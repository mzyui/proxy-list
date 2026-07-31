# Architecture

## Repository layout

The repository root is the **published data surface**; all code lives in `engine/`.

```
/                          ← what consumers fetch
├── all.txt http.txt socks4.txt socks5.txt   ← legacy raw URLs (do not move)
├── output/                ← json, csv, by-country/, by-anonymity/, stats.json (NO .txt)
├── README.md  LICENSE  docs/
└── engine/                ← the Node project
    ├── package.json  eslint.config.js  jest.config.js
    ├── src/  tests/  scripts/
```

`engine/src/utils/paths.js` resolves `REPO_ROOT` from `__dirname`, never from
`process.cwd()`, so the scraper writes to the right place whether it is started
from the repo root, from `engine/`, or by a scheduler with an unrelated cwd.

## Pipeline

```
providers.json ─┐
settings.json ──┴─► config (joi validation + env overrides)
                          │
                          ▼
                   core/scraper.js ── p-limit(5) ──► providers/*.js ──► utils/http-client.js
                          │                                                (timeout, retry,
                          │                                                 per-host throttle,
                          ▼                                                 TLS always verified)
                 core/deduplicator.js   (type://ip:port key, metadata merge)
                          │
                          ▼
                  core/validator.js  ── p-limit(50) ──► real request through each proxy
                          │                              (http/https → HttpsProxyAgent,
                          │                               socks4/5 → SocksProxyAgent)
                          ▼
                  core/formatter.js  ──► output/{all,http,socks4,socks5}.{json,csv}
                          │              output/by-country/*.txt
                          │              output/by-anonymity/*.txt
                          │              output/stats.json
                          └────────────► ./{all,http,socks4,socks5}.txt  (backward compatible; the only .txt copies)
```

## Directory layout

| Path | Responsibility |
| --- | --- |
| `engine/src/index.js` | Entry point; orchestrates the whole run and emits `stats.json`. |
| `engine/src/config/` | `providers.json`, `settings.json`, joi schemas, env overrides. |
| `engine/src/core/scraper.js` | Runs providers concurrently; one failure never aborts the run. |
| `engine/src/core/deduplicator.js` | Removes duplicates, merges metadata across sources. |
| `engine/src/core/validator.js` | Live connectivity checks, records latency and timestamp. |
| `engine/src/core/formatter.js` | All output serialization and filtered views. |
| `engine/src/providers/*.js` | One module per source, each exporting `{ name, fetch(config, ctx) }`. |
| `engine/src/utils/http-client.js` | Axios wrapper: retries with exponential backoff, per-host rate limiting. |
| `engine/src/utils/safe-parse.js` | eval-free decoders for obfuscated provider payloads. |
| `engine/src/utils/validators.js` | IP/port/type validation, sanitization, `buildProxy()`. |
| `engine/src/utils/table.js` | Cheerio table extraction helpers. |
| `engine/src/utils/logger.js` | Winston logger (console + `output/logs/YYYY-MM-DD.log`). |
| `engine/scripts/` | `generate-readme.js`, `smoke-check.js`, `check-no-eval.js`. |

## Security model

Everything a provider returns is untrusted input.

- **No dynamic evaluation.** The original scraper called `eval()` on scraped
  strings in three places (proxynova IP fields and two spys.one port decoders).
  These are replaced by `parseObfuscatedIp`, `parseSpysVars` / `decodeSpysPort`
  and a bounded recursive-descent arithmetic parser (`safeArithmetic`) that only
  accepts digits, `+ - * / %` and parentheses. CI runs `engine/scripts/check-no-eval.js` over `src/` and `scripts/`.
- **TLS is always verified.** `rejectUnauthorized: false` was removed; no code
  path constructs a permissive HTTPS agent.
- **Whitelist validation.** `buildProxy()` strips everything but digits and dots
  from the IP, enforces a strict IPv4 regex, requires an integer port in
  `[1, 65535]` and a protocol from a fixed list. Strings are stripped of control
  characters and quote/angle-bracket characters and length-capped.
- **Bounded work.** Every provider has a `maxPages` cap, a request timeout and a
  retry ceiling, so a hostile or broken source cannot spin forever.
- **No secrets in code.** The workflow reads `secrets.FAILURE_WEBHOOK_URL` and
  uses the built-in `GITHUB_TOKEN` via `git-auto-commit-action`.

## Concurrency

Two independent `p-limit` pools:

- Providers: `settings.fetch.maxConcurrentProviders` (default 5).
- Validation: `settings.validation.concurrency` (default 50, CI uses 200).

`utils/http-client.js` additionally serialises requests per hostname with a
minimum interval (`rateLimit.minIntervalMs`), so raising provider concurrency
never turns into a burst against a single site.

## Error handling

- `Promise.allSettled` at both the provider and proxy-check level.
- Each provider catches per-URL failures and continues with the next source.
- Failures are logged with the provider name and surfaced in `stats.json`
  (`providers[].ok` / `.error`), so a silently dying source is visible.
- A health check warns (and can fail the run via `FAIL_ON_LOW_YIELD=1`) when the
  working-proxy count falls under `validation.healthThreshold`.

## Environment variables

| Variable | Effect |
| --- | --- |
| `VALIDATE` | `true` enables live validation (default: **off** — it is slow and drops ~95% of entries). |
| `VALIDATION_CONCURRENCY` | Parallel proxy checks. |
| `VALIDATION_TIMEOUT_MS` | Per-proxy timeout. |
| `MAX_PROXIES` | Validate at most N proxies (useful locally). |
| `PROVIDERS` | Comma-separated allowlist of provider names. |
| `PROVIDER_CONCURRENCY` | Parallel providers. |
| `OUTPUT_DIR` | Output directory, relative to the repo root (default `output`). Absolute paths are honoured as-is. |
| `HEALTH_THRESHOLD` | Minimum acceptable working-proxy count. |
| `FAIL_ON_LOW_YIELD` | `1` turns the health warning into a non-zero exit. |
| `LOG_LEVEL` | winston level (`debug`, `info`, `warn`, `error`). |
| `REPO_SLUG` | Used by `engine/scripts/generate-readme.js`. |
