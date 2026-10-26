/**
 * AutoAccountRelinkingManager.js
 * Auto-relink & activate all accounts when server restarts
 */

import fs from 'fs';
import path from 'path';

class AutoAccountRelinkingManager {
  constructor(options = {}) {
    this.unifiedAccountManager = options.unifiedAccountManager;
    this.terminalDashboard = options.terminalDashboard;
    this.sessionsDir = options.sessionsDir || './sessions';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 3000;
    
    this.isRelinking = false;
    this.relinkProgress = new Map();
    this.relinkResults = [];
    this.logger = this.createLogger();
  }

  createLogger() {
    return {
      info: (msg) => console.log('[AutoRelink] ' + msg),
      success: (msg) => console.log('[AutoRelink] ' + msg),
      warn: (msg) => console.warn('[AutoRelink] ' + msg),
      error: (msg) => console.error('[AutoRelink] ' + msg),
    };
  }

  async initialize() {
    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true });
      }
      return true;
    } catch (error) {
      this.logger.error('Init error: ' + error.message);
      return false;
    }
  }

  getSavedSessions() {
    try {
      if (!fs.existsSync(this.sessionsDir)) return [];
      
      const files = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
      return files
        .filter(f => f.isDirectory())
        .map(f => f.name)
        .filter(name => /^\+\d{8,15}$/.test(name));
    } catch (error) {
      this.logger.error('Error reading sessions: ' + error.message);
      return [];
    }
  }

  async startAutoRelinking() {
    if (this.isRelinking) {
      this.logger.warn('Relinking already in progress');
      return;
    }

    this.isRelinking = true;
    const startTime = Date.now();

    try {
      const savedSessions = this.getSavedSessions();
      
      if (savedSessions.length === 0) {
        this.logger.warn('No saved sessions found');
        return;
      }

      this.logger.success('Found ' + savedSessions.length + ' saved account(s)');
      this.logger.info('Starting auto-relink sequence...\n');

      for (const phone of savedSessions) {
        this.relinkProgress.set(phone, {
          status: 'pending',
          retries: 0,
          lastError: null,
          startTime: null
        });
      }

      for (const phone of savedSessions) {
        await this.relinkAccount(phone);
      }

      this.reportResults(startTime);
    } catch (error) {
      this.logger.error('Fatal error: ' + error.message);
    } finally {
      this.isRelinking = false;
    }
  }

  async relinkAccount(phone) {
    const tracking = this.relinkProgress.get(phone);
    if (!tracking) return;

    const maxAttempts = this.maxRetries;
    tracking.status = 'relinking';
    tracking.startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.info('[' + attempt + '/' + maxAttempts + '] Relinking ' + phone + '...');

        const sessionPath = path.join(this.sessionsDir, phone);
        if (fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0) {
          if (this.unifiedAccountManager?.restoreAccount) {
            const account = await this.unifiedAccountManager.restoreAccount(phone, {
              sessionPath,
              autoActivate: true
            });

            if (account) {
              tracking.status = 'success';
              this.updateDashboard(phone, 'online');
              this.logger.success(' ' + phone + ' restored and activated');
              this.relinkResults.push({
                phone,
                status: 'success',
                method: 'session_restore',
                duration: Date.now() - tracking.startTime
              });
              return;
            }
          }
        }

        throw new Error('Session restore failed');
      } catch (error) {
        tracking.lastError = error.message;
        tracking.retries = attempt;

        if (attempt < maxAttempts) {
          const waitTime = this.retryDelayMs / 1000;
          this.logger.warn('Attempt ' + attempt + ' failed. Retrying in ' + waitTime + 's...');
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
        } else {
          tracking.status = 'failed';
          this.logger.error(' ' + phone + ' failed after ' + maxAttempts + ' attempts: ' + error.message);
          this.relinkResults.push({
            phone,
            status: 'failed',
            error: error.message,
            attempts: maxAttempts,
            duration: Date.now() - tracking.startTime
          });
        }
      }
    }
  }

  updateDashboard(phone, status) {
    try {
      if (this.terminalDashboard?.updateAccountStatus) {
        this.terminalDashboard.updateAccountStatus(phone, {
          status,
          lastUpdated: new Date(),
          connectionType: 'auto-relinked'
        });
      }
    } catch (error) {
      this.logger.warn('Dashboard update failed: ' + error.message);
    }
  }

  reportResults(startTime) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const successful = this.relinkResults.filter(r => r.status === 'success').length;
    const failed = this.relinkResults.filter(r => r.status === 'failed').length;

    console.log('\n' + '='.repeat(70));
    console.log(' AUTO-RELINK RESULTS');
    console.log('='.repeat(70));

    for (const result of this.relinkResults) {
      const icon = result.status === 'success' ? '' : '';
      const info = result.status === 'success'
        ? result.method + ' (' + result.duration + 'ms)'
        : result.error + ' (' + result.attempts + ' attempts)';
      console.log(icon + ' ' + result.phone + ': ' + info);
    }

    console.log('='.repeat(70));
    console.log('TOTAL: ' + successful + ' online, ' + failed + ' offline (' + duration + 's)');
    console.log('='.repeat(70) + '\n');
  }

  getRelinkStatus() {
    const status = {};
    for (const [phone, tracking] of this.relinkProgress) {
      status[phone] = {
        status: tracking.status,
        retries: tracking.retries,
        error: tracking.lastError
      };
    }
    return status;
  }

  getRelinkResults() {
    return this.relinkResults;
  }

  isAnyRelinking() {
    return Array.from(this.relinkProgress.values()).some(t => t.status === 'relinking');
  }
}

export default AutoAccountRelinkingManager;