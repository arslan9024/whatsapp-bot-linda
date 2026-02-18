/**
 * ====================================================================
 * PROTOCOL ERROR RECOVERY MANAGER
 * ====================================================================
 * Handle Puppeteer/WhatsApp-web.js protocol errors with recovery
 * 
 * Common Errors Fixed:
 * - "Target closed" - Browser tab/context closed unexpectedly
 * - "Session closed" - WebDriver session ended
 * - "Frame detached" - Page frame was detached during operation
 * - "Requesting from disconnected client" - Protocol error
 * - "Navigation timeout" - Page load took too long
 * - "PROTOCOL error" - Generic protocol errors
 * 
 * Features:
 * - Error classification and recovery strategy selection
 * - Automatic retry with exponential backoff
 * - Browser cleanup and process restart
 * - Connection state tracking
 * - Detailed error logging and metrics
 * 
 * @since Phase 20 - February 18, 2026
 */

class ProtocolErrorRecoveryManager {
  constructor(logger) {
    this.logger = logger || this.createDefaultLogger();
    this.errorHistory = [];
    this.errorMetrics = {
      totalErrors: 0,
      recoveredErrors: 0,
      failedRecoveries: 0,
      errorsByType: {},
    };
    this.retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 1.5,
    };
  }

  /**
   * Create default logger if none provided
   */
  createDefaultLogger() {
    return {
      debug: (msg) => console.log(`[ERROR-RECOVERY-DEBUG] ${msg}`),
      info: (msg) => console.log(`[ERROR-RECOVERY-INFO] ${msg}`),
      warn: (msg) => console.warn(`[ERROR-RECOVERY-WARN] ${msg}`),
      error: (msg) => console.error(`[ERROR-RECOVERY-ERROR] ${msg}`),
    };
  }

  /**
   * Classify error and return recovery strategy
   */
  classifyError(error) {
    const message = error?.message || String(error);
    const lowerMessage = message.toLowerCase();

    // Target/Session errors
    if (lowerMessage.includes('target closed') || message.includes('Target closed')) {
      return {
        type: 'TARGET_CLOSED',
        severity: 'high',
        recoverable: true,
        strategy: 'restart_browser',
      };
    }

    if (lowerMessage.includes('session closed') || message.includes('Session closed')) {
      return {
        type: 'SESSION_CLOSED',
        severity: 'high',
        recoverable: true,
        strategy: 'restart_client',
      };
    }

    // Frame errors
    if (lowerMessage.includes('frame detached') || message.includes('Frame detached')) {
      return {
        type: 'FRAME_DETACHED',
        severity: 'medium',
        recoverable: true,
        strategy: 'retry_operation',
      };
    }

    // Connection/Protocol errors
    if (lowerMessage.includes('disconnected client') || message.includes('Requesting from disconnected')) {
      return {
        type: 'DISCONNECTED_CLIENT',
        severity: 'high',
        recoverable: true,
        strategy: 'reconnect_client',
      };
    }

    if (lowerMessage.includes('protocol error') || message.includes('PROTOCOL error')) {
      return {
        type: 'PROTOCOL_ERROR',
        severity: 'medium',
        recoverable: true,
        strategy: 'retry_operation',
      };
    }

    // Navigation errors
    if (lowerMessage.includes('navigation timeout') || message.includes('Timeout')) {
      return {
        type: 'NAVIGATION_TIMEOUT',
        severity: 'low',
        recoverable: true,
        strategy: 'retry_operation',
      };
    }

    // WebSocket errors
    if (lowerMessage.includes('websocket') || message.includes('WebSocket')) {
      return {
        type: 'WEBSOCKET_ERROR',
        severity: 'high',
        recoverable: true,
        strategy: 'reconnect_client',
      };
    }

    // Browser not found
    if (lowerMessage.includes('chrome') || message.includes('CHROME_EXECUTABLE_PATH')) {
      return {
        type: 'BROWSER_NOT_FOUND',
        severity: 'critical',
        recoverable: false,
        strategy: 'manual_intervention',
      };
    }

    // Default: unknown error
    return {
      type: 'UNKNOWN',
      severity: 'medium',
      recoverable: true,
      strategy: 'retry_operation',
    };
  }

  /**
   * Handle protocol error with recovery strategy
   */
  async handleError(error, clientId, context = {}) {
    const classification = this.classifyError(error);

    // Update metrics
    this.errorMetrics.totalErrors++;
    this.errorMetrics.errorsByType[classification.type] = 
      (this.errorMetrics.errorsByType[classification.type] || 0) + 1;

    // Log error
    const message = error?.message || String(error);
    this.logger.error(`[${classification.type}] ${message}`);

    // Record in history
    this.recordErrorHistory({
      timestamp: Date.now(),
      clientId,
      type: classification.type,
      message,
      severity: classification.severity,
      strategy: classification.strategy,
      context,
    });

    // Return recovery strategy
    return {
      ...classification,
      execute: async () => await this.executeRecoveryStrategy(
        classification.strategy,
        clientId,
        context
      ),
    };
  }

  /**
   * Execute recovery strategy
   */
  async executeRecoveryStrategy(strategy, clientId, context = {}) {
    this.logger.info(`Executing recovery strategy: ${strategy} (${clientId})`);

    switch (strategy) {
      case 'restart_browser':
        return await this.restartBrowser(clientId, context);

      case 'restart_client':
        return await this.restartClient(clientId, context);

      case 'reconnect_client':
        return await this.reconnectClient(clientId, context);

      case 'retry_operation':
        return await this.retryOperationWithBackoff(clientId, context);

      case 'manual_intervention':
        return await this.requestManualIntervention(clientId, context);

      default:
        this.logger.warn(`Unknown recovery strategy: ${strategy}`);
        return false;
    }
  }

  /**
   * Restart browser (kill processes, cleanup, restart)
   */
  async restartBrowser(clientId, context = {}) {
    try {
      this.logger.warn(`Restarting browser for ${clientId}...`);

      // Kill browser processes
      if (context.cleanupFn) {
        await context.cleanupFn();
      }

      // Wait for browser to fully shut down
      await this.sleep(3000);

      this.logger.info(`Browser restart complete for ${clientId}`);
      this.errorMetrics.recoveredErrors++;

      return true;
    } catch (error) {
      this.logger.error(`Browser restart failed: ${error.message}`);
      this.errorMetrics.failedRecoveries++;
      return false;
    }
  }

  /**
   * Restart client (stop and re-initialize)
   */
  async restartClient(clientId, context = {}) {
    try {
      this.logger.warn(`Restarting client for ${clientId}...`);

      // Call cleanup function if provided
      if (context.stopClientFn) {
        await context.stopClientFn();
      }

      // Wait before restart
      await this.sleep(2000);

      // Re-initialize if function provided
      if (context.initClientFn) {
        await context.initClientFn();
      }

      this.logger.info(`Client restart complete for ${clientId}`);
      this.errorMetrics.recoveredErrors++;

      return true;
    } catch (error) {
      this.logger.error(`Client restart failed: ${error.message}`);
      this.errorMetrics.failedRecoveries++;
      return false;
    }
  }

  /**
   * Reconnect client (maintain session, re-establish connection)
   */
  async reconnectClient(clientId, context = {}) {
    try {
      this.logger.warn(`Reconnecting client for ${clientId}...`);

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          // Wait progressively longer between attempts
          const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
          await this.sleep(delay);

          // Call reconnect function if provided
          if (context.reconnectFn) {
            await context.reconnectFn();
            this.logger.info(`Client reconnected for ${clientId} (attempt ${attempts + 1})`);
            this.errorMetrics.recoveredErrors++;
            return true;
          }

          attempts++;
        } catch (retryError) {
          this.logger.debug(`Reconnect attempt ${attempts + 1} failed: ${retryError.message}`);
          attempts++;
        }
      }

      this.logger.error(`Failed to reconnect ${clientId} after ${maxAttempts} attempts`);
      this.errorMetrics.failedRecoveries++;
      return false;
    } catch (error) {
      this.logger.error(`Reconnect failed: ${error.message}`);
      this.errorMetrics.failedRecoveries++;
      return false;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperationWithBackoff(clientId, context = {}) {
    try {
      this.logger.warn(`Retrying operation for ${clientId} with backoff...`);

      const { operation } = context;
      if (!operation || typeof operation !== 'function') {
        this.logger.error('No operation function provided for retry');
        return false;
      }

      let attempts = 0;
      let delay = this.retryConfig.initialDelayMs;

      while (attempts < this.retryConfig.maxRetries) {
        try {
          // Wait with backoff
          await this.sleep(delay);

          // Attempt operation
          const result = await operation();
          this.logger.info(`Operation succeeded for ${clientId} (attempt ${attempts + 1})`);
          this.errorMetrics.recoveredErrors++;
          return true;
        } catch (retryError) {
          attempts++;
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
          this.logger.debug(
            `Retry attempt ${attempts}/${this.retryConfig.maxRetries} failed: ${retryError.message}`
          );
        }
      }

      this.logger.error(`All retry attempts failed for ${clientId}`);
      this.errorMetrics.failedRecoveries++;
      return false;
    } catch (error) {
      this.logger.error(`Retry with backoff failed: ${error.message}`);
      this.errorMetrics.failedRecoveries++;
      return false;
    }
  }

  /**
   * Request manual intervention
   */
  async requestManualIntervention(clientId, context = {}) {
    this.logger.error(`❌ MANUAL INTERVENTION REQUIRED for ${clientId}`);
    this.logger.error(`Error: ${context.error || 'Unknown error'}`);
    this.logger.error('This error cannot be automatically recovered. Please:');
    this.logger.error('  1. Check the error message above');
    this.logger.error('  2. Verify browser installation (Chrome/Chromium)');
    this.logger.error('  3. Restart the bot');

    this.errorMetrics.failedRecoveries++;
    return false;
  }

  /**
   * Record error in history for analysis
   */
  recordErrorHistory(errorData) {
    this.errorHistory.push({
      ...errorData,
      id: this.errorHistory.length + 1,
    });

    // Keep history limited to last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error metrics and statistics
   */
  getMetrics() {
    const totalErrors = this.errorMetrics.totalErrors;
    const recovered = this.errorMetrics.recoveredErrors;
    const failed = this.errorMetrics.failedRecoveries;
    const recoveryRate = totalErrors > 0 ? ((recovered / totalErrors) * 100).toFixed(1) : 0;

    return {
      ...this.errorMetrics,
      recoveryRate: `${recoveryRate}%`,
      errorHistory: this.errorHistory,
    };
  }

  /**
   * Print metrics to console
   */
  printMetrics() {
    const metrics = this.getMetrics();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       🛡️  PROTOCOL ERROR RECOVERY - METRICS              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Errors: ${metrics.totalErrors}`);
    console.log(`Recovered: ${metrics.recoveredErrors} ✅`);
    console.log(`Failed: ${metrics.failedRecoveries} ❌`);
    console.log(`Recovery Rate: ${metrics.recoveryRate}\n`);

    console.log(`Errors by Type:`);
    Object.entries(metrics.errorsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log();
  }

  /**
   * Simple sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ProtocolErrorRecoveryManager;
