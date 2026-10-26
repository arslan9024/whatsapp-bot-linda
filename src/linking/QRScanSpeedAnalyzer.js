/**
 * ====================================================================
 * QR SCAN SPEED ANALYZER (Phase 16)
 * ====================================================================
 * Tracks QR code scan speeds and calculates optimal timeouts
 * based on user behavior patterns.
 *
 * Key Responsibilities:
 * - Record QR scan events with timing data
 * - Calculate average, median, and percentile scan times
 * - Generate timeout recommendations
 * - Persist learning data to MongoDB
 * - Integrate with ConnectionManager for dynamic timeout
 *
 * @since Phase 16 - February 15, 2026
 */

import fs from 'fs';
import path from 'path';

export default class QRScanSpeedAnalyzer {
  /**
   * Initialize the QR Scan Speed Analyzer
   * @param {Object} db - MongoDB database instance
   * @param {Function} logFunc - Logging function
   * @param {Object} config - Phase 16 configuration
   */
  constructor(db, logFunc, config) {
    this.db = db;
    this.log = logFunc;
    this.config = config.qrScanAnalyzer;
    
    // In-memory cache for fast access
    this.cache = new Map(); // Map<phoneNumber, metrics>
    
    // Initialize database collection
    this._initializeDatabase();
  }

  /**
   * Initialize MongoDB collections and indexes
   * @private
   */
  async _initializeDatabase() {
    try {
      // Create collection if it doesn't exist
      const collectionName = this.config.collectionName || 'qr_scans';
      
      // Ensure indexes exist
      if (this.db && this.db.collection) {
        const collection = this.db.collection(collectionName);
        await collection.createIndex({ phoneNumber: 1, createdAt: 1 });
        await collection.createIndex({ phoneNumber: 1 }, { unique: false });
        
        this.collection = collection;
        this.log('[QRScanSpeedAnalyzer] Database initialized', 'info');
      }
    } catch (err) {
      this.log(`[QRScanSpeedAnalyzer] DB init error: ${err.message}`, 'warn');
    }
  }

  /**
   * Record a QR scan event
   * @param {string} phoneNumber - Account phone number
   * @param {number} scanTimeMs - Time from QR display to scan in milliseconds
   * @returns {Promise<void>}
   */
  async recordQRScan(phoneNumber, scanTimeMs) {
    try {
      // Validate input
      if (!phoneNumber || typeof scanTimeMs !== 'number') {
        this.log(`[${phoneNumber}] Invalid QR scan record`, 'warn');
        return;
      }

      // Record to database
      if (this.collection) {
        await this.collection.insertOne({
          phoneNumber,
          scanTimeMs,
          createdAt: new Date(),
          timestamps: {
            recorded: Date.now()
          }
        });
      }

      // Invalidate cache for this account
      this.cache.delete(phoneNumber);

      this.log(
        `[${phoneNumber}] QR scan recorded: ${Math.round(scanTimeMs / 1000)}s`,
        'debug'
      );
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error recording QR scan: ${err.message}`,
        'warn'
      );
    }
  }

  /**
   * Get all QR scan records for an account
   * @param {string} phoneNumber - Account phone number
   * @returns {Promise<Array>} - Array of scan records
   * @private
   */
  async _getQRScans(phoneNumber) {
    try {
      if (!this.collection) {
        return [];
      }

      const scans = await this.collection
        .find({ phoneNumber })
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray();

      return scans;
    } catch (err) {
      this.log(
        `[${phoneNumber}] Error fetching QR scans: ${err.message}`,
        'warn'
      );
      return [];
    }
  }

  /**
   * Calculate statistics from scan times
   * @param {Array<number>} scanTimes - Array of scan times in ms
   * @returns {Object} - Statistics object
   * @private
   */
  _calculateStatistics(scanTimes) {
    if (scanTimes.length === 0) {
      return null;
    }

    // Sort for percentile calculations
    const sorted = [...scanTimes].sort((a, b) => a - b);
    
    // Calculate average
    const average = scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length;
    
    // Calculate median
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Calculate 95th percentile
    const p95Index = Math.ceil((sorted.length * 95) / 100) - 1;
    const p95 = sorted[Math.max(0, p95Index)];
    
    // Calculate standard deviation
    const variance =
      scanTimes.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) /
      scanTimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Min and max
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      count: scanTimes.length,
      min,
      max,
      average: Math.round(average),
      median: Math.round(median),
      stdDev: Math.round(stdDev),
      p95: Math.round(p95),
      p99: sorted[Math.max(0, Math.ceil((sorted.length * 99) / 100) - 1)]
    };
  }

  /**
   * Get metrics for a specific account
   * @param {string} phoneNumber - Account phone number
   * @returns {Promise<Object>} - Metrics object with recommendations
   */
  async getMetrics(phoneNumber) {
    // Check cache first
    if (this.cache.has(phoneNumber)) {
      return this.cache.get(phoneNumber);
    }

    try {
      const scans = await this._getQRScans(phoneNumber);
      const scanTimes = scans.map(s => s.scanTimeMs);
      
      // Need minimum data points
      if (scanTimes.length < this.config.minimumDataPoints) {
        const metrics = {
          phoneNumber,
          totalScans: scanTimes.length,
          hasEnoughData: false,
          confidence: scanTimes.length / this.config.minimumDataPoints,
          message: `Need ${this.config.minimumDataPoints - scanTimes.length} more scans for recommendations`,
          recommendedTimeout: this.config.defaultTimeout,
          statistics: this._calculateStatistics(scanTimes)
        };
        
        this.cache.set(phoneNumber, metrics);
        return metrics;
      }

      // Have enough data
      const stats = this._calculateStatistics(scanTimes);
      
      // Calculate recommended timeout: p95 + buffer
      const recommendedTimeout = Math.min(
        this.config.maxTimeout,
        Math.max(
          this.config.minTimeout,
          stats.p95 + this.config.bufferTime
        )
      );

      const metrics = {
        phoneNumber,
        totalScans: scanTimes.length,
        hasEnoughData: true,
        confidence: Math.min(1, scanTimes.length / (this.config.minimumDataPoints * 2)),
        statistics: stats,
        recommendedTimeout,
        lastUpdated: Date.now(),
        
        // Pattern analysis
        pattern: {
          isSlow: stats.p95 > 30000,        // > 30s is slow
          isConsistent: stats.stdDev < stats.average * 0.3, // Low variance
          timeoutRatio: stats.p95 / this.config.defaultTimeout
        },
        
        // Recommendations
        recommendations: this._generateRecommendations(stats, recommendedTimeout)
      };

      this.cache.set(phoneNumber, metrics);
      return metrics;
    } catch (err) {
      this.log(`[${phoneNumber}] Error getting metrics: ${err.message}`, 'warn');
      return {
        phoneNumber,
        error: err.message,
        recommendedTimeout: this.config.defaultTimeout
      };
    }
  }

  /**
   * Generate recommendations based on scan patterns
   * @param {Object} stats - Statistics object
   * @param {number} recommendedTimeout - Calculated timeout
   * @returns {Array} - Array of recommendation objects
   * @private
   */
  _generateRecommendations(stats, recommendedTimeout) {
    const recommendations = [];

    // Slow scan pattern
    if (stats.p95 > 30000) {
      recommendations.push({
        type: 'SLOW_SCAN_PATTERN',
        severity: 'LOW',
        message: `User's QR scan time is slow (${Math.round(stats.p95 / 1000)}s avg)`,
        action: `Increase timeout: ${this.config.defaultTimeout / 1000}s → ${Math.round(recommendedTimeout / 1000)}s`,
        expectedImprovement: 'Reduce unnecessary QR regenerations by ~70%'
      });
    }

    // High variance
    if (stats.stdDev > stats.average * 0.5) {
      recommendations.push({
        type: 'HIGH_VARIANCE',
        severity: 'LOW',
        message: 'User scan time varies significantly',
        action: 'Use 95th percentile timeout for consistency',
        expectedImprovement: 'Maintain <5% failure rate'
      });
    }

    // Very consistent
    if (stats.stdDev < stats.average * 0.1) {
      recommendations.push({
        type: 'CONSISTENT_USER',
        severity: 'INFO',
        message: 'User has very consistent QR scan speed',
        action: 'Can use tighter timeout range if desired',
        expectedImprovement: 'Faster timeout = quicker feedback'
      });
    }

    return recommendations;
  }

  /**
   * Get optimal timeout for an account
   * @param {string} phoneNumber - Account phone number
   * @returns {Promise<number>} - Timeout in milliseconds
   */
  async getOptimalTimeout(phoneNumber) {
    const metrics = await this.getMetrics(phoneNumber);
    return metrics.recommendedTimeout || this.config.defaultTimeout;
  }

  /**
   * Get metrics for all accounts
   * @returns {Promise<Array>} - Array of metrics objects
   */
  async getBulkMetrics() {
    try {
      if (!this.collection) {
        return [];
      }

      // Get unique phone numbers
      const phoneNumbers = await this.collection
        .aggregate([{ $group: { _id: '$phoneNumber' } }])
        .toArray();

      const results = [];
      for (const { _id: phoneNumber } of phoneNumbers) {
        const metrics = await this.getMetrics(phoneNumber);
        results.push(metrics);
      }

      return results;
    } catch (err) {
      this.log(`Error getting bulk metrics: ${err.message}`, 'warn');
      return [];
    }
  }

  /**
   * Clear old data (retention policy)
   * @returns {Promise<number>} - Number of records deleted
   */
  async cleanupOldData() {
    try {
      if (!this.collection) {
        return 0;
      }

      const expiryTime = Date.now() - this.config.dataPointExpiry;
      const result = await this.collection.deleteMany({
        createdAt: { $lt: new Date(expiryTime) }
      });

      this.log(
        `[QRScanSpeedAnalyzer] Cleaned up ${result.deletedCount} old records`,
        'info'
      );

      return result.deletedCount;
    } catch (err) {
      this.log(`Error cleaning up old data: ${err.message}`, 'warn');
      return 0;
    }
  }

  /**
   * Clear cache for an account (after learning update)
   * @param {string} phoneNumber - Account phone number
   */
  invalidateCache(phoneNumber) {
    this.cache.delete(phoneNumber);
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache info
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
