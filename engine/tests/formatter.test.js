'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  groupByType,
  csvCell,
  txtLines,
  csvLines,
  jsonPayload,
  writeOutputs,
} = require('../src/core/formatter');

/**
 * Build a test proxy record.
 * @param {object} over Fields to override.
 * @returns {object} Proxy-shaped object.
 */
const mk = (over = {}) => ({
  ip: '1.2.3.4',
  port: 8080,
  type: 'http',
  country: 'US',
  anonymity: 'elite',
  source: 'test',
  last_checked: '2026-07-31T00:00:00.000Z',
  response_time_ms: 120,
  ...over,
});

describe('groupByType', () => {
  test('folds https into http for txt compatibility', () => {
    const groups = groupByType([mk({ type: 'https' }), mk({ type: 'socks5', port: 1080 })]);
    expect(groups.http).toHaveLength(1);
    expect(groups.socks5).toHaveLength(1);
    expect(groups.socks4).toHaveLength(0);
  });
});

describe('csvCell', () => {
  test('quotes when needed', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(5)).toBe('5');
  });
});

describe('line generators', () => {
  test('txtLines yields ip:port', () => {
    expect([...txtLines([mk()])]).toEqual(['1.2.3.4:8080\n']);
  });

  test('csvLines includes header', () => {
    const rows = [...csvLines([mk()])];
    expect(rows[0]).toMatch(/^ip,port,type/);
    expect(rows[1]).toContain('1.2.3.4,8080,http,US,elite,test');
  });

  test('jsonPayload shape', () => {
    const payload = jsonPayload([mk()], { total: 1 });
    expect(payload.proxies).toHaveLength(1);
    expect(payload.metadata.total).toBe(1);
  });
});

describe('writeOutputs', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-out-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('writes json/csv in output/ and txt at the repo root (no txt in output/)', async () => {
    const settings = {
      outputDir: 'output',
      publishToRoot: true,
      validation: { enabled: true },
      output: {
        formats: ['json', 'csv'],
        rootFormats: ['txt'],
        prettyJson: false,
        byCountry: true,
        byAnonymity: true,
        maxCountryFiles: 5,
      },
    };
    const proxies = [mk(), mk({ ip: '5.6.7.8', type: 'socks5', port: 1080, country: 'DE' })];

    await writeOutputs({ proxies, settings, stats: { working_total: 2 }, rootDir: dir });

    // Rich formats live only inside output/. The .txt counterpart is NOT there.
    expect(fs.existsSync(path.join(dir, 'output/all.txt'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'output/all.json'), 'utf8')).toContain('1.2.3.4');
    expect(fs.existsSync(path.join(dir, 'output/socks5.csv'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'output/by-country/us-http.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'output/by-anonymity/elite.txt'))).toBe(true);

    // The legacy txt surface is at the repo root, not duplicated in output/.
    expect(fs.readFileSync(path.join(dir, 'all.txt'), 'utf8')).toBe(
      '1.2.3.4:8080\n5.6.7.8:1080\n'
    );
    expect(fs.existsSync(path.join(dir, 'http.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'output/http.txt'))).toBe(false);

    const json = JSON.parse(fs.readFileSync(path.join(dir, 'output/all.json'), 'utf8'));
    expect(json.metadata.total).toBe(2);
    expect(json.proxies[0].ip).toBe('1.2.3.4');

    const stats = JSON.parse(fs.readFileSync(path.join(dir, 'output/stats.json'), 'utf8'));
    expect(stats.working_total).toBe(2);
  });

  test('does NOT duplicate a format listed in both rootFormats and formats', async () => {
    const settings = {
      outputDir: 'output',
      publishToRoot: true,
      validation: { enabled: false },
      output: {
        formats: ['txt', 'json'], // txt requested for output/ too
        rootFormats: ['txt'], // but also for the root
        prettyJson: false,
        byCountry: false,
        byAnonymity: false,
        maxCountryFiles: 0,
      },
    };

    await writeOutputs({ proxies: [mk()], settings, stats: {}, rootDir: dir });

    // txt is published once, at the root; output/ never gets a duplicate copy.
    expect(fs.existsSync(path.join(dir, 'all.txt'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'output/all.txt'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'all.txt'), 'utf8')).toBe('1.2.3.4:8080\n');
    // json has no root copy, so it stays only in output/.
    expect(fs.existsSync(path.join(dir, 'all.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'output/all.json'))).toBe(true);
  });

  test('publishes compatibility txt at the repo root, not inside output/', async () => {
    const settings = {
      outputDir: 'output',
      publishToRoot: true,
      validation: { enabled: false },
      output: {
        formats: ['json'],
        rootFormats: ['txt'],
        prettyJson: false,
        byCountry: false,
        byAnonymity: false,
        maxCountryFiles: 0,
      },
    };

    await writeOutputs({ proxies: [mk()], settings, stats: {}, rootDir: dir });

    // Backward-compatible raw URLs depend on these exact root paths.
    for (const name of ['all', 'http', 'socks4', 'socks5']) {
      expect(fs.existsSync(path.join(dir, `${name}.txt`))).toBe(true);
      expect(fs.existsSync(path.join(dir, `output/${name}.txt`))).toBe(false);
    }
    expect(fs.readFileSync(path.join(dir, 'http.txt'), 'utf8')).toBe('1.2.3.4:8080\n');
    expect(fs.readFileSync(path.join(dir, 'socks4.txt'), 'utf8')).toBe('');
  });

  test('is independent of process.cwd()', async () => {
    const settings = {
      outputDir: 'output',
      publishToRoot: true,
      validation: { enabled: false },
      output: {
        formats: ['json'],
        rootFormats: ['txt'],
        prettyJson: false,
        byCountry: false,
        byAnonymity: false,
        maxCountryFiles: 0,
      },
    };

    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-cwd-'));
    const previous = process.cwd();
    try {
      process.chdir(elsewhere);
      await writeOutputs({ proxies: [mk()], settings, stats: {}, rootDir: dir });
    } finally {
      process.chdir(previous);
    }

    expect(fs.existsSync(path.join(dir, 'all.txt'))).toBe(true);
    expect(fs.existsSync(path.join(elsewhere, 'all.txt'))).toBe(false);
    fs.rmSync(elsewhere, { recursive: true, force: true });
  });
});
