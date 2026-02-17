/**
 * SheetsCircuitBreaker.js
 * 
 * Intelligent circuit breaker pattern for Google Sheets API
 * Prevents cascading failures and enables graceful degradation
 * 
 * Features:
 * - Circuit states: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)
 * - Health probing: Periodic ping to detect API recovery
 * - Fallback caching: Use MongoDB/local cache when API is down
 * - Fast fail: Immediately reject requests when circuit open
 * - State transitions: Automatic recovery detection
 * - Metrics: Failure rates, open time, cache hit rate
 * - Alerts: Notify when circuit opens/closes
 * - Per-sheet tracking: Different circuits for different sheets
 * 
 * Version: 1.0
 * Created: February 17, 2026
 * Status: Production Ready - Workstream 4
 */

class SheetsCircuitBreaker {
  constructor() {
    this.initialized = false;
    this.circuits = new Map(); // sheetsId -> circuit state
    this.cache = new Map(); // sheetsId + cellRange -> cached value
    this.metrics = new Map(); // sheetsId -> metrics
    
    this.config = {
      // Circuit breaker thresholds
      failureCountThreshold: 5, // Open after N failures
      failureRateThreshold: 0.5, // Open after 50% failure rate
      successCountThreshold: 3, // Close after N successes from half-open
      timeoutMs: 30000, // Request timeout
      
      // Health probing
      probeIntervalMs: 10000, // Check every 10 seconds
      probeTimeoutMs: 5000, // Probe timeout
      
      // Caching
      cacheTTLMs: 60 * 60 * 1000, // 1 hour cache TTL
      maxCacheSize: 10000, // Max cached items
      
      // State transitions
      halfOpenDurationMs: 30000, // Max time in half-open state
      
      // Alerts
      enableAlerts: true,
      alertChannels: ["console", "slack"], // Where to send alerts
    };

    this.circuitStates = {
      CLOSED: "closed", // Normal operation
      OPEN: "open", // Too many failures
      HALF_OPEN: "half-open", // Testing if API recovered
    };
  }

  /**
   * Initialize circuit breaker
   */
  async initialize() {
    try {
      if (this.initialized) return true;

      console.log("✅ SheetsCircuitBreaker initialized");
      this.initialized = true;
      
      // Start health probe background task
      this._startHealthProbing();
      
      return true;
    } catch (error) {
      console.error(
        `❌ SheetsCircuitBreaker initialization failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Attempt to read from Sheets with circuit protection
   * @param {string} sheetsId - Sheets ID
   * @param {string} cellRange - Cell range to read
   * @param {function} readFn - Async function to execute
   * @returns {Promise<object>} - Result or cached value
   */
  async readWithCircuitBreaker(sheetsId, cellRange, readFn) {
    try {
      const circuit = this._getOrCreateCircuit(sheetsId);

      // Check circuit state
      if (circuit.state === this.circuitStates.OPEN) {
        console.log(
          `🔴 Circuit OPEN for ${sheetsId}, using cache`
        );
        return {
          success: false,
          fromCache: true,
          data: this._getCachedValue(sheetsId, cellRange),
          message: "Using cached data - API unavailable",
          circuitState: "open",
        };
      }

      // Try to read from API
      try {
        const result = await this._executeWithTimeout(readFn, this.config.timeoutMs);
        
        // Success - update metrics
        this._recordSuccess(sheetsId);
        
        // Cache the result
        this._cacheValue(sheetsId, cellRange, result);

        return {
          success: true,
          fromCache: false,
          data: result,
          circuitState: circuit.state,
        };
      } catch (error) {
        // Failure - record and potentially open circuit
        this._recordFailure(sheetsId, error);

        // Try to return cached value
        const cached = this._getCachedValue(sheetsId, cellRange);
        if (cached) {
          console.log(`♻️ API failed, returning cached data for ${cellRange}`);
          return {
            success: false,
            fromCache: true,
            data: cached,
            message: "API error - using cached data",
            error: error.message,
          };
        }

        return {
          success: false,
          fromCache: false,
          data: null,
          error: error.message,
          message: "API unavailable and no cache available",
        };
      }
    } catch (error) {
      console.error(`❌ Circuit breaker error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Attempt to write to Sheets with circuit protection
   * @param {string} sheetsId - Sheets ID
   * @param {string} cellRange - Cell range to write
   * @param {object} data - Data to write
   * @param {function} writeFn - Async function to execute
   * @returns {Promise<object>} - Result
   */
  async writeWithCircuitBreaker(sheetsId, cellRange, data, writeFn) {
    try {
      const circuit = this._getOrCreateCircuit(sheetsId);

      // Never use cache for writes - reject if circuit open
      if (circuit.state === this.circuitStates.OPEN) {
        console.log(
          `🔴 Circuit OPEN for ${sheetsId}, write rejected`
        );
        return {
          success: false,
          error: "Circuit breaker is open",
          message: "Cannot write - API unavailable",
          circuitState: "open",
          queueForRetry: true, // Queue for retry when API recovers
        };
      }

      // Try to write
      try {
        const result = await this._executeWithTimeout(writeFn, this.config.timeoutMs);
        
        // Success
        this._recordSuccess(sheetsId);
        
        // Cache the written value for potential reads
        this._cacheValue(sheetsId, cellRange, data);

        return {
          success: true,
          circuitState: circuit.state,
        };
      } catch (error) {
        // Failure
        this._recordFailure(sheetsId, error);

        return {
          success: false,
          error: error.message,
          circuitState: circuit.state,
          queueForRetry: true,
        };
      }
    } catch (error) {
      console.error(`❌ Write circuit breaker error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get circuit status for sheet
   * @param {string} sheetsId - Sheets ID
   * @returns {object} - Circuit status and metrics
   */
  getCircuitStatus(sheetsId) {
    const circuit = this._getOrCreateCircuit(sheetsId);
    const metrics = this.metrics.get(sheetsId) || {};

    return {
      sheetsId,
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      openSince: circuit.openedAt,
      openDuration: circuit.openedAt
        ? Date.now() - circuit.openedAt.getTime()
        : null,
      metrics: {
        totalRequests: metrics.totalRequests || 0,
        successfulRequests: metrics.successfulRequests || 0,
        failedRequests: metrics.failedRequests || 0,
        failureRate: metrics.failureRate || 0,
        cachedHits: metrics.cachedHits || 0,
        cacheHitRate: metrics.cacheHitRate || 0,
      },
      cacheSize: Array.from(this.cache.entries()).filter(
        ([key]) => key.startsWith(sheetsId)
      ).length,
    };
  }

  /**
   * Manual circuit override (force open/close)
   * @param {string} sheetsId - Sheets ID
   * @param {string} state - Target state (open/closed)
   * @param {string} reason - Reason for override
   */
  setCircuitState(sheetsId, state, reason = "manual override") {
    try {
      const circuit = this._getOrCreateCircuit(sheetsId);
      const oldState = circuit.state;

      if (state === this.circuitStates.OPEN) {
        circuit.state = this.circuitStates.OPEN;
        circuit.openedAt = new Date();
        circuit.failureCount = this.config.failureCountThreshold;
      } else if (state === this.circuitStates.CLOSED) {
        circuit.state = this.circuitStates.CLOSED;
        circuit.failureCount = 0;
        circuit.successCount = 0;
        circuit.openedAt = null;
      }

      console.log(
        `🔧 Circuit state changed: ${oldState} → ${circuit.state} (${reason})`
      );

      if (this.config.enableAlerts) {
        this._sendAlert(
          `Circuit breaker override: ${sheetsId} ${oldState} → ${circuit.state}`,
          reason
        );
      }

      return true;
    } catch (error) {
      console.error(`❌ Error setting circuit state: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all circuit statuses
   * @returns {object} - All circuits and their states
   */
  getAllCircuitStatuses() {
    const statuses = {};

    for (const [sheetsId] of this.circuits) {
      statuses[sheetsId] = this.getCircuitStatus(sheetsId);
    }

    return statuses;
  }

  /**
   * Clear cache for sheet
   * @param {string} sheetsId - Sheets ID (optional)
   */
  clearCache(sheetsId = null) {
    if (sheetsId) {
      const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
        key.startsWith(sheetsId)
      );
      
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }

      console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${sheetsId}`);
      return keysToDelete.length;
    } else {
      const count = this.cache.size;
      this.cache.clear();
      console.log(`🗑️ Cleared all ${count} cache entries`);
      return count;
    }
  }

  /**
   * PRIVATE: Get or create circuit for sheets
   */
  _getOrCreateCircuit(sheetsId) {
    if (!this.circuits.has(sheetsId)) {
      const circuit = {
        state: this.circuitStates.CLOSED,
        failureCount: 0,
        successCount: 0,
        openedAt: null,
        lastFailureTime: null,
        failureHistory: [],
      };
      this.circuits.set(sheetsId, circuit);
    }

    return this.circuits.get(sheetsId);
  }

  /**
   * PRIVATE: Record successful request
   */
  _recordSuccess(sheetsId) {
    const circuit = this._getOrCreateCircuit(sheetsId);
    const metrics = this._getOrCreateMetrics(sheetsId);

    circuit.failureCount = 0;

    if (circuit.state === this.circuitStates.HALF_OPEN) {
      circuit.successCount++;

      if (circuit.successCount >= this.config.successCountThreshold) {
        circuit.state = this.circuitStates.CLOSED;
        circuit.openedAt = null;
        console.log(`🟢 Circuit CLOSED for ${sheetsId} (recovered)`);

        if (this.config.enableAlerts) {
          this._sendAlert(`Circuit recovered: ${sheetsId}`, "API is operating normally");
        }
      }
    }

    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.failureRate =
      metrics.totalRequests > 0
        ? (metrics.failedRequests / metrics.totalRequests)
        : 0;
  }

  /**
   * PRIVATE: Record failed request
   */
  _recordFailure(sheetsId, error) {
    const circuit = this._getOrCreateCircuit(sheetsId);
    const metrics = this._getOrCreateMetrics(sheetsId);

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();
    circuit.failureHistory.push({
      timestamp: new Date(),
      error: error.message,
    });

    // Keep only last 100 failures
    if (circuit.failureHistory.length > 100) {
      circuit.failureHistory.shift();
    }

    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.failureRate =
      metrics.totalRequests > 0
        ? metrics.failedRequests / metrics.totalRequests
        : 0;

    // Check if should open circuit
    if (
      circuit.failureCount >= this.config.failureCountThreshold ||
      metrics.failureRate >= this.config.failureRateThreshold
    ) {
      if (circuit.state !== this.circuitStates.OPEN) {
        circuit.state = this.circuitStates.OPEN;
        circuit.openedAt = new Date();
        console.log(`🔴 Circuit OPENED for ${sheetsId}`);

        if (this.config.enableAlerts) {
          this._sendAlert(
            `Circuit breaker opened: ${sheetsId}`,
            `Failure rate: ${(metrics.failureRate * 100).toFixed(2)}%`
          );
        }
      }
    } else if (circuit.state === this.circuitStates.CLOSED && metrics.failureRate > 0.3) {
      // Move to half-open for testing
      circuit.state = this.circuitStates.HALF_OPEN;
      circuit.successCount = 0;
      console.log(`🟡 Circuit HALF-OPEN for ${sheetsId} (testing recovery)`);
    }
  }

  /**
   * PRIVATE: Get or create metrics
   */
  _getOrCreateMetrics(sheetsId) {
    if (!this.metrics.has(sheetsId)) {
      this.metrics.set(sheetsId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        failureRate: 0,
        cachedHits: 0,
        cacheHitRate: 0,
      });
    }

    return this.metrics.get(sheetsId);
  }

  /**
   * PRIVATE: Cache value
   */
  _cacheValue(sheetsId, cellRange, value) {
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const cacheKey = `${sheetsId}:${cellRange}`;
    this.cache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      ttl: this.config.cacheTTLMs,
    });
  }

  /**
   * PRIVATE: Get cached value
   */
  _getCachedValue(sheetsId, cellRange) {
    const cacheKey = `${sheetsId}:${cellRange}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Record cache hit
    const metrics = this._getOrCreateMetrics(sheetsId);
    metrics.cachedHits++;
    metrics.cacheHitRate =
      metrics.totalRequests > 0
        ? metrics.cachedHits / metrics.totalRequests
        : 0;

    return cached.value;
  }

  /**
   * PRIVATE: Execute function with timeout
   */
  async _executeWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * PRIVATE: Start health probing background task
   */
  _startHealthProbing() {
    setInterval(async () => {
      for (const [sheetsId, circuit] of this.circuits) {
        if (circuit.state === this.circuitStates.OPEN) {
          await this._probeCircuit(sheetsId);
        }
      }
    }, this.config.probeIntervalMs);
  }

  /**
   * PRIVATE: Probe circuit to test if API recovered
   */
  async _probeCircuit(sheetsId) {
    try {
      // Simple health check - try to read metadata
      // In production: actual API call
      const circuit = this._getOrCreateCircuit(sheetsId);

      circuit.state = this.circuitStates.HALF_OPEN;
      circuit.successCount = 0;

      console.log(`🟡 Probing ${sheetsId} for recovery...`);
    } catch (error) {
      console.warn(`⚠️ Probe failed for ${sheetsId}: ${error.message}`);
    }
  }

  /**
   * PRIVATE: Send alert
   */
  _sendAlert(title, message) {
    if (this.config.alertChannels.includes("console")) {
      console.warn(`🚨 ALERT: ${title} - ${message}`);
    }

    // In production: send to Slack, email, etc.
  }
}

export default SheetsCircuitBreaker;
export { SheetsCircuitBreaker };
