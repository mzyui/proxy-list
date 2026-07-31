/**
 * proxy-list.org — rows carry a base64 encoded `ip:port` blob.
 * @module providers/proxylist-org
 */

'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http-client');
const { decodeBase64Proxy } = require('../utils/safe-parse');
const { buildProxy, sanitizeString } = require('../utils/validators');

/**
 * Fetch paginated proxies from proxy-list.org.
 * @param {object} config Provider configuration (uses `maxPages`).
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  for (let page = 1; page <= config.maxPages; page++) {
    let html;
    try {
      html = await http.get(`https://proxy-list.org/english/index.php?p=${page}`, {
        timeout: config.timeout,
        retries: config.retries,
        rateLimitMs: config.rateLimit.minIntervalMs,
      });
    } catch (err) {
      ctx.logger.warn('proxylist-org page failed', { page, message: err.message });
      break;
    }

    const $ = cheerio.load(html);
    const items = $('.table ul').toArray();
    if (!items.length) break;

    let added = 0;
    for (const ul of items) {
      const cells = $(ul)
        .find('li')
        .toArray()
        .map((li) => sanitizeString($(li).text()));
      const raw = $(ul).find('li').first().text();
      const b64 = raw.match(/['"]([A-Za-z0-9+/=]+)['"]/)?.[1];
      const pair = b64 ? decodeBase64Proxy(b64) : null;
      if (!pair) continue;

      const proxy = buildProxy({
        ip: pair.ip,
        port: pair.port,
        type: cells[1] || 'http',
        country: cells[4],
        anonymity: cells[2],
        source: 'proxylist-org',
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

module.exports = { name: 'proxylist-org', fetch };
