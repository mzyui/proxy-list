#!/usr/bin/env node
/**
 * Offline smoke check used by CI: every configured provider must load,
 * validate against the schema and have a matching implementation.
 * @module scripts/smoke-check
 */

'use strict';

const { loadSettings, loadProviders } = require('../src/config');
const { getProvider } = require('../src/providers');

const settings = loadSettings();
const providers = loadProviders();

if (!providers.length) {
  console.error('no enabled providers');
  process.exit(1);
}

for (const config of providers) {
  const impl = getProvider(config.name);
  if (!impl || typeof impl.fetch !== 'function') {
    console.error(`missing implementation for provider: ${config.name}`);
    process.exit(1);
  }
}

console.log(
  `ok: ${providers.length} providers, output=${settings.outputDir}, validate=${settings.validation.enabled}`
);
