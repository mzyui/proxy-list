/**
 * my-proxy.com free list — `ip:port#CC` pairs embedded in the page text.
 * @module providers/my-proxy
 */

'use strict';

const http = require('../utils/http-client');
const { buildProxy } = require('../utils/validators');

/**
 * Fetch proxies from my-proxy.com.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  let html;
  try {
    html = await http.get('https://www.my-proxy.com/free-proxy-list.html', {
      timeout: config.timeout,
      retries: config.retries,
      rateLimitMs: config.rateLimit.minIntervalMs,
    });
  } catch (err) {
    ctx.logger.warn('my-proxy request failed', { message: err.message });
    return [];
  }

  const out = [];
  const re = /\b((?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})(?:#([A-Za-z]{2}))?/g;
  for (const m of html.matchAll(re)) {
    const proxy = buildProxy({
      ip: m[1],
      port: m[2],
      type: 'http',
      country: m[3],
      source: 'my-proxy',
    });
    if (proxy) out.push(proxy);
  }
  return out;
}

module.exports = { name: 'my-proxy', fetch };
