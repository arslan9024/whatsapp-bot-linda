/**
 * Operational Analytics Service (Session 16 - Phase 5)
 * 
 * Tracks bot interactions with organized sheet:
 * - Code lookups
 * - Property/contact queries
 * - New records created
 * - Cache hit rates
 * - System performance
 * 
 * Aggregates data hourly and writes daily summaries to Analytics tab
 * 
 * Usage:
 *   import { OperationalAnalytics } from './OperationalAnalytics.js';
 *   const analytics = new OperationalAnalytics(organizerSheetId);
 *   
 *   analytics.logInteraction({
 *     type: 'code_lookup',
 *     code: 'P00001',
 *     responseTime: 234
 *   });
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class OperationalAnalytics {
  constructor(organizerSheetId) {
    this.organizerSheetId = organizerSheetId;
    this.sheets = null;
    this.auth = null;

    // In-memory aggregation
    this.hourlyStats = {
      timestamp: new Date(),
      interactions: [],  // All interactions this hour
      summary: this.initHourlySummary()
    };

    // File-based logging (fallback if sheet write fails)
    this.logFile = path.join(__dirname, '../../logs/analytics.log');
  }

  /**
   * Initialize hourly summary structure
   * @private
   */
  initHourlySummary() {
    return {
      totalInteractions: 0,
      byType: {
        code_lookup: 0,
        property_query: 0,
        contact_query: 0,
        contact_created: 0,
        property_created: 0,
        contact_updated: 0,
        property_updated: 0,
        cache_hit: 0,
        cache_miss: 0,
        api_call: 0
      },
      topCodes: {},  // { code: count }
      topProperties: {},
      topContacts: {},
      avgResponseTime: 0,
      responseTimes: [],
      errors: 0,
      chatsWith: {},  // { phoneNumber: interactionCount }
    };
  }

  /**
   * Initialize service with Google Sheets auth
   */
  async initialize(credentials) {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ OperationalAnalytics initialized');
      return true;
    } catch (error) {
      console.error('❌ Analytics init failed:', error.message);
      return false;
    }
  }

  /**
   * Log an interaction
   * @param {Object} interaction - Interaction to log
   * @example
   *   logInteraction({
   *     type: 'code_lookup',
   *     code: 'P00001',
   *     responseTime: 234,
   *     fromNumber: '971501234567',
   *     success: true
   *   })
   */
  logInteraction(interaction) {
    const enriched = {
      ...interaction,
      timestamp: new Date().toISOString(),
      hour: new Date().getHours()
    };

    // Add to in-memory storage
    this.hourlyStats.interactions.push(enriched);
    
    // Update summary counts
    if (enriched.type in this.hourlyStats.summary.byType) {
      this.hourlyStats.summary.byType[enriched.type]++;
    }
    this.hourlyStats.summary.totalInteractions++;

    // Track top codes/properties
    if (enriched.code) {
      this.hourlyStats.summary.topCodes[enriched.code] = 
        (this.hourlyStats.summary.topCodes[enriched.code] || 0) + 1;
    }

    if (enriched.property) {
      this.hourlyStats.summary.topProperties[enriched.property] = 
        (this.hourlyStats.summary.topProperties[enriched.property] || 0) + 1;
    }

    if (enriched.contact) {
      this.hourlyStats.summary.topContacts[enriched.contact] = 
        (this.hourlyStats.summary.topContacts[enriched.contact] || 0) + 1;
    }

    // Track response times
    if (enriched.responseTime) {
      this.hourlyStats.summary.responseTimes.push(enriched.responseTime);
      this.hourlyStats.summary.avgResponseTime = 
        this.hourlyStats.summary.responseTimes.reduce((a, b) => a + b, 0) / 
        this.hourlyStats.summary.responseTimes.length;
    }

    // Track errors
    if (!enriched.success) {
      this.hourlyStats.summary.errors++;
    }

    // Track chats
    if (enriched.fromNumber) {
      this.hourlyStats.summary.chatsWith[enriched.fromNumber] = 
        (this.hourlyStats.summary.chatsWith[enriched.fromNumber] || 0) + 1;
    }

    // Also log to file (for persistence)
    this.logToFile(enriched);
  }

  /**
   * Get hourly summary
   */
  getHourlySummary() {
    const summary = { ...this.hourlyStats.summary };
    
    // Convert object counts to sorted arrays
    summary.topCodes = this.sortObjectByValue(summary.topCodes, 10);
    summary.topProperties = this.sortObjectByValue(summary.topProperties, 10);
    summary.topContacts = this.sortObjectByValue(summary.topContacts, 10);
    summary.chatsWith = this.sortObjectByValue(summary.chatsWith, 20);

    return summary;
  }

  /**
   * Get cache statistics (if DataContextService reports it)
   */
  getCacheStats() {
    const totalInteractions = this.hourlyStats.summary.totalInteractions;
    const cacheHits = this.hourlyStats.summary.byType.cache_hit;
    const cacheMisses = this.hourlyStats.summary.byType.cache_miss;
    
    const totalCacheOps = cacheHits + cacheMisses;
    const hitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps * 100).toFixed(2) : 'N/A';

    return {
      cacheHits,
      cacheMisses,
      totalOps: totalCacheOps,
      hitRate: `${hitRate}%`,
      avgResponseTime: this.hourlyStats.summary.avgResponseTime.toFixed(2) + 'ms'
    };
  }

  /**
   * Write daily summary to Analytics sheet
   * Called once per day (every 24 hours)
   */
  async writeDailySummary() {
    if (!this.sheets) {
      console.warn('⚠️  Analytics sheet not initialized, skipping daily write');
      return false;
    }

    try {
      console.log('\n📊 Writing daily analytics summary...');

      const summary = this.getHourlySummary();
      const today = new Date().toISOString().split('T')[0];

      // Build summary row
      const summaryRow = [
        today,
        summary.totalInteractions,
        summary.byType.code_lookup,
        summary.byType.property_query,
        summary.byType.contact_created,
        summary.byType.cache_hit,
        summary.byType.cache_miss,
        summary.errors,
        summary.avgResponseTime.toFixed(2),
        Object.keys(summary.topCodes).slice(0, 5).join(', '),
        Object.keys(summary.chatsWith).length,
        new Date().toISOString()
      ];

      // Append to Analytics tab
      const result = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.organizerSheetId,
        range: 'Analytics!A:L',
        valueInputOption: 'RAW',
        requestBody: {
          values: [summaryRow],
        },
      });

      console.log('✅ Daily summary written to Analytics tab');
      return true;

    } catch (error) {
      console.error('❌ Failed to write daily summary:', error.message);
      return false;
    }
  }

  /**
   * Reset hourly stats (called when hour changes)
   */
  resetHourly() {
    console.log('🔄 Resetting hourly analytics...');
    this.hourlyStats = {
      timestamp: new Date(),
      interactions: [],
      summary: this.initHourlySummary()
    };
  }

  /**
   * Check if hour has changed and reset if needed
   */
  checkHourChange() {
    const now = new Date();
    const currentHour = now.getHours();
    const previousHour = this.hourlyStats.timestamp.getHours();

    if (currentHour !== previousHour) {
      this.resetHourly();
      return true;
    }
    return false;
  }

  /**
   * Log interaction to file (fallback)
   * @private
   */
  logToFile(interaction) {
    try {
      const logsDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logEntry = JSON.stringify(interaction) + '\n';
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.warn('⚠️  Could not write to analytics log:', error.message);
    }
  }

  /**
   * Sort object by values and return top N
   * @private
   */
  sortObjectByValue(obj, topN = 10) {
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .reduce((result, [key, value]) => {
        result[key] = value;
        return result;
      }, {});
  }

  /**
   * Generate formatted report for logging
   */
  generateReport() {
    const summary = this.getHourlySummary();
    const cacheStats = this.getCacheStats();

    return `
╔════════════════════════════════════════════════════════════╗
║          OPERATIONAL ANALYTICS REPORT                      ║
╚════════════════════════════════════════════════════════════╝

📊 HOURLY SUMMARY:
   Total Interactions: ${summary.totalInteractions}
   Code Lookups: ${summary.byType.code_lookup}
   Property Queries: ${summary.byType.property_query}
   Contact Queries: ${summary.byType.contact_query}
   New Records: ${summary.byType.contact_created + summary.byType.property_created}
   Errors: ${summary.byType.error}

💾 CACHE PERFORMANCE:
   Hit Rate: ${cacheStats.hitRate}
   Avg Response Time: ${cacheStats.avgResponseTime}
   Cache Hits: ${cacheStats.cacheHits}
   Cache Misses: ${cacheStats.cacheMisses}

🔝 TOP CODES (Last Hour):
${Object.entries(summary.topCodes).slice(0, 5)
  .map(([code, count]) => `   ${code}: ${count}`)
  .join('\n') || '   None'}

👥 ACTIVE CHATS:
   Unique Numbers: ${Object.keys(summary.chatsWith).length}
`;
  }

  /**
   * Print hourly report to console
   */
  printReport() {
    console.log(this.generateReport());
  }
}

export default OperationalAnalytics;
