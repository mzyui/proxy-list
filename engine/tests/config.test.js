'use strict';

describe('config loader', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('loads and validates settings', () => {
    const { loadSettings } = require('../src/config');
    const s = loadSettings();
    expect(s.fetch.maxConcurrentProviders).toBeGreaterThan(0);
    expect(s.validation.testUrl).toMatch(/^https?:\/\//);
    expect(s.output.formats).toEqual(expect.arrayContaining(['json', 'csv']));
    expect(s.output.rootFormats).toEqual(expect.arrayContaining(['txt']));
  });

  test('environment overrides apply', () => {
    process.env.VALIDATE = 'false';
    process.env.VALIDATION_CONCURRENCY = '7';
    process.env.MAX_PROXIES = '25';
    const { loadSettings } = require('../src/config');
    const s = loadSettings();
    expect(s.validation.enabled).toBe(false);
    expect(s.validation.concurrency).toBe(7);
    expect(s.validation.maxProxies).toBe(25);
  });

  test('loads providers and honours PROVIDERS filter', () => {
    const { loadProviders } = require('../src/config');
    expect(loadProviders().length).toBeGreaterThan(3);

    process.env.PROVIDERS = 'proxyscrape';
    jest.resetModules();
    const { loadProviders: filtered } = require('../src/config');
    const list = filtered();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('proxyscrape');
    expect(list[0].timeout).toBeGreaterThan(0);
  });

  test('every configured provider has an implementation', () => {
    const { loadProviders } = require('../src/config');
    const { getProvider } = require('../src/providers');
    delete process.env.PROVIDERS;
    for (const p of loadProviders()) {
      expect(getProvider(p.name)).not.toBeNull();
      expect(typeof getProvider(p.name).fetch).toBe('function');
    }
  });
});
