/**
 * @file LatencyAnomalyCanary.js
 * @description Tracks real-time p95 and p99 conversational latency percentiles, raising automated alerts when network or inference latency exceeds 2,500ms.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class LatencyAnomalyCanary {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.p99ThresholdMs = options.p99ThresholdMs || 2500;
  }

  /**
   * Evaluates a batch of latency measurements.
   * @param {Array<number>} latencySamplesMs
   * @returns {Object}
   */
  auditLatencyPercentiles(latencySamplesMs = []) {
    if (latencySamplesMs.length === 0) {
      return { sampleCount: 0, p95Ms: 0, p99Ms: 0, isAnomalyDetected: false };
    }

    const sorted = [...latencySamplesMs].sort((a, b) => a - b);
    const p95Index = Math.min(sorted.length - 1, Math.round(sorted.length * 0.95));
    const p99Index = Math.min(sorted.length - 1, Math.round(sorted.length * 0.99));

    const p95 = sorted[p95Index];
    const p99 = sorted[p99Index];
    const isAnomaly = p99 > this.p99ThresholdMs;

    return {
      sampleCount: sorted.length,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      thresholdMs: this.p99ThresholdMs,
      isAnomalyDetected: isAnomaly,
      status: isAnomaly ? 'LATENCY_SPIKE_ALERT' : 'NOMINAL_SUB_SECOND',
      alertAction: isAnomaly ? 'POST_TELEMETRY_ALERT_TO_OPS_SLACK' : null
    };
  }
}

export default new LatencyAnomalyCanary();
