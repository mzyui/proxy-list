/**
 * Path resolution.
 *
 * The scraper lives in `engine/` while its published artifacts must land at the
 * repository root (`all.txt`, `http.txt`, ...) so that the historical raw
 * GitHub URLs keep working. Everything here is resolved relative to this file,
 * never to `process.cwd()`, so the scraper behaves identically whether it is
 * started from the repo root, from `engine/`, or by a scheduler.
 *
 * @module utils/paths
 */

'use strict';

const path = require('path');

/** Absolute path of the `engine/` directory (the Node project root). */
const ENGINE_ROOT = path.resolve(__dirname, '..', '..');

/** Absolute path of the repository root — where the compatible `*.txt` live. */
const REPO_ROOT = path.resolve(ENGINE_ROOT, '..');

/**
 * Resolve a path that is meant to live at the repository root.
 *
 * Absolute inputs are returned untouched, so `OUTPUT_DIR=/tmp/out` still works
 * for local experiments.
 *
 * @param {...string} segments Path segments relative to the repository root.
 * @returns {string} Absolute path.
 */
function fromRepoRoot(...segments) {
  if (segments.length && path.isAbsolute(segments[0])) {
    return path.resolve(...segments);
  }
  return path.resolve(REPO_ROOT, ...segments);
}

/**
 * Resolve a path inside the `engine/` project directory.
 * @param {...string} segments Path segments relative to `engine/`.
 * @returns {string} Absolute path.
 */
function fromEngineRoot(...segments) {
  return path.resolve(ENGINE_ROOT, ...segments);
}

module.exports = { REPO_ROOT, ENGINE_ROOT, fromRepoRoot, fromEngineRoot };
