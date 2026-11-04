/**
 * @file ProductionRollbackCircuitBreaker.js
 * @description Monitors post-deployment error rates and uncaught exceptions, triggering automated canary rollback alarms if error rate exceeds 2%.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class ProductionRollbackCircuitBreaker {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.maxErrorRatePct = options.maxErrorRatePct || 2.0; // 2% error rate threshold
    this.totalRequests = 0;
    this.totalErrors = 0;
  }

  /**
   * Records request outcome.
   * @param {boolean} isSuccess
   * @returns {Object}
   */
  recordOutcome(isSuccess) {
    this.totalRequests++;
    if (!isSuccess) this.totalErrors++;

    const errorRatePct = this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0;
    const shouldTripCircuit = this.totalRequests >= 20 && errorRatePct > this.maxErrorRatePct;

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRatePct: Number(errorRatePct.toFixed(2)),
      shouldTripCircuit,
      systemAction: shouldTripCircuit ? 'TRIP_CIRCUIT_AND_EXECUTE_SAFE_ROLLBACK' : 'CONTINUE_DEPLOYMENT',
      healthStatus: shouldTripCircuit ? 'UNHEALTHY_ROLLBACK_TRIGGERED' : 'HEALTHY_WITHIN_THRESHOLD'
    };
  }
}

export default new ProductionRollbackCircuitBreaker();
