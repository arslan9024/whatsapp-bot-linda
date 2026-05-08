/**
 * ====================================================================
 * LOGGER — Structured, levelled, file-persisted logging
 * ====================================================================
 *
 * Features:
 *  - Named loggers (new Logger('MyModule'))
 *  - Log levels: ERROR (0) < WARN (1) < INFO (2) < DEBUG (3)
 *  - Daily rotating log files: logs/bot-YYYY-MM-DD.log
 *  - File rotation at MAX_FILE_SIZE_BYTES (5 MB default)
 *  - Global min-level via LOG_LEVEL env var ('debug'|'info'|'warn'|'error')
 *  - Singleton `logger` for use without a named instance
 *  - Never crashes the bot — all file I/O is caught silently
 *
 * Usage:
 *   import { Logger, logger } from './Logger.js';
 *
 *   // named logger
 *   const log = new Logger('SessionManager');
 *   log.info('Session restored');
 *   log.error('Failed to restore session');
 *
 *   // global singleton (same API)
 *   logger.warn('Low memory');
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── constants ───────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../logs');
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LEVEL_LABELS = { 0: 'ERROR', 1: 'WARN ', 2: 'INFO ', 3: 'DEBUG' };
const LEVEL_ICONS  = { 0: '❌', 1: '⚠️ ', 2: 'ℹ️ ', 3: '🐛' };

function resolveMinLevel() {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[env] ?? LEVELS.info;
}

// ─── file writer (shared across all Logger instances) ─────────────────
let _currentLogPath = null;
let _lastDate = null;

function getLogPath() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (today !== _lastDate) {
    _lastDate = today;
    _currentLogPath = path.join(LOG_DIR, `bot-${today}.log`);
  }
  return _currentLogPath;
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotateIfNeeded(logPath) {
  try {
    if (!fs.existsSync(logPath)) return;
    const { size } = fs.statSync(logPath);
    if (size >= MAX_FILE_SIZE_BYTES) {
      const ts = Date.now();
      fs.renameSync(logPath, logPath.replace('.log', `-rotated-${ts}.log`));
    }
  } catch { /* best effort */ }
}

function writeToFile(line) {
  try {
    ensureLogDir();
    const logPath = getLogPath();
    rotateIfNeeded(logPath);
    fs.appendFileSync(logPath, line + '\n', 'utf8');
  } catch { /* never crash the bot because of logging */ }
}

// ─── Logger class ─────────────────────────────────────────────────────
class Logger {
  /**
   * @param {string} name  - Module name displayed in every log line
   */
  constructor(name = 'App') {
    this.name = name;
  }

  _log(level, message) {
    if (level > resolveMinLevel()) return;

    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const icon = LEVEL_ICONS[level];
    const label = LEVEL_LABELS[level];
    const prefix = `[${ts}] ${icon} [${this.name}]`;

    // Console output
    const consoleLine = `${prefix} ${message}`;
    if (level === 0) {
      console.error(consoleLine);
    } else {
      console.log(consoleLine);
    }

    // File output (plain text, no emoji artifacts from some terminals)
    const fileLine = `[${ts}] [${label}] [${this.name}] ${message}`;
    writeToFile(fileLine);
  }

  /** @param {string} message */
  error(message)   { this._log(0, message); }

  /** @param {string} message */
  warn(message)    { this._log(1, message); }

  /** @param {string} message */
  info(message)    { this._log(2, message); }

  /** @param {string} message */
  success(message) { this._log(2, `✅ ${message}`); }

  /** @param {string} message */
  debug(message)   { this._log(3, message); }

  /**
   * Time an async operation and log the duration.
   * @param {string}   label
   * @param {Function} fn    async () => any
   * @returns {Promise<any>}
   */
  async time(label, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      this._log(2, `${label} completed in ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      this._log(0, `${label} FAILED after ${Date.now() - start}ms — ${err.message}`);
      throw err;
    }
  }

  /**
   * Create a child logger with an extended name.
   * @param {string} subName
   * @returns {Logger}
   */
  child(subName) {
    return new Logger(`${this.name}:${subName}`);
  }
}

/** Global singleton — drop-in replacement for any `console.log` style use. */
const logger = new Logger('Bot');

export { Logger, logger };
export default Logger;
