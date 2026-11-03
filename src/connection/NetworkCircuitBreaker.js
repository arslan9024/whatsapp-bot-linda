/**
 * NetworkCircuitBreaker.js
 * 
 * Single responsibility: Auto-pause outbound queues during localized internet failure.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class NetworkCircuitBreaker {
  constructor({ failureThreshold = 3, resetTimeoutMs = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.state = 'CLOSED'; // CLOSED (normal) | OPEN (broken) | HALF_OPEN (probing)
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  canExecute() {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true; // Allow single test probe
      }
      return false;
    }

    // HALF_OPEN allows probe
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export default new NetworkCircuitBreaker();
