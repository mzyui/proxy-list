/**
 * freeproxy.world paginated HTML table.
 * @module providers/freeproxy-world
 */

'use strict';

const http = require('../utils/http-client');
const { extractTable, headerIndex } = require('../utils/table');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch paginated proxies from freeproxy.world.
 * @param {object} config Provider configuration (uses `maxPages`).
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  for (let page = 1; page <= config.maxPages; page++) {
    let html;
    try {
      html = await http.get(
        `https://freeproxy.world/?type=&anonymity=&country=&speed=&port=&page=${page}`,
        {
          timeout: config.timeout,
          retries: config.retries,
          rateLimitMs: config.rateLimit.minIntervalMs,
        }
      );
    } catch (err) {
      ctx.logger.warn('freeproxy-world page failed', { page, message: err.message });
      break;
    }

    const { header, rows } = extractTable(html, 'table');
    if (!rows.length) break;

    const iIp = Math.max(0, headerIndex(header, ['ip']));
    const iPort = headerIndex(header, ['port']);
    const iCountry = headerIndex(header, ['country']);
    const iType = headerIndex(header, ['type', 'protocol']);
    const iAnon = headerIndex(header, ['anonymity']);

    let added = 0;
    for (const cells of rows) {
      const proxy = buildProxy({
        ip: cells[iIp],
        port: cells[iPort >= 0 ? iPort : 1],
        type: iType >= 0 ? cells[iType] : 'http',
        country: iCountry >= 0 ? cells[iCountry] : null,
        anonymity: iAnon >= 0 ? cells[iAnon] : null,
        source: 'freeproxy-world',
      });
      if (proxy) {
        out.push(proxy);
        added++;
      }
    }
    if (added === 0) break;
  }
  return out;
}

module.exports = { name: 'freeproxy-world', fetch };
