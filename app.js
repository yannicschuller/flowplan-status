// Renders services.json + status.json (written by scripts/check.mjs).
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
      noData: "Noch keine Daten.",
      ledeUp: "Alle Flowplan-Dienste sind erreichbar und antworten normal.",
      ledeDegraded: (n) => `${n} antwortet gerade langsamer als gewohnt. Alles andere läuft normal.`,
      ledeDown: (n) => `${n} ist gerade nicht erreichbar. Die Störung wird automatisch beobachtet.`,
      ledeNoData: "Die erste automatische Prüfung steht noch aus.",
      loadError: "Der Status konnte nicht geladen werden. Neuer Versuch in einer Minute.",
      checked: (ago) => `Zuletzt geprüft ${ago}`,
      up: "Läuft",
      degraded: "Langsam",
      down: "Gestört",
      unknown: "Unbekannt",
      outage: "Ausfall",
      slow: "Verlangsamt",
      ongoing: "Andauernd",
      resolved: "Behoben",
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
      dur: { lt: "unter 5 Min.", m: (n) => `${n} Min.`, h: (h, m) => (m ? `${h} Std. ${m} Min.` : `${h} Std.`), d: (d, h) => (h ? `${d} T. ${h} Std.` : `${d} T.`) },
      ago: { now: "gerade eben", m: (n) => `vor ${n} Min.`, h: (n) => `vor ${n} Std.`, d: (n) => `vor ${n} T.` },
      checks: { database: "Datenbank", storage: "Dateispeicher" },
      causes: { Timeout: "Keine Antwort (Zeitüberschreitung)", ENOTFOUND: "Adresse nicht gefunden (DNS)", ECONNREFUSED: "Verbindung abgelehnt", ECONNRESET: "Verbindung abgebrochen", "Invalid JSON": "Ungültige Antwort" },
      cause: "Ursache",
      slowCause: (ms) => `Antwortzeit ${ms} ms`,
      checksN: (n) => (n === 1 ? "1 fehlgeschlagene Prüfung" : `${n} fehlgeschlagene Prüfungen`),
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
      noData: "No data yet.",
      ledeUp: "Every Flowplan service is reachable and responding normally.",
      ledeDegraded: (n) => `${n} is responding more slowly than usual. Everything else is normal.`,
      ledeDown: (n) => `${n} is currently unreachable. The outage is being monitored automatically.`,
      ledeNoData: "The first automatic check has not run yet.",
      loadError: "The status could not be loaded. Trying again in a minute.",
      checked: (ago) => `Last checked ${ago}`,
      up: "Operational",
      degraded: "Slow",
      down: "Outage",
      unknown: "Unknown",
      outage: "Outage",
      slow: "Degraded performance",
      ongoing: "Ongoing",
      resolved: "Resolved",
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
      dur: { lt: "under 5 min", m: (n) => `${n} min`, h: (h, m) => (m ? `${h} h ${m} min` : `${h} h`), d: (d, h) => (h ? `${d} d ${h} h` : `${d} d`) },
      ago: { now: "just now", m: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} d ago` },
      checks: { database: "Database", storage: "File storage" },
      causes: { Timeout: "No response (timeout)", ENOTFOUND: "Address not found (DNS)", ECONNREFUSED: "Connection refused", ECONNRESET: "Connection reset", "Invalid JSON": "Invalid response" },
      cause: "Cause",
      slowCause: (ms) => `Response time ${ms} ms`,
      checksN: (n) => (n === 1 ? "1 failed check" : `${n} failed checks`),
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
  const RANK = { up: 0, degraded: 1, down: 2 };
  const PAGE = 12; // days shown in the timeline before "show older"

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  const dataUrl = params.get("data") || (local ? "data/status.json" : document.querySelector('meta[name="status-data"]').content);

  let config = null, data = null, failed = false, shownDays = PAGE;
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k);
    return n;
  };
  const name = (o) => (o ? o[lang] || o.de || o.en : "");
  const services = () => config.groups.flatMap((g) => g.services);
  const serviceById = (id) => services().find((s) => s.id === id);

  const fmtDate = (d, opts) => new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", opts).format(d);
  const fmtTime = (d) => fmtDate(d, { hour: "2-digit", minute: "2-digit" });
  const fmtPct = (p) => new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { style: "percent", minimumFractionDigits: p >= 0.99995 ? 0 : 2, maximumFractionDigits: 2 }).format(p);
  const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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

  // ---- hero ----------------------------------------------------------
  function renderHero() {
    const dot = $("hero-dot");
    if (!data || !Object.keys(data.services || {}).length) {
      dot.removeAttribute("data-s");
      $("headline-text").textContent = failed ? t().noData : t().noData;
      $("lede").textContent = failed ? t().loadError : t().ledeNoData;
      $("eyebrow").innerHTML = "&nbsp;";
      return;
    }
    const all = services().map((s) => ({ s, st: data.services[s.id]?.status || "up" }));
    const down = all.filter((x) => x.st === "down");
    const slow = all.filter((x) => x.st === "degraded");
    const list = (xs) => new Intl.ListFormat(lang === "de" ? "de-DE" : "en-GB", { type: "conjunction" }).format(xs.map((x) => name(x.s.name)));
    let s = "up", h = t().allUp, l = t().ledeUp;
    if (down.length) {
      s = "down";
      h = down.length === all.length ? t().allDown : t().someDown;
      l = t().ledeDown(list(down));
    } else if (slow.length) {
      s = "degraded";
      h = t().someDegraded;
      l = t().ledeDegraded(list(slow));
    }
    dot.dataset.s = s;
    $("headline-text").textContent = h;
    $("lede").textContent = failed ? t().loadError : l;
    $("eyebrow").textContent = t().checked(ago(data.updatedAt));
    $("eyebrow").title = fmtDate(new Date(data.updatedAt), { dateStyle: "full", timeStyle: "short" });
    document.title = s === "up" ? "Flowplan Status" : `${s === "down" ? "⚠ " : ""}${h.replace(/\.$/, "")} · Flowplan Status`;
  }

  function renderOngoing() {
    const box = $("ongoing");
    box.replaceChildren();
    const open = (data?.incidents || []).filter((i) => !i.end && serviceById(i.service));
    for (const i of open) {
      box.append(el("div", { class: "notice", "data-s": i.status },
        el("strong", { text: `${name(serviceById(i.service).name)}: ${i.status === "down" ? t().outage : t().slow}` }),
        el("span", { text: `${t().since(fmtTime(new Date(i.start)))} · ${duration(Date.now() - new Date(i.start))}${i.lastMessage ? ` · ${cause(i.lastMessage)}` : ""}` }),
      ));
    }
    box.hidden = !open.length;
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
      out.push({ key, date: d, ...(days[key] || { n: 0, down: 0, degraded: 0 }) });
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
        const st = cur?.status;
        const stats = dayStats(s.id, n);
        const total = stats.reduce((a, d) => a + d.n, 0);
        const bad = stats.reduce((a, d) => a + d.down, 0);
        const bars = el("div", { class: "bars", style: `--days:${n}`, role: "img", "aria-label": `${name(s.name)}: ${n} ${lang === "de" ? "Tage" : "days"}` });
        for (const d of stats) {
          const ds = !d.n ? null : d.down ? "down" : d.degraded ? "degraded" : "up";
          const bar = el("span", { class: "bar", "data-s": ds, tabindex: "-1" });
          bar.addEventListener("mouseenter", () => showTip(bar, s, d, ds));
          bar.addEventListener("mouseleave", hideTip);
          bars.append(bar);
        }
        const checks = cur?.checks && typeof cur.checks === "object"
          ? el("ul", { class: "subchecks" }, Object.entries(cur.checks).map(([k, v]) => el("li", { "data-s": v, text: t().checks[k] || k })))
          : null;
        card.append(el("div", { class: "service" },
          el("div", { class: "service-head" },
            el("div", {},
              el("h3", { class: "service-name", text: name(s.name) }),
              el("p", { class: "service-desc", text: name(s.description) }),
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
        ));
      }
      root.append(el("section", { class: "group" }, el("h2", { text: name(g.name) }), card));
    }
  }

  const tip = $("tip");
  function showTip(bar, s, d, ds) {
    const date = fmtDate(d.date, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });
    let line = t().noDataDay;
    if (ds) {
      const m = troubleMinutes(s.id, d.key);
      const parts = [];
      if (d.down) parts.push(t().dayDown(duration(m.down || 1)));
      if (d.degraded) parts.push(t().daySlow(duration(m.slow || 1)));
      line = parts.length ? parts.join(" · ") : t().dayUp;
      if (d.n) line += ` · ${fmtPct(1 - d.down / d.n)}`;
    }
    tip.replaceChildren(el("b", { text: date }), el("br"), line);
    tip.hidden = false;
    const r = bar.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8)}px`;
    tip.style.top = `${r.top - tip.offsetHeight - 8}px`;
  }
  function hideTip() { tip.hidden = true; }
  addEventListener("scroll", hideTip, { passive: true });

  // ---- timeline ----------------------------------------------------------
  function renderTimeline() {
    const list = $("timeline");
    list.replaceChildren();
    const incidents = (data?.incidents || []).filter((i) => serviceById(i.service));
    const byDay = new Map();
    for (const i of incidents) {
      const k = localDay(new Date(i.start));
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(i);
    }
    const days = [...byDay.keys()].sort().reverse();
    if (!days.length) {
      list.append(el("li", {}, el("p", { class: "t-empty", text: data?.updatedAt && Object.keys(data.days || {}).some((id) => Object.keys(data.days[id]).length >= 90) ? t().noIncidents : t().noIncidentsYet })));
    }
    for (const k of days.slice(0, shownDays)) {
      const items = byDay.get(k).sort((a, b) => b.start.localeCompare(a.start));
      const worst = items.reduce((w, i) => (RANK[i.status] > RANK[w] ? i.status : w), "up");
      const [y, m, d] = k.split("-").map(Number);
      list.append(el("li", { class: "t-day", "data-s": worst },
        el("p", { class: "t-date", text: fmtDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long", year: "numeric" }) }),
        el("div", { class: "t-items" }, items.map(renderIncident)),
      ));
    }
    const more = $("more");
    more.hidden = days.length <= shownDays;
  }
  function renderIncident(i) {
    const s = serviceById(i.service);
    const start = new Date(i.start), end = i.end ? new Date(i.end) : null;
    const span = end ? `${fmtTime(start)} – ${localDay(end) === localDay(start) ? fmtTime(end) : fmtDate(end, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : t().since(fmtTime(start));
    const dur = duration((end ? end : new Date()) - start);
    const causes = [...new Set([i.message, i.lastMessage].filter(Boolean).map(cause))].join(" → ");
    return el("article", { class: `incident${end ? "" : " live"}` },
      el("div", { class: "incident-head" },
        el("h3", { class: "incident-title", text: `${name(s.name)}: ${i.status === "down" ? t().outage : t().slow}` }),
        el("span", { class: "pill", "data-s": end ? "up" : i.status, text: end ? t().resolved : t().ongoing }),
      ),
      el("p", { class: "incident-meta", text: `${span} · ${dur}` }),
      causes ? el("p", { class: "incident-cause", text: `${t().cause}: ${causes} · ${t().checksN(i.failedChecks || 1)}` }) : null,
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
    renderOngoing();
    renderGroups();
    renderTimeline();
  }

  async function load() {
    try {
      if (!config) config = await (await fetch("services.json", { cache: "no-cache" })).json();
      const res = await fetch(`${dataUrl}${dataUrl.includes("?") ? "&" : "?"}t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
      failed = false;
    } catch {
      failed = true;
    }
    render();
  }
  let lastWide = dayCount();
  addEventListener("resize", () => { if (dayCount() !== lastWide) { lastWide = dayCount(); renderGroups(); } });
  applyLang();
  load();
  setInterval(load, 60_000);
  setInterval(() => data && renderHero(), 20_000);
})();
