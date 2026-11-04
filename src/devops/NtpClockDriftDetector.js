/**
 * @file NtpClockDriftDetector.js
 * @description Measures system clock drift against network time reference points,
 * alerting when drift crosses tolerance thresholds to avoid SSL and message scheduling faults.
 * Category: Dev-ops / Tools
 */

export class NtpClockDriftDetector {
  constructor(config = {}) {
    this.maxDriftToleranceMs = config.maxDriftToleranceMs || 2500; // 2.5 seconds
  }

  /**
   * Calculates clock drift between local system time and reference timestamp
   * @param {number} localTimestampMs
   * @param {number} referenceTimestampMs
   * @returns {{ driftMs: number, withinTolerance: boolean, status: 'IN_SYNC'|'DRIFT_WARNING' }}
   */
  calculateDrift(localTimestampMs = Date.now(), referenceTimestampMs = Date.now()) {
    const driftMs = Math.abs(localTimestampMs - referenceTimestampMs);
    const withinTolerance = driftMs <= this.maxDriftToleranceMs;

    return {
      driftMs,
      withinTolerance,
      status: withinTolerance ? 'IN_SYNC' : 'DRIFT_WARNING'
    };
  }
}

export default new NtpClockDriftDetector();

