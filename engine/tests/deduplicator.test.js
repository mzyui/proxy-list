'use strict';

const { deduplicate, proxyKey } = require('../src/core/deduplicator');

/**
 * Build a test proxy record.
 * @param {object} over Fields to override.
 * @returns {object} Proxy-shaped object.
 */
const mk = (over = {}) => ({
  ip: '1.2.3.4',
  port: 80,
  type: 'http',
  country: null,
  anonymity: null,
  source: 'a',
  last_checked: null,
  response_time_ms: null,
  ...over,
});

describe('deduplicate', () => {
  test('removes exact duplicates', () => {
    expect(deduplicate([mk(), mk(), mk()])).toHaveLength(1);
  });

  test('keeps distinct types on the same endpoint', () => {
    expect(deduplicate([mk({ type: 'http' }), mk({ type: 'socks5' })])).toHaveLength(2);
  });

  test('merges metadata from duplicates', () => {
    const [merged] = deduplicate([mk(), mk({ country: 'US', anonymity: 'elite' })]);
    expect(merged.country).toBe('US');
    expect(merged.anonymity).toBe('elite');
  });

  test('ignores nullish entries', () => {
    expect(deduplicate([null, undefined, mk()])).toHaveLength(1);
  });

  test('proxyKey format', () => {
    expect(proxyKey(mk())).toBe('http://1.2.3.4:80');
  });
});
