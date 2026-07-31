# Adding a proxy provider

A provider is a module in `engine/src/providers/` that exports:

```js
module.exports = { name: 'my-source', fetch };
```

where `fetch(config, ctx)` resolves to an array of validated proxy records.

## 1. Write the module

```js
// engine/src/providers/my-source.js
'use strict';

const http = require('../utils/http-client');
const { parseProxyLines } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from my-source.
 * @param {object} config Provider configuration from providers.json.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  for (const [type, url] of Object.entries(config.endpoints || {})) {
    try {
      const body = await http.get(url, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
      for (const { ip, port } of parseProxyLines(body)) {
        const proxy = buildProxy({ ip, port, type, source: 'my-source' });
        if (proxy) out.push(proxy);   // buildProxy returns null on invalid input
      }
    } catch (err) {
      ctx.logger.warn('my-source endpoint failed', { type, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'my-source', fetch };
```

Rules:

- **Never throw for a single bad URL.** Catch, log via `ctx.logger`, continue.
  Throwing from `fetch` marks the whole provider failed in `stats.json`.
- **Always go through `buildProxy()`.** Never push a raw scraped object.
- **Always use `utils/http-client`.** It provides the timeout, retry/backoff,
  per-host throttling and the correct User-Agent. Do not import `axios` directly.
- **Never `eval` scraped content.** Add a decoder to `engine/src/utils/safe-parse.js`
  with unit tests instead.
- **Bound your loops** with `config.maxPages`.

## 2. Register it

`engine/src/providers/index.js`:

```js
for (const mod of [
  require('./github-raw'),
  require('./my-source'),   // ← add here
]) {
```

## 3. Configure it

`engine/src/config/providers.json`:

```json
{
  "name": "my-source",
  "enabled": true,
  "type": "plaintext",
  "timeout": 15000,
  "retries": 3,
  "rateLimit": { "minIntervalMs": 1000 },
  "endpoints": {
    "http": "https://example.com/http.txt",
    "socks5": "https://example.com/socks5.txt"
  }
}
```

`name` must match the module's `name`. `type` is one of `api`, `plaintext`,
`web_scrape`. Optional keys: `baseUrl`, `maxPages`, `sites`, `selectors`,
`_comment`. The joi schema in `src/config/index.js` rejects unknown keys — extend
it if you need a new field.

## 4. Scraping HTML tables

Use the helpers instead of hand-rolling cheerio:

```js
const { extractTable, headerIndex } = require('../utils/table');

const { header, rows } = extractTable(html, 'table.table');
const iPort = headerIndex(header, ['port']);
```

`headerIndex` matches on lowercase substrings and returns `-1` when absent, so
always guard before indexing.

## 5. Test it

Add a case to `engine/tests/providers.test.js` with the HTTP client mocked — CI must
never depend on a live third-party site:

```js
jest.mock('../src/utils/http-client');
const http = require('../src/utils/http-client');

http.get.mockResolvedValue('1.2.3.4:8080\n');
```

Cover at least: the happy path, a malformed row that must be dropped, and a
request failure that must not throw.

## 6. Verify locally

All commands run from `engine/`:

```bash
cd engine
npm run lint
npm test
PROVIDERS=my-source OUTPUT_DIR=/tmp/out npm run scrape
head /tmp/out/all.txt
```

Passing an absolute `OUTPUT_DIR` keeps the run away from the real repo-root
lists, so you can experiment without dirtying `all.txt`.

## Etiquette

Before adding a source, check its terms of service and `robots.txt`. Keep
`minIntervalMs` at 1000 ms or higher for HTML sites. If a source dies, set
`"enabled": false` and add a `_comment` explaining why rather than deleting it.
