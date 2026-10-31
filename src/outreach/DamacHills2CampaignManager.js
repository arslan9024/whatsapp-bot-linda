/**
 * ====================================================================
 * DAMAC HILLS 2 CAMPAIGN MANAGER (1 New Lead / Day / Account Engine)
 * ====================================================================
 * Manages ultra-safe real estate outreach to Damac Hills 2 property owners:
 *   1. Strictly 1 new conversation per account per calendar day.
 *   2. Multi-layer history audit to detect prior dialogue across all lines.
 *   3. Fresh leads: Simple greetings-only message dispatched.
 *   4. Existing leads: Cold outreach blocked; Supervisor alerts sub-agent.
 *
 * @since Development Phase — October 2026
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';
import services from '../core/ServiceRegistry.js';
import { maskPhone, phoneKey } from './OwnerPhoneNormalizer.js';
import { auditCrossAccountHistory } from './DeepChatHistoryAuditor.js';
import { dispatchSupervisorReminder } from './SupervisorFollowUpDispatcher.js';
import { getOrganicGreeting, sendHumanizedMessage } from './HumanizedMessageSender.js';
import { supervisorFollowUpTracker } from './SupervisorFollowUpTracker.js';

const logger = new Logger('DamacHills2CampaignManager');

/**
 * Format fresh greeting for a brand-new contact (uses organic variations).
 *
 * @param {string} [ownerName]
 * @returns {string}
 */
export function formatFreshGreeting(ownerName = '') {
  return getOrganicGreeting(ownerName);
}

export class DamacHills2CampaignManager {
  constructor(deps = {}) {
    this.quotaFile = deps.quotaFile || path.resolve('data', 'outreach', 'daily-quota.json');
    this.accountConfigManager = deps.accountConfigManager || null;
    this.accountClients = deps.accountClients || null;
    this.sheetSource = deps.sheetSource || null;
    this.dailyLimitPerAccount = 1; // Strict 1 new conversation per day per account
  }

  /**
   * Sync outreach status back to Google Sheets if configured.
   */
  async _syncSheetStatus(lead, statusText, options = {}) {
    const sheetSource = options.sheetSource || this.sheetSource;
    if (!sheetSource || !lead.rowIndex || !options.mainValues) return;
    try {
      const statusMap = new Map([[lead.rowIndex, statusText]]);
      await sheetSource.writeStatus(options.mainValues, statusMap, options.spreadsheetId);
      logger.info(`📝 Synced row ${lead.rowIndex} status to Google Sheets: "${statusText}"`);
    } catch (err) {
      logger.warn(`Failed to sync status to Google Sheets: ${err.message}`);
    }
  }

  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadQuota() {
    try {
      if (fs.existsSync(this.quotaFile)) {
        const raw = JSON.parse(fs.readFileSync(this.quotaFile, 'utf8'));
        const today = this.getTodayKey();
        return raw[today] || {};
      }
    } catch (_) {
      /* fallback empty */
    }
    return {};
  }

  saveQuota(todayQuota) {
    try {
      fs.mkdirSync(path.dirname(this.quotaFile), { recursive: true });
      const today = this.getTodayKey();
      let all = {};
      if (fs.existsSync(this.quotaFile)) {
        try {
          all = JSON.parse(fs.readFileSync(this.quotaFile, 'utf8')) || {};
        } catch (_) {}
      }
      all[today] = todayQuota;
      fs.writeFileSync(this.quotaFile, JSON.stringify(all, null, 2), 'utf8');
    } catch (err) {
      logger.warn(`Failed to save quota file: ${err.message}`);
    }
  }

  getUsage(accountPhone) {
    const todayQuota = this.loadQuota();
    const key = phoneKey(accountPhone);
    return Number(todayQuota[key] || 0);
  }

  recordUsage(accountPhone) {
    const todayQuota = this.loadQuota();
    const key = phoneKey(accountPhone);
    todayQuota[key] = (todayQuota[key] || 0) + 1;
    this.saveQuota(todayQuota);
    return todayQuota[key];
  }

  /**
   * Find an active account that has available quota (sent 0 fresh leads today).
   */
  findAvailableAccount() {
    const clients = this.accountClients || services.get('accountClients') || new Map();
    const todayQuota = this.loadQuota();

    for (const accountPhone of clients.keys()) {
      const key = phoneKey(accountPhone);
      const used = Number(todayQuota[key] || 0);
      if (used < this.dailyLimitPerAccount) {
        return { accountPhone, client: clients.get(accountPhone) };
      }
    }

    return null;
  }

  /**
   * Process a single Damac Hills 2 property owner candidate.
   *
   * @param {object} lead - Lead object ({ name, phone, unit, community })
   * @param {object} [options]
   * @param {boolean} [options.dryRun] - If true, simulates actions without sending actual WhatsApp messages
   * @returns {Promise<object>} Outcome result
   */
  async processLead(lead, options = {}) {
    if (!lead || !lead.phone) {
      return { success: false, reason: 'invalid_lead_phone' };
    }

    const { dryRun = false } = options;
    const clientPhone = lead.phone;
    const clientDigits = phoneKey(clientPhone);

    logger.info(`📋 Processing Damac Hills 2 Owner: ${lead.name || 'Owner'} (${maskPhone(clientDigits)})...`);

    // 1. Cross-Account Multi-Layer History Audit
    const history = await auditCrossAccountHistory(clientDigits, {
      accountClients: this.accountClients,
      accountConfigManager: this.accountConfigManager,
    });

    // 2. Existing Conversation Branch -> Alert Sub-Agent
    if (history.hasPriorChat) {
      logger.info(
        `🛑 Prior conversation detected on line ${maskPhone(history.accountPhone)}. SKIPPING cold outreach to client.`
      );

      if (dryRun) {
        return {
          success: true,
          action: 'supervisor_reminder_simulated',
          assignedAgent: history.accountPhone,
          agentName: history.accountName,
          lead,
        };
      }

      const dispatchResult = await dispatchSupervisorReminder({
        clientInfo: lead,
        targetAgentPhone: history.accountPhone,
        agentName: history.accountName,
        historyDetails: history.details,
      });

      // Record in 24-hour SLA monitor
      supervisorFollowUpTracker.recordAssignment({
        ownerName: lead.name,
        clientPhone: clientDigits,
        assignedAgentPhone: history.accountPhone,
        agentName: history.accountName,
        community: lead.community || 'Damac Hills 2',
        unit: lead.unit || '',
      });

      if (options.syncSheet) {
        await this._syncSheetStatus(
          lead,
          `Follow-up -> ${history.accountName || history.accountPhone} (${this.getTodayKey()})`,
          options
        );
      }

      return {
        success: true,
        action: 'supervisor_reminder_dispatched',
        assignedAgent: history.accountPhone,
        agentName: history.accountName,
        delivery: dispatchResult,
        lead,
      };
    }

    // 3. Fresh Lead Branch -> Check 1/day quota and send greeting
    const available = this.findAvailableAccount();
    if (!available) {
      logger.info(`⏳ All active accounts have reached their daily quota (1/1 sent today). Lead queued for tomorrow.`);
      return {
        success: false,
        action: 'quota_exhausted_for_today',
        lead,
      };
    }

    const { accountPhone, client } = available;
    const greetingText = formatFreshGreeting(lead.name);
    const targetJid = `${clientDigits}@c.us`;

    logger.info(
      `🌱 Dispatching 1 daily fresh greeting from ${maskPhone(accountPhone)} to ${maskPhone(clientDigits)}`
    );

    if (dryRun) {
      this.recordUsage(accountPhone);
      return {
        success: true,
        action: 'fresh_greeting_simulated',
        sendingAgent: accountPhone,
        greetingText,
        lead,
      };
    }

    try {
      const sendRes = await sendHumanizedMessage(client, targetJid, greetingText, { instant: options.instant });
      this.recordUsage(accountPhone);
      logger.info(`✅ Fresh greeting sent from ${maskPhone(accountPhone)} to ${maskPhone(clientDigits)} (Quota 1/1 complete)`);

      if (options.syncSheet) {
        await this._syncSheetStatus(lead, `Sent ${this.getTodayKey()} via ${accountPhone}`, options);
      }

      return {
        success: true,
        action: 'fresh_greeting_sent',
        messageId: sendRes?.id?.id,
        sendingAgent: accountPhone,
        lead,
      };
    } catch (err) {
      logger.error(`❌ Failed to send greeting to ${maskPhone(clientDigits)}: ${err.message}`);
      return {
        success: false,
        action: 'send_error',
        error: err.message,
        lead,
      };
    }
  }
}

export default DamacHills2CampaignManager;

