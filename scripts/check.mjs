// Checks every service in services.json once and updates the data files:
//
//   status.json   current state, per-day counters for the uptime bars and the
//                 incident history (with updates from the incident issues)
//   latency.json  response times: every check of the last 24 hours and
//                 hourly averages of the last 7 days
//   badge.json    shields.io endpoint for a README badge
//   summary.json  small overall state for the status dot on other sites
//
// An incident opens on the first failed check and closes on the first
// successful one. With GITHUB_TOKEN set (GitHub Actions), every outage also
// gets an issue: it is assigned to the repository owner (so they are
// notified), closed on recovery, and comments by the owner or collaborators
// appear as updates in the timeline on the page.
//
//   node scripts/check.mjs [path/to/status.json]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = resolve(process.argv[2] || resolve(root, "data/status.json"));
const latencyFile = resolve(dirname(dataFile), "latency.json");
const badgeFile = resolve(dirname(dataFile), "badge.json");
const summaryFile = resolve(dirname(dataFile), "summary.json");
const TIMEOUT_MS = 15_000;
const SLOW_MS = 4_000; // slower than this counts as degraded
const RETRY_DELAY_MS = 8_000;
const KEEP_DAYS = 90;
const KEEP_INCIDENT_DAYS = 365;
const SAMPLE_HOURS = 24;
const HOURLY_DAYS = 7;
// A slow service only gets an issue once it has stayed slow for this many checks.
const DEGRADED_ISSUE_AFTER = 3;
const COMMENT_WINDOW_DAYS = 14;
const RANK = { up: 0, degraded: 1, down: 2 };

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};

const config = await readJson(resolve(root, "services.json"), null);
const services = config.groups.flatMap((g) => g.services);
const maintenance = (await readJson(resolve(root, "maintenance.json"), [])) || [];

async function probe(service) {
  const started = performance.now();
  try {
    const res = await fetch(service.url, {
      method: service.method || "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(service.timeout || TIMEOUT_MS),
      headers: { "user-agent": "flowplan-status (+https://status.flowplan.org)", "cache-control": "no-cache" },
    });
    const body = await res.text();
    const latency = Math.round(performance.now() - started);
    const expect = service.expect || [200];
    if (!expect.includes(res.status)) {
      return { status: "down", latency, code: res.status, message: `HTTP ${res.status}` };
    }
    let checks;
    if (service.json) {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return { status: "down", latency, code: res.status, message: "Invalid JSON" };
      }
      if (data && typeof data.checks === "object") checks = data.checks;
      for (const [key, want] of Object.entries(service.json)) {
        if (data?.[key] !== want) {
          return { status: "down", latency, code: res.status, message: `${key}: ${data?.[key] ?? "missing"}`, checks };
        }
      }
    }
    if (latency > (service.slowMs || SLOW_MS)) {
      return { status: "degraded", latency, code: res.status, message: `Slow response (${latency} ms)`, checks };
    }
    return { status: "up", latency, code: res.status, checks };
  } catch (err) {
    const latency = Math.round(performance.now() - started);
    const reason = err?.name === "TimeoutError" ? "Timeout" : err?.cause?.code || err?.message || "Network error";
    return { status: "down", latency, message: String(reason) };
  }
}

// A failure gets a second chance a few seconds later, so a single dropped
// packet on the runner does not become an incident.
async function check(service) {
  const first = await probe(service);
  if (first.status === "up") return first;
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  const second = await probe(service);
  return RANK[second.status] <= RANK[first.status] ? second : first;
}

const now = new Date();
const nowIso = now.toISOString();
const today = nowIso.slice(0, 10);

const inMaintenance = (id) =>
  maintenance.find((m) => (!m.services?.length || m.services.includes(id)) && Date.parse(m.start) <= now && now < Date.parse(m.end));

let data = { services: {}, days: {}, incidents: [] };
data = { ...data, ...(await readJson(dataFile, {})) };
const latency = { samples: {}, hourly: {}, ...(await readJson(latencyFile, {})) };

const results = await Promise.all(services.map(async (s) => [s, await check(s)]));
const resolvedNow = [];

for (const [service, result] of results) {
  // Failures inside an announced maintenance window are expected: they are
  // shown as maintenance and neither open incidents nor count as downtime.
  const maint = result.status !== "up" ? inMaintenance(service.id) : null;
  const status = maint ? "maintenance" : result.status;

  const prev = data.services[service.id];
  data.services[service.id] = {
    status,
    latency: result.latency,
    code: result.code ?? null,
    message: result.message ?? null,
    checks: result.checks ?? null,
    checkedAt: nowIso,
    since: prev && prev.status === status ? prev.since : nowIso,
  };

  const days = (data.days[service.id] ||= {});
  const day = (days[today] ||= { n: 0, down: 0, degraded: 0, ms: 0 });
  day.n += 1;
  if (status !== "up") day[status] = (day[status] || 0) + 1;
  day.ms += result.latency;

  // Response times.
  const minute = Math.round(now.getTime() / 60000);
  const code = { up: "u", degraded: "d", down: "x", maintenance: "m" }[status];
  (latency.samples[service.id] ||= []).push([minute, result.latency, code]);
  const hour = nowIso.slice(0, 13);
  const h = ((latency.hourly[service.id] ||= {})[hour] ||= [0, 0, 0, 0]); // n, sum ms, max ms, failures
  h[0] += 1;
  h[1] += result.latency;
  h[2] = Math.max(h[2], result.latency);
  if (status === "down") h[3] += 1;

  if (status === "maintenance") continue;
  const open = data.incidents.find((i) => i.service === service.id && !i.end);
  if (status === "up") {
    if (open) {
      open.end = nowIso;
      resolvedNow.push(open);
    }
  } else if (open) {
    open.failedChecks = (open.failedChecks || 1) + 1;
    if (RANK[status] > RANK[open.status]) open.status = status;
    open.lastMessage = result.message;
  } else {
    data.incidents.push({
      id: `${service.id}-${nowIso.replace(/[-:.]/g, "").slice(0, 15)}`,
      service: service.id,
      status,
      start: nowIso,
      end: null,
      message: result.message,
      lastMessage: result.message,
      failedChecks: 1,
    });
  }
}

// A service that was removed from the config ends its open incident.
const configured = new Set(services.map((s) => s.id));
for (const i of data.incidents) {
  if (!i.end && !configured.has(i.service)) {
    i.end = nowIso;
    resolvedNow.push(i);
  }
}

// ---- GitHub issues ----------------------------------------------------------
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const owner = process.env.GITHUB_REPOSITORY_OWNER || repo?.split("/")[0];

async function gh(path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const serviceName = (id) => services.find((s) => s.id === id)?.name?.en || id;
const statusWord = (s) => (s === "down" ? "outage" : "degraded performance");
const fmtUtc = (iso) => `${iso.slice(0, 16).replace("T", " ")} UTC`;
function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 5) return "under 5 minutes";
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

async function syncIssues() {
  // Make sure the label exists (ignored if it does).
  await gh("/labels", { method: "POST", body: { name: "incident", color: "d2462f", description: "Detected automatically by the status check" } }).catch(() => {});

  for (const i of data.incidents) {
    if (i.issue || i.end) continue;
    if (i.status === "degraded" && (i.failedChecks || 1) < DEGRADED_ISSUE_AFTER) continue;
    const svc = services.find((s) => s.id === i.service);
    const issue = await gh("/issues", {
      method: "POST",
      body: {
        title: `${serviceName(i.service)}: ${statusWord(i.status)}`,
        labels: ["incident"],
        assignees: owner ? [owner] : [],
        body: [
          `**${serviceName(i.service)}** (${svc?.url}) has been failing since **${fmtUtc(i.start)}**.`,
          "",
          `- Cause: \`${i.message}\``,
          `- Status page: https://status.flowplan.org`,
          "",
          "This issue closes itself as soon as the service responds normally again.",
          "Comments by maintainers appear as updates on the status page.",
        ].join("\n"),
      },
    });
    i.issue = issue.number;
    i.issueUrl = issue.html_url;
    console.log(`opened issue #${issue.number} for ${i.service}`);
  }

  for (const i of resolvedNow) {
    if (!i.issue) continue;
    await gh(`/issues/${i.issue}/comments`, {
      method: "POST",
      body: { body: `Resolved: ${serviceName(i.service)} has been responding normally since ${fmtUtc(i.end)} (${statusWord(i.status)} for ${fmtDuration(Date.parse(i.end) - Date.parse(i.start))}).` },
    });
    await gh(`/issues/${i.issue}`, { method: "PATCH", body: { state: "closed", state_reason: "completed" } });
    console.log(`closed issue #${i.issue} for ${i.service}`);
  }

  // Updates written by maintainers (not bots, not strangers: the repository
  // is public and anyone could comment).
  const since = new Date(now.getTime() - COMMENT_WINDOW_DAYS * 864e5).toISOString();
  const byIssue = new Map(data.incidents.filter((i) => i.issue).map((i) => [i.issue, i]));
  if (!byIssue.size) return;
  const comments = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`/issues/comments?since=${since}&per_page=100&page=${page}`);
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  const fresh = new Map();
  for (const c of comments) {
    const number = Number(c.issue_url.split("/").pop());
    const incident = byIssue.get(number);
    if (!incident || c.user?.type === "Bot") continue;
    if (!["OWNER", "MEMBER", "COLLABORATOR"].includes(c.author_association)) continue;
    if (!fresh.has(incident)) fresh.set(incident, []);
    fresh.get(incident).push({ id: c.id, at: c.created_at, text: String(c.body || "").trim().slice(0, 4000) });
  }
  // Comments inside the window are replaced (so edits and deletions show up),
  // older ones are kept as they were.
  for (const i of byIssue.values()) {
    const kept = (i.updates || []).filter((u) => u.at < since);
    const next = [...kept, ...(fresh.get(i) || [])].sort((a, b) => a.at.localeCompare(b.at));
    if (next.length) i.updates = next;
    else delete i.updates;
  }
}

if (token && repo) {
  try {
    await syncIssues();
  } catch (err) {
    console.error(`GitHub issues: ${err.message}`);
  }
}

// ---- tidy up and write ------------------------------------------------------
const known = new Set(services.map((s) => s.id));
for (const id of Object.keys(data.services)) if (!known.has(id)) delete data.services[id];
const dayCutoff = new Date(now.getTime() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
for (const [id, days] of Object.entries(data.days)) {
  if (!known.has(id)) delete data.days[id];
  else for (const d of Object.keys(days)) if (d < dayCutoff) delete days[d];
}
const incidentCutoff = new Date(now.getTime() - KEEP_INCIDENT_DAYS * 864e5).toISOString();
data.incidents = data.incidents
  .filter((i) => !i.end || i.end >= incidentCutoff)
  .map((i) => (known.has(i.service) || i.end ? i : { ...i, end: nowIso }))
  .sort((a, b) => b.start.localeCompare(a.start));
data.updatedAt = nowIso;

const sampleCutoff = Math.round(now.getTime() / 60000) - SAMPLE_HOURS * 60;
const hourCutoff = new Date(now.getTime() - HOURLY_DAYS * 864e5).toISOString().slice(0, 13);
for (const group of [latency.samples, latency.hourly]) for (const id of Object.keys(group)) if (!known.has(id)) delete group[id];
for (const id of Object.keys(latency.samples)) latency.samples[id] = latency.samples[id].filter(([m]) => m >= sampleCutoff);
for (const hours of Object.values(latency.hourly)) for (const k of Object.keys(hours)) if (k < hourCutoff) delete hours[k];
latency.updatedAt = nowIso;

const states = Object.values(data.services).map((s) => s.status);
const downCount = states.filter((s) => s === "down").length;
const badge = { schemaVersion: 1, label: "status", message: "all systems operational", color: "2f8f5b" };
if (downCount) Object.assign(badge, { message: downCount === states.length ? "major outage" : "partial outage", color: "d2462f" });
else if (states.includes("degraded")) Object.assign(badge, { message: "degraded performance", color: "c98a12" });
else if (states.includes("maintenance")) Object.assign(badge, { message: "maintenance", color: "3b3fd8" });

await mkdir(dirname(dataFile), { recursive: true });
await writeFile(dataFile, JSON.stringify(data, null, 1) + "\n");
await writeFile(latencyFile, JSON.stringify(latency) + "\n");
await writeFile(badgeFile, JSON.stringify(badge) + "\n");

// One word for the whole platform plus each service, small enough to fetch
// on every page view of the website and the docs.
const overall = downCount ? (downCount === states.length ? "major_outage" : "partial_outage") : states.includes("degraded") ? "degraded" : states.includes("maintenance") ? "maintenance" : "operational";
const summary = {
  status: overall,
  updatedAt: nowIso,
  url: "https://status.flowplan.org",
  services: Object.fromEntries(Object.entries(data.services).map(([id, s]) => [id, s.status])),
  incidents: data.incidents.filter((i) => !i.end).map((i) => ({ service: i.service, status: i.status, since: i.start })),
  maintenance: maintenance
    .filter((m) => Date.parse(m.end) > now)
    .map((m) => ({ title: m.title, start: m.start, end: m.end, services: m.services || [] })),
};
await writeFile(summaryFile, JSON.stringify(summary) + "\n");

for (const [service, r] of results) {
  console.log(`${data.services[service.id].status.padEnd(11)} ${String(r.latency).padStart(5)} ms  ${service.id}${r.message ? `  (${r.message})` : ""}`);
}
