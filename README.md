# Flowplan Status

[![Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fyannicschuller%2Fflowplan-status%2Fstatus-data%2Fbadge.json&cacheSeconds=300)](https://status.flowplan.org)

Status page for all Flowplan services: the web app, API, MCP server, push relay, website, marketplace,
downloads and documentation. Live at https://status.flowplan.org

## How it works

- `services.json` lists the services and what a healthy answer looks like.
- `.github/workflows/check.yml` runs `scripts/check.mjs` every 5 minutes on
  GitHub Actions. Each failed check is retried once; a service that still
  fails (or answers slower than 4 s) opens an incident, the first successful
  check closes it.
- Every outage also opens a GitHub issue with the label `incident`, assigned
  to the repository owner, so GitHub notifies you. It closes itself when the
  service recovers. **Comments by the owner or collaborators on that issue
  appear as updates in the timeline** (everyone else's comments are ignored).
  Slow responses only get an issue after three slow checks in a row.
- Results live on the `status-data` branch (a single commit that is replaced
  on every run, so `main` stays clean).
- The page (`index.html`, `app.js`, `style.css`) is static, has no build step
  and reads that file. Incidents appear automatically in the timeline.

## Reliable 5-minute checks

GitHub's `schedule` trigger is best effort: runs are often late by 10–30
minutes or skipped. An external cron service therefore starts the workflow
every 5 minutes; the schedule stays as a fallback.

1. Create a fine-grained personal access token (GitHub → Settings →
   Developer settings → Fine-grained tokens): repository access *only*
   `yannicschuller/flowplan-status`, permission **Actions: Read and write**,
   nothing else.
2. In a cron service (e.g. cron-job.org) create a job running every 5 minutes:
   - `POST https://api.github.com/repos/yannicschuller/flowplan-status/actions/workflows/check.yml/dispatches`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
     `X-GitHub-Api-Version: 2022-11-28`, `Content-Type: application/json`
   - Body: `{"ref":"main"}`
   - Success is HTTP `204`.
3. Renew the token before it expires (the job then fails with `401`).

Overlapping runs are queued by the workflow's concurrency group, so a
schedule run and a dispatched run never write at the same time.

## Data / API

All files are public, CORS-enabled and at most about 10 minutes old:

| File | Contents |
| --- | --- |
| [`summary.json`](https://raw.githubusercontent.com/yannicschuller/flowplan-status/status-data/summary.json) | overall state (`operational`, `degraded`, `partial_outage`, `major_outage`, `maintenance`), each service, open incidents, upcoming maintenance – for status dots on other sites |
| [`status.json`](https://raw.githubusercontent.com/yannicschuller/flowplan-status/status-data/status.json) | everything the page shows: current state, per-day counters (90 days), incidents with updates (365 days) |
| [`latency.json`](https://raw.githubusercontent.com/yannicschuller/flowplan-status/status-data/latency.json) | response times: every check of the last 24 h, hourly `[checks, sum ms, max ms, failures]` for 7 days |
| [`badge.json`](https://raw.githubusercontent.com/yannicschuller/flowplan-status/status-data/badge.json) | shields.io endpoint for the badge above |

## Scheduled maintenance

Add an entry to `maintenance.json` on `main`:

```json
[
  {
    "id": "db-upgrade",
    "title": { "de": "Datenbank-Upgrade", "en": "Database upgrade" },
    "description": { "de": "Die App ist etwa 10 Minuten nur lesend erreichbar.", "en": "The app is read-only for about 10 minutes." },
    "start": "2026-11-20T22:00:00+01:00",
    "end": "2026-11-20T22:30:00+01:00",
    "services": ["app", "api"]
  }
]
```

It is announced on the page as soon as it is pushed. During the window,
failed checks of those services (all services if `services` is left out)
show as maintenance and neither open incidents nor count as downtime.
Afterwards it appears in the timeline as completed.

## Adding a service

Add an entry to `services.json`:

```json
{
  "id": "example",
  "name": { "de": "Beispiel", "en": "Example" },
  "description": { "de": "example.org", "en": "example.org" },
  "url": "https://example.org/health",
  "expect": [200],
  "json": { "status": "ok" }
}
```

`expect` are accepted HTTP status codes, `json` optional fields the response
body must contain. `slowMs` and `timeout` override the defaults.

## Running locally

```bash
node scripts/check.mjs data/status.json
python3 -m http.server 8000
```

On localhost the page reads `data/status.json`; `?data=<url>` points it at
any other file, `?lang=en` switches the language.

## Licence

Fonts: Instrument Sans and Instrument Serif, SIL Open Font License (see
`fonts/`).
