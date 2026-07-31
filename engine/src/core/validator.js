/**
 * Live proxy validation: performs a real request through each proxy and keeps
 * only the ones that answer with HTTP 200 inside the timeout.
 * @module core/validator
 */

'use strict';

const axios = require('axios');
const pLimit = require('p-limit');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('../utils/logger');

/**
 * Build the appropriate agent for a proxy type.
 * @param {import('./types').Proxy} proxy Proxy record.
 * @returns {{httpAgent?: object, httpsAgent?: object, proxy: false}} Axios agent options.
 */
function agentsFor(proxy) {
  const authority = `${proxy.ip}:${proxy.port}`;
  if (proxy.type === 'socks4' || proxy.type === 'socks5') {
    const agent = new SocksProxyAgent(
      `${proxy.type === 'socks4' ? 'socks4' : 'socks5'}://${authority}`
    );
    return { httpAgent: agent, httpsAgent: agent, proxy: false };
  }
  const agent = new HttpsProxyAgent(`http://${authority}`);
  return { httpAgent: agent, httpsAgent: agent, proxy: false };
}

/**
 * Test a single proxy against the configured test URL.
 *
 * @param {import('./types').Proxy} proxy Proxy record (not mutated).
 * @param {object} options Validation options.
 * @param {string} options.testUrl Absolute URL to request through the proxy.
 * @param {number} options.timeoutMs Per-proxy timeout.
 * @returns {Promise<import('./types').Proxy|null>} Enriched proxy when alive, else null.
 */
async function checkProxy(proxy, { testUrl, timeoutMs }) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await axios.get(testUrl, {
      ...agentsFor(proxy),
      timeout: timeoutMs,
      signal: controller.signal,
      maxRedirects: 0,
      responseType: 'text',
      validateStatus: (s) => s === 200,
      headers: { 'User-Agent': 'proxy-list-checker/2.0' },
    });
    if (res.status !== 200) return null;
    return {
      ...proxy,
      last_checked: new Date().toISOString(),
      response_time_ms: Date.now() - started,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate a list of proxies concurrently.
 *
 * @param {import('./types').Proxy[]} proxies Candidates.
 * @param {object} config Validation settings (`concurrency`, `timeoutMs`, `testUrl`, `maxProxies`).
 * @returns {Promise<import('./types').Proxy[]>} Only the working proxies, with metadata filled in.
 */
async function validateAll(proxies, config) {
  const candidates = config.maxProxies > 0 ? proxies.slice(0, config.maxProxies) : proxies;
  const limit = pLimit(config.concurrency);
  let done = 0;
  let alive = 0;

  const tasks = candidates.map((proxy) =>
    limit(async () => {
      const result = await checkProxy(proxy, {
        testUrl: config.testUrl,
        timeoutMs: config.timeoutMs,
      });
      done++;
      if (result) alive++;
      if (done % 1000 === 0) {
        logger.info('validation progress', { checked: done, total: candidates.length, alive });
      }
      return result;
    })
  );

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => /** @type {import('./types').Proxy} */ (r.value));
}

module.exports = { validateAll, checkProxy, agentsFor };
