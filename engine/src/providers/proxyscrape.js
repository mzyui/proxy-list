/**
 * proxyscrape.com public API (plain text lists per protocol).
 * @module providers/proxyscrape
 */

'use strict';

const http = require('../utils/http-client');
const { parseProxyLines } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from the proxyscrape API.
 * @param {object} config Provider configuration (uses `endpoints`).
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
        const proxy = buildProxy({ ip, port, type, source: 'proxyscrape' });
        if (proxy) out.push(proxy);
      }
    } catch (err) {
      ctx.logger.warn('proxyscrape endpoint failed', { type, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'proxyscrape', fetch };
