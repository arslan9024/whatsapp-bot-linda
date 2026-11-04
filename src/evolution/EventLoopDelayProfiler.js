/**
 * @file EventLoopDelayProfiler.js
 * @description Samples Node.js libuv event loop lag percentiles, detecting CPU-intensive synchronous blocks exceeding 50ms to maintain real-time chat responsiveness.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class EventLoopDelayProfiler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maxAcceptableLagMs = options.maxAcceptableLagMs || 50; // 50ms max lag threshold
    this.lagSamples = [];
  }

  /**
   * Records an event loop delay measurement.
   * @param {number} delayMs
   */
  recordLag(delayMs) {
    this.lagSamples.push(delayMs);
    if (this.lagSamples.length > 200) this.lagSamples.shift();
  }

  /**
   * Evaluates lag telemetry.
   * @returns {Object}
   */
  getLagSummary() {
    if (this.lagSamples.length === 0) {
      return { sampleCount: 0, meanLagMs: 0, isHealthy: true };
    }

    const maxLag = Math.max(...this.lagSamples);
    const meanLag = this.lagSamples.reduce((a, b) => a + b, 0) / this.lagSamples.length;
    const isDegraded = maxLag > this.maxAcceptableLagMs;

    return {
      sampleCount: this.lagSamples.length,
      meanLagMs: Number(meanLag.toFixed(2)),
      peakLagMs: maxLag,
      thresholdMs: this.maxAcceptableLagMs,
      isHealthy: !isDegraded,
      runtimeCondition: isDegraded ? 'EVENT_LOOP_PRESSURE_DETECTED' : 'EVENT_LOOP_PERFECT_FLUIDITY'
    };
  }
}

export default new EventLoopDelayProfiler();
