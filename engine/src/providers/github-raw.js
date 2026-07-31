/**
 * GitHub raw plaintext proxy lists (several community repositories).
 * @module providers/github-raw
 */

'use strict';

const http = require('../utils/http-client');
const { parseProxyLines } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

const SOURCES = [
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', type: 'http' },
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', type: 'socks4' },
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', type: 'socks5' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', type: 'http' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt', type: 'socks4' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', type: 'socks5' },
  {
    url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks4/data.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt',
    type: 'socks5',
  },
  { url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', type: 'socks5' },
  {
    url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
    type: 'http',
  },

  // Verified 2026-07-31: each of the sources below was curl-tested and measured
  // for how many proxies it contributes that the sources above do not already
  // provide. Sources contributing 0% unique entries were deliberately left out
  // (clarketm/proxy-list, last commit 2023; iplocate all-proxies.txt, which just
  // concatenates the per-protocol files already listed here).
  {
    url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks4.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks5.txt',
    type: 'socks5',
  },
  {
    url: 'https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/http.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/https.txt',
    type: 'https',
  },
  {
    url: 'https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/socks4.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/iplocate/free-proxy-list/main/protocols/socks5.txt',
    type: 'socks5',
  },
  {
    url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/http.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks4.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks5.txt',
    type: 'socks5',
  },
  {
    url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
    type: 'https',
  },
  {
    url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4_RAW.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt',
    type: 'socks5',
  },
  {
    url: 'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/databay-labs/free-proxy-list/master/http.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/databay-labs/free-proxy-list/master/socks4.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/databay-labs/free-proxy-list/master/socks5.txt',
    type: 'socks5',
  },
  {
    url: 'https://raw.githubusercontent.com/VPSLabCloud/VPSLab-Free-Proxy-List/main/http_all.txt',
    type: 'http',
  },
  {
    url: 'https://raw.githubusercontent.com/VPSLabCloud/VPSLab-Free-Proxy-List/main/socks4_all.txt',
    type: 'socks4',
  },
  {
    url: 'https://raw.githubusercontent.com/VPSLabCloud/VPSLab-Free-Proxy-List/main/socks5_all.txt',
    type: 'socks5',
  },
];

/**
 * Fetch proxies from raw GitHub lists.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  const startedAt = Date.now();

  for (const src of SOURCES) {
    const srcStarted = Date.now();
    try {
      const body = await http.get(src.url, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
      const parsed = parseProxyLines(body);
      let added = 0;
      for (const { ip, port } of parsed) {
        const proxy = buildProxy({
          ip,
          port,
          type: src.type,
          anonymity: src.anonymity,
          source: 'github-raw',
        });
        if (proxy) {
          out.push(proxy);
          added += 1;
        }
      }
      ctx.logger.info('github-raw source fetched', {
        url: src.url,
        type: src.type,
        lines: parsed.length,
        accepted: added,
        durationMs: Date.now() - srcStarted,
      });
    } catch (err) {
      ctx.logger.warn('github-raw source failed', {
        url: src.url,
        message: err.message,
        durationMs: Date.now() - srcStarted,
      });
    }
  }

  ctx.logger.info('github-raw complete', {
    urls: SOURCES.length,
    total: out.length,
    durationMs: Date.now() - startedAt,
  });
  return out;
}

module.exports = { name: 'github-raw', fetch };
