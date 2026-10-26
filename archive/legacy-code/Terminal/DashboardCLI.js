/**
 * TERMINAL DASHBOARD CLI - DAMAC HILLS 2
 * 
 * Provides terminal-based dashboard commands for monitoring and managing
 * the DAMAC Hills 2 property system
 * 
 * Commands:
 * - dashboard show
 * - stats owners
 * - stats contacts
 * - stats properties
 * - quality score
 * - activity recent
 * - migration status
 * - data summary
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 19, 2026
 */

import DashboardDataService from '../Database/DashboardDataService.js';
import DataMigrationService from '../Database/DataMigrationService.js';

class DashboardCLI {
  /**
   * Terminal dashboard command handler
   * 
   * @param {String} command - Command to execute
   * @param {Object} args - Command arguments
   * @param {String} userEmail - User executing command
   * @returns {Promise<String>} Formatted output
   */
  static async handleCommand(command, args = {}, userEmail = 'terminal') {
    try {
      switch (command) {
        case 'dashboard':
        case 'dashboard:show':
          return await this.showDashboard();
        
        case 'stats:owners':
          return await this.showOwnerStats();
        
        case 'stats:contacts':
          return await this.showContactStats();
        
        case 'stats:properties':
          return await this.showPropertyStats();
        
        case 'quality:score':
          return await this.showQualityScore();
        
        case 'activity:recent':
          const limit = args.limit || 10;
          return await this.showRecentActivity(limit);
        
        case 'migration:status':
          return await this.showMigrationStatus();
        
        case 'data:summary':
          return await this.generateDataSummary();
        
        case 'portfolio':
          const ownerId = args.id || args.ownerId;
          return await this.showOwnerPortfolio(ownerId);
        
        case 'help':
        case 'dashboard:help':
          return this.showHelp();
        
        default:
          return `Unknown dashboard command: ${command}\nType 'dashboard help' for available commands`;
      }
    } catch (error) {
      return `Error executing dashboard command: ${error.message}`;
    }
  }

  /**
   * Show main dashboard
   */
  static async showDashboard() {
    const overview = await DashboardDataService.getDashboardOverview();
    const quality = await DashboardDataService.getDataQualityScore();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                    DAMAC HILLS 2 - MAIN DASHBOARD                          ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SYSTEM OVERVIEW
──────────────────────────────────────────────────────────────────────────────
`;

    Object.entries(overview.overview).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorNumber(value)}\n`;
    });

    output += `\n📈 KEY METRICS\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(overview.metrics).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorMetric(value)}\n`;
    });

    output += `\n✅ DATA QUALITY: ${this._colorQuality(quality.overallScore)} (${quality.rating})\n`;
    if (quality.issues.length > 0) {
      output += `\n⚠️  ISSUES:\n`;
      quality.issues.forEach(issue => {
        output += `  • ${issue}\n`;
      });
    }

    output += `\n\nℹ️  Use 'stats owners', 'stats contacts', 'stats properties' for detailed statistics\n`;
    output += `🔧 Use 'quality score' to see data quality details\n`;
    output += `📋 Use 'activity recent' to see recent changes\n`;

    return output;
  }

  /**
   * Show owner statistics
   */
  static async showOwnerStats() {
    const stats = await DashboardDataService.getOwnerStatistics();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                       OWNER STATISTICS                                      ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
──────────────────────────────────────────────────────────────────────────────
`;

    Object.entries(stats.summary).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorNumber(value)}\n`;
    });

    output += `\n📋 OWNERSHIP TYPES\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.byType).forEach(([type, count]) => {
      const bar = this._makeProgressBar(count, stats.summary['Total Owners']);
      output += `  ${this._padRight(type, 20)}: ${bar} ${count}\n`;
    });

    output += `\n🏙️  TOP CITIES\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.topCities).forEach(([city, count]) => {
      const bar = this._makeProgressBar(count, Math.max(...Object.values(stats.topCities)));
      output += `  ${this._padRight(city, 20)}: ${bar} ${count}\n`;
    });

    output += `\n📈 VERIFICATION RATES\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.rates).forEach(([metric, value]) => {
      output += `  ${this._padRight(metric, 35)}: ${this._colorMetric(value + '%')}\n`;
    });

    return output;
  }

  /**
   * Show contact statistics
   */
  static async showContactStats() {
    const stats = await DashboardDataService.getContactStatistics();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                      CONTACT STATISTICS                                     ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
──────────────────────────────────────────────────────────────────────────────
`;

    Object.entries(stats.summary).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorNumber(value)}\n`;
    });

    output += `\n👥 CONTACTS BY TYPE\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.byType).forEach(([type, count]) => {
      const bar = this._makeProgressBar(count, stats.summary['Total Contacts']);
      output += `  ${this._padRight(type, 20)}: ${bar} ${count}\n`;
    });

    output += `\n💼 CONTACTS BY ROLE\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.byRole).forEach(([role, count]) => {
      const bar = this._makeProgressBar(count, Math.max(...Object.values(stats.byRole)));
      output += `  ${this._padRight(role || 'unassigned', 20)}: ${bar} ${count}\n`;
    });

    return output;
  }

  /**
   * Show property statistics
   */
  static async showPropertyStats() {
    const stats = await DashboardDataService.getPropertyStatistics();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                     PROPERTY STATISTICS                                     ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
──────────────────────────────────────────────────────────────────────────────
`;

    Object.entries(stats.summary).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorNumber(value)}\n`;
    });

    output += `\n💰 FINANCIAL INFORMATION\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.financials).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorMoney(value)}\n`;
    });

    output += `\n📈 OCCUPANCY\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(stats.occupancy).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${this._colorMetric(value)}\n`;
    });

    return output;
  }

  /**
   * Show data quality score
   */
  static async showQualityScore() {
    const quality = await DashboardDataService.getDataQualityScore();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                      DATA QUALITY ASSESSMENT                                ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 OVERALL SCORE: ${this._colorQuality(quality.overallScore)} / 100
📈 RATING: ${this._ratingBadge(quality.rating)}
📋 TOTAL RECORDS: ${quality.total_records}

`;

    const scoreNum = parseFloat(quality.overallScore);
    const barLength = Math.round(scoreNum / 5);
    const emptyLength = 20 - barLength;
    output += `  Quality Bar: [${'█'.repeat(barLength)}${'░'.repeat(emptyLength)}]\n\n`;

    output += `⚠️  IDENTIFIED ISSUES:\n──────────────────────────────────────────────────────────────────────────────\n`;
    if (quality.issues.length === 0 || !quality.issues[0].includes('No issues')) {
      quality.issues.forEach(issue => {
        output += `  ✗ ${issue}\n`;
      });
    } else {
      output += `  ✓ No critical issues found\n`;
    }

    output += `\n💡 RECOMMENDATIONS:\n──────────────────────────────────────────────────────────────────────────────\n`;
    quality.recommendations.forEach(rec => {
      output += `  → ${rec}\n`;
    });

    return output;
  }

  /**
   * Show recent activity
   */
  static async showRecentActivity(limit = 10) {
    const activity = await DashboardDataService.getRecentActivity(limit);

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                        RECENT ACTIVITY LOG                                  ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 Last ${activity.count} Activities
──────────────────────────────────────────────────────────────────────────────
`;

    activity.activities.forEach((act, index) => {
      const date = new Date(act.date).toLocaleString();
      output += `\n${index + 1}. [${date}]\n`;
      output += `   User: ${act.user}\n`;
      output += `   Action: ${act.action}\n`;
      output += `   Entity: ${act.entity} (${act.entityId})\n`;
      output += `   Changes: ${act.changes} field(s)\n`;
      output += `   Status: ${act.status}\n`;
    });

    return output;
  }

  /**
   * Show migration status
   */
  static async showMigrationStatus() {
    const status = await DataMigrationService.getMigrationStatus();

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                      MIGRATION STATUS                                       ║
║                         ${new Date().toLocaleTimeString()}                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 DATABASE COLLECTIONS
──────────────────────────────────────────────────────────────────────────────
`;

    Object.entries(status).forEach(([key, value]) => {
      if (key !== 'timestamp' && key !== 'summary' && typeof value === 'number') {
        output += `  ${this._padRight(key, 35)}: ${this._colorNumber(value)}\n`;
      }
    });

    if (status.summary) {
      output += `\n📈 SUMMARY\n──────────────────────────────────────────────────────────────────────────────\n`;
      output += `  Total Entities: ${status.summary.totalEntities}\n`;
      output += `  Migration Status: ${this._colorSuccess(status.summary.completeness)}\n`;
    }

    return output;
  }

  /**
   * Generate comprehensive data summary
   */
  static async generateDataSummary() {
    return await DashboardDataService.generateSummaryReport();
  }

  /**
   * Show portfolio for specific owner
   */
  static async showOwnerPortfolio(ownerId) {
    if (!ownerId) {
      return 'Error: ownerId is required. Usage: portfolio --id OWNER_ID';
    }

    const portfolio = await DashboardDataService.getOwnerPortfolio(ownerId);

    if (portfolio.error) {
      return `Error: ${portfolio.error}`;
    }

    let output = `
╔════════════════════════════════════════════════════════════════════════════╗
║                       OWNER PORTFOLIO SUMMARY                               ║
╚════════════════════════════════════════════════════════════════════════════╝

👤 OWNER INFORMATION
──────────────────────────────────────────────────────────────────────────────
`;

    output += `  Name: ${portfolio.owner.name}\n`;
    output += `  ID: ${portfolio.owner.id}\n`;
    output += `  Email: ${portfolio.owner.email || 'Not provided'}\n`;
    output += `  Phone: ${portfolio.owner.phone || 'Not provided'}\n`;
    output += `  Verified: ${portfolio.owner.verified ? '✓ Yes' : '✗ No'}\n`;

    output += `\n🏢 PORTFOLIO\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(portfolio.portfolio).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${value}\n`;
    });

    output += `\n👥 CONTACTS\n──────────────────────────────────────────────────────────────────────────────\n`;
    Object.entries(portfolio.contacts).forEach(([key, value]) => {
      output += `  ${this._padRight(key, 35)}: ${value}\n`;
    });

    return output;
  }

  /**
   * Show help
   */
  static showHelp() {
    return `
╔════════════════════════════════════════════════════════════════════════════╗
║               DAMAC HILLS 2 TERMINAL DASHBOARD - HELP                       ║
╚════════════════════════════════════════════════════════════════════════════╝

DASHBOARD COMMANDS
──────────────────────────────────────────────────────────────────────────────

📊 Main Dashboard:
  dashboard                  Show main dashboard overview
  dashboard show            Same as above

📈 Statistics:
  stats owners              Show owner statistics and breakdown
  stats contacts            Show contact statistics and breakdown
  stats properties          Show property statistics and finances

✅ Data Quality:
  quality score             Show data quality assessment
  data summary              Generate comprehensive summary report

📋 Activity:
  activity recent           Show last 10 recent activities
  activity recent --limit 20  Show last 20 activities

🔄 Migration:
  migration status          Show current migration/database status

👤 Owner Details:
  portfolio --id OWNER_ID   Show specific owner's portfolio

ℹ️  System:
  dashboard help            Show this help message

EXAMPLES
──────────────────────────────────────────────────────────────────────────────

  1. Check current system status:
     > dashboard

  2. Review owner statistics:
     > stats owners

  3. Assess data quality:
     > quality score

  4. See what changed recently:
     > activity recent --limit 20

  5. View specific owner:
     > portfolio --id OWNER-20260219-001

  6. Generate full report:
     > data summary

NAVIGATION
──────────────────────────────────────────────────────────────────────────────

• Each command displays relevant metrics and trends
• Use 'quality score' to identify data improvement areas
• Use 'activity recent' to track changes over time
• Use 'migration status' to verify all data loaded correctly

Questions? Type 'dashboard help' for this menu
`;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  static _padRight(str, len) {
    return str.padEnd(len, ' ');
  }

  static _makeProgressBar(value, max, length = 20) {
    if (max === 0) return '░'.repeat(length);
    const filled = Math.round((value / max) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
  }

  static _colorNumber(num) {
    return `\x1b[36m${num}\x1b[0m`; // Cyan
  }

  static _colorMetric(val) {
    return `\x1b[33m${val}\x1b[0m`; // Yellow
  }

  static _colorMoney(val) {
    return `\x1b[32m${val}\x1b[0m`; // Green
  }

  static _colorQuality(score) {
    const num = parseFloat(score);
    if (num >= 80) return `\x1b[32m${score}\x1b[0m`; // Green
    if (num >= 60) return `\x1b[33m${score}\x1b[0m`; // Yellow
    return `\x1b[31m${score}\x1b[0m`; // Red
  }

  static _ratingBadge(rating) {
    switch(rating) {
      case 'EXCELLENT': return `\x1b[32m⭐ EXCELLENT\x1b[0m`;
      case 'GOOD': return `\x1b[33m⭐ GOOD\x1b[0m`;
      case 'FAIR': return `\x1b[33m⭐ FAIR\x1b[0m`;
      case 'POOR': return `\x1b[31m⭐ POOR\x1b[0m`;
      default: return rating;
    }
  }

  static _colorSuccess(str) {
    return `\x1b[32m${str}\x1b[0m`; // Green
  }
}

export default DashboardCLI;
