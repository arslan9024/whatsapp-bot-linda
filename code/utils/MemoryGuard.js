/**
 * ====================================================================
 * MEMORY GUARD — Proactive memory monitoring & leak prevention
 * ====================================================================
 *
 * Monitors Node.js heap usage on a configurable interval and takes
 * graduated action when consumption climbs toward dangerous levels:
 *
 *   WARN  threshold (default 70 %) — emits a warning log
 *   HIGH  threshold (default 85 %) — requests a V8 GC cycle (if
 *         the process was started with --expose-gc, otherwise skips)
 *   CRIT  threshold (default 95 %) — emits an error log + calls the
 *         optional `onCritical` callback so the application can shed
 *         load or restart
 *
 * Usage:
 *   import memoryGuard from './MemoryGuard.js';
 *   memoryGuard.start();
 *
 *   // Or with custom options:
 *   new MemoryGuard({ warnPct: 75, critPct: 92, onCritical: () => process.exit(1) }).start();
 *
 * @since Wave-2 Reliability Upgrade — May 2026
 */

import { Logger } from './Logger.js';

const log = new Logger('MemoryGuard');

const MB = 1024 * 1024;

export class MemoryGuard {
  /**
   * @param {object}   [opts]
   * @param {number}   [opts.intervalMs=30000]   - Check interval in ms (default 30 s)
   * @param {number}   [opts.warnPct=70]         - % of heap limit → WARN
   * @param {number}   [opts.highPct=85]         - % of heap limit → attempt GC
   * @param {number}   [opts.critPct=95]         - % of heap limit → CRITICAL + callback
   * @param {Function} [opts.onCritical]         - Called when critPct exceeded: (stats) => void
   */
  constructor(opts = {}) {
    this.intervalMs  = opts.intervalMs  ?? 30_000;
    this.warnPct     = opts.warnPct     ?? 70;
    this.highPct     = opts.highPct     ?? 85;
    this.critPct     = opts.critPct     ?? 95;
    this.onCritical  = opts.onCritical  ?? null;

    this._timer      = null;
    this._gcAttempts = 0;
    this._critCount  = 0;
    this._lastStats  = null;
  }

  /** Start monitoring. Idempotent — calling twice is safe. */
  start() {
    if (this._timer) return this;
    this._timer = setInterval(() => this._check(), this.intervalMs);
    if (this._timer.unref) this._timer.unref(); // Don't block process exit
    log.info(`🛡️  MemoryGuard started (interval=${this.intervalMs / 1000}s, warn=${this.warnPct}%, high=${this.highPct}%, crit=${this.critPct}%)`);
    return this;
  }

  /** Stop monitoring. */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      log.info('🛡️  MemoryGuard stopped');
    }
    return this;
  }

  /**
   * Snapshot of the last memory reading.
   * @returns {{ heapUsedMB: number, heapTotalMB: number, rss: number, pct: number }|null}
   */
  lastStats() {
    return this._lastStats;
  }

  /** @private */
  _check() {
    const mem      = process.memoryUsage();
    const usedMB   = mem.heapUsed  / MB;
    const totalMB  = mem.heapTotal / MB;
    const rssMB    = mem.rss       / MB;
    const pct      = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

    this._lastStats = { heapUsedMB: usedMB, heapTotalMB: totalMB, rssMB, pct };

    if (pct >= this.critPct) {
      this._critCount++;
      log.error(
        `🚨 CRITICAL memory: ${usedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB (${pct}%) ` +
        `RSS=${rssMB.toFixed(1)} MB — occurrence #${this._critCount}`
      );
      this._tryGC();
      if (typeof this.onCritical === 'function') {
        try { this.onCritical(this._lastStats); } catch (_) { /* swallow */ }
      }
    } else if (pct >= this.highPct) {
      log.warn(
        `⚠️  High memory: ${usedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB (${pct}%) RSS=${rssMB.toFixed(1)} MB`
      );
      this._tryGC();
    } else if (pct >= this.warnPct) {
      log.warn(
        `💛 Memory warning: ${usedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB (${pct}%)`
      );
    } else {
      log.debug(`💚 Memory OK: ${usedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB (${pct}%)`);
    }
  }

  /** @private — Request V8 GC if available (--expose-gc flag). */
  _tryGC() {
    if (typeof global.gc === 'function') {
      this._gcAttempts++;
      try {
        global.gc();
        log.info(`♻️  GC requested (attempt #${this._gcAttempts})`);
      } catch (_) { /* ignore */ }
    }
  }

  /** Diagnostic summary string. */
  toString() {
    const s = this._lastStats;
    if (!s) return 'MemoryGuard[no reading yet]';
    return `MemoryGuard[${s.heapUsedMB.toFixed(1)}/${s.heapTotalMB.toFixed(1)} MB, ${s.pct}%]`;
  }
}

/** Singleton — import and call .start() in index.js */
const memoryGuard = new MemoryGuard({
  intervalMs: parseInt(process.env.MEMORY_GUARD_INTERVAL_MS) || 30_000,
  warnPct:    parseInt(process.env.MEMORY_GUARD_WARN_PCT)    || 70,
  highPct:    parseInt(process.env.MEMORY_GUARD_HIGH_PCT)    || 85,
  critPct:    parseInt(process.env.MEMORY_GUARD_CRIT_PCT)    || 95,
});

export default memoryGuard;
