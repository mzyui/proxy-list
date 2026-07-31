/**
 * api.proxynova.com JSON list. The `ip` field is obfuscated; it is decoded
 * with {@link module:utils/safe-parse.parseObfuscatedIp} instead of `eval()`.
 * @module providers/proxynova
 */

'use strict';

const http = require('../utils/http-client');
const { parseObfuscatedIp } = require('../utils/safe-parse');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from proxynova.
 * @param {object} config Provider configuration (uses `endpoints.list`).
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const url = config.endpoints?.list || 'https://api.proxynova.com/proxylist';
  let payload;
  try {
    payload = await http.get(url, {
      timeout: config.timeout,
      retries: config.retries,
      rateLimitMs: config.rateLimit.minIntervalMs,
      responseType: 'json',
    });
  } catch (err) {
    ctx.logger.warn('proxynova request failed', { message: err.message });
    return [];
  }

  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const out = [];
  for (const row of rows) {
    const ip = parseObfuscatedIp(row?.ip);
    if (!ip) continue;
    const proxy = buildProxy({
      ip,
      port: row?.port,
      type: 'http',
      country: row?.countryCode,
      anonymity: row?.anonymity,
      source: 'proxynova',
    });
    if (proxy) out.push(proxy);
  }
  return out;
}

module.exports = { name: 'proxynova', fetch };
