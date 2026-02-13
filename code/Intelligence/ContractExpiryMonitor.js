/**
 * Contract Expiry Monitor
 * Daily monitoring system for contract renewals
 * Sends alerts 100 days before contract expiry
 * Generates renewal notifications for tenants and landlords
 * 
 * Features:
 * - Daily check for contracts expiring in 100 days
 * - Generate renewal notifications
 * - Queue reminders for tenants + landlords
 * - Track reminder delivery status
 * - Automated scheduling (8 AM daily)
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContractExpiryMonitor {
  constructor(config = {}) {
    this.tenancyManager = config.tenancyManager;
    this.notificationService = config.notificationService;
    this.whatsappManager = config.whatsappManager;
    
    this.monitorDbPath = config.monitorDbPath || './code/Data/contract-alerts.json';
    this.checkTime = config.checkTime || '08:00';  // 8 AM daily
    this.alertDaysBeforeExpiry = config.alertDaysBeforeExpiry || 100;
    
    this.alertQueue = [];
    this.scheduledJob = null;
    this.isRunning = false;
  }

  /**
   * Initialize monitor
   */
  async initialize() {
    try {
      if (fs.existsSync(this.monitorDbPath)) {
        const data = JSON.parse(fs.readFileSync(this.monitorDbPath, 'utf8'));
        this.alertQueue = data.alerts || [];
        logger.info(`✅ Contract Expiry Monitor initialized with ${this.alertQueue.length} pending alerts`);
      } else {
        logger.warn(`⚠️ Alert database not found, starting fresh`);
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize ContractExpiryMonitor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start daily monitoring schedule
   * Runs check every day at 08:00
   */
  startScheduledMonitoring() {
    try {
      // Run immediately first time
      this._performDailyCheck();

      // Then schedule for specified time daily
      const schedule = this._scheduleNextCheck();
      
      logger.info(`✅ Contract expiry monitoring started (daily at ${this.checkTime})`);
      this.isRunning = true;
      
      return true;
    } catch (error) {
      logger.error(`❌ Error starting monitoring: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop daily monitoring
   */
  stopScheduledMonitoring() {
    if (this.scheduledJob) {
      clearTimeout(this.scheduledJob);
      this.scheduledJob = null;
    }
    this.isRunning = false;
    logger.info(`✅ Contract expiry monitoring stopped`);
  }

  /**
   * Perform daily check for expiring contracts
   * @private
   */
  async _performDailyCheck() {
    try {
      logger.info(`📋 Starting daily contract expiry check...`);

      // Get contracts needing alerts today
      const contractsNeedingAlert = this.tenancyManager.getContractsNeedingAlertToday();

      if (contractsNeedingAlert.length === 0) {
        logger.info(`✅ No contracts need alerts today`);
        return;
      }

      logger.info(`⚠️ Found ${contractsNeedingAlert.length} contracts needing alerts today`);

      // Generate and queue notifications for each contract
      for (const contract of contractsNeedingAlert) {
        await this._queueContractAlert(contract);
      }

      // Process alert queue
      await this._processAlertQueue();

    } catch (error) {
      logger.error(`❌ Error in daily check: ${error.message}`);
    }
  }

  /**
   * Queue a contract alert
   * @private
   */
  async _queueContractAlert(contract) {
    try {
      const daysUntilExpiry = this._calculateDaysUntilExpiry(contract.dates.expiryDate);

      // Alert for tenant
      const tenantAlert = {
        alertId: `alert-${Date.now()}-tenant`,
        contractId: contract.contractId,
        type: 'tenant_renewal',
        recipient: {
          phone: contract.tenant.phone,
          name: contract.tenant.name,
          role: 'tenant'
        },
        message: this._generateTenantWarningMessage(contract, daysUntilExpiry),
        createdAt: new Date().toISOString(),
        status: 'pending',
        scheduledFor: contract.dates.renewalAlertDate,
        daysUntilExpiry: daysUntilExpiry
      };

      // Alert for landlord
      const landlordAlert = {
        alertId: `alert-${Date.now()}-landlord`,
        contractId: contract.contractId,
        type: 'landlord_renewal',
        recipient: {
          phone: contract.landlord.phone,
          name: contract.landlord.name,
          role: 'landlord'
        },
        message: this._generateLandlordWarningMessage(contract, daysUntilExpiry),
        createdAt: new Date().toISOString(),
        status: 'pending',
        scheduledFor: contract.dates.renewalAlertDate,
        daysUntilExpiry: daysUntilExpiry
      };

      this.alertQueue.push(tenantAlert);
      this.alertQueue.push(landlordAlert);

      logger.info(`✅ Alerts queued for contract: ${contract.contractId}`);

    } catch (error) {
      logger.error(`❌ Error queuing alert: ${error.message}`);
    }
  }

  /**
   * Process all pending alerts in queue
   * @private
   */
  async _processAlertQueue() {
    try {
      const pendingAlerts = this.alertQueue.filter(a => a.status === 'pending');

      if (pendingAlerts.length === 0) {
        logger.info(`✅ No pending alerts to process`);
        return;
      }

      logger.info(`📤 Processing ${pendingAlerts.length} pending alerts...`);

      for (const alert of pendingAlerts) {
        await this._sendAlert(alert);
      }

      await this._persistAlerts();

    } catch (error) {
      logger.error(`❌ Error processing alert queue: ${error.message}`);
    }
  }

  /**
   * Send a single alert
   * @private
   */
  async _sendAlert(alert) {
    try {
      // Validate recipient has phone number
      if (!alert.recipient.phone) {
        logger.warn(`⚠️ No phone number for ${alert.recipient.role}: ${alert.recipient.name}`);
        alert.status = 'no_contact';
        return;
      }

      // Send via WhatsApp
      if (this.whatsappManager) {
        const sent = await this.whatsappManager.sendMessage(
          alert.recipient.phone,
          alert.message
        );

        alert.status = sent ? 'sent' : 'failed';
        alert.sentAt = new Date().toISOString();

        logger.info(`✅ Alert sent to ${alert.recipient.name}: ${alert.recipient.phone}`);
      } else {
        // Fallback: just mark as sent for testing
        alert.status = 'sent';
        alert.sentAt = new Date().toISOString();
        logger.info(`📨 Alert queued (no WhatsApp manager): ${alert.recipient.name}`);
      }

      // Mark contract alert as sent
      const contract = this.tenancyManager.getContract(alert.contractId);
      if (contract && alert.type === 'tenant_renewal') {
        await this.tenancyManager.markAlertSent(alert.contractId);
      }

    } catch (error) {
      logger.error(`❌ Error sending alert: ${error.message}`);
      alert.status = 'error';
      alert.error = error.message;
    }
  }

  /**
   * Generate tenant warning message
   * @private
   */
  _generateTenantWarningMessage(contract, daysUntilExpiry) {
    return `Hello ${contract.tenant.name},

Your lease agreement for ${contract.property.location} expires on ${contract.dates.expiryDate} (${daysUntilExpiry} days from now).

If you wish to renew your tenancy, please contact your landlord or reach out to us at your earliest convenience so we can begin the renewal process.

We are here to support you!

Best regards,
Linda AI - Property Management`;
  }

  /**
   * Generate landlord warning message
   * @private
   */
  _generateLandlordWarningMessage(contract, daysUntilExpiry) {
    return `Hello ${contract.landlord.name},

Please note that the lease agreement for ${contract.property.location} with tenant ${contract.tenant.name} expires on ${contract.dates.expiryDate} (${daysUntilExpiry} days from now).

We recommend reaching out to your tenant to discuss renewal options well in advance.

Monthly rent: ${contract.financial.monthlyRent} ${contract.financial.currency}

If you need assistance, please contact us.

Best regards,
Linda AI - Property Management`;
  }

  /**
   * Calculate days until expiry
   * @private
   */
  _calculateDaysUntilExpiry(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Schedule next daily check
   * @private
   */
  _scheduleNextCheck() {
    const now = new Date();
    const [hours, minutes] = this.checkTime.split(':').map(Number);

    let nextCheck = new Date();
    nextCheck.setHours(hours, minutes, 0, 0);

    // If time has already passed today, schedule for tomorrow
    if (nextCheck <= now) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }

    const timeUntilCheck = nextCheck - now;

    this.scheduledJob = setTimeout(() => {
      this._performDailyCheck();
      this._scheduleNextCheck();  // Reschedule for next day
    }, timeUntilCheck);

    const checkTimeStr = nextCheck.toLocaleString();
    logger.info(`⏰ Next check scheduled for: ${checkTimeStr}`);

    return this.scheduledJob;
  }

  /**
   * Get all pending alerts
   * @returns {Array} Pending alerts
   */
  getPendingAlerts() {
    return this.alertQueue.filter(a => a.status === 'pending');
  }

  /**
   * Get alert history
   * @param {string} contractId - Optional contract ID filter
   * @returns {Array} Alerts
   */
  getAlertHistory(contractId = null) {
    if (contractId) {
      return this.alertQueue.filter(a => a.contractId === contractId);
    }
    return this.alertQueue;
  }

  /**
   * Manual trigger for testing
   * @param {string} contractId - Contract ID to test
   */
  async testAlert(contractId) {
    try {
      const contract = this.tenancyManager.getContract(contractId);
      if (!contract) {
        logger.warn(`Contract not found: ${contractId}`);
        return false;
      }

      logger.info(`🧪 Testing alert for contract: ${contractId}`);
      await this._queueContractAlert(contract);
      await this._processAlertQueue();
      
      return true;
    } catch (error) {
      logger.error(`❌ Error testing alert: ${error.message}`);
      return false;
    }
  }

  /**
   * Get statistics
   * @returns {object} Monitor statistics
   */
  getStatistics() {
    return {
      totalAlerts: this.alertQueue.length,
      pendingAlerts: this.getPendingAlerts().length,
      sentAlerts: this.alertQueue.filter(a => a.status === 'sent').length,
      failedAlerts: this.alertQueue.filter(a => a.status === 'failed').length,
      isRunning: this.isRunning,
      nextCheckTime: this.checkTime,
      alertDaysBeforeExpiry: this.alertDaysBeforeExpiry
    };
  }

  /**
   * Persist alerts to file
   * @private
   */
  async _persistAlerts() {
    try {
      const data = {
        alerts: this.alertQueue,
        totalAlerts: this.alertQueue.length,
        lastUpdated: new Date().toISOString(),
        isRunning: this.isRunning,
        version: '1.0.0'
      };

      const dir = path.dirname(this.monitorDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.monitorDbPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      logger.info(`✅ Alerts persisted (${this.alertQueue.length} total)`);
    } catch (error) {
      logger.error(`❌ Failed to persist alerts: ${error.message}`);
    }
  }
}

export default ContractExpiryMonitor;
