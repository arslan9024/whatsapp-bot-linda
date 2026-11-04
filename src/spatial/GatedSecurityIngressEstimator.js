/**
 * @file GatedSecurityIngressEstimator.js
 * @description Estimates morning resident and visitor security gate ingress waiting times
 * and ANPR (Automatic Number Plate Recognition) lanes across major gated Dubai villa estates.
 * Category: Domain / Feature (Spatial)
 */

export class GatedSecurityIngressEstimator {
  constructor() {
    this.estateGates = {
      'ARABIAN_RANCHES_1': { gateCount: 2, hasAnprFastLane: true, peakWaitMinutes: 3 },
      'AL_BARARI': { gateCount: 1, hasAnprFastLane: true, peakWaitMinutes: 2 },
      'EMIRATES_HILLS': { gateCount: 2, hasAnprFastLane: true, peakWaitMinutes: 1 },
      'JUMEIRAH_ISLANDS': { gateCount: 2, hasAnprFastLane: true, peakWaitMinutes: 2 }
    };
  }

  /**
   * Evaluates security gate ingress throughput
   * @param {string} estateName
   * @param {boolean} [isRegisteredResident]
   * @returns {Object} Security gate ingress audit
   */
  estimateGateIngress(estateName = '', isRegisteredResident = true) {
    const key = estateName.toUpperCase().replace(/\s+/g, '_');
    const gate = this.estateGates[key] || { gateCount: 1, hasAnprFastLane: false, peakWaitMinutes: 5 };

    const estimatedWait = isRegisteredResident && gate.hasAnprFastLane
      ? '< 1 minute (RFID / ANPR Plate Reader)'
      : `${gate.peakWaitMinutes} - ${gate.peakWaitMinutes + 3} minutes (Visitor ID Verification)`;

    return {
      estate: estateName,
      securityGatesAvailable: gate.gateCount,
      residentFastPassEnabled: gate.hasAnprFastLane,
      estimatedWaitTime: estimatedWait,
      securityTier: '24/7_PATROLLED_GUARDED_PERIMETER'
    };
  }
}

export default new GatedSecurityIngressEstimator();
