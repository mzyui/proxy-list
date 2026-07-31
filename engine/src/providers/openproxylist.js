/**
 * api.openproxylist.xyz plaintext lists.
 * @module providers/openproxylist
 */

'use strict';

const http = require('../utils/http-client');
const { parseProxyLines } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from openproxylist.
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
        const proxy = buildProxy({ ip, port, type, source: 'openproxylist' });
        if (proxy) out.push(proxy);
      }
    } catch (err) {
      ctx.logger.warn('openproxylist endpoint failed', { type, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'openproxylist', fetch };
