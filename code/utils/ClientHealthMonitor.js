const logger = {
  info: (msg) => console.log(`[HealthMonitor] ℹ️  ${msg}`),
  warn: (msg) => console.log(`[HealthMonitor] ⚠️  ${msg}`),
  error: (msg) => console.error(`[HealthMonitor] ❌ ${msg}`),
  debug: (msg) => console.log(`[HealthMonitor] 🐛 ${msg}`)
};

/**
 * ClientHealthMonitor - Detects and recovers from frame detachment and connection issues
 * 
 * Problem being solved:
 * - "Attempted to use detached Frame" errors from Puppeteer
 * - Heartbeat timeouts on idle connections
 * - Stale sessions causing message failures
 * 
 * Solution:
 * - Periodic health checks via test messages
 * - Frame recovery with auto-reload
 * - Connection pooling to reuse stable sessions
 * - Health metrics tracking
 */
class ClientHealthMonitor {
  
  // Configuration
  HEALTH_CHECK_INTERVAL = 30000;        // 30 seconds
  HEARTBEAT_THRESHOLD = 60000;          // 60 seconds timeout
  MAX_RECOVERY_ATTEMPTS = 3;
  RECOVERY_COOLDOWN = 5000;             // 5 seconds between recovery attempts
  
  constructor() {
    this.clients = new Map();            // Map of clientId -> health data
    this.checkIntervals = new Map();     // Map of clientId -> interval IDs
    this.recoveryAttempts = new Map();   // Track recovery attempts
    this.healthMetrics = new Map();      // Track health history
  }
  
  /**
   * Register a client for health monitoring
   */
  registerClient(clientId, client) {
    try {
      if (!clientId || !client) {
        throw new Error('Missing clientId or client instance');
      }
      
      // Initialize health data
      this.clients.set(clientId, {
        clientId,
        client,
        status: 'healthy',
        lastHealthCheckAt: null,
        lastMessageAt: null,
        frameDetachmentCount: 0,
        recoveryCount: 0,
        consecutiveFailures: 0,
        registeredAt: new Date(),
        isHealthy: true
      });
      
      // Initialize metrics
      this.healthMetrics.set(clientId, []);
      this.recoveryAttempts.set(clientId, 0);
      
      logger.info(`Registered client for health monitoring: ${clientId}`);
      
      // Start health checks
      this.startHealthChecks(clientId);
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to register client: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Unregister a client from monitoring
   */
  unregisterClient(clientId) {
    try {
      // Stop health checks
      this.stopHealthChecks(clientId);
      
      // Clean up data
      this.clients.delete(clientId);
      this.healthMetrics.delete(clientId);
      this.recoveryAttempts.delete(clientId);
      
      logger.info(`Unregistered client from health monitoring: ${clientId}`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to unregister client: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Start periodic health checks for a client
   */
  startHealthChecks(clientId) {
    try {
      // Stop existing interval if any
      this.stopHealthChecks(clientId);
      
      // Start new interval
      const intervalId = setInterval(async () => {
        await this.checkHealth(clientId);
      }, this.HEALTH_CHECK_INTERVAL);
      
      this.checkIntervals.set(clientId, intervalId);
      
      logger.debug(`Health checks started for ${clientId} (interval: ${this.HEALTH_CHECK_INTERVAL}ms)`);
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to start health checks: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Stop health checks for a client
   */
  stopHealthChecks(clientId) {
    try {
      const intervalId = this.checkIntervals.get(clientId);
      
      if (intervalId) {
        clearInterval(intervalId);
        this.checkIntervals.delete(clientId);
        logger.debug(`Health checks stopped for ${clientId}`);
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to stop health checks: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check health of a client
   */
  async checkHealth(clientId) {
    try {
      const healthData = this.clients.get(clientId);
      
      if (!healthData) {
        return { success: false, error: 'Client not found' };
      }
      
      const client = healthData.client;
      
      // Check if client is still connected
      if (!client.pupPage || !client.pupBrowser) {
        logger.warn(`${clientId}: Missing page or browser`);
        await this.handleUnhealthyClient(clientId, 'missing_resources');
        return { healthy: false, reason: 'missing_resources' };
      }
      
      // Check if page is still valid
      try {
        const url = await Promise.race([
          client.pupPage.url(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Page check timeout')), 5000)
          )
        ]);
        
        if (!url) {
          throw new Error('Page URL is empty');
        }
      } catch (error) {
        logger.warn(`${clientId}: Page health check failed - ${error.message}`);
        await this.handleUnhealthyClient(clientId, 'page_error');
        return { healthy: false, reason: 'page_error' };
      }
      
      // Update health status
      healthData.lastHealthCheckAt = new Date();
      healthData.status = 'healthy';
      healthData.consecutiveFailures = 0;
      
      // Record metric
      this.recordMetric(clientId, 'healthy');
      
      logger.debug(`${clientId}: Health check passed`);
      
      return { healthy: true };
      
    } catch (error) {
      logger.error(`Health check failed for ${clientId}: ${error.message}`);
      await this.handleUnhealthyClient(clientId, 'check_failed');
      return { healthy: false, reason: 'check_failed' };
    }
  }
  
  /**
   * Handle unhealthy client (frame detachment, timeout, etc.)
   * @private
   */
  async handleUnhealthyClient(clientId, reason) {
    try {
      const healthData = this.clients.get(clientId);
      
      if (!healthData) return;
      
      healthData.consecutiveFailures = (healthData.consecutiveFailures || 0) + 1;
      healthData.status = 'unhealthy';
      
      if (reason === 'detached_frame') {
        healthData.frameDetachmentCount++;
      }
      
      logger.warn(`${clientId}: Unhealthy (${reason}), consecutive failures: ${healthData.consecutiveFailures}`);
      
      // Attempt recovery
      if (healthData.consecutiveFailures >= 2) {
        await this.attemptRecovery(clientId, reason);
      }
      
      // Record metric
      this.recordMetric(clientId, 'unhealthy', reason);
      
    } catch (error) {
      logger.error(`Error handling unhealthy client: ${error.message}`);
    }
  }
  
  /**
   * Attempt to recover unhealthy client
   */
  async attemptRecovery(clientId, reason) {
    try {
      const healthData = this.clients.get(clientId);
      const recoveryCount = this.recoveryAttempts.get(clientId) || 0;
      
      if (!healthData) return { success: false };
      
      // Check recovery attempt limits
      if (recoveryCount >= this.MAX_RECOVERY_ATTEMPTS) {
        logger.error(`${clientId}: Max recovery attempts reached`);
        healthData.isHealthy = false;
        return { success: false, error: 'Max recovery attempts reached' };
      }
      
      logger.warn(`${clientId}: Attempting recovery (attempt ${recoveryCount + 1}/${this.MAX_RECOVERY_ATTEMPTS})...`);
      
      try {
        // Strategy 1: Reload page (fixes most frame detachment issues)
        if (reason === 'detached_frame' || reason === 'page_error') {
          logger.info(`${clientId}: Attempting page reload...`);
          
          await Promise.race([
            healthData.client.pupPage?.reload({ waitUntil: 'networkidle2' }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Page reload timeout')), 15000)
            )
          ]);
          
          logger.info(`${clientId}: Page reloaded successfully`);
          
          // Wait for WhatsApp to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          healthData.status = 'recovering';
          this.recoveryAttempts.set(clientId, recoveryCount + 1);
          
          return { success: true, strategy: 'page_reload' };
        }
        
        // Strategy 2: Reconnect (for connection issues)
        if (reason === 'missing_resources' || reason === 'check_failed') {
          logger.info(`${clientId}: Reconnecting client...`);
          
          // This would trigger WhatsApp Web reconnection
          await healthData.client.pupPage?.goto('https://web.whatsapp.com', {
            waitUntil: 'networkidle0'
          });
          
          logger.info(`${clientId}: Client reconnected`);
          
          this.recoveryAttempts.set(clientId, recoveryCount + 1);
          
          return { success: true, strategy: 'reconnect' };
        }
        
      } catch (strategyError) {
        logger.error(`${clientId}: Recovery strategy failed - ${strategyError.message}`);
        this.recoveryAttempts.set(clientId, recoveryCount + 1);
        
        return { success: false, error: strategyError.message };
      }
      
    } catch (error) {
      logger.error(`Recovery attempt failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Record frame detachment error
   * Call this when you catch "detached Frame" error
   */
  async recordFrameDetachment(clientId, error) {
    try {
      logger.warn(`${clientId}: Frame detachment detected - ${error.message}`);
      
      await this.handleUnhealthyClient(clientId, 'detached_frame');
      
      return { success: true };
    } catch (e) {
      logger.error(`Error recording frame detachment: ${e.message}`);
      return { success: false };
    }
  }
  
  /**
   * Record successful message send (resets failure count)
   */
  recordMessageSent(clientId) {
    try {
      const healthData = this.clients.get(clientId);
      
      if (healthData) {
        healthData.lastMessageAt = new Date();
        healthData.consecutiveFailures = 0;
        healthData.status = 'healthy';
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`Error recording message send: ${error.message}`);
      return { success: false };
    }
  }
  
  /**
   * Record metric for analytics
   * @private
   */
  recordMetric(clientId, status, reason = null) {
    try {
      const metrics = this.healthMetrics.get(clientId) || [];
      
      metrics.push({
        timestamp: new Date(),
        status,
        reason
      });
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      this.healthMetrics.set(clientId, metrics);
    } catch (error) {
      logger.debug(`Error recording metric: ${error.message}`);
    }
  }
  
  /**
   * Get client health status
   */
  getClientHealth(clientId) {
    try {
      const healthData = this.clients.get(clientId);
      
      if (!healthData) {
        return { success: false, error: 'Client not found' };
      }
      
      const metrics = this.healthMetrics.get(clientId) || [];
      const healthyMetrics = metrics.filter(m => m.status === 'healthy').length;
      const healthPercentage = metrics.length > 0
        ? (healthyMetrics / metrics.length * 100).toFixed(2)
        : 0;
      
      return {
        success: true,
        health: {
          clientId,
          status: healthData.status,
          isHealthy: healthData.isHealthy,
          consecutiveFailures: healthData.consecutiveFailures,
          frameDetachmentCount: healthData.frameDetachmentCount,
          recoveryCount: healthData.recoveryCount,
          healthPercentage: healthPercentage + '%',
          lastHealthCheckAt: healthData.lastHealthCheckAt,
          lastMessageAt: healthData.lastMessageAt,
          registeredAt: healthData.registeredAt,
          uptime: this._calculateUptime(healthData.registeredAt)
        }
      };
    } catch (error) {
      logger.error(`Failed to get client health: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all clients health summary
   */
  getAllClientsHealth() {
    try {
      const summary = {
        totalClients: this.clients.size,
        healthyCount: 0,
        unhealthyCount: 0,
        clients: []
      };
      
      for (const [clientId, healthData] of this.clients) {
        if (healthData.isHealthy) {
          summary.healthyCount++;
        } else {
          summary.unhealthyCount++;
        }
        
        summary.clients.push({
          clientId,
          status: healthData.status,
          consecutiveFailures: healthData.consecutiveFailures,
          frameDetachments: healthData.frameDetachmentCount
        });
      }
      
      return { success: true, summary };
    } catch (error) {
      logger.error(`Failed to get all clients health: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Calculate uptime
   * @private
   */
  _calculateUptime(registeredAt) {
    const uptimeMs = Date.now() - registeredAt;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);
    
    if (uptimeDays > 0) {
      return `${uptimeDays}d ${uptimeHours % 24}h`;
    } else if (uptimeHours > 0) {
      return `${uptimeHours}h ${uptimeMinutes % 60}m`;
    } else {
      return `${uptimeMinutes}m`;
    }
  }
  
  /**
   * Stop monitoring all clients
   */
  stopAll() {
    try {
      const clientIds = Array.from(this.clients.keys());
      
      for (const clientId of clientIds) {
        this.unregisterClient(clientId);
      }
      
      logger.info(`Stopped monitoring ${clientIds.length} clients`);
      
      return { success: true, stoppedCount: clientIds.length };
    } catch (error) {
      logger.error(`Failed to stop all monitoring: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new ClientHealthMonitor();
