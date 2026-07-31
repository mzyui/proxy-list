/**
 * Deduplication of proxy records.
 * @module core/deduplicator
 */

'use strict';

/**
 * Unique key for a proxy record.
 * @param {import('./types').Proxy} proxy Proxy record.
 * @returns {string} `type://ip:port`.
 */
function proxyKey(proxy) {
  return `${proxy.type}://${proxy.ip}:${proxy.port}`;
}

/**
 * Remove duplicate proxies, merging metadata from later duplicates into the
 * first occurrence (a later record may know the country while the first didn't).
 *
 * @param {import('./types').Proxy[]} proxies Raw proxy records.
 * @returns {import('./types').Proxy[]} Deduplicated records, order preserved.
 */
function deduplicate(proxies) {
  /** @type {Map<string, import('./types').Proxy>} */
  const seen = new Map();
  for (const proxy of proxies) {
    if (!proxy) continue;
    const key = proxyKey(proxy);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...proxy });
      continue;
    }
    existing.country = existing.country || proxy.country;
    existing.anonymity = existing.anonymity || proxy.anonymity;
  }
  return [...seen.values()];
}

module.exports = { deduplicate, proxyKey };
