/**
 * The "free-proxy-list" family of sites (free-proxy-list.net, sslproxies.org,
 * us-proxy.org, socks-proxy.net) which all share the same table markup.
 * @module providers/free-proxy-list
 */

'use strict';

const http = require('../utils/http-client');
const { extractTable, headerIndex } = require('../utils/table');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from every configured site.
 * @param {object} config Provider configuration (uses `sites`, `selectors`).
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  const selector = config.selectors?.table || 'table.table';

  for (const site of config.sites || []) {
    try {
      const html = await http.get(site.url, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
      const { header, rows } = extractTable(html, selector);

      const iIp = Math.max(0, headerIndex(header, ['ip address', 'ip']));
      const iPort = headerIndex(header, ['port']);
      const iCountry = headerIndex(header, ['code', 'country']);
      const iAnon = headerIndex(header, ['anonymity']);
      const iHttps = headerIndex(header, ['https']);
      const iVersion = headerIndex(header, ['version']);

      for (const cells of rows) {
        let type = site.defaultType;
        if (iVersion >= 0 && cells[iVersion]) type = cells[iVersion];
        else if (iHttps >= 0 && /yes/i.test(cells[iHttps] || '')) type = 'https';

        const proxy = buildProxy({
          ip: cells[iIp],
          port: cells[iPort >= 0 ? iPort : 1],
          type,
          country: iCountry >= 0 ? cells[iCountry] : null,
          anonymity: iAnon >= 0 ? cells[iAnon] : null,
          source: 'free-proxy-list',
        });
        if (proxy) out.push(proxy);
      }
    } catch (err) {
      ctx.logger.warn('free-proxy-list site failed', { url: site.url, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'free-proxy-list', fetch };
