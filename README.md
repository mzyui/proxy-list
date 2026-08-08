<div align="center">

# proxy-list

[![proxy-list](https://img.shields.io/static/v1?label=mzyui&message=proxy-list&color=blue&logo=github)](https://github.com/mzyui/proxy-list "Go to GitHub repo")
[![stars](https://img.shields.io/github/stars/mzyui/proxy-list?style=social)](https://github.com/mzyui/proxy-list)
[![forks](https://img.shields.io/github/forks/mzyui/proxy-list?style=social)](https://github.com/mzyui/proxy-list)

[![Proxy Updater](https://github.com/mzyui/proxy-list/actions/workflows/auto-update.yml/badge.svg)](https://github.com/mzyui/proxy-list/actions/workflows/auto-update.yml)
[![CI](https://github.com/mzyui/proxy-list/actions/workflows/ci.yml/badge.svg)](https://github.com/mzyui/proxy-list/actions/workflows/ci.yml)
![repo size](https://img.shields.io/github/repo-size/mzyui/proxy-list)
[![commit activity](https://img.shields.io/github/commit-activity/m/mzyui/proxy-list)](https://github.com/mzyui/proxy-list/commits/main)
[![license](https://img.shields.io/github/license/mzyui/proxy-list)](LICENSE)

Free HTTP / SOCKS4 / SOCKS5 proxies, aggregated from 10 public sources
and refreshed every 3 hours.

</div>

---

## Status

| Metric | Value |
| --- | --- |
| Total proxies | **92655** |
| HTTP / HTTPS | 49650 |
| SOCKS4 | 21418 |
| SOCKS5 | 21587 |
| Sources checked | 10 (10 healthy) |
| Live-checked | no — the lists are aggregated and deduplicated, but not connection-tested |
| Last updated | 2026-08-08T04:13:58.170Z |

### Per-source contribution

```
source          raw     unique  
--------------- ------- ------- 
github-raw        109255   92143
geonode             1500     331
free-proxy-list      900     103
proxylist-org        140      34
proxyscrape         1324      23
openproxylist      14864      11
my-proxy              70       7
proxynova              9       3
freeproxy-world        0       0
spysone                0       0
```

## Download

```bash
# plain IP:PORT lists (backward compatible)
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/all.txt
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/http.txt
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/socks4.txt
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/socks5.txt
```

```bash
# JSON with metadata (country, anonymity, latency, source)
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/output/all.json
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/output/stats.json

# CSV
curl -O https://raw.githubusercontent.com/mzyui/proxy-list/main/output/all.csv
```

Filtered lists live under `output/by-country/` (e.g. `us-http.txt`) and
`output/by-anonymity/` (`elite.txt`, `anonymous.txt`, `transparent.txt`).

The legacy `.txt` lists live at the repository root; the `output/` directory
holds the richer `json`/`csv` formats plus the filtered views — the two surfaces
are intentionally non-overlapping so nothing is committed twice.

### Python

```python
import requests

proxies = requests.get("https://raw.githubusercontent.com/mzyui/proxy-list/main/http.txt").text.split()
r = requests.get("https://httpbin.org/ip",
                 proxies={"http": f"http://{proxies[0]}"}, timeout=10)
print(r.json())
```

### Node.js

```js
const res = await fetch('https://raw.githubusercontent.com/mzyui/proxy-list/main/output/all.json');
const { proxies, metadata } = await res.json();
const fast = proxies.filter((p) => p.type === 'socks5' && p.response_time_ms < 1000);
console.log(fast.length, 'fast socks5 proxies of', metadata.total);
```

## Proxy types

| Type | What it does | Notes |
| --- | --- | --- |
| **HTTP** | Forwards HTTP requests | May add `X-Forwarded-For`; use elite proxies for privacy |
| **HTTPS** | HTTP proxy supporting `CONNECT` tunnelling | Listed inside `http.txt` for compatibility |
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

All code lives in `engine/`; the repository root holds only published data.

```bash
cd engine
npm ci
npm run lint
npm test
npm run scrape                                # writes to the repo root
VALIDATE=true MAX_PROXIES=200 npm run scrape  # opt in to live proxy checking
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/ADDING_PROVIDERS.md](docs/ADDING_PROVIDERS.md)
and [docs/API.md](docs/API.md). Contributions welcome — read [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

This repository only aggregates proxy addresses that are already published publicly.
It is provided for research, testing and educational purposes. You are responsible for
complying with all applicable laws and with the terms of service of any site you access.
The maintainers do not operate these proxies and accept no liability for their use.

## License

[MIT](LICENSE)
