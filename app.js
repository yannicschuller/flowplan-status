// Renders services.json, maintenance.json and the data files written by
// scripts/check.mjs (status.json, latency.json).
(() => {
  const T = {
    de: {
      status: "Status",
      openApp: "Flowplan öffnen",
      loading: "Wird geladen …",
      history: "Verlauf",
      historyNote: "Störungen werden automatisch erkannt und hier eingetragen.",
      older: "Ältere anzeigen",
      footer: "Geprüft alle 5 Minuten von außen über GitHub Actions.",
      source: "Quellcode",
      allUp: "Alles läuft.",
      someDegraded: "Etwas langsamer.",
      someDown: "Teilweise gestört.",
      allDown: "Gerade gestört.",
      inMaintenance: "Wartung läuft.",
      noData: "Noch keine Daten.",
      ledeUp: "Alle Flowplan-Dienste sind erreichbar und antworten normal.",
      ledeDegraded: (n) => `${n} antwortet gerade langsamer als gewohnt. Alles andere läuft normal.`,
      ledeDown: (n) => `${n} ist gerade nicht erreichbar. Die Störung wird automatisch beobachtet.`,
      ledeMaintenance: (n) => `${n} wird gerade gewartet und ist kurz eingeschränkt. Alles andere läuft normal.`,
      ledeNoData: "Die erste automatische Prüfung steht noch aus.",
      loadError: "Der Status konnte nicht geladen werden. Neuer Versuch in einer Minute.",
      checked: (ago) => `Zuletzt geprüft ${ago}`,
      up: "Läuft",
      degraded: "Langsam",
      down: "Gestört",
      maintenance: "Wartung",
      unknown: "Unbekannt",
      outage: "Ausfall",
      slow: "Verlangsamt",
      ongoing: "Andauernd",
      resolved: "Behoben",
      planned: "Geplant",
      running: "Läuft",
      completed: "Abgeschlossen",
      maintTitle: "Geplante Wartung",
      allServices: "Alle Dienste",
      since: (t) => `seit ${t}`,
      daysAgo: (n) => `vor ${n} Tagen`,
      today: "Heute",
      uptime: (p) => `${p} verfügbar`,
      noIncidents: "Keine Störungen in den letzten 90 Tagen.",
      noIncidentsYet: "Bisher wurden keine Störungen aufgezeichnet.",
      noDataDay: "Keine Daten",
      dayUp: "Keine Störung",
      dayDown: (d) => `${d} gestört`,
      daySlow: (d) => `${d} verlangsamt`,
      dayMaint: "Wartung",
      dur: { lt: "unter 5 Min.", m: (n) => `${n} Min.`, h: (h, m) => (m ? `${h} Std. ${m} Min.` : `${h} Std.`), d: (d, h) => (h ? `${d} T. ${h} Std.` : `${d} T.`) },
      ago: { now: "gerade eben", m: (n) => `vor ${n} Min.`, h: (n) => `vor ${n} Std.`, d: (n) => `vor ${n} T.` },
      checks: { database: "Datenbank", storage: "Dateispeicher" },
      causes: { Timeout: "Keine Antwort (Zeitüberschreitung)", ENOTFOUND: "Adresse nicht gefunden (DNS)", ECONNREFUSED: "Verbindung abgelehnt", ECONNRESET: "Verbindung abgebrochen", "Invalid JSON": "Ungültige Antwort" },
      cause: "Ursache",
      slowCause: (ms) => `Antwortzeit ${ms} ms`,
      checksN: (n) => (n === 1 ? "1 fehlgeschlagene Prüfung" : `${n} fehlgeschlagene Prüfungen`),
      viewIssue: "Auf GitHub",
      responseTime: "Antwortzeit",
      showResponse: "Antwortzeit anzeigen",
      range24: "24 Std.",
      range7: "7 Tage",
      avgPeak: (a, p) => `Ø ${a} · Spitze ${p}`,
      noSamples: "Noch keine Messwerte für diesen Zeitraum.",
      failed: "fehlgeschlagen",
      hourAvg: "Stundenmittel",
    },
    en: {
      status: "Status",
      openApp: "Open Flowplan",
      loading: "Loading …",
      history: "History",
      historyNote: "Incidents are detected and recorded here automatically.",
      older: "Show older",
      footer: "Checked from the outside every 5 minutes by GitHub Actions.",
      source: "Source",
      allUp: "All systems go.",
      someDegraded: "A little slower.",
      someDown: "Partial outage.",
      allDown: "Major outage.",
      inMaintenance: "Under maintenance.",
      noData: "No data yet.",
      ledeUp: "Every Flowplan service is reachable and responding normally.",
      ledeDegraded: (n) => `${n} is responding more slowly than usual. Everything else is normal.`,
      ledeDown: (n) => `${n} is currently unreachable. The outage is being monitored automatically.`,
      ledeMaintenance: (n) => `${n} is undergoing scheduled maintenance and may be briefly limited. Everything else is normal.`,
      ledeNoData: "The first automatic check has not run yet.",
      loadError: "The status could not be loaded. Trying again in a minute.",
      checked: (ago) => `Last checked ${ago}`,
      up: "Operational",
      degraded: "Slow",
      down: "Outage",
      maintenance: "Maintenance",
      unknown: "Unknown",
      outage: "Outage",
      slow: "Degraded performance",
      ongoing: "Ongoing",
      resolved: "Resolved",
      planned: "Scheduled",
      running: "In progress",
      completed: "Completed",
      maintTitle: "Scheduled maintenance",
      allServices: "All services",
      since: (t) => `since ${t}`,
      daysAgo: (n) => `${n} days ago`,
      today: "Today",
      uptime: (p) => `${p} uptime`,
      noIncidents: "No incidents in the last 90 days.",
      noIncidentsYet: "No incidents recorded so far.",
      noDataDay: "No data",
      dayUp: "No incidents",
      dayDown: (d) => `${d} outage`,
      daySlow: (d) => `${d} degraded`,
      dayMaint: "Maintenance",
      dur: { lt: "under 5 min", m: (n) => `${n} min`, h: (h, m) => (m ? `${h} h ${m} min` : `${h} h`), d: (d, h) => (h ? `${d} d ${h} h` : `${d} d`) },
      ago: { now: "just now", m: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} d ago` },
      checks: { database: "Database", storage: "File storage" },
      causes: { Timeout: "No response (timeout)", ENOTFOUND: "Address not found (DNS)", ECONNREFUSED: "Connection refused", ECONNRESET: "Connection reset", "Invalid JSON": "Invalid response" },
      cause: "Cause",
      slowCause: (ms) => `Response time ${ms} ms`,
      checksN: (n) => (n === 1 ? "1 failed check" : `${n} failed checks`),
      viewIssue: "On GitHub",
      responseTime: "Response time",
      showResponse: "Show response time",
      range24: "24 h",
      range7: "7 days",
      avgPeak: (a, p) => `avg ${a} · peak ${p}`,
      noSamples: "No measurements for this period yet.",
      failed: "failed",
      hourAvg: "hourly average",
    },
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") || store.get("lang") || ((navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en");
  if (!T[lang]) lang = "de";
  const t = () => T[lang];
  const RANK = { up: 0, maintenance: 0.5, degraded: 1, down: 2 };
  const PAGE = 12; // days shown in the timeline before "show older"
  const COLORS = { down: "#d2462f", degraded: "#c98a12", maintenance: "#3b3fd8" };

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  const dataUrl = params.get("data") || (local ? "data/status.json" : document.querySelector('meta[name="status-data"]').content);
  const latencyUrl = params.get("latency") || dataUrl.replace(/status\.json$/, "latency.json").replace(/[^/]+\.json$/, (f) => (f === "latency.json" ? f : f.replace(".json", ".latency.json")));
  const maintenanceUrl = params.get("maintenance") || "maintenance.json";

  let config = null, data = null, latency = null, maintenance = [], failed = false, shownDays = PAGE;
  const expanded = new Map(); // service id -> "24h" | "7d"
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k);
    return n;
  };
  const SVG = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const name = (o) => (o ? o[lang] || o.de || o.en : "");
  const services = () => config.groups.flatMap((g) => g.services);
  const serviceById = (id) => services().find((s) => s.id === id);
  const locale = () => (lang === "de" ? "de-DE" : "en-GB");

  const fmtDate = (d, opts) => new Intl.DateTimeFormat(locale(), opts).format(d);
  const fmtTime = (d) => fmtDate(d, { hour: "2-digit", minute: "2-digit" });
  const fmtDateTime = (d) => fmtDate(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const fmtPct = (p) => new Intl.NumberFormat(locale(), { style: "percent", minimumFractionDigits: p >= 0.99995 ? 0 : 2, maximumFractionDigits: 2 }).format(p);
  const fmtMs = (ms) => (ms >= 1000 ? `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(ms / 1000)} s` : `${Math.round(ms)} ms`);
  const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const list = (names) => new Intl.ListFormat(locale(), { type: "conjunction" }).format(names);

  function duration(ms) {
    const d = t().dur;
    const min = Math.round(ms / 60000);
    if (min < 5) return d.lt;
    if (min < 60) return d.m(min);
    const h = Math.floor(min / 60);
    if (h < 24) return d.h(h, min % 60);
    return d.d(Math.floor(h / 24), h % 24);
  }
  function ago(iso) {
    const a = t().ago;
    const min = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (min < 1) return a.now;
    if (min < 60) return a.m(min);
    if (min < 1440) return a.h(Math.floor(min / 60));
    return a.d(Math.floor(min / 1440));
  }
  function cause(msg) {
    if (!msg) return "";
    const c = t().causes;
    if (c[msg]) return c[msg];
    const slow = /^Slow response \((\d+) ms\)$/.exec(msg);
    if (slow) return t().slowCause(slow[1]);
    return msg;
  }

  // ---- maintenance -----------------------------------------------------------
  const maintServices = (m) => (m.services?.length ? m.services : services().map((s) => s.id));
  const activeMaint = () => maintenance.filter((m) => Date.parse(m.start) <= Date.now() && Date.now() < Date.parse(m.end));
  const upcomingMaint = () => maintenance.filter((m) => Date.parse(m.start) > Date.now()).sort((a, b) => a.start.localeCompare(b.start));
  const inMaint = (id) => activeMaint().some((m) => maintServices(m).includes(id));
  const maintScope = (m) => (m.services?.length ? list(m.services.map((id) => name(serviceById(id)?.name) || id)) : t().allServices);
  const maintSpan = (m) => {
    const a = new Date(m.start), b = new Date(m.end);
    return `${fmtDate(a, { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(a)} – ${localDay(a) === localDay(b) ? fmtTime(b) : fmtDateTime(b)}`;
  };
  // The status shown for a service: an announced window wins over a failed check.
  const shownStatus = (id) => (inMaint(id) ? "maintenance" : data?.services?.[id]?.status);

  // ---- hero, favicon, title ----------------------------------------------------
  let baseIcon = null;
  function setFavicon(state) {
    const link = document.querySelector('link[rel="icon"]');
    baseIcon ||= link.href;
    if (!COLORS[state]) { link.href = baseIcon; return; }
    const dot = `<circle cx="25.5" cy="25.5" r="6.5" fill="${COLORS[state]}" stroke="#fcfbf8" stroke-width="2.5"/>`;
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4146e6"/><stop offset="1" stop-color="#6a3fe0"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#g)"/><path d="M16 6.8 25.2 11.4 16 16 6.8 11.4Z" fill="#fff"/><g fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6.8 16 16 20.6 25.2 16" opacity=".72"/><path d="M6.8 20.6 16 25.2 25.2 20.6" opacity=".42"/></g>${dot}</svg>`;
    link.href = `data:image/svg+xml,${encodeURIComponent(icon)}`;
  }

  function renderHero() {
    const dot = $("hero-dot");
    if (!data || !Object.keys(data.services || {}).length) {
      dot.removeAttribute("data-s");
      $("headline-text").textContent = t().noData;
      $("lede").textContent = failed ? t().loadError : t().ledeNoData;
      $("eyebrow").innerHTML = "&nbsp;";
      setFavicon("up");
      return;
    }
    const all = services().map((s) => ({ s, st: shownStatus(s.id) || "up" }));
    const pick = (st) => all.filter((x) => x.st === st);
    const names = (xs) => list(xs.map((x) => name(x.s.name)));
    const down = pick("down"), slow = pick("degraded"), maint = pick("maintenance");
    let s = "up", h = t().allUp, l = t().ledeUp;
    if (down.length) {
      s = "down";
      h = down.length === all.length ? t().allDown : t().someDown;
      l = t().ledeDown(names(down));
    } else if (slow.length) {
      s = "degraded";
      h = t().someDegraded;
      l = t().ledeDegraded(names(slow));
    } else if (maint.length) {
      s = "maintenance";
      h = t().inMaintenance;
      l = t().ledeMaintenance(maint.length === all.length ? t().allServices : names(maint));
    }
    dot.dataset.s = s;
    $("headline-text").textContent = h;
    $("lede").textContent = failed ? t().loadError : l;
    $("eyebrow").textContent = t().checked(ago(data.updatedAt));
    $("eyebrow").title = fmtDate(new Date(data.updatedAt), { dateStyle: "full", timeStyle: "short" });
    const mark = { down: "🔴 ", degraded: "🟡 ", maintenance: "🔵 " }[s] || "";
    document.title = s === "up" ? "Flowplan Status" : `${mark}${h.replace(/\.$/, "")} · Flowplan Status`;
    setFavicon(s);
  }

  function renderNotices() {
    const box = $("ongoing");
    box.replaceChildren();
    const open = (data?.incidents || []).filter((i) => !i.end && serviceById(i.service) && !inMaint(i.service));
    for (const i of open) {
      const last = i.updates?.[i.updates.length - 1];
      box.append(el("div", { class: "notice", "data-s": i.status },
        el("strong", { text: `${name(serviceById(i.service).name)}: ${i.status === "down" ? t().outage : t().slow}` }),
        el("span", { text: `${t().since(fmtTime(new Date(i.start)))} · ${duration(Date.now() - new Date(i.start))}${i.lastMessage ? ` · ${cause(i.lastMessage)}` : ""}` }),
        last ? el("p", { class: "notice-update", text: last.text }) : null,
      ));
    }
    for (const m of [...activeMaint(), ...upcomingMaint()]) {
      const running = Date.parse(m.start) <= Date.now();
      box.append(el("div", { class: "notice", "data-s": "maintenance" },
        el("strong", { text: `${running ? t().maintenance : t().maintTitle}: ${name(m.title)}` }),
        el("span", { text: `${maintSpan(m)} · ${maintScope(m)}` }),
        m.description ? el("p", { class: "notice-update", text: name(m.description) }) : null,
      ));
    }
    box.hidden = !box.childElementCount;
  }

  // ---- services + uptime bars ------------------------------------------
  const dayCount = () => (window.matchMedia("(max-width: 560px)").matches ? 45 : 90);

  function dayStats(id, n) {
    const days = data?.days?.[id] || {};
    const out = [];
    const now = new Date();
    for (let k = n - 1; k >= 0; k--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - k));
      const key = d.toISOString().slice(0, 10);
      out.push({ key, date: d, n: 0, down: 0, degraded: 0, maintenance: 0, ...(days[key] || {}) });
    }
    return out;
  }
  // Minutes of trouble per day, taken from the incident list (more exact
  // than counting checks, since GitHub does not run every 5 minutes sharp).
  function troubleMinutes(id, key) {
    const start = Date.parse(`${key}T00:00:00Z`), end = start + 864e5;
    let down = 0, slow = 0;
    for (const i of data?.incidents || []) {
      if (i.service !== id) continue;
      const a = Math.max(start, Date.parse(i.start)), b = Math.min(end, i.end ? Date.parse(i.end) : Date.now());
      if (b > a) (i.status === "down" ? (down += b - a) : (slow += b - a));
    }
    return { down, slow };
  }

  function renderGroups() {
    const root = $("groups");
    root.replaceChildren();
    const n = dayCount();
    for (const g of config.groups) {
      const card = el("div", { class: "card" });
      for (const s of g.services) {
        const cur = data?.services?.[s.id];
        const st = shownStatus(s.id);
        const stats = dayStats(s.id, n);
        const total = stats.reduce((a, d) => a + d.n, 0);
        const bad = stats.reduce((a, d) => a + d.down, 0);
        const bars = el("div", { class: "bars", style: `--days:${n}`, role: "img", "aria-label": `${name(s.name)}: ${n} ${lang === "de" ? "Tage" : "days"}` });
        for (const d of stats) {
          const ds = !d.n ? null : d.down ? "down" : d.degraded ? "degraded" : d.maintenance ? "maintenance" : "up";
          const bar = el("span", { class: "bar", "data-s": ds });
          bar.addEventListener("mouseenter", () => showBarTip(bar, s, d, ds));
          bar.addEventListener("mouseleave", hideTip);
          bars.append(bar);
        }
        const checks = cur?.checks && typeof cur.checks === "object"
          ? el("ul", { class: "subchecks" }, Object.entries(cur.checks).map(([k, v]) => el("li", { "data-s": v, text: t().checks[k] || k })))
          : null;
        const open = expanded.has(s.id);
        const panelId = `rt-${s.id}`;
        const section = el("div", { class: "service" },
          el("div", { class: "service-head" },
            el("button", {
              class: "service-toggle", type: "button", "aria-expanded": String(open), "aria-controls": panelId, title: t().showResponse,
              onclick: () => { open ? expanded.delete(s.id) : expanded.set(s.id, "24h"); renderGroups(); if (!open) ensureLatency(); },
            },
              el("span", {},
                el("span", { class: "service-name" }, name(s.name), chevron()),
                el("span", { class: "service-desc", text: name(s.description) }),
              ),
            ),
            el("span", { class: "pill", "data-s": st, title: cur?.latency != null ? `${cur.latency} ms` : null, text: st ? t()[st] : t().unknown }),
          ),
          checks,
          bars,
          el("div", { class: "bars-legend" },
            el("span", { text: t().daysAgo(n) }),
            el("span", { class: "uptime", text: total ? t().uptime(fmtPct(1 - bad / total)) : "" }),
            el("span", { text: t().today }),
          ),
          open ? renderLatency(s, panelId) : null,
        );
        card.append(section);
      }
      root.append(el("section", { class: "group" }, el("h2", { text: name(g.name) }), card));
    }
  }
  function chevron() {
    const c = svg("svg", { class: "chevron", width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true" });
    c.append(svg("path", { d: "M3 4.5 6 7.5 9 4.5", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }));
    return c;
  }

  // ---- response time chart -------------------------------------------------
  let latencyLoading = null;
  function ensureLatency(force) {
    if (latencyLoading || (latency && !force)) return latencyLoading;
    latencyLoading = fetch(`${latencyUrl}${latencyUrl.includes("?") ? "&" : "?"}t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => { latency = j; })
      .catch(() => { latency ||= { samples: {}, hourly: {} }; })
      .finally(() => { latencyLoading = null; renderGroups(); });
    return latencyLoading;
  }

  function seriesFor(id, range) {
    if (!latency) return null;
    if (range === "24h") {
      return (latency.samples?.[id] || []).map(([m, ms, s]) => ({ t: m * 60000, ms, fail: s === "x", maint: s === "m" }));
    }
    return Object.entries(latency.hourly?.[id] || {})
      .map(([k, [n, sum, max, fails]]) => ({ t: Date.parse(`${k}:30:00Z`), ms: n ? sum / n : 0, max, fail: fails > 0 }))
      .sort((a, b) => a.t - b.t);
  }

  function renderLatency(s, panelId) {
    const range = expanded.get(s.id);
    const panel = el("div", { class: "latency", id: panelId });
    const tabs = el("div", { class: "latency-tabs", role: "group", "aria-label": t().responseTime },
      ["24h", "7d"].map((r) => el("button", {
        type: "button", "aria-pressed": String(r === range),
        onclick: () => { expanded.set(s.id, r); renderGroups(); },
        text: r === "24h" ? t().range24 : t().range7,
      })),
    );
    const head = el("div", { class: "latency-head" }, el("span", { class: "latency-title", text: t().responseTime }), tabs);
    panel.append(head);
    const points = seriesFor(s.id, range);
    if (!points) { panel.append(el("p", { class: "latency-empty", text: t().loading })); return panel; }
    if (!points.length) { panel.append(el("p", { class: "latency-empty", text: t().noSamples })); return panel; }

    const span = range === "24h" ? 864e5 : 7 * 864e5;
    const t1 = Date.now(), t0 = t1 - span;
    const ok = points.filter((p) => !p.fail).map((p) => p.ms).sort((a, b) => a - b);
    const p95 = ok.length ? ok[Math.min(ok.length - 1, Math.floor(ok.length * 0.95))] : 500;
    const step = [250, 500, 1000, 2000, 5000, 10000, 20000].find((v) => v >= p95 * 1.25) || 20000;
    const W = 600, H = 120;
    const x = (tt) => ((tt - t0) / span) * W;
    const y = (ms) => H - (Math.min(ms, step) / step) * (H - 6);
    const gap = range === "24h" ? 20 * 60000 : 3 * 3600000;

    const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "latency-svg", "aria-hidden": "true" });
    chart.append(svg("line", { x1: 0, x2: W, y1: y(step / 2), y2: y(step / 2), class: "grid" }));
    const bandW = Math.max(2, (range === "24h" ? 5 * 60000 : 3600000) / span * W);
    for (const p of points) {
      if (p.fail || p.maint) chart.append(svg("rect", { x: x(p.t) - bandW / 2, y: 0, width: bandW, height: H, class: p.fail ? "band-fail" : "band-maint" }));
    }
    let line = "", area = "", segStart = null, prev = null;
    const closeArea = () => { if (segStart != null) area += `L${x(prev.t).toFixed(1)},${H}L${segStart.toFixed(1)},${H}Z`; };
    for (const p of points.filter((q) => !q.fail && q.t >= t0)) {
      const px = x(p.t).toFixed(1), py = y(p.ms).toFixed(1);
      if (!prev || p.t - prev.t > gap) {
        closeArea();
        line += `M${px},${py}`;
        area += `M${px},${H}L${px},${py}`;
        segStart = Number(px);
      } else {
        line += `L${px},${py}`;
        area += `L${px},${py}`;
      }
      prev = p;
    }
    closeArea();
    chart.append(svg("path", { d: area, class: "area" }), svg("path", { d: line, class: "line" }));

    const cursor = el("div", { class: "latency-cursor", hidden: "" });
    const dot = el("div", { class: "latency-dot", hidden: "" });
    const plot = el("div", { class: "latency-plot" },
      chart,
      el("span", { class: "axis axis-top", text: fmtMs(step) }),
      el("span", { class: "axis axis-mid", text: fmtMs(step / 2) }),
      cursor, dot,
    );
    const move = (ev) => {
      const r = plot.getBoundingClientRect();
      const tt = t0 + ((ev.clientX - r.left) / r.width) * span;
      let best = null;
      for (const p of points) if (!best || Math.abs(p.t - tt) < Math.abs(best.t - tt)) best = p;
      if (!best || Math.abs(best.t - tt) > gap) return hidePlot();
      const px = (x(best.t) / W) * r.width;
      cursor.hidden = false;
      cursor.style.left = `${px}px`;
      dot.hidden = best.fail;
      dot.style.left = `${px}px`;
      dot.style.top = `${(y(best.ms) / H) * r.height}px`;
      const when = range === "24h" ? fmtTime(new Date(best.t)) : `${fmtDate(new Date(best.t), { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(new Date(best.t - 1800000))}`;
      const value = best.fail ? t().failed : best.maint ? `${fmtMs(best.ms)} · ${t().maintenance}` : range === "7d" ? `${fmtMs(best.ms)} (${t().hourAvg})` : fmtMs(best.ms);
      showTip({ left: r.left + px, top: r.top, width: 0 }, [el("b", { text: when }), el("br"), value]);
    };
    const hidePlot = () => { cursor.hidden = true; dot.hidden = true; hideTip(); };
    plot.addEventListener("pointermove", move);
    plot.addEventListener("pointerleave", hidePlot);
    panel.append(plot);

    const inRange = points.filter((p) => !p.fail && p.t >= t0);
    const avg = inRange.reduce((a, p) => a + p.ms, 0) / (inRange.length || 1);
    const peak = Math.max(0, ...points.filter((p) => p.t >= t0).map((p) => p.max ?? p.ms));
    panel.append(el("div", { class: "bars-legend" },
      el("span", { text: range === "24h" ? (lang === "de" ? "vor 24 Std." : "24 h ago") : t().daysAgo(7) }),
      el("span", { class: "uptime", text: inRange.length ? t().avgPeak(fmtMs(avg), fmtMs(peak)) : "" }),
      el("span", { text: lang === "de" ? "Jetzt" : "Now" }),
    ));
    return panel;
  }

  // ---- tooltip ----------------------------------------------------------------
  const tip = $("tip");
  function showTip(r, content) {
    tip.replaceChildren(...content);
    tip.hidden = false;
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
    tip.style.top = `${Math.max(8, r.top - tip.offsetHeight - 8)}px`;
  }
  function showBarTip(bar, s, d, ds) {
    const date = fmtDate(d.date, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
    let line = t().noDataDay;
    if (ds) {
      const m = troubleMinutes(s.id, d.key);
      const parts = [];
      if (d.down) parts.push(t().dayDown(duration(m.down || 1)));
      if (d.degraded) parts.push(t().daySlow(duration(m.slow || 1)));
      if (d.maintenance) parts.push(t().dayMaint);
      line = parts.length ? parts.join(" · ") : t().dayUp;
      if (d.n) line += ` · ${fmtPct(1 - d.down / d.n)}`;
    }
    showTip(bar.getBoundingClientRect(), [el("b", { text: date }), el("br"), line]);
  }
  function hideTip() { tip.hidden = true; }
  addEventListener("scroll", hideTip, { passive: true });

  // ---- timeline ----------------------------------------------------------
  function renderTimeline() {
    const root = $("timeline");
    root.replaceChildren();
    const entries = [
      ...(data?.incidents || []).filter((i) => serviceById(i.service)).map((i) => ({ kind: "incident", start: i.start, status: i.status, i })),
      ...maintenance.filter((m) => Date.parse(m.start) <= Date.now()).map((m) => ({ kind: "maintenance", start: new Date(m.start).toISOString(), status: "maintenance", m })),
    ];
    const byDay = new Map();
    for (const e of entries) {
      const k = localDay(new Date(e.start));
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }
    const days = [...byDay.keys()].sort().reverse();
    if (!days.length) {
      const longEnough = Object.values(data?.days || {}).some((d) => Object.keys(d).length >= 90);
      root.append(el("li", {}, el("p", { class: "t-empty", text: longEnough ? t().noIncidents : t().noIncidentsYet })));
    }
    for (const k of days.slice(0, shownDays)) {
      const items = byDay.get(k).sort((a, b) => b.start.localeCompare(a.start));
      const worst = items.reduce((w, e) => (RANK[e.status] > RANK[w] ? e.status : w), "up");
      const [y, m, d] = k.split("-").map(Number);
      root.append(el("li", { class: "t-day", "data-s": worst },
        el("p", { class: "t-date", text: fmtDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }),
        el("div", { class: "t-items" }, items.map((e) => (e.kind === "incident" ? renderIncident(e.i) : renderMaintenance(e.m)))),
      ));
    }
    $("more").hidden = days.length <= shownDays;
  }
  function renderIncident(i) {
    const s = serviceById(i.service);
    const start = new Date(i.start), end = i.end ? new Date(i.end) : null;
    const span = end ? `${fmtTime(start)} – ${localDay(end) === localDay(start) ? fmtTime(end) : fmtDateTime(end)}` : t().since(fmtTime(start));
    const dur = duration((end || new Date()) - start);
    const causes = [...new Set([i.message, i.lastMessage].filter(Boolean).map(cause))].join(" → ");
    return el("article", { class: `incident${end ? "" : " live"}` },
      el("div", { class: "incident-head" },
        el("h3", { class: "incident-title", text: `${name(s.name)}: ${i.status === "down" ? t().outage : t().slow}` }),
        el("span", { class: "pill", "data-s": end ? "up" : i.status, text: end ? t().resolved : t().ongoing }),
      ),
      el("p", { class: "incident-meta" },
        `${span} · ${dur}`,
        i.issueUrl ? el("a", { href: i.issueUrl, class: "issue-link", text: `${t().viewIssue} #${i.issue}` }) : null,
      ),
      causes ? el("p", { class: "incident-cause", text: `${t().cause}: ${causes} · ${t().checksN(i.failedChecks || 1)}` }) : null,
      i.updates?.length
        ? el("ol", { class: "updates" }, [...i.updates].reverse().map((u) => el("li", {},
            el("time", { datetime: u.at, text: fmtDateTime(new Date(u.at)) }),
            el("p", { text: u.text }),
          )))
        : null,
    );
  }
  function renderMaintenance(m) {
    const done = Date.parse(m.end) <= Date.now();
    return el("article", { class: "incident maint" },
      el("div", { class: "incident-head" },
        el("h3", { class: "incident-title", text: `${t().maintTitle}: ${name(m.title)}` }),
        el("span", { class: "pill", "data-s": done ? "up" : "maintenance", text: done ? t().completed : t().running }),
      ),
      el("p", { class: "incident-meta", text: `${maintSpan(m)} · ${maintScope(m)}` }),
      m.description ? el("p", { class: "incident-cause", text: name(m.description) }) : null,
    );
  }
  $("more").addEventListener("click", () => { shownDays += PAGE; renderTimeline(); });

  // ---- language + loading -------------------------------------------------
  function applyLang() {
    document.documentElement.lang = lang;
    for (const n of document.querySelectorAll("[data-i18n]")) {
      const v = t()[n.dataset.i18n];
      if (typeof v === "string") n.textContent = v;
    }
    for (const b of document.querySelectorAll("[data-lang]")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  }
  for (const b of document.querySelectorAll("[data-lang]")) {
    b.addEventListener("click", () => { lang = b.dataset.lang; store.set("lang", lang); render(); });
  }

  function render() {
    applyLang();
    if (!config) return;
    renderHero();
    renderNotices();
    renderGroups();
    renderTimeline();
  }

  async function load() {
    try {
      if (!config) config = await (await fetch("services.json", { cache: "no-cache" })).json();
      const [res, maint] = await Promise.all([
        fetch(`${dataUrl}${dataUrl.includes("?") ? "&" : "?"}t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" }),
        fetch(maintenanceUrl, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
      maintenance = Array.isArray(maint) ? maint.filter((m) => m && m.start && m.end) : [];
      failed = false;
    } catch {
      failed = true;
    }
    render();
    if (expanded.size) ensureLatency(true);
  }
  let lastWide = dayCount();
  addEventListener("resize", () => { if (dayCount() !== lastWide) { lastWide = dayCount(); renderGroups(); } });
  applyLang();
  load();
  setInterval(load, 60_000);
  setInterval(() => data && renderHero(), 20_000);
})();
