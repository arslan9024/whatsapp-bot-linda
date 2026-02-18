/**
 * LoadBalancingService.js
 * Distributes load across multiple master accounts
 * 
 * Features:
 * - Multiple load balancing strategies (round-robin, priority, least-loaded)
 * - Real-time load metrics tracking
 * - Dynamic rebalancing
 * - Performance optimization
 */

import { Logger } from '../utils/logger.js';

class LoadBalancingService {
  constructor(
    failoverDetectionService,
    accountConfigManager,
    config = {}
  ) {
    this.failoverDetectionService = failoverDetectionService;
    this.accountConfigManager = accountConfigManager;
    
    // Configuration
    this.strategy = config.strategy || 'round-robin';
    this.enableMetrics = config.enableMetrics !== false;
    this.rebalanceInterval = config.rebalanceInterval || 30000;
    
    // State tracking
    this.currentRoundRobinIndex = 0;
    this.loadMetrics = new Map();
    this.distributionHistory = [];
    this.rebalanceTimer = null;
    
    // Logger
    this.logger = new Logger('LoadBalancingService');

    // Supported strategies
    this.strategies = {
      'round-robin': this._selectRoundRobin.bind(this),
      'priority': this._selectByPriority.bind(this),
      'least-loaded': this._selectLeastLoaded.bind(this),
      'geolocation': this._selectByGeolocation.bind(this),
    };
  }

  /**
   * Initialize load balancing
   */
  async initialize() {
    this.logger.info(`Initializing LoadBalancingService`, {
      strategy: this.strategy,
    });

    // Initialize metrics for all masters
    const allMasters = this.accountConfigManager.getAllMasters();
    for (const master of allMasters) {
      this._initializeMetrics(master.phoneNumber);
    }

    // Start rebalancing timer
    if (this.rebalanceInterval > 0) {
      this.rebalanceTimer = setInterval(() => {
        this._performRebalancing();
      }, this.rebalanceInterval);
    }

    this.logger.info(`LoadBalancingService initialized`);
  }

  /**
   * Shutdown load balancing
   */
  async shutdown() {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
    }
    this.logger.info(`LoadBalancingService shutdown`);
  }

  /**
   * Initialize metrics for a master
   */
  _initializeMetrics(masterPhone) {
    if (!this.loadMetrics.has(masterPhone)) {
      this.loadMetrics.set(masterPhone, {
        masterPhone,
        activeMessages: 0,
        completedMessages: 0,
        failedMessages: 0,
        averageLatency: 0,
        queueLength: 0,
        throughput: 0,
        lastUpdated: new Date(),
        loads: [], // History of loads for trending
      });
    }
  }

  /**
   * Select master for routing message
   */
  selectMasterForMessage(targetAudience = null) {
    try {
      // Get healthy masters only
      const healthyMasters = this.failoverDetectionService.getHealthyMasters();

      if (healthyMasters.length === 0) {
        this.logger.warn(`No healthy masters available`);
        // Return primary master anyway (degraded mode)
        const allMasters = this.accountConfigManager.getAllMasters();
        return allMasters.length > 0 ? allMasters[0].phoneNumber : null;
      }

      // Get master phone numbers
      const masterPhones = healthyMasters.map(s => 
        this.accountConfigManager.getMasterByStatus(s)?.phoneNumber
      ).filter(Boolean);

      if (masterPhones.length === 0) {
        return null;
      }

      // Select based on configured strategy
      let selectedMaster;
      const strategyFunction = this.strategies[this.strategy];

      if (strategyFunction) {
        selectedMaster = strategyFunction(masterPhones, targetAudience);
      } else {
        this.logger.warn(`Unknown strategy: ${this.strategy}, falling back to round-robin`);
        selectedMaster = this._selectRoundRobin(masterPhones);
      }

      // Record distribution
      if (selectedMaster) {
        this._recordDistribution(selectedMaster);
      }

      return selectedMaster;
    } catch (error) {
      this.logger.error(`Error selecting master for message`, error);
      // Fallback to first available master
      const allMasters = this.accountConfigManager.getAllMasters();
      return allMasters.length > 0 ? allMasters[0].phoneNumber : null;
    }
  }

  /**
   * Round-robin load balancing strategy
   */
  _selectRoundRobin(masterPhones) {
    const selected = masterPhones[this.currentRoundRobinIndex % masterPhones.length];
    this.currentRoundRobinIndex = (this.currentRoundRobinIndex + 1) % masterPhones.length;
    return selected;
  }

  /**
   * Priority-based load balancing strategy
   */
  _selectByPriority(masterPhones) {
    const mastersWithPriority = masterPhones
      .map(phone => ({
        phone,
        master: this.accountConfigManager.getMasterByPhone(phone),
      }))
      .filter(item => item.master)
      .sort((a, b) => (a.master.priority || 999) - (b.master.priority || 999));

    return mastersWithPriority.length > 0 ? mastersWithPriority[0].phone : masterPhones[0];
  }

  /**
   * Least-loaded strategy
   */
  _selectLeastLoaded(masterPhones) {
    let leastLoadedMaster = masterPhones[0];
    let minLoad = Infinity;

    for (const masterPhone of masterPhones) {
      const metrics = this.loadMetrics.get(masterPhone);
      const currentLoad = metrics ? metrics.activeMessages + metrics.queueLength : 0;

      if (currentLoad < minLoad) {
        minLoad = currentLoad;
        leastLoadedMaster = masterPhone;
      }
    }

    return leastLoadedMaster;
  }

  /**
   * Geolocation-based strategy
   */
  _selectByGeolocation(masterPhones, targetAudience) {
    // If target audience region is specified, prefer masters in that region
    if (!targetAudience || !targetAudience.region) {
      return this._selectRoundRobin(masterPhones);
    }

    const regionMasters = masterPhones
      .map(phone => ({
        phone,
        master: this.accountConfigManager.getMasterByPhone(phone),
      }))
      .filter(item => item.master && item.master.region === targetAudience.region);

    if (regionMasters.length > 0) {
      return regionMasters[0].phone;
    }

    // Fallback to round-robin if no regional match
    return this._selectRoundRobin(masterPhones);
  }

  /**
   * Record message distribution
   */
  _recordDistribution(masterPhone) {
    const metrics = this.loadMetrics.get(masterPhone);
    if (metrics) {
      metrics.activeMessages++;
      metrics.lastUpdated = new Date();

      // Keep distribution history
      this.distributionHistory.push({
        masterPhone,
        timestamp: new Date(),
        action: 'message-routed',
      });

      // Keep history size manageable
      if (this.distributionHistory.length > 10000) {
        this.distributionHistory.shift();
      }
    }
  }

  /**
   * Record message completion
   */
  recordMessageCompleted(masterPhone) {
    const metrics = this.loadMetrics.get(masterPhone);
    if (metrics) {
      metrics.activeMessages = Math.max(0, metrics.activeMessages - 1);
      metrics.completedMessages++;
      metrics.lastUpdated = new Date();
    }
  }

  /**
   * Record message failure
   */
  recordMessageFailed(masterPhone) {
    const metrics = this.loadMetrics.get(masterPhone);
    if (metrics) {
      metrics.activeMessages = Math.max(0, metrics.activeMessages - 1);
      metrics.failedMessages++;
      metrics.lastUpdated = new Date();
    }
  }

  /**
   * Update load metrics
   */
  updateLoadMetrics(masterPhone, metrics) {
    const existing = this.loadMetrics.get(masterPhone);
    if (existing) {
      Object.assign(existing, metrics);
      existing.lastUpdated = new Date();

      // Track load history for trending
      if (existing.loads) {
        existing.loads.push({
          activeMessages: existing.activeMessages,
          queueLength: existing.queueLength,
          timestamp: new Date(),
        });

        // Keep only last 100 samples
        if (existing.loads.length > 100) {
          existing.loads.shift();
        }
      }
    }
  }

  /**
   * Get load metrics for specific master
   */
  getLoadMetrics(masterPhone) {
    return this.loadMetrics.get(masterPhone) || null;
  }

  /**
   * Get all load metrics
   */
  getAllLoadMetrics() {
    return Array.from(this.loadMetrics.values());
  }

  /**
   * Get load distribution report
   */
  getLoadDistribution() {
    const allMetrics = this.getAllLoadMetrics();
    const totalLoad = allMetrics.reduce((sum, m) => sum + m.activeMessages, 0);
    
    const distribution = allMetrics.map(m => ({
      masterPhone: m.masterPhone,
      activeMessages: m.activeMessages,
      percentageOfLoad: totalLoad > 0 ? (m.activeMessages / totalLoad) * 100 : 0,
      completedMessages: m.completedMessages,
      failedMessages: m.failedMessages,
      queueLength: m.queueLength,
      throughput: m.throughput,
      averageLatency: m.averageLatency,
    }));

    return {
      timestamp: new Date(),
      strategy: this.strategy,
      totalLoad,
      distribution,
      balanceQuality: this._calculateBalanceQuality(distribution),
    };
  }

  /**
   * Calculate load balance quality (0-100)
   */
  _calculateBalanceQuality(distribution) {
    if (distribution.length <= 1) return 100;

    const percentages = distribution.map(d => d.percentageOfLoad);
    const ideal = 100 / distribution.length;
    
    // Calculate variance from ideal distribution
    const variance = percentages.reduce((sum, p) => {
      return sum + Math.pow(p - ideal, 2);
    }, 0) / distribution.length;

    const stdDev = Math.sqrt(variance);
    
    // Convert std dev to quality score (0-100)
    // Perfect balance = 0 std dev = 100 quality
    // Completely imbalanced = high std dev = low quality
    const quality = Math.max(0, 100 - (stdDev * 2));

    return Math.round(quality);
  }

  /**
   * Perform dynamic rebalancing if needed
   */
  async _performRebalancing() {
    try {
      const distribution = this.getLoadDistribution();
      
      // Check if rebalancing is needed
      if (distribution.balanceQuality < 70) {
        this.logger.info(`Triggering load rebalancing`, {
          currentQuality: distribution.balanceQuality,
        });

        // Log rebalancing event
        this.distributionHistory.push({
          event: 'rebalancing-triggered',
          timestamp: new Date(),
          quality: distribution.balanceQuality,
        });
      }
    } catch (error) {
      this.logger.error(`Error during rebalancing check`, error);
    }
  }

  /**
   * Update routing priorities
   */
  updateRoutingPriorities(masterPhone, priority) {
    try {
      const master = this.accountConfigManager.getMasterConfig(masterPhone);
      if (master) {
        master.priority = priority;
        this.accountConfigManager.updateMasterConfig(masterPhone, master);

        this.logger.info(`Updated routing priority`, {
          masterPhone,
          priority,
        });
      }
    } catch (error) {
      this.logger.error(`Error updating routing priority`, error);
    }
  }

  /**
   * Get distribution history
   */
  getDistributionHistory(limit = 100) {
    return this.distributionHistory.slice(-limit);
  }

  /**
   * Get load trending for master
   */
  getLoadTrending(masterPhone, samples = 50) {
    const metrics = this.loadMetrics.get(masterPhone);
    if (!metrics || !metrics.loads) {
      return [];
    }

    return metrics.loads.slice(-samples);
  }

  /**
   * Change load balancing strategy
   */
  setStrategy(newStrategy) {
    if (!this.strategies[newStrategy]) {
      this.logger.warn(`Unknown strategy: ${newStrategy}`);
      return false;
    }

    const oldStrategy = this.strategy;
    this.strategy = newStrategy;
    this.currentRoundRobinIndex = 0;

    this.logger.info(`Changed load balancing strategy`, {
      from: oldStrategy,
      to: newStrategy,
    });

    return true;
  }

  /**
   * Get current strategy
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Get list of available strategies
   */
  getAvailableStrategies() {
    return Object.keys(this.strategies);
  }
}

export default LoadBalancingService;
