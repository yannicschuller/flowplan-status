// Checks every service in services.json once and updates the status file:
// current state, per-day counters for the uptime bars and the incident
// history. An incident opens on the first failed check and closes on the
// first successful one, so the timeline fills itself.
//
//   node scripts/check.mjs [path/to/status.json]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = resolve(process.argv[2] || resolve(root, "data/status.json"));
const TIMEOUT_MS = 15_000;
const SLOW_MS = 4_000; // slower than this counts as degraded
const RETRY_DELAY_MS = 8_000;
const KEEP_DAYS = 90;
const KEEP_INCIDENT_DAYS = 365;
const RANK = { up: 0, degraded: 1, down: 2 };

const config = JSON.parse(await readFile(resolve(root, "services.json"), "utf8"));
const services = config.groups.flatMap((g) => g.services);

async function probe(service) {
  const started = performance.now();
  try {
    const res = await fetch(service.url, {
      method: service.method || "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(service.timeout || TIMEOUT_MS),
      headers: { "user-agent": "flowplan-status (+https://github.com/yannicschuller/flowplan-status)", "cache-control": "no-cache" },
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

let data = { services: {}, days: {}, incidents: [] };
try {
  data = { ...data, ...JSON.parse(await readFile(dataFile, "utf8")) };
} catch {}

const now = new Date();
const nowIso = now.toISOString();
const today = nowIso.slice(0, 10);
const results = await Promise.all(services.map(async (s) => [s, await check(s)]));

for (const [service, result] of results) {
  const prev = data.services[service.id];
  data.services[service.id] = {
    status: result.status,
    latency: result.latency,
    code: result.code ?? null,
    message: result.message ?? null,
    checks: result.checks ?? null,
    checkedAt: nowIso,
    since: prev && prev.status === result.status ? prev.since : nowIso,
  };

  const days = (data.days[service.id] ||= {});
  const day = (days[today] ||= { n: 0, down: 0, degraded: 0, ms: 0 });
  day.n += 1;
  if (result.status !== "up") day[result.status] += 1;
  day.ms += result.latency;

  const open = data.incidents.find((i) => i.service === service.id && !i.end);
  if (result.status === "up") {
    if (open) {
      open.end = nowIso;
    }
  } else if (open) {
    open.failedChecks = (open.failedChecks || 1) + 1;
    if (RANK[result.status] > RANK[open.status]) open.status = result.status;
    open.lastMessage = result.message;
  } else {
    data.incidents.push({
      id: `${service.id}-${nowIso.replace(/[-:.]/g, "").slice(0, 15)}`,
      service: service.id,
      status: result.status,
      start: nowIso,
      end: null,
      message: result.message,
      lastMessage: result.message,
      failedChecks: 1,
    });
  }
}

// Forget services that were removed from the config, and old data.
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
await mkdir(dirname(dataFile), { recursive: true });
await writeFile(dataFile, JSON.stringify(data, null, 1) + "\n");

for (const [service, r] of results) {
  console.log(`${r.status.padEnd(8)} ${String(r.latency).padStart(5)} ms  ${service.id}${r.message ? `  (${r.message})` : ""}`);
}
