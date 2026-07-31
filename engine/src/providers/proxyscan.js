/**
 * proxyscan.io — HTML table plus per-protocol download endpoints.
 * SSL verification is enabled (the old implementation disabled it).
 * @module providers/proxyscan
 */

'use strict';

const http = require('../utils/http-client');
const { parseProxyLines } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from proxyscan.io.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  const base = config.baseUrl || 'https://www.proxyscan.io';

  for (const type of ['http', 'https', 'socks4', 'socks5']) {
    try {
      const body = await http.get(`${base}/download?type=${type}`, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
      for (const { ip, port } of parseProxyLines(body)) {
        const proxy = buildProxy({ ip, port, type, source: 'proxyscan' });
        if (proxy) out.push(proxy);
      }
    } catch (err) {
      ctx.logger.warn('proxyscan download failed', { type, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'proxyscan', fetch };
