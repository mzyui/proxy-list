/**
 * Output formatting: txt (backward compatible), json, csv, plus filtered
 * per-country / per-anonymity files and a stats summary.
 * @module core/formatter
 */

'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const { fromRepoRoot } = require('../utils/paths');

const CSV_HEADER = 'ip,port,type,country,anonymity,source,last_checked,response_time_ms';

/**
 * Group proxies by protocol type.
 * @param {import('./types').Proxy[]} proxies Proxy records.
 * @returns {Record<string, import('./types').Proxy[]>} Map of type to proxies.
 */
function groupByType(proxies) {
  /** @type {Record<string, import('./types').Proxy[]>} */
  const groups = { http: [], socks4: [], socks5: [] };
  for (const p of proxies) {
    // `https` proxies are HTTP proxies that support CONNECT — keep the txt
    // layout backward compatible by folding them into http.txt.
    const bucket = p.type === 'https' ? 'http' : p.type;
    (groups[bucket] = groups[bucket] || []).push(p);
  }
  return groups;
}

/**
 * Escape a value for CSV.
 * @param {unknown} value Cell value.
 * @returns {string} CSV-safe cell.
 */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Write a file via a stream, awaiting full flush (handles backpressure).
 * @param {string} filePath Destination path.
 * @param {Iterable<string>} chunks Content chunks.
 * @returns {Promise<void>} Resolves when the file is closed.
 */
async function writeStream(filePath, chunks) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const out = fs.createWriteStream(filePath, { encoding: 'utf8' });
  try {
    await pipeline(Readable.from(chunks), out);
  } finally {
    if (!out.closed) out.destroy();
  }
}

/**
 * Generator of `ip:port` lines.
 * @param {import('./types').Proxy[]} proxies Proxy records.
 * @yields {string} One line per proxy.
 */
function* txtLines(proxies) {
  for (const p of proxies) yield `${p.ip}:${p.port}\n`;
}

/**
 * Generator of CSV rows including the header.
 * @param {import('./types').Proxy[]} proxies Proxy records.
 * @yields {string} CSV lines.
 */
function* csvLines(proxies) {
  yield `${CSV_HEADER}\n`;
  for (const p of proxies) {
    yield `${[
      p.ip,
      p.port,
      p.type,
      p.country,
      p.anonymity,
      p.source,
      p.last_checked,
      p.response_time_ms,
    ]
      .map(csvCell)
      .join(',')}\n`;
  }
}

/**
 * Build the JSON document for a set of proxies.
 * @param {import('./types').Proxy[]} proxies Proxy records.
 * @param {object} metadata Metadata block to embed.
 * @returns {{proxies: import('./types').Proxy[], metadata: object}} JSON payload.
 */
function jsonPayload(proxies, metadata) {
  return { proxies, metadata };
}

/**
 * Write one proxy set in a single format.
 *
 * @param {object} params Parameters.
 * @param {string} params.dir Destination directory.
 * @param {string} params.name Set name (`all`, `http`, `socks4`, `socks5`).
 * @param {import('./types').Proxy[]} params.list Proxies to serialize.
 * @param {'txt'|'json'|'csv'} params.format Output format.
 * @param {object} params.settings Global settings.
 * @param {string} params.now ISO timestamp used in JSON metadata.
 * @returns {Promise<string>} Path of the file written.
 */
async function writeSet({ dir, name, list, format, settings, now }) {
  const file = path.join(dir, `${name}.${format}`);

  if (format === 'txt') {
    await writeStream(file, txtLines(list));
    return file;
  }
  if (format === 'csv') {
    await writeStream(file, csvLines(list));
    return file;
  }

  const payload = jsonPayload(list, {
    type: name,
    total: list.length,
    last_updated: now,
    validated: settings.validation.enabled,
  });
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(
    file,
    JSON.stringify(payload, null, settings.output.prettyJson ? 2 : 0),
    'utf8'
  );
  return file;
}

/**
 * Write all output artifacts.
 *
 * Two distinct surfaces are produced, deliberately without overlap:
 *
 * - **Repository root** — `output.rootFormats` (default `txt`). These are the
 *   legacy `all.txt` / `http.txt` / `socks4.txt` / `socks5.txt` paths that the
 *   historical raw GitHub URLs point at. They are a public contract.
 * - **`outputDir`** — `output.formats` (default `json`, `csv`) plus the filtered
 *   `by-country/` and `by-anonymity/` views and `stats.json`.
 *
 * Listing the same format in both would commit an identical ~540 KB payload
 * twice on every run, which bloats git history for no benefit. Overlaps are
 * therefore skipped in `outputDir` and reported in the return value only once.
 *
 * @param {object} params Parameters.
 * @param {import('./types').Proxy[]} params.proxies Final proxy list.
 * @param {object} params.settings Global settings.
 * @param {object} params.stats Run statistics (provider reports, totals).
 * @param {string} [params.rootDir] Repository root to publish into. Defaults to
 *   the real repository root (resolved from this file, not from `cwd`). Tests
 *   pass a temporary directory here.
 * @returns {Promise<string[]>} Paths of the files written.
 */
async function writeOutputs({ proxies, settings, stats, rootDir }) {
  const repoRoot = rootDir ? path.resolve(rootDir) : fromRepoRoot();
  const outDir = path.isAbsolute(settings.outputDir)
    ? settings.outputDir
    : path.join(repoRoot, settings.outputDir);
  const compatDir = path.isAbsolute(settings.outputDir) ? path.dirname(outDir) : repoRoot;

  const rootFormats = new Set(settings.publishToRoot ? settings.output.rootFormats || [] : []);
  // A format published at the root is never duplicated inside outputDir.
  const dirFormats = new Set(
    (settings.output.formats || []).filter((f) => !(rootFormats.has(f) && compatDir !== outDir))
  );

  const written = [];
  const now = new Date().toISOString();

  const groups = groupByType(proxies);
  const sets = { all: proxies, ...groups };

  for (const [name, list] of Object.entries(sets)) {
    for (const format of ['txt', 'json', 'csv']) {
      if (!dirFormats.has(format)) continue;
      written.push(await writeSet({ dir: outDir, name, list, format, settings, now }));
    }
  }

  // Filtered views. These only exist as plain lists and live exclusively in
  // outputDir, so they never collide with the root compatibility files.
  if (settings.output.byCountry) {
    /** @type {Map<string, import('./types').Proxy[]>} */
    const byCountry = new Map();
    for (const p of proxies) {
      if (!p.country) continue;
      const key = `${p.country.toLowerCase()}-${p.type === 'https' ? 'http' : p.type}`;
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key).push(p);
    }
    const top = [...byCountry.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, settings.output.maxCountryFiles);
    for (const [key, list] of top) {
      const file = path.join(outDir, 'by-country', `${key}.txt`);
      await writeStream(file, txtLines(list));
      written.push(file);
    }
  }

  if (settings.output.byAnonymity) {
    for (const level of ['elite', 'anonymous', 'transparent']) {
      const list = proxies.filter((p) => p.anonymity === level);
      if (!list.length) continue;
      const file = path.join(outDir, 'by-anonymity', `${level}.txt`);
      await writeStream(file, txtLines(list));
      written.push(file);
    }
  }

  // stats.json
  const statsFile = path.join(outDir, 'stats.json');
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf8');
  written.push(statsFile);

  // Backward compatibility: the historical raw GitHub URLs point at
  // `<repo>/all.txt` etc., so these lists must sit at the repository root even
  // though the scraper itself lives in `engine/`. When OUTPUT_DIR is an
  // absolute override (local experiments), they are published next to it
  // instead of touching the real repo root.
  for (const [name, list] of Object.entries(sets)) {
    for (const format of ['txt', 'json', 'csv']) {
      if (!rootFormats.has(format)) continue;
      written.push(await writeSet({ dir: compatDir, name, list, format, settings, now }));
    }
  }

  return written;
}

module.exports = {
  writeOutputs,
  writeSet,
  groupByType,
  csvCell,
  jsonPayload,
  txtLines,
  csvLines,
  CSV_HEADER,
};
