/**
 * ====================================================================
 * PROCESS ERROR HANDLERS (Extracted from index.js — Phase 12)
 * ====================================================================
 * Installs global process.on('unhandledRejection') and
 * process.on('uncaughtException') guards that stop non-critical
 * Puppeteer / Protocol errors from crashing the bot.
 *
 * @since Phase 12 — February 14, 2026
 */

// Patterns for non-critical protocol errors that should NOT crash the bot
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
];

/**
 * Returns true when the error message matches any known non-critical pattern.
 * @param {string} errorMsg
 * @returns {boolean}
 */
export function isNonCriticalError(errorMsg) {
  return NON_CRITICAL_ERROR_PATTERNS.some((pattern) =>
    errorMsg.toLowerCase().includes(pattern.toLowerCase()),
  );
}

/**
 * Install global process error handlers.
 * @param {Function} logBot - (msg, level) => void
 */
export function installProcessErrorHandlers(logBot) {
  process.on('unhandledRejection', (reason, _promise) => {
    const errorMsg = reason?.message || String(reason);

    if (isNonCriticalError(errorMsg)) {
      logBot(`⚠️  Protocol Warning: ${errorMsg}`, 'warn');
      return;
    }

    logBot(`❌ Unhandled Rejection: ${errorMsg}`, 'error');
    logBot('Bot will attempt to recover...', 'info');
  });

  process.on('uncaughtException', (error) => {
    const errorMsg = error?.message || String(error);

    if (isNonCriticalError(errorMsg)) {
      logBot(`⚠️  Browser Protocol Exception: ${errorMsg}`, 'warn');
      return;
    }

    logBot(`❌ Uncaught Exception: ${errorMsg}`, 'error');
    logBot('Attempting graceful recovery...', 'info');
  });
}
