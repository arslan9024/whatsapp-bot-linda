/**
 * @file EventLoopLagMonitor.js
 * @description Measures Node.js event loop lag and synchronous thread blocking,
 * generating alerts when un-optimized synchronous code stalls message processing.
 * Category: Dev-ops / Tools
 */

export class EventLoopLagMonitor {
  constructor(config = {}) {
    this.thresholdMs = config.thresholdMs || 100; // Alert if lag > 100ms
    this.history = [];
    this.maxHistory = 60;
  }

  /**
   * Records an observed event loop delay
   * @param {number} lagMs
   * @returns {{ lagMs: number, status: 'NORMAL'|'BLOCKED', isWarning: boolean }}
   */
  recordSample(lagMs) {
    const isWarning = lagMs >= this.thresholdMs;
    const sample = {
      timestamp: new Date().toISOString(),
      lagMs,
      status: isWarning ? 'BLOCKED' : 'NORMAL'
    };

    this.history.push(sample);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return {
      lagMs,
      status: sample.status,
      isWarning
    };
  }

  /**
   * Computes moving average and 95th percentile lag
   * @returns {Object} Lag statistics
   */
  getLagStatistics() {
    if (this.history.length === 0) {
      return { avgLagMs: 0, p95LagMs: 0, totalSamples: 0 };
    }

    const values = this.history.map(s => s.lagMs).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avgLagMs = Math.round((sum / values.length) * 10) / 10;
    const p95Idx = Math.floor(values.length * 0.95);
    const p95LagMs = values[p95Idx] ?? values[values.length - 1];

    return {
      avgLagMs,
      p95LagMs,
      totalSamples: this.history.length
    };
  }
}

export default new EventLoopLagMonitor();

