#!/usr/bin/env node
/**
 * Generate README.md from the latest run statistics.
 * Run after `npm run scrape`.
 * @module scripts/generate-readme
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { fromRepoRoot } = require('../src/utils/paths');

const REPO = process.env.REPO_SLUG || 'mzyui/proxy-list';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const outputDir = process.env.OUTPUT_DIR
  ? path.resolve(process.env.OUTPUT_DIR)
  : fromRepoRoot('output');

/**
 * Count non-empty lines in a file.
 * @param {string} file Path to a text file.
 * @returns {number} Line count (0 when the file is missing).
 */
function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Read stats.json produced by the scraper.
 * @returns {object} Stats object (possibly empty).
 */
function readStats() {
  try {
    return JSON.parse(fs.readFileSync(path.join(outputDir, 'stats.json'), 'utf8'));
  } catch {
    return {};
  }
}

const stats = readStats();
const counts = {
  all: countLines(fromRepoRoot('all.txt')),
  http: countLines(fromRepoRoot('http.txt')),
  socks4: countLines(fromRepoRoot('socks4.txt')),
  socks5: countLines(fromRepoRoot('socks5.txt')),
};

const updated = stats.last_updated || new Date().toISOString();
const validated = stats.validated
  ? 'yes — every listed proxy answered a live HTTP request'
  : 'no — the lists are aggregated and deduplicated, but not connection-tested';
const totalLabel = stats.validated ? 'Working proxies' : 'Total proxies';
const nameW = 16;
const numW = 8;
const pad = (s, w) => String(s).padEnd(w);
const padN = (n, w) => String(n).padStart(w);

const providers = Array.isArray(stats.providers) ? stats.providers : [];
const sourceTable = providers.length
  ? [
      '```',
      pad('source', nameW) + pad('raw', numW) + pad('unique', numW),
      pad('-'.repeat(nameW - 1), nameW) + pad('-'.repeat(numW - 1), numW) + pad('-'.repeat(numW - 1), numW),
      ...providers
        .slice()
        .sort((a, b) => (b.unique || 0) - (a.unique || 0))
        .map((p) => pad(p.name, nameW) + padN(p.count ?? 0, numW) + padN(p.unique ?? 0, numW)),
      '```',
    ].join('\n')
  : '';

const readme = `<div align="center">

# proxy-list

[![proxy-list](https://img.shields.io/static/v1?label=${REPO.split('/')[0]}&message=proxy-list&color=blue&logo=github)](https://github.com/${REPO} "Go to GitHub repo")
[![stars](https://img.shields.io/github/stars/${REPO}?style=social)](https://github.com/${REPO})
[![forks](https://img.shields.io/github/forks/${REPO}?style=social)](https://github.com/${REPO})

[![Proxy Updater](https://github.com/${REPO}/actions/workflows/auto-update.yml/badge.svg)](https://github.com/${REPO}/actions/workflows/auto-update.yml)
[![CI](https://github.com/${REPO}/actions/workflows/ci.yml/badge.svg)](https://github.com/${REPO}/actions/workflows/ci.yml)
![repo size](https://img.shields.io/github/repo-size/${REPO})
[![commit activity](https://img.shields.io/github/commit-activity/m/${REPO})](https://github.com/${REPO}/commits/main)
[![license](https://img.shields.io/github/license/${REPO})](LICENSE)

Free HTTP / SOCKS4 / SOCKS5 proxies, aggregated from ${stats.sources_checked ?? 'multiple'} public sources
and refreshed every 3 hours.

</div>

---

## Status

| Metric | Value |
| --- | --- |
| ${totalLabel} | **${counts.all}** |
| HTTP / HTTPS | ${counts.http} |
| SOCKS4 | ${counts.socks4} |
| SOCKS5 | ${counts.socks5} |
| Sources checked | ${stats.sources_checked ?? 'n/a'} (${stats.sources_ok ?? 'n/a'} healthy) |
| Live-checked | ${validated} |
| Last updated | ${updated} |

### Per-source contribution

${sourceTable}

## Download

\`\`\`bash
# plain IP:PORT lists (backward compatible)
curl -O ${RAW}/all.txt
curl -O ${RAW}/http.txt
curl -O ${RAW}/socks4.txt
curl -O ${RAW}/socks5.txt
\`\`\`

\`\`\`bash
# JSON with metadata (country, anonymity, latency, source)
curl -O ${RAW}/output/all.json
curl -O ${RAW}/output/stats.json

# CSV
curl -O ${RAW}/output/all.csv
\`\`\`

Filtered lists live under \`output/by-country/\` (e.g. \`us-http.txt\`) and
\`output/by-anonymity/\` (\`elite.txt\`, \`anonymous.txt\`, \`transparent.txt\`).

The legacy \`.txt\` lists live at the repository root; the \`output/\` directory
holds the richer \`json\`/\`csv\` formats plus the filtered views — the two surfaces
are intentionally non-overlapping so nothing is committed twice.

### Python

\`\`\`python
import requests

proxies = requests.get("${RAW}/http.txt").text.split()
r = requests.get("https://httpbin.org/ip",
                 proxies={"http": f"http://{proxies[0]}"}, timeout=10)
print(r.json())
\`\`\`

### Node.js

\`\`\`js
const res = await fetch('${RAW}/output/all.json');
const { proxies, metadata } = await res.json();
const fast = proxies.filter((p) => p.type === 'socks5' && p.response_time_ms < 1000);
console.log(fast.length, 'fast socks5 proxies of', metadata.total);
\`\`\`

## Proxy types

| Type | What it does | Notes |
| --- | --- | --- |
| **HTTP** | Forwards HTTP requests | May add \`X-Forwarded-For\`; use elite proxies for privacy |
| **HTTPS** | HTTP proxy supporting \`CONNECT\` tunnelling | Listed inside \`http.txt\` for compatibility |
| **SOCKS4** | TCP-level tunnel | No UDP, no authentication, no IPv6 |
| **SOCKS5** | TCP + UDP tunnel | Supports auth and IPv6; most flexible |

Anonymity levels: **transparent** (forwards your IP), **anonymous** (hides your IP
but advertises the proxy), **elite** (does neither).

## Fair use

- These are **public, free, third-party** proxies. Availability changes constantly.
- Please do not hammer the raw endpoints — the data only changes every 3 hours.
  Cache it locally instead of fetching per request.
- Never send credentials, personal data, or anything sensitive through a free proxy.
  The operator can read and modify unencrypted traffic.

## Development

All code lives in \`engine/\`; the repository root holds only published data.

\`\`\`bash
cd engine
npm ci
npm run lint
npm test
npm run scrape                                # writes to the repo root
VALIDATE=true MAX_PROXIES=200 npm run scrape  # opt in to live proxy checking
\`\`\`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ADDING_PROVIDERS.md](docs/ADDING_PROVIDERS.md)
and [docs/API.md](docs/API.md). Contributions welcome — read [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

This repository only aggregates proxy addresses that are already published publicly.
It is provided for research, testing and educational purposes. You are responsible for
complying with all applicable laws and with the terms of service of any site you access.
The maintainers do not operate these proxies and accept no liability for their use.

## License

[MIT](LICENSE)
`;

fs.writeFileSync(fromRepoRoot('README.md'), readme, 'utf8');
console.log(`README.md generated (${counts.all} proxies)`);
