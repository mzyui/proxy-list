/**
 * Config loading + schema validation (joi) + environment overrides.
 * @module core/config
 */

'use strict';

const Joi = require('joi');
const providersRaw = require('./providers.json');
const settingsRaw = require('./settings.json');

const providerSchema = Joi.object({
  name: Joi.string().required(),
  _comment: Joi.string().optional(),
  enabled: Joi.boolean().default(true),
  type: Joi.string().valid('api', 'plaintext', 'web_scrape').required(),
  baseUrl: Joi.string().uri().optional(),
  timeout: Joi.number().integer().min(1000).max(120000).default(10000),
  retries: Joi.number().integer().min(1).max(10).default(3),
  maxPages: Joi.number().integer().min(1).max(500).default(10),
  rateLimit: Joi.object({ minIntervalMs: Joi.number().integer().min(0).default(1000) }).default(),
  endpoints: Joi.object().pattern(Joi.string(), Joi.string().uri()).optional(),
  sites: Joi.array()
    .items(Joi.object({ url: Joi.string().uri().required(), defaultType: Joi.string().required() }))
    .optional(),
  selectors: Joi.object().unknown(true).optional(),
});

const settingsSchema = Joi.object({
  outputDir: Joi.string().default('output'),
  publishToRoot: Joi.boolean().default(true),
  fetch: Joi.object({
    maxConcurrentProviders: Joi.number().integer().min(1).max(50).default(5),
    defaultTimeout: Joi.number().integer().min(1000).default(10000),
    defaultRetries: Joi.number().integer().min(1).default(3),
    defaultRateLimitMs: Joi.number().integer().min(0).default(1000),
  }).default(),
  validation: Joi.object({
    enabled: Joi.boolean().default(true),
    concurrency: Joi.number().integer().min(1).max(1000).default(50),
    timeoutMs: Joi.number().integer().min(1000).max(60000).default(8000),
    testUrl: Joi.string().uri().default('http://httpbin.org/ip'),
    maxProxies: Joi.number().integer().min(0).default(0),
    healthThreshold: Joi.number().integer().min(0).default(100),
  }).default(),
  output: Joi.object({
    // Formats written into `outputDir` (the rich data surface).
    formats: Joi.array().items(Joi.string().valid('txt', 'json', 'csv')).default(['json', 'csv']),
    // Formats published at the repository root (the legacy compatibility surface).
    // Keeping `txt` here and out of `formats` is what prevents the same list
    // being committed twice on every run.
    rootFormats: Joi.array().items(Joi.string().valid('txt', 'json', 'csv')).default(['txt']),
    prettyJson: Joi.boolean().default(false),
    byCountry: Joi.boolean().default(true),
    byAnonymity: Joi.boolean().default(true),
    maxCountryFiles: Joi.number().integer().min(0).default(30),
  }).default(),
});

/**
 * Parse a boolean environment variable.
 * @param {string|undefined} value Raw env value.
 * @param {boolean} fallback Value used when unset.
 * @returns {boolean} Parsed boolean.
 */
function envBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return !/^(0|false|no|off)$/i.test(value.trim());
}

/**
 * Parse an integer environment variable.
 * @param {string|undefined} value Raw env value.
 * @param {number} fallback Value used when unset/invalid.
 * @returns {number} Parsed integer.
 */
function envInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Load validated settings, applying environment overrides.
 * Supported env vars: VALIDATE, VALIDATION_CONCURRENCY, VALIDATION_TIMEOUT_MS,
 * MAX_PROXIES, OUTPUT_DIR, PROVIDER_CONCURRENCY, HEALTH_THRESHOLD.
 * @returns {object} Validated settings object.
 */
function loadSettings() {
  const { value, error } = settingsSchema.validate(settingsRaw, { abortEarly: false });
  if (error) throw new Error(`Invalid settings.json: ${error.message}`);

  value.outputDir = process.env.OUTPUT_DIR || value.outputDir;
  value.validation.enabled = envBool(process.env.VALIDATE, value.validation.enabled);
  value.validation.concurrency = envInt(
    process.env.VALIDATION_CONCURRENCY,
    value.validation.concurrency
  );
  value.validation.timeoutMs = envInt(process.env.VALIDATION_TIMEOUT_MS, value.validation.timeoutMs);
  value.validation.maxProxies = envInt(process.env.MAX_PROXIES, value.validation.maxProxies);
  value.validation.healthThreshold = envInt(
    process.env.HEALTH_THRESHOLD,
    value.validation.healthThreshold
  );
  value.fetch.maxConcurrentProviders = envInt(
    process.env.PROVIDER_CONCURRENCY,
    value.fetch.maxConcurrentProviders
  );
  return value;
}

/**
 * Load and validate provider configurations.
 * Set `PROVIDERS=name1,name2` to restrict the run to specific providers.
 * @returns {object[]} Enabled provider configs.
 */
function loadProviders() {
  const list = Array.isArray(providersRaw.providers) ? providersRaw.providers : [];
  const parsed = list.map((p) => {
    const { value, error } = providerSchema.validate(p, { abortEarly: false });
    if (error) throw new Error(`Invalid provider config "${p.name}": ${error.message}`);
    return value;
  });

  const only = (process.env.PROVIDERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return parsed.filter((p) => p.enabled && (only.length === 0 || only.includes(p.name)));
}

module.exports = { loadSettings, loadProviders, providerSchema, settingsSchema };
