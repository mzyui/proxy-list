/**
 * Configured HTTP client: timeouts, retries with exponential backoff,
 * per-host rate limiting and SSL verification always enabled.
 * @module utils/http-client
 */

'use strict';

const axios = require('axios');
const logger = require('./logger');

const DEFAULT_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** @type {Map<string, number>} host -> timestamp (ms) when the next request may start. */
const hostSchedule = new Map();

/**
 * Sleep helper.
 * @param {number} ms Milliseconds to sleep.
 * @returns {Promise<void>} Resolves after the delay.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until this host's rate-limit slot is free, then reserve the next slot.
 * @param {string} url Absolute request URL.
 * @param {number} minIntervalMs Minimum gap between requests to the same host.
 * @returns {Promise<void>} Resolves when the caller may proceed.
 */
async function throttle(url, minIntervalMs) {
  if (!minIntervalMs || minIntervalMs <= 0) return;
  let host;
  try {
    host = new URL(url).host;
  } catch {
    return;
  }
  const now = Date.now();
  const next = hostSchedule.get(host) || 0;
  const waitFor = Math.max(0, next - now);
  hostSchedule.set(host, Math.max(now, next) + minIntervalMs);
  if (waitFor > 0) await sleep(waitFor);
}

/**
 * Perform an HTTP request with retries and exponential backoff.
 *
 * SSL verification is never disabled. Failures are logged and rethrown after
 * the final attempt so callers can degrade gracefully.
 *
 * @param {object} options Request options.
 * @param {string} options.url Absolute URL.
 * @param {'get'|'post'} [options.method='get'] HTTP method.
 * @param {object} [options.data] Request body for POST.
 * @param {object} [options.headers] Extra headers.
 * @param {number} [options.timeout=10000] Per-attempt timeout in ms.
 * @param {number} [options.retries=3] Max attempts (including the first).
 * @param {number} [options.rateLimitMs=1000] Minimum gap between same-host requests.
 * @param {'text'|'json'} [options.responseType='text'] Expected payload type.
 * @returns {Promise<{status:number, data:any, headers:object}>} The response.
 * @throws {Error} When every attempt fails.
 */
async function request({
  url,
  method = 'get',
  data,
  headers = {},
  timeout = 10000,
  retries = 3,
  rateLimitMs = 1000,
  responseType = 'text',
}) {
  let lastError;
  for (let attempt = 1; attempt <= Math.max(1, retries); attempt++) {
    await throttle(url, rateLimitMs);
    try {
      const res = await axios({
        url,
        method,
        data,
        timeout,
        maxRedirects: 5,
        // Large text lists (some providers return several MB).
        maxContentLength: 64 * 1024 * 1024,
        maxBodyLength: 16 * 1024 * 1024,
        responseType: responseType === 'json' ? 'json' : 'text',
        transformResponse: responseType === 'json' ? undefined : [(d) => d],
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...headers,
        },
        validateStatus: (s) => s >= 200 && s < 400,
      });
      return { status: res.status, data: res.data, headers: res.headers };
    } catch (err) {
      lastError = err;
      const retriable =
        !err.response || err.response.status >= 500 || err.response.status === 429;
      logger.debug('http request failed', {
        url,
        attempt,
        status: err.response?.status ?? null,
        message: err.message,
      });
      if (!retriable || attempt === retries) break;
      await sleep(Math.min(30000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250));
    }
  }
  throw lastError || new Error(`request failed: ${url}`);
}

/**
 * Convenience GET returning the body only.
 * @param {string} url Absolute URL.
 * @param {object} [opts] Extra options for {@link request}.
 * @returns {Promise<any>} Response body.
 */
async function get(url, opts = {}) {
  const res = await request({ ...opts, url, method: 'get' });
  return res.data;
}

/**
 * Convenience POST returning the body only.
 * @param {string} url Absolute URL.
 * @param {object} data Form/JSON body.
 * @param {object} [opts] Extra options for {@link request}.
 * @returns {Promise<any>} Response body.
 */
async function post(url, data, opts = {}) {
  const res = await request({ ...opts, url, method: 'post', data });
  return res.data;
}

module.exports = { request, get, post, sleep, DEFAULT_UA };
