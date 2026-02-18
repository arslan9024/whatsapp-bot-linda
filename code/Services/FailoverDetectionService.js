/**
 * FailoverDetectionService.js
 * Monitors master account health and detects failures in real-time
 * 
 * Features:
 * - Periodic health checks on all masters
 * - Connection status tracking
 * - Failure pattern recognition
 * - Recovery attempt management
 * - Event emission on state changes
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';

class FailoverDetectionService extends EventEmitter {
  constructor(accountConfigManager, deviceLinkedManager, config = {}) {
    super();
    this.accountConfigManager = accountConfigManager;
    this.deviceLinkedManager = deviceLinkedManager;
    
    // Configuration
    this.healthCheckInterval = config.healthCheckInterval || 5000;
    this.failureThreshold = config.failureThreshold || 3;
    this.recoveryTimeout = config.recoveryTimeout || 30000;
    this.maxRecoveryAttempts = config.maxRecoveryAttempts || 5;
    
    // State tracking
    this.masterStatusMap = new Map();
    this.failureMetrics = new Map();
    this.recoveryAttempts = new Map();
    this.healthCheckTimer = null;
    this.isMonitoring = false;
    
    // Initialize logger
    this.logger = new Logger('FailoverDetectionService');
  }

  /**
   * Start health monitoring for all masters
   */
  async startHealthMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('Health monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Starting health monitoring');
    
    // Initialize status for all masters
    await this._initializeMasterStatuses();
    
    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this._performHealthChecks();
    }, this.healthCheckInterval);

    // Initial health check
    await this._performHealthChecks();

    this.emit('monitoring-started');
  }

  /**
   * Stop health monitoring
   */
  async stopHealthMonitoring() {
    if (!this.isMonitoring) {
      this.logger.warn('Health monitoring not running');
      return;
    }

    this.isMonitoring = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.logger.info('Stopped health monitoring');
    this.emit('monitoring-stopped');
  }

  /**
   * Initialize status tracking for all master accounts
   */
  async _initializeMasterStatuses() {
    try {
      const allMasters = this.accountConfigManager.getAllMasters();
      
      for (const master of allMasters) {
        const masterPhone = master.phoneNumber;
        
        if (!this.masterStatusMap.has(masterPhone)) {
          this.masterStatusMap.set(masterPhone, {
            masterPhone,
            status: 'unknown',
            lastChecked: null,
            consecutiveFailures: 0,
            consecutiveSuccesses: 0,
            isHealthy: true,
            isDegraded: false,
            isFailed: false,
            lastFailureTime: null,
            lastRecoveryTime: null,
            responseTime: null,
            lastError: null,
          });
        }

        if (!this.failureMetrics.has(masterPhone)) {
          this.failureMetrics.set(masterPhone, {
            masterPhone,
            totalFailures: 0,
            totalRecoveries: 0,
            failureCount24h: 0,
            averageRecoveryTime: 0,
            longestRecoveryTime: 0,
            shortestRecoveryTime: Infinity,
            mtbf: null, // Mean Time Between Failures
          });
        }

        if (!this.recoveryAttempts.has(masterPhone)) {
          this.recoveryAttempts.set(masterPhone, {
            masterPhone,
            attemptCount: 0,
            lastAttempt: null,
            isRecovering: false,
          });
        }
      }

      this.logger.info(`Initialized status tracking for ${allMasters.length} masters`);
    } catch (error) {
      this.logger.error('Failed to initialize master statuses', error);
      throw error;
    }
  }

  /**
   * Perform health checks on all masters
   */
  async _performHealthChecks() {
    try {
      const allMasters = this.accountConfigManager.getAllMasters();
      
      for (const master of allMasters) {
        await this._checkMasterHealth(master.phoneNumber);
      }
    } catch (error) {
      this.logger.error('Error during health checks', error);
    }
  }

  /**
   * Check health of a specific master
   */
  async checkMasterHealth(masterPhone) {
    return await this._checkMasterHealth(masterPhone);
  }

  /**
   * Internal health check implementation
   */
  async _checkMasterHealth(masterPhone) {
    try {
      const status = this.masterStatusMap.get(masterPhone);
      if (!status) {
        this.logger.warn(`Master ${masterPhone} not found in status map`);
        return null;
      }

      const startTime = Date.now();
      let isConnected = false;
      let error = null;

      try {
        // Check device connection status
        const deviceStatus = await this.deviceLinkedManager.getDeviceStatus(masterPhone);
        isConnected = deviceStatus && deviceStatus.connected === true;
      } catch (checkError) {
        error = checkError.message;
        isConnected = false;
      }

      const responseTime = Date.now() - startTime;

      // Update status
      if (isConnected) {
        await this._recordSuccess(masterPhone, responseTime);
      } else {
        await this._recordFailure(masterPhone, error, responseTime);
      }

      status.lastChecked = new Date();
      status.responseTime = responseTime;

      return status;
    } catch (error) {
      this.logger.error(`Health check failed for ${masterPhone}`, error);
      return null;
    }
  }

  /**
   * Record successful health check
   */
  async _recordSuccess(masterPhone, responseTime) {
    const status = this.masterStatusMap.get(masterPhone);
    const metrics = this.failureMetrics.get(masterPhone);
    const recovery = this.recoveryAttempts.get(masterPhone);

    status.consecutiveFailures = 0;
    status.consecutiveSuccesses = (status.consecutiveSuccesses || 0) + 1;
    status.lastError = null;

    // Transition from failed to healthy
    if (status.isFailed || status.isDegraded) {
      await this._handleRecovery(masterPhone);
      status.lastRecoveryTime = new Date();
      status.isFailed = false;
      status.isDegraded = false;
      status.isHealthy = true;
      status.status = 'healthy';

      metrics.totalRecoveries++;

      // Calculate recovery time
      if (status.lastFailureTime) {
        const recoveryTime = Date.now() - status.lastFailureTime.getTime();
        metrics.averageRecoveryTime = 
          (metrics.averageRecoveryTime + recoveryTime) / 2;
        metrics.longestRecoveryTime = 
          Math.max(metrics.longestRecoveryTime, recoveryTime);
        metrics.shortestRecoveryTime = 
          Math.min(metrics.shortestRecoveryTime, recoveryTime);
      }

      recovery.isRecovering = false;
      recovery.attemptCount = 0;

      this.logger.info(`Master ${masterPhone} recovered successfully`, {
        responseTime,
        recoveryTime: status.lastRecoveryTime - status.lastFailureTime,
      });

      this.emit('master-recovered', {
        masterPhone,
        recoveryTime: status.lastRecoveryTime - status.lastFailureTime,
        timestamp: new Date(),
      });
    } else if (status.consecutiveSuccesses === 1) {
      status.isHealthy = true;
      status.isDegraded = false;
      status.status = 'healthy';
    }
  }

  /**
   * Record failed health check
   */
  async _recordFailure(masterPhone, error, responseTime) {
    const status = this.masterStatusMap.get(masterPhone);
    const metrics = this.failureMetrics.get(masterPhone);
    const recovery = this.recoveryAttempts.get(masterPhone);

    status.consecutiveSuccesses = 0;
    status.consecutiveFailures = (status.consecutiveFailures || 0) + 1;
    status.lastError = error;
    status.lastFailureTime = new Date();

    metrics.totalFailures++;
    metrics.failureCount24h++;

    // Transition to degraded after 1 failure
    if (status.consecutiveFailures === 1) {
      status.isDegraded = true;
      status.status = 'degraded';

      this.logger.warn(`Master ${masterPhone} degraded`, {
        error,
        consecutiveFailures: status.consecutiveFailures,
      });

      this.emit('master-degraded', {
        masterPhone,
        error,
        timestamp: new Date(),
      });
    }

    // Transition to failed after threshold reached
    if (status.consecutiveFailures >= this.failureThreshold) {
      status.isFailed = true;
      status.isDegraded = false;
      status.isHealthy = false;
      status.status = 'failed';

      this.logger.error(`Master ${masterPhone} failed`, {
        error,
        consecutiveFailures: status.consecutiveFailures,
        failureThreshold: this.failureThreshold,
      });

      this.emit('master-failed', {
        masterPhone,
        consecutiveFailures: status.consecutiveFailures,
        error,
        timestamp: new Date(),
      });

      // Initiate recovery procedures
      await this._initiateRecovery(masterPhone);
    }
  }

  /**
   * Initiate recovery procedures for failed master
   */
  async _initiateRecovery(masterPhone) {
    try {
      const recovery = this.recoveryAttempts.get(masterPhone);
      
      if (recovery.isRecovering && recovery.attemptCount >= this.maxRecoveryAttempts) {
        this.logger.error(`Max recovery attempts exceeded for ${masterPhone}`);
        this.emit('recovery-failed', {
          masterPhone,
          attemptCount: recovery.attemptCount,
          timestamp: new Date(),
        });
        return;
      }

      recovery.isRecovering = true;
      recovery.lastAttempt = new Date();
      recovery.attemptCount++;

      this.logger.info(`Initiating recovery for ${masterPhone}`, {
        attemptCount: recovery.attemptCount,
      });

      this.emit('recovery-initiated', {
        masterPhone,
        attemptCount: recovery.attemptCount,
        timestamp: new Date(),
      });

      // Schedule recovery check after timeout
      setTimeout(() => {
        this._checkMasterHealth(masterPhone);
      }, this.recoveryTimeout);
    } catch (error) {
      this.logger.error(`Failed to initiate recovery for ${masterPhone}`, error);
    }
  }

  /**
   * Handle successful recovery
   */
  async _handleRecovery(masterPhone) {
    try {
      this.logger.info(`Handling recovery procedures for ${masterPhone}`);
      
      // Any recovery-specific logic can be added here
      // For now, metrics are updated in _recordSuccess
      
      this.emit('recovery-completed', {
        masterPhone,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error handling recovery for ${masterPhone}`, error);
    }
  }

  /**
   * Record failure with reason
   */
  recordFailure(masterPhone, error) {
    this.logger.error(`Failure recorded for ${masterPhone}`, error);
    this._recordFailure(masterPhone, error?.message || String(error), 0);
  }

  /**
   * Record recovery
   */
  recordRecovery(masterPhone) {
    this.logger.info(`Recovery recorded for ${masterPhone}`);
    this._recordSuccess(masterPhone, 0);
  }

  /**
   * Get status of specific master
   */
  getMasterStatus(masterPhone) {
    return this.masterStatusMap.get(masterPhone) || null;
  }

  /**
   * Get all master statuses
   */
  getAllMasterStatuses() {
    return Array.from(this.masterStatusMap.values());
  }

  /**
   * Get failure metrics for master
   */
  getFailureMetrics(masterPhone) {
    return this.failureMetrics.get(masterPhone) || null;
  }

  /**
   * Get all failure metrics
   */
  getAllFailureMetrics() {
    return Array.from(this.failureMetrics.values());
  }

  /**
   * Get recovery attempts info
   */
  getRecoveryAttempts(masterPhone) {
    return this.recoveryAttempts.get(masterPhone) || null;
  }

  /**
   * Reset failure metrics for master (after successful reset)
   */
  resetFailureMetrics(masterPhone) {
    const metrics = this.failureMetrics.get(masterPhone);
    if (metrics) {
      metrics.failureCount24h = 0;
      metrics.totalFailures = 0;
      this.logger.info(`Reset failure metrics for ${masterPhone}`);
    }
  }

  /**
   * Get health report for monitoring dashboard
   */
  getHealthReport() {
    const statuses = this.getAllMasterStatuses();
    const healthyCount = statuses.filter(s => s.isHealthy).length;
    const degradedCount = statuses.filter(s => s.isDegraded).length;
    const failedCount = statuses.filter(s => s.isFailed).length;
    
    return {
      timestamp: new Date(),
      totalMasters: statuses.length,
      healthyCount,
      degradedCount,
      failedCount,
      healthPercentage: (healthyCount / statuses.length) * 100,
      statuses,
      metrics: Array.from(this.failureMetrics.values()),
    };
  }

  /**
   * Check if any master is healthy
   */
  hasHealthyMaster() {
    return this.getAllMasterStatuses().some(s => s.isHealthy);
  }

  /**
   * Get healthy masters
   */
  getHealthyMasters() {
    return this.getAllMasterStatuses().filter(s => s.isHealthy);
  }

  /**
   * Get failed masters
   */
  getFailedMasters() {
    return this.getAllMasterStatuses().filter(s => s.isFailed);
  }

  /**
   * Get degraded masters
   */
  getDegradedMasters() {
    return this.getAllMasterStatuses().filter(s => s.isDegraded);
  }
}

export default FailoverDetectionService;
