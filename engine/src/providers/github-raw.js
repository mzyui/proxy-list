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
];

/**
 * Fetch proxies from raw GitHub lists.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  for (const src of SOURCES) {
    try {
      const body = await http.get(src.url, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
      for (const { ip, port } of parseProxyLines(body)) {
        const proxy = buildProxy({
          ip,
          port,
          type: src.type,
          anonymity: src.anonymity,
          source: 'github-raw',
        });
        if (proxy) out.push(proxy);
      }
    } catch (err) {
      ctx.logger.warn('github-raw source failed', { url: src.url, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'github-raw', fetch };
