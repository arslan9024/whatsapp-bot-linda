/**
 * ====================================================================
 * PROCESS ERROR HANDLERS (Extracted from index.js — Phase 12)
 * ====================================================================
 * Installs global process.on('unhandledRejection') and
 * process.on('uncaughtException') guards that:
 *  - Filter non-critical Puppeteer / Protocol errors
 *  - Debounce noisy repeated errors (max 1 log per type per 10 s)
 *  - Write crash dumps to logs/crash-<timestamp>.json for post-mortem
 *
 * @since Phase 12 — February 14, 2026
 * @upgraded May 2026 — crash dumps, debounce, structured error ring-buffer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.join(__dirname, '../../logs');
const MAX_RECENT_ERRORS = 20; // ring buffer size

// ─── non-critical patterns ────────────────────────────────────────────
const NON_CRITICAL_ERROR_PATTERNS = [
  'Target closed',
  'Session closed',
  'Target.setAutoAttach',
  'Requesting main frame',
  'Requesting main frame too early',
  'Navigating frame was detached',
  'DevTools',
  'Protocol error',
  'browser is already running',
  'CHROME_EXECUTABLE_PATH',
  'page has been closed',
  'net::ERR_',           // network blips
  'ECONNRESET',
  'ETIMEDOUT',
];

/**
 * Returns true when the error message matches any known non-critical pattern.
 * @param {string} errorMsg
 * @returns {boolean}
 */
export function isNonCriticalError(errorMsg) {
  const lower = errorMsg.toLowerCase();
  return NON_CRITICAL_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

// ─── debouncer ───────────────────────────────────────────────────────
const _lastLoggedAt = new Map(); // errorKey → timestamp
const DEBOUNCE_MS = 10_000;      // max 1 log per error key per 10 s
const MAX_DEBOUNCE_KEYS = 500;   // prevent unbounded Map growth

function isDebouncedOut(key) {
  const last = _lastLoggedAt.get(key) || 0;
  if (Date.now() - last < DEBOUNCE_MS) return true;
  // Evict oldest key when at capacity to prevent memory leak
  if (_lastLoggedAt.size >= MAX_DEBOUNCE_KEYS) {
    const oldestKey = _lastLoggedAt.keys().next().value;
    _lastLoggedAt.delete(oldestKey);
  }
  _lastLoggedAt.set(key, Date.now());
  return false;
}

// ─── recent error ring buffer ────────────────────────────────────────
const _recentErrors = [];

function recordError(type, msg, stack) {
  _recentErrors.push({ type, msg, stack, ts: new Date().toISOString() });
  if (_recentErrors.length > MAX_RECENT_ERRORS) _recentErrors.shift();
}

/**
 * Returns the last N recorded errors (useful for `npm run doctor`).
 * @param {number} [n=10]
 * @returns {Array<{type, msg, stack, ts}>}
 */
export function getRecentErrors(n = 10) {
  return _recentErrors.slice(-n);
}

// ─── crash dump writer ───────────────────────────────────────────────
function writeCrashDump(type, error) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

    const ts = Date.now();
    const dumpPath = path.join(LOG_DIR, `crash-${ts}.json`);
    const mem = process.memoryUsage();

    const dump = {
      type,
      timestamp: new Date(ts).toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || null,
      memory: {
        heapUsedMB:  Math.round(mem.heapUsed  / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB:       Math.round(mem.rss       / 1024 / 1024),
      },
      recentErrors: getRecentErrors(5),
    };

    fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2), 'utf8');
    // Restrict permissions: crash dumps may contain credentials/tokens
    try { fs.chmodSync(dumpPath, 0o600); } catch { /* best effort on Windows */ }
    return dumpPath;
  } catch {
    return null;
  }
}

// ─── public installer ────────────────────────────────────────────────
/**
 * Install global process error handlers.
 * @param {Function} logBot - (msg, level) => void
 */
export function installProcessErrorHandlers(logBot) {
  process.on('unhandledRejection', (reason, _promise) => {
    const error    = reason instanceof Error ? reason : new Error(String(reason));
    const errorMsg = error.message;
    const key      = errorMsg.slice(0, 60); // debounce key

    if (isNonCriticalError(errorMsg)) {
      if (!isDebouncedOut(`nc:${key}`)) {
        logBot(`⚠️  Protocol Warning: ${errorMsg}`, 'warn');
      }
      return;
    }

    recordError('unhandledRejection', errorMsg, error.stack);

    if (!isDebouncedOut(`rej:${key}`)) {
      logBot(`❌ Unhandled Rejection: ${errorMsg}`, 'error');
      logBot('Bot will attempt to recover...', 'info');

      const dumpPath = writeCrashDump('unhandledRejection', error);
      if (dumpPath) logBot(`📄 Crash dump written: ${path.basename(dumpPath)}`, 'info');
    }
  });

  process.on('uncaughtException', (error) => {
    const errorMsg = error?.message || String(error);
    const key      = errorMsg.slice(0, 60);

    if (isNonCriticalError(errorMsg)) {
      if (!isDebouncedOut(`nc:${key}`)) {
        logBot(`⚠️  Browser Protocol Exception: ${errorMsg}`, 'warn');
      }
      return;
    }

    recordError('uncaughtException', errorMsg, error?.stack);

    // Always log fatal errors — no debounce, but write dump
    logBot(`❌ Uncaught Exception: ${errorMsg}`, 'error');
    logBot('Attempting graceful recovery...', 'info');

    const dumpPath = writeCrashDump('uncaughtException', error);
    if (dumpPath) logBot(`📄 Crash dump written: ${path.basename(dumpPath)}`, 'info');
  });
}
