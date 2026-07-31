/**
 * Safe replacements for the `eval()` calls that used to live in the scraper.
 * All functions here are pure and never execute untrusted code.
 * @module utils/safe-parse
 */

'use strict';

/**
 * Evaluate a *very* restricted arithmetic expression consisting only of
 * integers, `+ - * / %`, parentheses and whitespace.
 *
 * This replaces `eval()` for provider payloads such as spys.one's obfuscated
 * port arithmetic (`(a^b)+(c*d)` style becomes digit concatenation there, but
 * only `+ - * / %` and parens are ever needed).
 *
 * @param {string} expr Expression to evaluate.
 * @returns {number|null} The numeric result, or null when the expression is
 *   not a pure-arithmetic expression or cannot be evaluated.
 */
function safeArithmetic(expr) {
  if (typeof expr !== 'string') return null;
  const src = expr.trim();
  if (!src || src.length > 200) return null;
  if (!/^[0-9+\-*/%(). ]+$/.test(src)) return null;

  const tokens = src.match(/\d+(?:\.\d+)?|[+\-*/%()]/g);
  if (!tokens) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  /** @returns {number|null} Parsed primary (number, parenthesized expr, unary sign). */
  function primary() {
    const t = peek();
    if (t === undefined) return null;
    if (t === '(') {
      eat();
      const v = additive();
      if (peek() !== ')') return null;
      eat();
      return v;
    }
    if (t === '-' || t === '+') {
      eat();
      const v = primary();
      if (v === null) return null;
      return t === '-' ? -v : v;
    }
    if (/^\d/.test(t)) {
      eat();
      return Number(t);
    }
    return null;
  }

  /** @returns {number|null} Parsed `* / %` chain. */
  function multiplicative() {
    let left = primary();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = eat();
      const right = primary();
      if (right === null) return null;
      if ((op === '/' || op === '%') && right === 0) return null;
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }

  /** @returns {number|null} Parsed `+ -` chain. */
  function additive() {
    let left = multiplicative();
    if (left === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = eat();
      const right = multiplicative();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  const value = additive();
  if (value === null || pos !== tokens.length || !Number.isFinite(value)) return null;
  return value;
}

/**
 * Extract an IPv4 address from an obfuscated proxynova `ip` field.
 *
 * Historically this field was a JavaScript string-concatenation expression
 * (e.g. `"12.34." + "56.78"`) which the old code passed to `eval()`. We instead
 * pull every quoted literal out and join them, then verify the result.
 *
 * @param {unknown} raw Raw field value.
 * @returns {string|null} A dotted-quad IPv4 string, or null.
 */
function parseObfuscatedIp(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();

  // Plain address already.
  if (/^[0-9.]+$/.test(s)) return s;

  // Concatenated quoted literals: 'a' + "b" + 'c'
  const literals = [...s.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2] ?? '');
  if (literals.length) {
    const joined = literals.join('');
    if (/^[0-9.]+$/.test(joined) && joined.length) return joined;
  }

  // Fallback: first dotted-quad found anywhere in the string.
  const m = s.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return m ? m[0] : null;
}

/**
 * Resolve spys.one style variable assignments without `eval()`.
 *
 * The page ships `a=1;b=2;c=a^b;...` style scripts. We support integer
 * literals, references to previously defined variables and the `^` XOR
 * operator, which is all the site actually uses.
 *
 * @param {string} scriptText Raw `<script>` body.
 * @returns {Record<string, number>} Map of variable name to numeric value.
 */
function parseSpysVars(scriptText) {
  /** @type {Record<string, number>} */
  const vars = {};
  if (typeof scriptText !== 'string') return vars;

  for (const stmt of scriptText.split(';')) {
    const m = stmt.match(/^\s*([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*$/s);
    if (!m) continue;
    const [, name, rhs] = m;

    if (/^\d+$/.test(rhs)) {
      vars[name] = parseInt(rhs, 10);
      continue;
    }

    // `x^y` where each side is a literal or a known variable.
    const xor = rhs.match(/^([A-Za-z_$][\w$]*|\d+)\s*\^\s*([A-Za-z_$][\w$]*|\d+)$/);
    if (xor) {
      const resolve = (t) => (/^\d+$/.test(t) ? parseInt(t, 10) : vars[t]);
      const a = resolve(xor[1]);
      const b = resolve(xor[2]);
      if (Number.isInteger(a) && Number.isInteger(b)) vars[name] = a ^ b;
      continue;
    }

    // Pure arithmetic after substituting known variables.
    const substituted = rhs.replace(/[A-Za-z_$][\w$]*/g, (t) =>
      Number.isInteger(vars[t]) ? String(vars[t]) : '\u0000'
    );
    const value = safeArithmetic(substituted);
    if (value !== null) vars[name] = value;
  }
  return vars;
}

/**
 * Decode a spys.one obfuscated port expression such as
 * `"+(f^p)+(x^b)+..."` into the concatenated digit string.
 *
 * @param {string} expr The raw expression following the IP cell.
 * @param {Record<string, number>} vars Variable table from {@link parseSpysVars}.
 * @returns {string|null} The port digits, or null when undecodable.
 */
function decodeSpysPort(expr, vars) {
  if (typeof expr !== 'string') return null;
  const groups = expr.match(/\([^()]*\)/g);
  if (!groups || !groups.length) return null;

  const digits = [];
  for (const group of groups) {
    const m = group.match(/^\(\s*([A-Za-z_$][\w$]*|\d+)\s*\^\s*([A-Za-z_$][\w$]*|\d+)\s*\)$/);
    if (m) {
      const resolve = (t) => (/^\d+$/.test(t) ? parseInt(t, 10) : vars[t]);
      const a = resolve(m[1]);
      const b = resolve(m[2]);
      if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
      digits.push(String(a ^ b));
      continue;
    }
    const substituted = group.replace(/[A-Za-z_$][\w$]*/g, (t) =>
      Number.isInteger(vars[t]) ? String(vars[t]) : '\u0000'
    );
    const value = safeArithmetic(substituted);
    if (value === null) return null;
    digits.push(String(value));
  }
  const port = digits.join('');
  return /^\d{1,5}$/.test(port) ? port : null;
}

/**
 * Decode a base64 `ip:port` blob (used by proxy-list.org).
 * @param {string} b64 Base64 payload.
 * @returns {{ip:string, port:string}|null} Parsed pair or null.
 */
function decodeBase64Proxy(b64) {
  if (typeof b64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b64.trim())) return null;
  try {
    const decoded = Buffer.from(b64.trim(), 'base64').toString('utf8');
    const m = decoded.match(/^\s*((?:\d{1,3}\.){3}\d{1,3})\s*:\s*(\d{1,5})\s*$/);
    return m ? { ip: m[1], port: m[2] } : null;
  } catch {
    return null;
  }
}

/**
 * Extract every `ip:port` pair from a plain-text proxy list.
 * @param {string} text Raw body.
 * @returns {Array<{ip:string, port:string}>} Parsed pairs (unvalidated ranges).
 */
function parseProxyLines(text) {
  if (typeof text !== 'string') return [];
  return [...text.matchAll(/\b((?:\d{1,3}\.){3}\d{1,3})\s*:\s*(\d{1,5})\b/g)].map((m) => ({
    ip: m[1],
    port: m[2],
  }));
}

module.exports = {
  safeArithmetic,
  parseObfuscatedIp,
  parseSpysVars,
  decodeSpysPort,
  decodeBase64Proxy,
  parseProxyLines,
};
