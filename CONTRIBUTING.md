# Contributing

Thanks for helping improve proxy-list.

## Getting started

```bash
git clone https://github.com/mzyui/proxy-list.git
cd proxy-list/engine     # all code lives in engine/
npm ci
npm test
```

Node.js 20 LTS or newer is required.

**Layout:** the repository root holds only published data (`all.txt`, `output/`,
docs). The scraper is a self-contained Node project in `engine/`. Run every npm
command from `engine/`; the scraper still writes its output to the repo root so
the historical raw URLs keep working.

## Before opening a pull request

```bash
npm run lint            # ESLint must pass with zero warnings
npm test                # Jest, ≥70% coverage on the tested modules
npm run check:smoke     # config + provider registry load
npm run check:security  # no eval / new Function / vm / insecure TLS
```

Quick manual run (live validation is off by default):

```bash
PROVIDERS=proxyscrape OUTPUT_DIR=/tmp/out npm run scrape
```

To exercise the validator on a small sample:

```bash
VALIDATE=true MAX_PROXIES=200 PROVIDERS=proxyscrape OUTPUT_DIR=/tmp/out npm run scrape
```

## Ground rules

1. **Never use `eval`, `new Function`, `setTimeout(string)` or any other dynamic
   code execution** on scraped data. CI fails the build if `eval(` appears in `src/`.
   Use the helpers in `src/utils/safe-parse.js` instead.
2. **Never disable TLS verification.** No `rejectUnauthorized: false`.
3. **Validate everything.** All scraped values must pass through
   `buildProxy()` in `src/utils/validators.js` before being emitted.
4. **Be polite to sources.** Every provider honours `rateLimit.minIntervalMs`
   and a bounded `maxPages`. Do not remove those limits.
5. **Keep `*.txt` output backward compatible** — one `ip:port` per line, nothing
   else, and published at the **repository root**. The raw GitHub URLs
   (`.../main/all.txt`) are a public contract; never relocate those four files.
   Resolve paths with `src/utils/paths.js`, never with `process.cwd()`.
6. Add JSDoc to every exported function and a unit test for every pure helper.

## Adding a proxy source

See [docs/ADDING_PROVIDERS.md](docs/ADDING_PROVIDERS.md).

## Commit style

Conventional commits are preferred: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

## Reporting a security issue

Please open a private security advisory rather than a public issue if you find a
vulnerability (e.g. a code-execution path in a parser).
