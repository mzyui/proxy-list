# Data format / "API"

There is no server — the repository is the API. Fetch the raw files from GitHub.

Base URL:

```
https://raw.githubusercontent.com/mzyui/proxy-list/main
```

## Endpoints

| Path | Format | Contents |
| --- | --- | --- |
| `/all.txt` | text | Every working proxy, `ip:port` per line |
| `/http.txt` | text | HTTP + HTTPS proxies |
| `/socks4.txt` | text | SOCKS4 proxies |
| `/socks5.txt` | text | SOCKS5 proxies |
| `/output/all.json` | JSON | Full records with metadata |
| `/output/{http,socks4,socks5}.json` | JSON | Per-protocol records |
| `/output/{all,http,socks4,socks5}.csv` | CSV | Same data, spreadsheet friendly |
| `/output/stats.json` | JSON | Run statistics and per-provider health |
| `/output/by-country/{cc}-{type}.txt` | text | e.g. `us-http.txt`, `de-socks5.txt` |
| `/output/by-anonymity/{level}.txt` | text | `elite.txt`, `anonymous.txt`, `transparent.txt` |

Updated every 3 hours. Cache locally; do not poll faster than that.

## `*.txt`

One proxy per line, no header, LF line endings:

```
203.0.113.10:8080
198.51.100.7:1080
```

This format is unchanged from v1 and will not break.

Note: HTTPS-capable proxies are included in `http.txt` (they are HTTP proxies
that support `CONNECT`). Use the JSON output if you need to tell them apart.

## `*.json`

```json
{
  "proxies": [
    {
      "ip": "203.0.113.10",
      "port": 8080,
      "type": "http",
      "country": "US",
      "anonymity": "elite",
      "source": "proxyscrape",
      "last_checked": "2026-07-31T04:32:22.039Z",
      "response_time_ms": 705
    }
  ],
  "metadata": {
    "type": "all",
    "total": 1,
    "last_updated": "2026-07-31T04:32:38.000Z",
    "validated": true
  }
}
```

### Proxy fields

| Field | Type | Notes |
| --- | --- | --- |
| `ip` | string | IPv4, always validated |
| `port` | number | integer `1..65535` |
| `type` | string | `http` \| `https` \| `socks4` \| `socks5` |
| `country` | string \| null | ISO-3166 alpha-2, uppercase; `null` when the source did not say |
| `anonymity` | string \| null | `transparent` \| `anonymous` \| `elite` \| `null` |
| `source` | string | Provider the proxy came from |
| `last_checked` | string \| null | ISO-8601 UTC timestamp of the successful check |
| `response_time_ms` | number \| null | Latency measured during validation; `null` when validation was skipped |

Proxies are sorted by ascending `response_time_ms`, so the fastest come first.

JSON is minified by default (`output.prettyJson: false`) to keep file sizes down.

## `stats.json`

```json
{
  "last_updated": "2026-07-31T04:32:38.000Z",
  "duration_ms": 30213,
  "sources_checked": 9,
  "sources_ok": 8,
  "scraped_total": 22620,
  "unique_total": 13527,
  "working_total": 742,
  "validated": true,
  "by_type": { "http": 610, "socks4": 51, "socks5": 81 },
  "providers": [
    { "name": "proxyscrape", "ok": true, "count": 1639, "durationMs": 5684, "error": null }
  ]
}
```

`working_total` is `null` when the run was made without live validation
(the default; set `VALIDATE=true` to enable it). When validation is off,
`last_checked` is the aggregation timestamp and `response_time_ms` is `null`.
Use `providers[]` to spot a source that has silently started failing.

## Usage examples

```bash
# fastest 20 elite HTTP proxies
curl -s https://raw.githubusercontent.com/mzyui/proxy-list/main/output/http.json \
  | jq -r '.proxies[] | select(.anonymity=="elite") | "\(.ip):\(.port)"' | head -20
```

```python
import requests

data = requests.get(
    "https://raw.githubusercontent.com/mzyui/proxy-list/main/output/all.json"
).json()

fast_us = [
    p for p in data["proxies"]
    if p["country"] == "US" and (p["response_time_ms"] or 9999) < 1000
]
print(len(fast_us), "fast US proxies of", data["metadata"]["total"])
```

```js
const { proxies } = await (
  await fetch('https://raw.githubusercontent.com/mzyui/proxy-list/main/output/socks5.json')
).json();
const best = proxies[0]; // already sorted by latency
```

## Guarantees and caveats

- Free public proxies die constantly. A proxy verified at `last_checked` may be
  dead minutes later — always handle connection failures.
- `country` and `anonymity` come from the upstream source and are not verified.
- Field additions are possible; existing fields will not be renamed or removed
  without a major version bump.
