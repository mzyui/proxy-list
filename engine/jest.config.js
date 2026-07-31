'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/utils/**/*.js',
    'src/core/deduplicator.js',
    'src/core/formatter.js',
    'src/config/index.js',
  ],
  coverageThreshold: {
    global: { statements: 70, branches: 60, functions: 70, lines: 70 },
  },
};
