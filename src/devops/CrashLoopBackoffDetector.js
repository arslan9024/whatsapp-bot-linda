/**
 * @file CrashLoopBackoffDetector.js
 * @description Detects rapid crash loop thrashing (e.g. consecutive startup failures)
 * and enforces escalating exponential backoff delays to prevent IP bans and CPU churn.
 * Category: Dev-ops / Tools
 */

export class CrashLoopBackoffDetector {
  constructor(config = {}) {
    this.windowMs = config.windowMs || 60000; // 1 minute window
    this.maxCrashesBeforeBackoff = config.maxCrashesBeforeBackoff || 3;
    this.baseBackoffSeconds = config.baseBackoffSeconds || 10;
    this.crashTimestamps = [];
  }

  /**
   * Records a crash/restart event and computes backoff delay
   * @param {number} [nowMs]
   * @returns {{ inCrashLoop: boolean, backoffSeconds: number, crashCount: number }}
   */
  recordCrash(nowMs = Date.now()) {
    this.crashTimestamps = this.crashTimestamps.filter(t => (nowMs - t) < this.windowMs);
    this.crashTimestamps.push(nowMs);

    const count = this.crashTimestamps.length;
    if (count >= this.maxCrashesBeforeBackoff) {
      const exponent = count - this.maxCrashesBeforeBackoff;
      const backoffSeconds = Math.min(300, this.baseBackoffSeconds * Math.pow(2, exponent));
      return {
        inCrashLoop: true,
        backoffSeconds,
        crashCount: count
      };
    }

    return {
      inCrashLoop: false,
      backoffSeconds: 0,
      crashCount: count
    };
  }

  /**
   * Resets the crash window after stable operation
   */
  reset() {
    this.crashTimestamps = [];
  }
}

export default new CrashLoopBackoffDetector();

