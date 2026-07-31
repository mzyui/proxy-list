/**
 * Small formatting helpers for human-readable log lines and summaries.
 * @module utils/format
 */

'use strict';

/** Render a millisecond duration as a compact, readable string. */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m${rem.toString().padStart(2, '0')}s`;
}

/** Format an integer with thousands separators. */
function formatCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  return v.toLocaleString('en-US');
}

/**
 * Render a simple aligned text table (used for end-of-run summaries).
 * @param {string[]} headers Column headers.
 * @param {string[][]} rows Rows of cells.
 * @returns {string} A newline-joined table.
 */
function table(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length))
  );
  const line = (cells) =>
    cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [line(headers), sep, ...rows.map(line)].join('\n');
}

module.exports = { formatDuration, formatCount, table };
