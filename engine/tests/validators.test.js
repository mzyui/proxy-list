'use strict';

const {
  isValidIp,
  isValidPort,
  isValidType,
  sanitizeString,
  normalizeType,
  normalizeAnonymity,
  normalizeCountry,
  buildProxy,
} = require('../src/utils/validators');

describe('isValidIp', () => {
  test.each(['1.2.3.4', '255.255.255.255', '0.0.0.0', '192.168.1.1'])('accepts %s', (ip) => {
    expect(isValidIp(ip)).toBe(true);
  });

  test.each(['256.1.1.1', '1.2.3', '1.2.3.4.5', 'abc', '', null, undefined, '1.2.3.-4'])(
    'rejects %s',
    (ip) => {
      expect(isValidIp(ip)).toBe(false);
    }
  );
});

describe('isValidPort', () => {
  test.each([1, 80, 8080, 65535, '3128'])('accepts %s', (p) => expect(isValidPort(p)).toBe(true));
  test.each([0, -1, 65536, 1.5, 'abc', null, undefined, ''])('rejects %s', (p) =>
    expect(isValidPort(p)).toBe(false)
  );
});

describe('isValidType', () => {
  test('accepts known types', () => {
    for (const t of ['http', 'https', 'socks4', 'socks5']) expect(isValidType(t)).toBe(true);
  });
  test('rejects unknown', () => {
    expect(isValidType('ftp')).toBe(false);
    expect(isValidType(5)).toBe(false);
  });
});

describe('sanitizeString', () => {
  test('strips control chars and dangerous punctuation', () => {
    expect(sanitizeString('  <script>alert("x")</script> ')).toBe('scriptalert(x)/script');
  });
  test('collapses whitespace', () => {
    expect(sanitizeString('a \n\t b')).toBe('a b');
  });
  test('truncates', () => {
    expect(sanitizeString('x'.repeat(500), 10)).toHaveLength(10);
  });
  test('handles nullish', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });
});

describe('normalizeType', () => {
  test.each([
    ['HTTP proxy', 'http'],
    ['https', 'https'],
    ['Socks5', 'socks5'],
    ['SOCKS 4', 'socks4'],
    ['socks', 'socks5'],
    ['garbage', null],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeType(input)).toBe(expected);
  });
});

describe('normalizeAnonymity', () => {
  test.each([
    ['elite proxy', 'elite'],
    ['high anonymity', 'elite'],
    ['anonymous', 'anonymous'],
    ['transparent', 'transparent'],
    ['whatever', null],
  ])('%s -> %s', (input, expected) => expect(normalizeAnonymity(input)).toBe(expected));
});

describe('normalizeCountry', () => {
  test('extracts alpha-2', () => {
    expect(normalizeCountry('us United States')).toBe('US');
    expect(normalizeCountry('Germany')).toBe(null);
  });
});

describe('buildProxy', () => {
  test('builds a normalized record', () => {
    const p = buildProxy({
      ip: ' 1.2.3.4 ',
      port: '8080',
      type: 'HTTP proxy',
      country: 'us',
      anonymity: 'elite',
      source: 'test',
    });
    expect(p).toEqual({
      ip: '1.2.3.4',
      port: 8080,
      type: 'http',
      country: 'US',
      anonymity: 'elite',
      source: 'test',
      last_checked: null,
      response_time_ms: null,
    });
  });

  test('rejects bad ip/port/type', () => {
    expect(buildProxy({ ip: '999.1.1.1', port: 80, type: 'http' })).toBeNull();
    expect(buildProxy({ ip: '1.2.3.4', port: 0, type: 'http' })).toBeNull();
    expect(buildProxy({ ip: '1.2.3.4', port: 80, type: 'gopher' })).toBeNull();
  });

  test('defaults source to unknown', () => {
    expect(buildProxy({ ip: '1.2.3.4', port: 80, type: 'http' }).source).toBe('unknown');
  });
});

describe('buildProxy responseTimeMs', () => {
  const base = { ip: '1.2.3.4', port: 8080, type: 'http' };

  test('defaults to null when the source reports nothing', () => {
    expect(buildProxy(base).response_time_ms).toBeNull();
  });

  test('accepts and rounds a plausible latency', () => {
    expect(buildProxy({ ...base, responseTimeMs: 1234.7 }).response_time_ms).toBe(1235);
  });

  test('rejects negative, absurd and non-numeric latencies', () => {
    expect(buildProxy({ ...base, responseTimeMs: -5 }).response_time_ms).toBeNull();
    expect(buildProxy({ ...base, responseTimeMs: 999999999 }).response_time_ms).toBeNull();
    expect(buildProxy({ ...base, responseTimeMs: 'fast' }).response_time_ms).toBeNull();
    expect(buildProxy({ ...base, responseTimeMs: NaN }).response_time_ms).toBeNull();
  });
});
