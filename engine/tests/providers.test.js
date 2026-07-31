'use strict';

jest.mock('../src/utils/http-client');

const http = require('../src/utils/http-client');
const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };
const ctx = { logger };

const baseConfig = { timeout: 1000, retries: 1, rateLimit: { minIntervalMs: 0 }, maxPages: 2 };

beforeEach(() => jest.clearAllMocks());

describe('proxyscrape provider', () => {
  const provider = require('../src/providers/proxyscrape');

  test('parses plaintext endpoints', async () => {
    http.get.mockResolvedValue('1.2.3.4:8080\n5.6.7.8:1080\nbroken\n');
    const proxies = await provider.fetch(
      { ...baseConfig, endpoints: { http: 'https://example.com/http' } },
      ctx
    );
    expect(proxies).toHaveLength(2);
    expect(proxies[0]).toMatchObject({ ip: '1.2.3.4', port: 8080, type: 'http', source: 'proxyscrape' });
  });

  test('survives endpoint failure', async () => {
    http.get.mockRejectedValue(new Error('boom'));
    const proxies = await provider.fetch(
      { ...baseConfig, endpoints: { http: 'https://example.com/http' } },
      ctx
    );
    expect(proxies).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('proxynova provider', () => {
  const provider = require('../src/providers/proxynova');

  test('decodes obfuscated ips without eval', async () => {
    http.get.mockResolvedValue({
      data: [
        { ip: "'93.115.' + '25.14'", port: '8080', countryCode: 'ro', anonymity: 'elite' },
        { ip: 'garbage', port: '80' },
      ],
    });
    const proxies = await provider.fetch({ ...baseConfig, endpoints: { list: 'https://x/y' } }, ctx);
    expect(proxies).toHaveLength(1);
    expect(proxies[0]).toMatchObject({
      ip: '93.115.25.14',
      port: 8080,
      type: 'http',
      country: 'RO',
      anonymity: 'elite',
    });
  });
});

describe('free-proxy-list provider', () => {
  const provider = require('../src/providers/free-proxy-list');

  test('parses the shared table markup', async () => {
    http.get.mockResolvedValue(`
      <table class="table">
        <thead><tr><th>IP Address</th><th>Port</th><th>Code</th><th>Anonymity</th><th>Https</th></tr></thead>
        <tbody>
          <tr><td>1.2.3.4</td><td>3128</td><td>US</td><td>elite proxy</td><td>yes</td></tr>
          <tr><td>bad</td><td>3128</td><td>US</td><td>elite proxy</td><td>no</td></tr>
        </tbody>
      </table>`);

    const proxies = await provider.fetch(
      {
        ...baseConfig,
        sites: [{ url: 'https://free-proxy-list.net/', defaultType: 'http' }],
        selectors: { table: 'table.table' },
      },
      ctx
    );
    expect(proxies).toHaveLength(1);
    expect(proxies[0]).toMatchObject({
      ip: '1.2.3.4',
      port: 3128,
      type: 'https',
      country: 'US',
      anonymity: 'elite',
    });
  });
});

describe('github-raw provider', () => {
  const provider = require('../src/providers/github-raw');

  test('aggregates all sources and tolerates failures', async () => {
    http.get.mockImplementation(async (url) =>
      url.includes('socks5') ? '9.9.9.9:1080\n' : '1.1.1.1:80\n'
    );
    const proxies = await provider.fetch(baseConfig, ctx);
    expect(proxies.length).toBeGreaterThan(5);
    expect(proxies.every((p) => p.source === 'github-raw')).toBe(true);
  });
});

describe('geonode provider', () => {
  const provider = require('../src/providers/geonode');

  const page = (rows) => JSON.stringify({ data: rows });

  test('expands multi-protocol rows and keeps metadata', async () => {
    http.get
      .mockResolvedValueOnce(
        page([
          {
            ip: '1.2.3.4',
            port: '8080',
            protocols: ['http', 'socks5'],
            country: 'US',
            anonymityLevel: 'elite',
            latency: 1234.7,
          },
        ])
      )
      .mockResolvedValue(page([]));

    const proxies = await provider.fetch(baseConfig, ctx);

    expect(proxies).toHaveLength(2);
    expect(proxies[0]).toMatchObject({
      ip: '1.2.3.4',
      port: 8080,
      type: 'http',
      country: 'US',
      anonymity: 'elite',
      response_time_ms: 1235,
      source: 'geonode',
    });
    expect(proxies[1].type).toBe('socks5');
  });

  test('stops paging on the first empty page', async () => {
    http.get.mockResolvedValueOnce(page([])).mockResolvedValue(page([{ ip: '9.9.9.9', port: 1, protocols: ['http'] }]));
    const proxies = await provider.fetch(baseConfig, ctx);
    expect(proxies).toHaveLength(0);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  test('survives invalid JSON without throwing', async () => {
    http.get.mockResolvedValue('<html>rate limited</html>');
    const proxies = await provider.fetch(baseConfig, ctx);
    expect(proxies).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  test('skips rows with no protocols', async () => {
    http.get.mockResolvedValueOnce(page([{ ip: '1.2.3.4', port: 80, protocols: [] }])).mockResolvedValue(page([]));
    const proxies = await provider.fetch(baseConfig, ctx);
    expect(proxies).toEqual([]);
  });
});
