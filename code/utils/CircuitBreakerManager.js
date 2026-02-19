/**
 * CircuitBreakerManager.js
 * 
 * Phase 29d: Advanced Recovery Strategies - Circuit Breaker Pattern
 * 
 * Implements the circuit breaker pattern to prevent hammering broken endpoints.
 * States: CLOSED (normal) -> OPEN (too many failures) -> HALF_OPEN (testing recovery)
 * 
 * Features:
 * - Tracks failure rates per endpoint/account
 * - Opens circuit when failure threshold exceeded
 * - Automatically half-opens after timeout to test recovery
 * - Prevents cascading failures
 * - Provides circuit status dashboard
 * 
 * Usage:
 *   const breaker = new CircuitBreakerManager({
 *     failureThreshold: 5,
 *     resetTimeoutMs: 30000,
 *     terminalDashboard
 *   });
 *   
 *   if (breaker.isCircuitOpen('whatsapp-account-1')) {
 *     // Skip reconnect attempt - circuit is open
 *   }
 */

class CircuitBreakerManager {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // Open after 5 failures
    this.resetTimeoutMs = options.resetTimeoutMs || 30000; // Try recovery after 30 seconds
    this.terminalDashboard = options.terminalDashboard;
    
    // Circuit state tracking: phone -> { state, failures, lastFailure, resetTimer }
    this.circuits = new Map();
    
    // Statistics
    this.stats = {
      totalCircuitTrips: 0,
      totalCircuitResets: 0,
      currentOpenCircuits: 0
    };

    // States
    this.STATES = {
      CLOSED: 'CLOSED',           // Normal operation - requests pass through
      OPEN: 'OPEN',               // Too many failures - reject all requests
      HALF_OPEN: 'HALF_OPEN'      // Testing recovery - allow limited requests
    };
  }

  /**
   * Initialize circuit breaker for an account
   */
  initializeCircuit(phone) {
    if (!this.circuits.has(phone)) {
      this.circuits.set(phone, {
        state: this.STATES.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
        resetTimer: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(phone) {
    this.initializeCircuit(phone);
    const circuit = this.circuits.get(phone);

    circuit.successes++;
    circuit.lastSuccess = new Date().toISOString();

    // If circuit was half-open and we got a success, close it
    if (circuit.state === this.STATES.HALF_OPEN) {
      console.log(`[CircuitBreaker] ✅ ${phone}: Recovery successful - closing circuit`);
      circuit.state = this.STATES.CLOSED;
      circuit.failures = 0;
      this.stats.totalCircuitResets++;
      this.stats.currentOpenCircuits = Array.from(this.circuits.values())
        .filter(c => c.state === this.STATES.OPEN).length;
      
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'circuit_closed',
          message: 'Circuit breaker: Normal operation resumed',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Record a failure
   */
  recordFailure(phone) {
    this.initializeCircuit(phone);
    const circuit = this.circuits.get(phone);

    circuit.failures++;
    circuit.lastFailure = new Date().toISOString();

    // Check if we should open the circuit
    if (circuit.failures >= this.failureThreshold && circuit.state === this.STATES.CLOSED) {
      console.log(`[CircuitBreaker] 🔴 ${phone}: Failure threshold exceeded - opening circuit`);
      circuit.state = this.STATES.OPEN;
      this.stats.totalCircuitTrips++;
      this.stats.currentOpenCircuits++;

      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'circuit_open',
          message: `Circuit breaker: OPEN (${circuit.failures} failures)`,
          timestamp: new Date().toISOString()
        });
      }

      // Schedule recovery test
      this._scheduleRecoveryTest(phone);
    }
    // If circuit is already open, just track the failure
    else if (circuit.state === this.STATES.OPEN) {
      console.log(`[CircuitBreaker] 🔴 ${phone}: Circuit already open`);
    }
  }

  /**
   * Schedule recovery test after timeout
   */
  _scheduleRecoveryTest(phone) {
    const circuit = this.circuits.get(phone);

    if (circuit.resetTimer) {
      clearTimeout(circuit.resetTimer);
    }

    circuit.resetTimer = setTimeout(() => {
      console.log(`[CircuitBreaker] 🟡 ${phone}: Attempting recovery (half-open)`);
      circuit.state = this.STATES.HALF_OPEN;
      circuit.failures = 0; // Reset failure counter for this test

      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status: 'circuit_half_open',
          message: 'Circuit breaker: Testing recovery',
          timestamp: new Date().toISOString()
        });
      }
    }, this.resetTimeoutMs);
  }

  /**
   * Check if circuit is open (requests should be rejected)
   */
  isCircuitOpen(phone) {
    this.initializeCircuit(phone);
    const circuit = this.circuits.get(phone);
    return circuit.state === this.STATES.OPEN;
  }

  /**
   * Get circuit state for an account
   */
  getCircuitState(phone) {
    this.initializeCircuit(phone);
    const circuit = this.circuits.get(phone);

    return {
      phone,
      state: circuit.state,
      failures: circuit.failures,
      successes: circuit.successes,
      failureThreshold: this.failureThreshold,
      lastFailure: circuit.lastFailure,
      lastSuccess: circuit.lastSuccess,
      canRequest: circuit.state !== this.STATES.OPEN
    };
  }

  /**
   * Get all circuit states
   */
  getAllCircuitStates() {
    const states = [];
    for (const [phone, circuit] of this.circuits) {
      states.push({
        phone,
        state: circuit.state,
        failures: circuit.failures,
        successes: circuit.successes,
        failureThreshold: this.failureThreshold,
        lastFailure: circuit.lastFailure,
        lastSuccess: circuit.lastSuccess,
        canRequest: circuit.state !== this.STATES.OPEN
      });
    }
    return states;
  }

  /**
   * Reset circuit for an account (manual reset)
   */
  resetCircuit(phone) {
    const circuit = this.circuits.get(phone);
    if (!circuit) return false;

    if (circuit.resetTimer) {
      clearTimeout(circuit.resetTimer);
    }

    circuit.state = this.STATES.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.resetTimer = null;

    console.log(`[CircuitBreaker] ✅ ${phone}: Circuit manually reset`);

    if (this.terminalDashboard?.updateAccountStatus) {
      this.terminalDashboard.updateAccountStatus(phone, {
        status: 'circuit_closed',
        message: 'Circuit breaker: Manually reset',
        timestamp: new Date().toISOString()
      });
    }

    return true;
  }

  /**
   * Get circuit breaker statistics
   */
  getStatistics() {
    const openCircuits = Array.from(this.circuits.values())
      .filter(c => c.state === this.STATES.OPEN).length;
    const halfOpenCircuits = Array.from(this.circuits.values())
      .filter(c => c.state === this.STATES.HALF_OPEN).length;
    const closedCircuits = Array.from(this.circuits.values())
      .filter(c => c.state === this.STATES.CLOSED).length;

    return {
      totalCircuits: this.circuits.size,
      closedCircuits,
      openCircuits,
      halfOpenCircuits,
      totalCircuitTrips: this.stats.totalCircuitTrips,
      totalCircuitResets: this.stats.totalCircuitResets
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalCircuitTrips: 0,
      totalCircuitResets: 0,
      currentOpenCircuits: 0
    };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    for (const circuit of this.circuits.values()) {
      if (circuit.resetTimer) {
        clearTimeout(circuit.resetTimer);
      }
    }
    this.circuits.clear();
  }
}

export default CircuitBreakerManager;
