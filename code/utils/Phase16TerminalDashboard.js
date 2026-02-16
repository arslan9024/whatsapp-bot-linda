/**
 * ====================================================================
 * PHASE 16 TERMINAL DASHBOARD
 * ====================================================================
 * Real-time terminal display for Phase 16 monitoring and metrics.
 * Displays QR scan analytics, health scores, issues, and recommendations
 * in a clean CLI format with live updates.
 *
 * Key Responsibilities:
 * - Render real-time metrics in terminal
 * - Display account health gauges
 * - Show active issues and recommendations
 * - Provide statistical summaries
 * - Support color coding and formatting
 * - Handle terminal resizing gracefully
 *
 * @since Phase 16 - February 16, 2026
 */

export default class Phase16TerminalDashboard {
  /**
   * Initialize the Terminal Dashboard
   * @param {Object} orchestrator - Phase16Orchestrator instance
   * @param {Function} logFunc - Logging function
   */
  constructor(orchestrator, logFunc) {
    this.orchestrator = orchestrator;
    this.log = logFunc;

    // Display state
    this.lastUpdate = 0;
    this.updateInterval = 5000; // 5 sec
    this.displayMode = 'summary'; // 'summary', 'detailed', 'issues'
    this.selectedAccount = null;
    this.isActive = false;

    // Color codes for terminal
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      white: '\x1b[37m',
      bgRed: '\x1b[41m',
      bgGreen: '\x1b[42m',
      bgYellow: '\x1b[43m',
      bgBlue: '\x1b[44m'
    };
  }

  /**
   * Start the dashboard display
   * @returns {void}
   */
  start() {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.startTime = Date.now();

    // Clear screen and start rendering
    this._clearScreen();
    this._renderLoop();

    this.log('[Phase16TerminalDashboard] Started', 'info');
  }

  /**
   * Stop the dashboard display
   * @returns {void}
   */
  stop() {
    this.isActive = false;
    this.log('[Phase16TerminalDashboard] Stopped', 'info');
  }

  /**
   * Render loop
   * @private
   */
  _renderLoop() {
    if (!this.isActive) {
      return;
    }

    try {
      this._render();
    } catch (err) {
      this.log(`[Phase16TerminalDashboard] Render error: ${err.message}`, 'error');
    }

    setTimeout(() => this._renderLoop(), this.updateInterval);
  }

  /**
   * Main render function
   * @private
   */
  _render() {
    const state = this.orchestrator.getDashboardState();

    switch (this.displayMode) {
      case 'summary':
        this._renderSummary(state);
        break;
      case 'detailed':
        this._renderDetailed(state);
        break;
      case 'issues':
        this._renderIssues(state);
        break;
      default:
        this._renderSummary(state);
    }
  }

  /**
   * Render summary view
   * @private
   */
  _renderSummary(state) {
    const lines = [];

    // Header
    const uptime = this._formatUptime(Date.now() - this.startTime);
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      `  PHASE 16 MONITORING DASHBOARD [${state.isRunning ? 'ACTIVE' : 'INACTIVE'}] - Uptime: ${uptime}`,
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push('');

    // Key metrics
    lines.push(this._colorize('📊 SYSTEM METRICS', 'blue', 'bright'));
    lines.push(this._buildMetricsTable(state));
    lines.push('');

    // Account summary
    lines.push(this._colorize('🔗 ACCOUNTS (' + state.totalAccounts + ')', 'blue', 'bright'));
    if (state.accounts.length > 0) {
      lines.push(this._buildAccountsSummaryTable(state.accounts));
    } else {
      lines.push('  No active accounts');
    }
    lines.push('');

    // Health overview
    if (state.totalAccounts > 0) {
      const healthPercentage = Math.round((state.healthyAccounts / state.totalAccounts) * 100);
      const healthColor = this._getHealthColor(healthPercentage);
      lines.push(this._colorize('💚 HEALTH OVERVIEW', 'blue', 'bright'));
      lines.push(`  Healthy Accounts: ${this._colorize(
        `${state.healthyAccounts}/${state.totalAccounts}`,
        healthColor
      )} (${healthPercentage}%)`);
      lines.push(this._buildHealthGauge(healthPercentage));
      lines.push('');
    }

    // Active issues
    if (state.issuesCount > 0) {
      lines.push(this._colorize('⚠️  ACTIVE ISSUES (' + state.issuesCount + ')', 'red', 'bright'));
      lines.push(this._buildIssuesSummary(state.accounts));
      lines.push('');
    }

    // Footer
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push('Commands: [1] Summary | [2] Details | [3] Issues | [Q] Quit');

    this._clearScreen();
    console.log(lines.join('\n'));
  }

  /**
   * Render detailed view
   * @private
   */
  _renderDetailed(state) {
    const lines = [];

    // Header
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      '  DETAILED METRICS VIEW',
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push('');

    // Detailed account info
    for (const account of state.accounts) {
      lines.push(this._buildDetailedAccountView(account));
      lines.push('');
    }

    // Footer
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));

    this._clearScreen();
    console.log(lines.join('\n'));
  }

  /**
   * Render issues view
   * @private
   */
  _renderIssues(state) {
    const lines = [];

    // Header
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      '  ACTIVE ISSUES & RECOMMENDATIONS',
      'cyan', 'bright'
    ));
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));
    lines.push('');

    let issueCount = 0;
    for (const account of state.accounts) {
      if (account.issues && account.issues.length > 0) {
        lines.push(this._colorize(
          `📱 ${account.phoneNumber}`,
          'yellow', 'bright'
        ));

        for (const issue of account.issues) {
          issueCount++;
          const severityColor = this._getSeverityColor(issue.severity);
          lines.push(`  ${this._colorize(issue.severity, severityColor, 'bright')}: ${issue.description}`);
          lines.push(`    Type: ${this._colorize(issue.type, 'dim')}`);
        }

        lines.push('');
      }
    }

    if (issueCount === 0) {
      lines.push(this._colorize('✅ No active issues detected!', 'green'));
    }

    // Footer
    lines.push(this._colorize(
      '═══════════════════════════════════════════════════════════════',
      'cyan', 'bright'
    ));

    this._clearScreen();
    console.log(lines.join('\n'));
  }

  /**
   * Build metrics table
   * @private
   */
  _buildMetricsTable(state) {
    const stats = state.stats || {};
    const lines = [];

    lines.push('  ┌─────────────────────────────────────────────────┐');
    lines.push(`  │ QR Scans Recorded      ${this._padRight(stats.qrScansRecorded || 0, 22)} │`);
    lines.push(`  │ Health Checks Run      ${this._padRight(stats.healthChecksRun || 0, 22)} │`);
    lines.push(`  │ Diagnostics Run        ${this._padRight(stats.diagnosticsRun || 0, 22)} │`);
    lines.push(`  │ Notifications Sent     ${this._padRight(stats.notificationsSent || 0, 22)} │`);
    lines.push(`  │ Issues Detected        ${this._padRight(stats.issuesDetected || 0, 22)} │`);
    lines.push(`  │ Recommendations        ${this._padRight(stats.recommendationsGenerated || 0, 22)} │`);
    lines.push('  └─────────────────────────────────────────────────┘');

    return lines.join('\n');
  }

  /**
   * Build accounts summary table
   * @private
   */
  _buildAccountsSummaryTable(accounts) {
    const lines = [];

    lines.push('  ┌─────────────────────────────────────────────────┐');
    lines.push('  │ Phone           │ Score │ Rating  │ Issues      │');
    lines.push('  ├─────────────────────────────────────────────────┤');

    for (const account of accounts) {
      const phone = (account.phoneNumber || 'N/A').substring(0, 15).padEnd(15);
      const score = (account.score || 0).toString().padStart(5);
      const rating = (account.rating || 'N/A').padEnd(7);
      const issues = (account.issues?.length || 0).toString().padStart(11);

      const scoreColor = this._getHealthColor(account.score || 0);
      const line = `  │ ${phone} │ ${this._colorize(score, scoreColor)} │ ${rating} │ ${issues} │`;

      lines.push(line);
    }

    lines.push('  └─────────────────────────────────────────────────┘');

    return lines.join('\n');
  }

  /**
   * Build health gauge
   * @private
   */
  _buildHealthGauge(percentage) {
    const total = 40;
    const filled = Math.round((percentage / 100) * total);
    const empty = total - filled;

    const gauge = '█'.repeat(filled) + '░'.repeat(empty);
    const color = this._getHealthColor(percentage);

    return `  [${this._colorize(gauge, color)}] ${percentage}%`;
  }

  /**
   * Build issues summary
   * @private
   */
  _buildIssuesSummary(accounts) {
    const lines = [];

    let count = 0;
    for (const account of accounts) {
      if (account.issues && account.issues.length > 0) {
        for (const issue of account.issues.slice(0, 5)) {
          count++;
          const severityColor = this._getSeverityColor(issue.severity);
          lines.push(`  ${this._colorize(issue.severity, severityColor)}: ${issue.description}`);
        }
      }
    }

    if (count === 0) {
      lines.push('  No active issues');
    }

    return lines.join('\n');
  }

  /**
   * Build detailed account view
   * @private
   */
  _buildDetailedAccountView(account) {
    const lines = [];

    lines.push(this._colorize(`  📱 ${account.phoneNumber}`, 'yellow', 'bright'));
    lines.push('  ├─ Health Score: ' + (account.score || 'N/A') + ' (' + (account.rating || 'N/A') + ')');

    if (account.qr) {
      lines.push('  ├─ QR Metrics:');
      lines.push(`  │  ├─ Total Scans: ${account.qr.totalScans || 0}`);
      if (account.qr.statistics) {
        lines.push(`  │  ├─ Avg Scan Time: ${account.qr.statistics.average || 0}ms`);
        lines.push(`  │  ├─ P95 Scan Time: ${account.qr.statistics.p95 || 0}ms`);
      }
      if (account.qr.recommendedTimeout) {
        lines.push(`  │  └─ Recommended Timeout: ${account.qr.recommendedTimeout / 1000}s`);
      }
    }

    if (account.health) {
      lines.push('  ├─ Component Scores:');
      const scores = account.health.componentScores || {};
      lines.push(`  │  ├─ Uptime: ${scores.uptime || 'N/A'}`);
      lines.push(`  │  ├─ QR Quality: ${scores.qrQuality || 'N/A'}`);
      lines.push(`  │  ├─ Error Rate: ${scores.errorRate || 'N/A'}`);
      lines.push(`  │  ├─ Response Time: ${scores.responseTime || 'N/A'}`);
      lines.push(`  │  └─ Message Processing: ${scores.messageProcessing || 'N/A'}`);
    }

    if (account.issues && account.issues.length > 0) {
      lines.push(`  ├─ Issues (${account.issues.length}):`);
      for (const issue of account.issues) {
        const color = this._getSeverityColor(issue.severity);
        lines.push(`  │  └─ ${this._colorize(issue.severity, color)}: ${issue.type}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Helper: Get color for health score
   * @private
   */
  _getHealthColor(score) {
    if (score >= 90) return 'green';
    if (score >= 75) return 'cyan';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'yellow';
    return 'red';
  }

  /**
   * Helper: Get color for severity
   * @private
   */
  _getSeverityColor(severity) {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'yellow';
      case 'MEDIUM': return 'cyan';
      case 'LOW': return 'green';
      default: return 'white';
    }
  }

  /**
   * Helper: Clear screen
   * @private
   */
  _clearScreen() {
    console.clear();
  }

  /**
   * Helper: Format uptime
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Helper: Colorize text
   * @private
   */
  _colorize(text, color, style = 'normal') {
    const colorCode = this.colors[color] || '';
    const styleCode = style === 'bright' ? this.colors.bright : '';
    return colorCode + styleCode + text + this.colors.reset;
  }

  /**
   * Helper: Pad string to right
   * @private
   */
  _padRight(value, width) {
    return value.toString().padEnd(width);
  }

  /**
   * Switch display mode
   * @param {string} mode - 'summary', 'detailed', or 'issues'
   */
  setDisplayMode(mode) {
    if (['summary', 'detailed', 'issues'].includes(mode)) {
      this.displayMode = mode;
    }
  }

  /**
   * Get current display mode
   * @returns {string} - Current mode
   */
  getDisplayMode() {
    return this.displayMode;
  }
}
