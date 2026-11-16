# Flowplan Status

Status page for all Flowplan services: the web app, API, MCP server, push relay, website, marketplace,
downloads and documentation. Live at https://yannicschuller.github.io/flowplan-status/

## How it works

- `services.json` lists the services and what a healthy answer looks like.
- `.github/workflows/check.yml` runs `scripts/check.mjs` every 5 minutes on
  GitHub Actions. Each failed check is retried once; a service that still
  fails (or answers slower than 4 s) opens an incident, the first successful
  check closes it.
- Results live in `status.json` on the `status-data` branch (a single commit
  that is replaced on every run, so `main` stays clean): current state,
  per-day counters for the 90-day bars and incidents of the last 365 days.
- The page (`index.html`, `app.js`, `style.css`) is static, has no build step
  and reads that file. Incidents appear automatically in the timeline.

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
