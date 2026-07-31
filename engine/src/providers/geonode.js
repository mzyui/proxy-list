/**
 * proxylist.geonode.com public JSON API.
 *
 * Unlike the plaintext sources this endpoint returns rich metadata (country,
 * anonymity level, latency) which flows straight into the by-country and
 * by-anonymity output views. No API key is required.
 *
 * @module providers/geonode
 */

'use strict';

const http = require('../utils/http-client');
const { buildProxy } = require('../utils/validators');

const BASE = 'https://proxylist.geonode.com/api/proxy-list';
const PAGES = 3;
const LIMIT = 500;

/**
 * Fetch proxies from the GeoNode API.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];

  for (let page = 1; page <= PAGES; page += 1) {
    const url =
      `${BASE}?limit=${LIMIT}&page=${page}` +
      '&sort_by=lastChecked&sort_type=desc';

    let body;
    try {
      body = await http.get(url, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
    } catch (err) {
      ctx.logger.warn('geonode page failed', { page, message: err.message });
      continue;
    }

    let payload;
    try {
      payload = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (err) {
      ctx.logger.warn('geonode returned invalid JSON', { page, message: err.message });
      continue;
    }

    const rows = Array.isArray(payload && payload.data) ? payload.data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      // A single entry can advertise several protocols.
      const protocols = Array.isArray(row.protocols) && row.protocols.length ? row.protocols : [];
      for (const protocol of protocols) {
        const proxy = buildProxy({
          ip: row.ip,
          port: row.port,
          type: protocol,
          country: row.country,
          anonymity: row.anonymityLevel,
          responseTimeMs: Number.isFinite(row.latency) ? Math.round(row.latency) : undefined,
          source: 'geonode',
        });
        if (proxy) out.push(proxy);
      }
    }
  }

  return out;
}

module.exports = { name: 'geonode', fetch };
