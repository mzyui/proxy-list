#!/usr/bin/env node
/**
 * Entry point: scrape → deduplicate → validate → write outputs.
 * @module index
 */

'use strict';

const logger = require('./utils/logger');
const { loadSettings, loadProviders } = require('./config');
const { scrapeAll } = require('./core/scraper');
const { deduplicate } = require('./core/deduplicator');
const { validateAll } = require('./core/validator');
const { writeOutputs } = require('./core/formatter');

/**
 * Run one full update cycle.
 * @returns {Promise<object>} The stats object that was written to stats.json.
 */
async function run() {
  const startedAt = Date.now();
  const settings = loadSettings();
  const providers = loadProviders();

  logger.info('run start', {
    providers: providers.length,
    validate: settings.validation.enabled,
    outputDir: settings.outputDir,
  });

  const { proxies: scraped, results } = await scrapeAll(providers, settings);
  logger.info('scrape complete', { scraped: scraped.length });

  const unique = deduplicate(scraped);
  logger.info('deduplicated', { unique: unique.length, removed: scraped.length - unique.length });

  let final = unique;
  if (settings.validation.enabled) {
    const candidates =
      settings.validation.maxProxies > 0
        ? Math.min(unique.length, settings.validation.maxProxies)
        : unique.length;
    logger.info('validation start', {
      candidates,
      concurrency: settings.validation.concurrency,
    });
    final = await validateAll(unique, settings.validation);
    logger.info('validation complete', { working: final.length, checked: candidates });
  } else {
    const now = new Date().toISOString();
    final = unique.map((p) => ({ ...p, last_checked: now }));
  }

  final.sort((a, b) => (a.response_time_ms ?? 1e9) - (b.response_time_ms ?? 1e9));

  const stats = {
    last_updated: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    sources_checked: results.length,
    sources_ok: results.filter((r) => r.ok).length,
    scraped_total: scraped.length,
    unique_total: unique.length,
    working_total: settings.validation.enabled ? final.length : null,
    validated: settings.validation.enabled,
    by_type: final.reduce((acc, p) => {
      const key = p.type === 'https' ? 'http' : p.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    providers: results,
  };

  const written = await writeOutputs({ proxies: final, settings, stats });
  logger.info('outputs written', { files: written.length });

  const threshold = settings.validation.healthThreshold;
  if (settings.validation.enabled && threshold > 0 && final.length < threshold) {
    logger.warn('health check below threshold', { working: final.length, threshold });
    if (process.env.FAIL_ON_LOW_YIELD === '1') {
      throw new Error(`only ${final.length} working proxies (threshold ${threshold})`);
    }
  }

  logger.info('run complete', {
    total: final.length,
    durationMs: stats.duration_ms,
  });
  return stats;
}

if (require.main === module) {
  run().catch((err) => {
    logger.error('run failed', { message: err.message, stack: err.stack });
    process.exitCode = 1;
  });
}

module.exports = { run };
