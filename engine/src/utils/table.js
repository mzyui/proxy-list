/**
 * Cheerio helpers for extracting tabular proxy data.
 * @module utils/table
 */

'use strict';

const cheerio = require('cheerio');
const { sanitizeString } = require('./validators');

/**
 * Extract a table's header labels and row cells.
 *
 * @param {string} html Raw HTML document.
 * @param {string} selector CSS selector of the table.
 * @returns {{header: string[], rows: string[][]}} Header labels and row cells.
 */
function extractTable(html, selector) {
  const $ = cheerio.load(html || '');
  const table = $(selector).first();

  const header = table
    .find('thead th, thead td')
    .toArray()
    .map((e) => sanitizeString($(e).text()));

  const rowScope = table.find('tbody tr').length ? table.find('tbody tr') : table.find('tr');
  const rows = rowScope
    .toArray()
    .map((tr) =>
      $(tr)
        .find('td, th')
        .toArray()
        .map((td) => sanitizeString($(td).text()))
    )
    .filter((cells) => cells.length > 1);

  return { header, rows };
}

/**
 * Find the index of the first header whose label matches any candidate.
 * @param {string[]} header Header labels.
 * @param {string[]} candidates Lowercase substrings to look for.
 * @returns {number} Matching index, or -1.
 */
function headerIndex(header, candidates) {
  return header.findIndex((h) => {
    const label = String(h).toLowerCase();
    return candidates.some((c) => label.includes(c));
  });
}

module.exports = { extractTable, headerIndex };
