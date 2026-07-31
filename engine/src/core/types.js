/**
 * Shared type definitions (JSDoc only — no runtime code).
 * @module core/types
 */

'use strict';

/**
 * @typedef {object} Proxy
 * @property {string} ip IPv4 address.
 * @property {number} port TCP port (1-65535).
 * @property {'http'|'https'|'socks4'|'socks5'} type Protocol.
 * @property {string|null} country ISO-3166 alpha-2 country code, if known.
 * @property {'transparent'|'anonymous'|'elite'|null} anonymity Anonymity level, if known.
 * @property {string} source Provider that supplied the proxy.
 * @property {string|null} last_checked ISO timestamp of the last successful check.
 * @property {number|null} response_time_ms Measured latency during validation.
 */

/**
 * @typedef {object} ProviderResult
 * @property {string} name Provider name.
 * @property {boolean} ok Whether the provider completed without throwing.
 * @property {number} count Number of valid proxies returned.
 * @property {number} durationMs Wall-clock duration.
 * @property {string|null} error Error message when `ok` is false.
 */

module.exports = {};
