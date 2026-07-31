/**
 * Low level validation and sanitization helpers.
 * No network access, no side effects — safe to unit test.
 * @module utils/validators
 */

'use strict';

/** Strict IPv4 regex (no leading-zero octets longer than 3 digits). */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/** Supported proxy protocol identifiers. */
const VALID_TYPES = Object.freeze(['http', 'https', 'socks4', 'socks5']);

/** Anonymity levels we normalize to. */
const ANONYMITY_LEVELS = Object.freeze(['transparent', 'anonymous', 'elite']);

/**
 * Check whether a value is a syntactically valid IPv4 address.
 * @param {unknown} ip Candidate value.
 * @returns {boolean} True when `ip` is a valid dotted-quad IPv4 string.
 */
function isValidIp(ip) {
  return typeof ip === 'string' && IPV4_REGEX.test(ip.trim());
}

/**
 * Check whether a value is a valid TCP port number.
 * Accepts numbers or numeric strings.
 * @param {unknown} port Candidate value.
 * @returns {boolean} True when the port is an integer in [1, 65535].
 */
function isValidPort(port) {
  const n = typeof port === 'string' ? Number(port.trim()) : port;
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

/**
 * Check whether a value is a supported proxy type.
 * @param {unknown} type Candidate value.
 * @returns {boolean} True when the type is one of {@link VALID_TYPES}.
 */
function isValidType(type) {
  return typeof type === 'string' && VALID_TYPES.includes(type.trim().toLowerCase());
}

/**
 * Strip control characters and collapse whitespace in an untrusted string.
 * @param {unknown} value Raw scraped value.
 * @param {number} [maxLength=120] Maximum length of the returned string.
 * @returns {string} Sanitized string (possibly empty).
 */
function sanitizeString(value, maxLength = 120) {
  if (value === null || value === undefined) return '';
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalize a free-form protocol label into a canonical proxy type.
 * Examples: "HTTPS proxy" -> "https", "Socks 5" -> "socks5", "elite" -> null.
 * @param {unknown} raw Raw label from a provider.
 * @returns {string|null} Canonical type or null when unrecognized.
 */
function normalizeType(raw) {
  const s = sanitizeString(raw).toLowerCase().replace(/\s*proxy\s*/g, '').replace(/\s+/g, '');
  if (!s) return null;
  if (s.includes('socks5')) return 'socks5';
  if (s.includes('socks4')) return 'socks4';
  if (s.includes('socks')) return 'socks5';
  if (s.includes('https') || s === 'ssl' || s === 'yes') return 'https';
  if (s.includes('http')) return 'http';
  return null;
}

/**
 * Normalize a free-form anonymity label.
 * @param {unknown} raw Raw label from a provider.
 * @returns {string|null} One of {@link ANONYMITY_LEVELS} or null.
 */
function normalizeAnonymity(raw) {
  const s = sanitizeString(raw).toLowerCase();
  if (!s) return null;
  if (s.includes('elite') || s.includes('high')) return 'elite';
  if (/\bnon[- ]?anonymous\b/.test(s) || s.startsWith('non')) return 'transparent';
  if (s.includes('anonymous')) return 'anonymous';
  if (s.includes('transparent') || s.includes('none') || s.includes('no ')) return 'transparent';
  return null;
}

/**
 * Normalize a country code into a 2-letter uppercase ISO code.
 * @param {unknown} raw Raw country code or name fragment.
 * @returns {string|null} ISO-3166 alpha-2 code or null.
 */
function normalizeCountry(raw) {
  const s = sanitizeString(raw).toUpperCase();
  const m = s.match(/\b([A-Z]{2})\b/);
  return m ? m[1] : null;
}

/**
 * Build a validated, normalized proxy record.
 * Returns null when the input fails validation — callers should drop nulls.
 *
 * @param {object} input Raw proxy fields.
 * @param {string} input.ip IPv4 address.
 * @param {string|number} input.port TCP port.
 * @param {string} input.type Protocol label.
 * @param {string} [input.country] Country code/name.
 * @param {string} [input.anonymity] Anonymity label.
 * @param {string} [input.source] Provider name.
 * @returns {import('../core/types').Proxy|null} Normalized proxy or null.
 */
function buildProxy({ ip, port, type, country, anonymity, source }) {
  const cleanIp = sanitizeString(ip, 45).replace(/[^0-9.]/g, '');
  if (!isValidIp(cleanIp)) return null;

  const cleanPort = Number(String(port).replace(/[^0-9]/g, ''));
  if (!isValidPort(cleanPort)) return null;

  const cleanType = normalizeType(type);
  if (!cleanType || !isValidType(cleanType)) return null;

  return {
    ip: cleanIp,
    port: cleanPort,
    type: cleanType,
    country: normalizeCountry(country),
    anonymity: normalizeAnonymity(anonymity),
    source: sanitizeString(source, 40) || 'unknown',
    last_checked: null,
    response_time_ms: null,
  };
}

module.exports = {
  IPV4_REGEX,
  VALID_TYPES,
  ANONYMITY_LEVELS,
  isValidIp,
  isValidPort,
  isValidType,
  sanitizeString,
  normalizeType,
  normalizeAnonymity,
  normalizeCountry,
  buildProxy,
};
