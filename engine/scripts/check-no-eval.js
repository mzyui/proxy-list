#!/usr/bin/env node
/**
 * CI guard: fail if any dynamic code-execution sink appears in `src/`.
 * Comments and string literals mentioning eval() are ignored — only real
 * code is inspected.
 * @module scripts/check-no-eval
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOTS = ['src', 'scripts'];
const SINKS = [
  /(^|[^\w.$])eval\s*\(/,
  /new\s+Function\s*\(/,
  /(^|[^\w.$])(setTimeout|setInterval)\s*\(\s*['"`]/,
  /require\s*\(\s*['"]vm['"]\s*\)/,
  /rejectUnauthorized\s*:\s*false/,
];

/**
 * Strip comments and string literals from JavaScript source.
 * @param {string} src Raw source text.
 * @returns {string[]} Lines with comments/strings blanked out.
 */
function stripNonCode(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  let quote = '';

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (state === 'code') {
      if (c === '/' && next === '/') {
        state = 'line';
        out += '  ';
        i += 2;
        continue;
      }
      if (c === '/' && next === '*') {
        state = 'block';
        out += '  ';
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        state = 'string';
        quote = c;
        out += ' ';
        i++;
        continue;
      }
      out += c;
      i++;
      continue;
    }

    if (state === 'line') {
      if (c === '\n') state = 'code';
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }

    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code';
        out += '  ';
        i += 2;
        continue;
      }
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }

    // state === 'string'
    if (c === '\\') {
      out += '  ';
      i += 2;
      continue;
    }
    if (c === quote) {
      state = 'code';
      out += ' ';
      i++;
      continue;
    }
    out += c === '\n' ? '\n' : ' ';
    i++;
  }

  return out.split('\n');
}

/**
 * Recursively collect .js files under a directory.
 * @param {string} dir Directory to walk.
 * @returns {string[]} Absolute-ish file paths.
 */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  });
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = stripNonCode(fs.readFileSync(file, 'utf8'));
    lines.forEach((line, idx) => {
      for (const sink of SINKS) {
        if (sink.test(line)) violations.push(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
}

if (violations.length) {
  console.error('Forbidden dynamic-execution / insecure TLS pattern found:');
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
}

console.log(`ok: no eval/new Function/vm/insecure-TLS in ${ROOTS.join(', ')}`);
