/**
 * Provider orchestration: runs providers in parallel with a concurrency cap
 * and never lets a single failing provider abort the run.
 * @module core/scraper
 */

'use strict';

const pLimit = require('p-limit');
const logger = require('../utils/logger');
const { getProvider } = require('../providers');

/**
 * Run every configured provider and collect their proxies.
 *
 * @param {object[]} providerConfigs Validated provider configs.
 * @param {object} settings Global settings.
 * @returns {Promise<{proxies: import('./types').Proxy[], results: import('./types').ProviderResult[]}>}
 *   Collected proxies plus a per-provider report.
 */
async function scrapeAll(providerConfigs, settings) {
  const limit = pLimit(settings.fetch.maxConcurrentProviders);

  const tasks = providerConfigs.map((config) =>
    limit(async () => {
      const impl = getProvider(config.name);
      const started = Date.now();
      if (!impl) {
        logger.warn('no implementation for provider', { provider: config.name });
        return { name: config.name, ok: false, count: 0, durationMs: 0, error: 'not implemented', proxies: [] };
      }
      logger.info('provider start', { provider: config.name });
      try {
        const proxies = await impl.fetch(config, { logger });
        const durationMs = Date.now() - started;
        logger.info('provider done', { provider: config.name, count: proxies.length, durationMs });
        return { name: config.name, ok: true, count: proxies.length, durationMs, error: null, proxies };
      } catch (err) {
        const durationMs = Date.now() - started;
        logger.error('provider failed', { provider: config.name, message: err.message, durationMs });
        return { name: config.name, ok: false, count: 0, durationMs, error: err.message, proxies: [] };
      }
    })
  );

  const settled = await Promise.allSettled(tasks);

  /** @type {import('./types').Proxy[]} */
  const proxies = [];
  /** @type {import('./types').ProviderResult[]} */
  const results = [];

  for (const item of settled) {
    if (item.status !== 'fulfilled') {
      results.push({ name: 'unknown', ok: false, count: 0, durationMs: 0, error: String(item.reason) });
      continue;
    }
    const { proxies: got, ...report } = item.value;
    proxies.push(...got);
    results.push(report);
  }

  return { proxies, results };
}

module.exports = { scrapeAll };
