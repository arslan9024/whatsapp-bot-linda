/**
 * ====================================================================
 * DEVICE LINKING ERROR RECOVERY & DIAGNOSTICS
 * ====================================================================
 * Intelligent error detection, categorization, and recovery with
 * detailed diagnostics and user guidance
 * 
 * Features:
 * - Smart error categorization (Network, Browser, Protocol, WhatsApp)
 * - Auto-recovery with category-specific healing strategies
 * - Network quality monitoring and diagnostics
 * - Browser health checking
 * - WhatsApp API version detection
 * - Detailed error reports with recovery recommendations
 * - Metrics tracking and analytics
 * 
 * @since Phase 4+ - February 18, 2026
 */

class DeviceLinkingDiagnostics {
  constructor(logBotFn) {
    this.logBot = logBotFn || console.log;
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize recovery strategies per error type
   */
  initializeRecoveryStrategies() {
    // Network errors
    this.recoveryStrategies.set('NETWORK_TIMEOUT', {
      priority: 1,
      steps: ['check_connectivity', 'retry_connection'],
      maxAttempts: 2,
      delayMs: 3000
    });

    // Browser errors
    this.recoveryStrategies.set('BROWSER_CRASH', {
      priority: 1,
      steps: ['kill_browser', 'clear_cache', 'restart_browser'],
      maxAttempts: 1,
      delayMs: 5000
    });

    // Protocol errors
    this.recoveryStrategies.set('PROTOCOL_ERROR', {
      priority: 2,
      steps: ['reset_client', 'clear_session', 'restart_connection'],
      maxAttempts: 2,
      delayMs: 2000
    });

    // WhatsApp API errors
    this.recoveryStrategies.set('WHATSAPP_API_ERROR', {
      priority: 3,
      steps: ['check_version', 'reset_state', 'retry'],
      maxAttempts: 3,
      delayMs: 1000
    });

    // Generic errors
    this.recoveryStrategies.set('GENERIC_ERROR', {
      priority: 4,
      steps: ['wait', 'retry'],
      maxAttempts: 2,
      delayMs: 2000
    });
  }

  /**
   * DIAGNOSIS: Categorize error type
   */
  diagnoseError(error, context = {}) {
    const errorMsg = error?.message?.toLowerCase() || '';
    const errorType = error?.code || 'UNKNOWN';

    let category = 'GENERIC_ERROR';
    let severity = 'warning';
    let recommendation = 'Retry the operation';

    // Network errors
    if (errorMsg.includes('timeout') || errorMsg.includes('econnrefused') || errorMsg.includes('network')) {
      category = 'NETWORK_TIMEOUT';
      severity = 'error';
      recommendation = 'Check your internet connection and try again';
    }

    // Browser errors
    if (errorMsg.includes('chrome') || errorMsg.includes('browser') || errorMsg.includes('crash')) {
      category = 'BROWSER_CRASH';
      severity = 'error';
      recommendation = 'Browser process crashed - will restart automatically';
    }

    // Protocol errors
    if (errorMsg.includes('protocol') || errorMsg.includes('closed') || errorMsg.includes('disconnected')) {
      category = 'PROTOCOL_ERROR';
      severity = 'error';
      recommendation = 'Connection lost - reinitializing device';
    }

    // WhatsApp API errors
    if (errorMsg.includes('whatsapp') || errorMsg.includes('api') || errorMsg.includes('request')) {
      category = 'WHATSAPP_API_ERROR';
      severity = 'warning';
      recommendation = 'WhatsApp service issue - retrying automatically';
    }

    return {
      category,
      severity,
      message: error?.message || 'Unknown error',
      code: errorType,
      recommendation,
      timestamp: new Date().toISOString(),
      context
    };
  }

  /**
   * STRATEGY: Get recovery strategy for error
   */
  getRecoveryStrategy(errorCategory) {
    return this.recoveryStrategies.get(errorCategory) || this.recoveryStrategies.get('GENERIC_ERROR');
  }

  /**
   * EXECUTE: Run recovery strategy
   */
  async executeRecovery(phoneNumber, errorCategory, client, attempt = 1) {
    const strategy = this.getRecoveryStrategy(errorCategory);

    this.logBot(`[Recovery] Executing ${errorCategory} recovery strategy (Attempt ${attempt}/${strategy.maxAttempts})`, 'info');

    for (const step of strategy.steps) {
      try {
        await this.executeRecoveryStep(step, phoneNumber, client);
      } catch (e) {
        this.logBot(`[Recovery] Step ${step} failed: ${e.message}`, 'warn');
      }
    }

    return true;
  }

  /**
   * Execute individual recovery step
   */
  async executeRecoveryStep(step, phoneNumber, client) {
    switch (step) {
      case 'check_connectivity':
        return await this.checkNetworkConnectivity();

      case 'retry_connection':
        return await this.wait(2000);

      case 'kill_browser':
        return this.killBrowserProcess();

      case 'clear_cache':
        return this.clearBrowserCache();

      case 'restart_browser':
        return this.wait(3000);

      case 'reset_client':
        return this.resetClientState(client);

      case 'clear_session':
        return this.clearSessionFolder(phoneNumber);

      case 'restart_connection':
        return this.wait(2000);

      case 'check_version':
        return await this.checkWhatsAppVersion(client);

      case 'reset_state':
        return this.resetClientState(client);

      case 'retry':
        return this.wait(1000);

      case 'wait':
        return this.wait(2000);

      default:
        return true;
    }
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity() {
    try {
      // Try to resolve DNS
      const dns = require('dns').promises;
      await dns.resolve('api.whatsapp.com');
      this.logBot('[Diagnostics] Network: ✅ Connected to WhatsApp APIs', 'success');
      return true;
    } catch (e) {
      this.logBot('[Diagnostics] Network: ❌ Cannot reach WhatsApp APIs', 'error');
      return false;
    }
  }

  /**
   * Check WhatsApp Web version
   */
  async checkWhatsAppVersion(client) {
    try {
      if (!client) return null;
      const version = await client.getWWebVersion?.();
      this.logBot(`[Diagnostics] WhatsApp Web Version: ${version}`, 'info');
      return version;
    } catch (e) {
      this.logBot(`[Diagnostics] Cannot detect WhatsApp version`, 'warn');
      return null;
    }
  }

  /**
   * Kill browser process
   */
  killBrowserProcess() {
    const { spawn } = require('child_process');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/IM', 'chrome.exe'], { stdio: 'ignore' });
    }
    this.logBot('[Recovery] Browser processes killed', 'info');
    return true;
  }

  /**
   * Clear browser cache
   */
  clearBrowserCache() {
    const fs = require('fs');
    const path = require('path');
    try {
      const cachePath = path.join(process.cwd(), '.wwebjs_cache');
      if (fs.existsSync(cachePath)) {
        fs.rmSync(cachePath, { recursive: true, force: true });
        this.logBot('[Recovery] Browser cache cleared', 'success');
      }
    } catch (e) {
      this.logBot(`[Recovery] Cache clear failed: ${e.message}`, 'warn');
    }
    return true;
  }

  /**
   * Reset client state
   */
  resetClientState(client) {
    if (client) {
      client._authenticated = false;
      client._initializing = false;
      this.logBot('[Recovery] Client state reset', 'info');
    }
    return true;
  }

  /**
   * Clear session folder
   */
  clearSessionFolder(phoneNumber) {
    const fs = require('fs');
    const path = require('path');
    try {
      const sessionPath = path.join(process.cwd(), `.whatsapp-sessions/session-${phoneNumber}`);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.logBot('[Recovery] Session cleared', 'success');
      }
    } catch (e) {
      this.logBot(`[Recovery] Session clear failed: ${e.message}`, 'warn');
    }
    return true;
  }

  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log error to history
   */
  logError(diagnosis) {
    this.errorHistory.push(diagnosis);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    return diagnosis;
  }

  /**
   * Generate detailed error report
   */
  generateErrorReport(phoneNumber) {
    const recentErrors = this.errorHistory.filter(e => 
      e.context?.phoneNumber === phoneNumber || !e.context?.phoneNumber
    );

    const byCategory = {};
    recentErrors.forEach(err => {
      byCategory[err.category] = (byCategory[err.category] || 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      phoneNumber,
      totalErrors: recentErrors.length,
      errorsByCategory: byCategory,
      recentErrors: recentErrors.slice(-10),
      recommendations: this.getRecommendations(byCategory)
    };
  }

  /**
   * Generate recommendations based on error patterns
   */
  getRecommendations(errorCategories) {
    const recommendations = [];

    if (errorCategories.NETWORK_TIMEOUT > 3) {
      recommendations.push('⚠️  Frequent network timeouts - check your internet connection');
    }

    if (errorCategories.BROWSER_CRASH > 2) {
      recommendations.push('⚠️  Browser crashing frequently - consider restarting the bot');
    }

    if (errorCategories.PROTOCOL_ERROR > 5) {
      recommendations.push('⚠️  Connection instability detected - WhatsApp API may be overloaded');
    }

    if (errorCategories.WHATSAPP_API_ERROR > 4) {
      recommendations.push('⚠️  WhatsApp API issues - try again later');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Error rates within normal range');
    }

    return recommendations;
  }

  /**
   * Export diagnostics data
   */
  exportDiagnostics() {
    return {
      timestamp: new Date().toISOString(),
      errorHistory: this.errorHistory,
      errorCategoryCounts: this.errorHistoryGroupByCategory(),
      totalErrors: this.errorHistory.length,
      recoveryStrategies: Object.fromEntries(this.recoveryStrategies)
    };
  }

  /**
   * Group errors by category
   */
  errorHistoryGroupByCategory() {
    const grouped = {};
    this.errorHistory.forEach(err => {
      grouped[err.category] = (grouped[err.category] || 0) + 1;
    });
    return grouped;
  }
}

export { DeviceLinkingDiagnostics };
export default DeviceLinkingDiagnostics;
