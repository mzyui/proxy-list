/**
 * Structured logger (winston) with console + daily file transport.
 * @module utils/logger
 */

'use strict';

const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { fromRepoRoot } = require('./paths');

const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : fromRepoRoot('output', 'logs');

try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* logging must never crash the run */
}

const day = new Date().toISOString().slice(0, 10);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        ({ level, message, timestamp, ...meta }) =>
          `${timestamp} ${level} ${message}` +
          (Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '')
      )
    ),
  }),
];

try {
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, `${day}.log`),
      format: winston.format.json(),
    })
  );
} catch {
  /* read-only fs: console only */
}

/** @type {winston.Logger} */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true })),
  transports,
});

module.exports = logger;
module.exports.LOG_DIR = LOG_DIR;
