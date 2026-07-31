/**
 * spys.one — ports are obfuscated with generated JS variables. Decoded with
 * the safe parser in {@link module:utils/safe-parse} instead of `eval()`.
 * @module providers/spysone
 */

'use strict';

const cheerio = require('cheerio');
const http = require('../utils/http-client');
const { parseSpysVars, decodeSpysPort } = require('../utils/safe-parse');
const { buildProxy, sanitizeString } = require('../utils/validators');

const PATHS = [
  'free-proxy-list',
  'anonymous-proxy-list',
  'http-proxy-list',
  'https-ssl-proxy',
  'socks-proxy-list',
];

/**
 * Scrape one spys.one page.
 * @param {string} url Page URL.
 * @param {object} config Provider configuration.
 * @returns {Promise<import('../core/types').Proxy[]>} Proxies from that page.
 */
async function scrapePage(url, config) {
  const opts = {
    timeout: config.timeout,
    retries: config.retries,
    rateLimitMs: config.rateLimit.minIntervalMs,
  };

  const first = await http.get(url, opts);
  const $first = cheerio.load(first);

  /** @type {Record<string,string>} */
  const form = {};
  $first('input').each((_, e) => {
    if (e.attribs?.name) form[e.attribs.name] = e.attribs.value ?? '';
  });
  form.xx0 = form.xx0 ?? '';
  form.xpp = '5'; // request the largest page size

  const html = await http.post(url, new URLSearchParams(form).toString(), {
    ...opts,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const $ = cheerio.load(html);

  /** @type {Record<string, number>} */
  let vars = {};
  $('script').each((_, el) => {
    const text = $(el).text();
    if (text.includes('=') && /\^/.test(text)) {
      vars = { ...vars, ...parseSpysVars(text) };
    }
  });

  const out = [];
  const rows = [...$('tr.spy1x').toArray(), ...$('tr.spy1xx').toArray()];
  for (const tr of rows) {
    const tds = $(tr).find('td').toArray();
    if (tds.length < 3) continue;

    const cellHtml = $(tds[0]).html() || '';
    const ip = sanitizeString($(tds[0]).text()).match(/(?:\d{1,3}\.){3}\d{1,3}/)?.[0];
    if (!ip) continue;

    const portExpr = cellHtml.split(/document\.write[^)]*\)/).pop() || cellHtml;
    const port = decodeSpysPort(portExpr, vars);
    if (!port) continue;

    const proxy = buildProxy({
      ip,
      port,
      type: sanitizeString($(tds[1]).text()) || 'http',
      country: sanitizeString($(tds[3]).text()),
      anonymity: sanitizeString($(tds[2]).text()),
      source: 'spysone',
    });
    if (proxy) out.push(proxy);
  }
  return out;
}

/**
 * Fetch proxies from all spys.one list pages.
 * @param {object} config Provider configuration.
 * @param {{logger: import('winston').Logger}} ctx Runtime context.
 * @returns {Promise<import('../core/types').Proxy[]>} Collected proxies.
 */
async function fetch(config, ctx) {
  const out = [];
  for (const path of PATHS) {
    const url = `https://spys.one/en/${path}/`;
    try {
      out.push(...(await scrapePage(url, config)));
    } catch (err) {
      ctx.logger.warn('spysone page failed', { url, message: err.message });
    }
  }
  return out;
}

module.exports = { name: 'spysone', fetch, scrapePage };
