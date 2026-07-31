/**
 * Provider registry. Each module exports `{ name, fetch(config, ctx) }`.
 * @module providers
 */

'use strict';

/** @type {Record<string, {name: string, fetch: Function}>} */
const registry = {};

for (const mod of [
  require('./github-raw'),
  require('./proxyscrape'),
  require('./openproxylist'),
  require('./proxyscan'),
  require('./proxynova'),
  require('./free-proxy-list'),
  require('./freeproxy-world'),
  require('./proxylist-org'),
  require('./my-proxy'),
  require('./spysone'),
]) {
  registry[mod.name] = mod;
}

/**
 * Look up a provider implementation by config name.
 * @param {string} name Provider name from providers.json.
 * @returns {{name: string, fetch: Function}|null} The provider module or null.
 */
function getProvider(name) {
  return registry[name] || null;
}

module.exports = { registry, getProvider };
