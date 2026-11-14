// @ts-nocheck
/**
 * ====================================================================
 * DAMAC HILLS 2 CAMPAIGN MANAGER (Dynamic Multi-Account Scaling Engine)
 * ====================================================================
 * Manages ultra-safe real estate outreach to Damac Hills 2 property owners:
 *   1. Dynamic multi-account scaling via WhatsAppDispatchPool + AccountWarmupScheduler
 *      (scales from 1/day cold warmup up to 12–15/day warmed-up per account).
 *   2. 15s–45s Gaussian jitter between sends (GaussianJitterScheduler).
 *   3. UAE quiet-hours enforcement (no cold sends between 20:00 and 09:00 GST).
 *   4. Multi-layer history audit to detect prior dialogue across all lines.
 *   5. Fresh leads: Simple greetings-only message dispatched.
 *   6. Existing leads: Cold outreach blocked; Supervisor alerts sub-agent.
 *   7. Real-time owner reply escalation & delivery/read receipt tracking.
 *
 * @since Development Phase — November 2026
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
import { outreachSafetyController } from './OutreachSafetyController.js';
import { WhatsAppDispatchPool } from './WhatsAppDispatchPool.js';
import { accountWarmupScheduler } from '../anti-ban/AccountWarmupScheduler.js';
import { GaussianJitterScheduler } from '../anti-ban/GaussianJitterScheduler.js';
import { LiveCampaignSchedulePacer } from './LiveCampaignSchedulePacer.js';
import inboundIntentCategorizer from './InboundIntentCategorizer.js';
import { syncLeadToCrm } from '../whatsapp/bridge/whiteCavesServerBridge.js';

const logger = new Logger('DamacHills2CampaignManager');

export const CLUSTER_SAMPLE_LEADS = {
  VARDON: [
    { name: 'Rashid Al Maktoum', phone: '+971504128890', community: 'Damac Hills 2', cluster: 'VARDON', unit: 'Vardon Cluster Villa 114' },
    { name: 'Fatima Al Mazrouei', phone: '+971529083312', community: 'Damac Hills 2', cluster: 'VARDON', unit: 'Vardon Cluster Villa 209' },
  ],
  AMAZON: [
    { name: 'Hassan Al Shamsi', phone: '+971505110636', community: 'Damac Hills 2', cluster: 'AMAZON', unit: 'Amazon Cluster Villa 12' },
    { name: 'Tariq Mansoor', phone: '+971507160096', community: 'Damac Hills 2', cluster: 'AMAZON', unit: 'Amazon Cluster Villa 18' },
  ],
  PACIFICA: [
    { name: 'Karim Haddad', phone: '+971501122334', community: 'Damac Hills 2', cluster: 'PACIFICA', unit: 'Pacifica Cluster Villa 99' },
  ],
  CAMELLIA: [
    { name: 'Rashid Al Nuaimi', phone: '+971501234567', community: 'Damac Hills 2', cluster: 'CAMELLIA', unit: 'Camellia Cluster Villa 42' },
  ],
};

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
    this.registryFile = deps.registryFile || path.resolve('data', 'outreach', 'dispatched-owners.json');
    this.accountConfigManager = deps.accountConfigManager || null;
    this.accountClients = deps.accountClients || null;
    this.sheetSource = deps.sheetSource || null;
    this.dailyLimitPerAccount = deps.dailyLimitPerAccount ?? null; // When null, scales dynamically via warmupScheduler (1 to 15/day)

    this.dispatchPool = deps.dispatchPool || new WhatsAppDispatchPool({ maxDailyPerAccount: 15 });
    this.warmupScheduler = deps.warmupScheduler || accountWarmupScheduler;
    this.jitterScheduler = deps.jitterScheduler || new GaussianJitterScheduler({
      meanMs: 30000,
      stdDevMs: 7500,
      minMs: 15000,
      maxMs: 45000,
    });
    this.schedulePacer = deps.schedulePacer || new LiveCampaignSchedulePacer({
      workingHoursStart: 9,
      workingHoursEnd: 20,
      timezone: 'Asia/Dubai',
    });
    this.categorizer = deps.categorizer || inboundIntentCategorizer;
    this.crmSyncer = deps.crmSyncer || syncLeadToCrm;
    this.sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.enforceQuietHours = deps.enforceQuietHours ?? false;
  }

  /**
   * Check whether current time is within UAE compliant outreach hours (09:00–20:00 GST).
   * Quiet hours are 20:00–09:00 GST.
   *
   * @param {Date} [now]
   * @returns {{ isAllowed: boolean, currentHourGST: number, reason?: string }}
   */
  isWithinCompliantHours(now = new Date()) {
    return this.schedulePacer.isWithinCompliantHours(now);
  }

  /**
   * Generate a 15s–45s Gaussian jitter delay in milliseconds.
   *
   * @returns {number}
   */
  getNextJitterDelayMs() {
    return this.jitterScheduler.getNextInterval();
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

  /**
   * Load registry of dispatched DAMAC Hills 2 owners for reply & receipt correlation.
   */
  loadDispatchedRegistry() {
    try {
      if (fs.existsSync(this.registryFile)) {
        return JSON.parse(fs.readFileSync(this.registryFile, 'utf8')) || {};
      }
    } catch (_) {}
    return {};
  }

  saveDispatchedRegistry(registry) {
    try {
      fs.mkdirSync(path.dirname(this.registryFile), { recursive: true });
      fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2), 'utf8');
    } catch (err) {
      logger.warn(`Failed to save dispatched owners registry: ${err.message}`);
    }
  }

  recordDispatchedOwner(lead, sendingAgent, messageId = null) {
    const key = phoneKey(lead.phone);
    if (!key) return null;
    const registry = this.loadDispatchedRegistry();
    registry[key] = {
      name: lead.name || 'Property Owner',
      phone: `+${key}`,
      unit: lead.unit || 'Villa',
      cluster: lead.cluster || lead.community || 'VARDON',
      community: lead.community || 'Damac Hills 2',
      sendingAgent: sendingAgent ? `+${phoneKey(sendingAgent)}` : '',
      lastMessageId: messageId,
      dispatchedAt: new Date().toISOString(),
      receiptStatus: 'SENT',
    };
    this.saveDispatchedRegistry(registry);
    return registry[key];
  }

  getDispatchedOwner(phone) {
    const key = phoneKey(phone);
    if (!key) return null;
    const registry = this.loadDispatchedRegistry();
    return registry[key] || null;
  }

  /**
   * Track WhatsApp message delivery/read receipt acks (1=SENT, 2=DELIVERED, 3=READ, 4=PLAYED).
   */
  recordDeliveryReceipt(phoneOrJid, ackStatus, messageId = null) {
    const key = phoneKey(phoneOrJid);
    if (!key) return null;
    const registry = this.loadDispatchedRegistry();
    const entry = registry[key];
    if (!entry) return null;

    const statusLabels = { 1: 'SENT', 2: 'DELIVERED', 3: 'READ', 4: 'PLAYED' };
    const statusLabel = typeof ackStatus === 'number' ? (statusLabels[ackStatus] || 'DELIVERED') : String(ackStatus).toUpperCase();
    entry.receiptStatus = statusLabel;
    entry.receiptUpdatedAt = new Date().toISOString();
    if (messageId) entry.lastMessageId = messageId;
    this.saveDispatchedRegistry(registry);
    return entry;
  }

  /**
   * Get dynamic daily limit for an account via AccountWarmupScheduler (1/day cold -> 12-15/day warmed up).
   */
  getAccountDailyLimit(accountPhone) {
    if (typeof this.dailyLimitPerAccount === 'number') {
      return this.dailyLimitPerAccount;
    }
    if (this.warmupScheduler && typeof this.warmupScheduler.getWarmupStatus === 'function') {
      const status = this.warmupScheduler.getWarmupStatus(accountPhone);
      return Math.min(15, Math.max(1, Number(status.allowed || 1)));
    }
    return 1;
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
    if (this.warmupScheduler && typeof this.warmupScheduler.recordSend === 'function') {
      try {
        this.warmupScheduler.recordSend(accountPhone);
      } catch (_) {}
    }
    return todayQuota[key];
  }

  /**
   * Synchronize active clients into WhatsAppDispatchPool and select next available account
   * in round-robin order respecting its warmup stage ceiling.
   */
  findAvailableAccount() {
    const clients = this.accountClients || services.get('accountClients') || new Map();
    const todayQuota = this.loadQuota();
    const clientEntries = Array.from(clients.entries());
    if (clientEntries.length === 0) return null;

    // Register all active clients in the dispatch pool
    for (const [accountPhone] of clientEntries) {
      this.dispatchPool.registerAccount(accountPhone);
    }

    // Attempt round-robin acquisition across the pool up to pool size
    const poolSize = Math.max(clientEntries.length, this.dispatchPool.pool?.length || 1);
    for (let i = 0; i < poolSize; i++) {
      const candidatePhone = this.dispatchPool.acquireNextSender();
      if (!candidatePhone) break;

      const matchedEntry = clientEntries.find(([p]) => phoneKey(p) === phoneKey(candidatePhone));
      if (!matchedEntry) continue;

      const [accountPhone, client] = matchedEntry;
      const key = phoneKey(accountPhone);
      const used = Number(todayQuota[key] || 0);
      const limit = this.getAccountDailyLimit(accountPhone);

      if (used < limit) {
        return { accountPhone, client, used, limit };
      }
    }

    // Fallback scan if round-robin pointers were uneven
    for (const [accountPhone, client] of clientEntries) {
      const key = phoneKey(accountPhone);
      const used = Number(todayQuota[key] || 0);
      const limit = this.getAccountDailyLimit(accountPhone);
      if (used < limit) {
        return { accountPhone, client, used, limit };
      }
    }

    return null;
  }

  /**
   * Process a single Damac Hills 2 property owner candidate.
   */
  async processLead(lead, options = {}) {
    if (outreachSafetyController.isPaused()) {
      const state = outreachSafetyController.getState();
      logger.warn(`🛑 Cold outreach is currently PAUSED (${state.reason || 'Safety switch'}). Skipping lead.`);
      return { success: false, action: 'outreach_paused', reason: state.reason };
    }

    if (!lead || !lead.phone) {
      return { success: false, reason: 'invalid_lead_phone' };
    }

    const checkQuietHours = options.enforceQuietHours ?? this.enforceQuietHours;
    if (checkQuietHours) {
      const hoursCheck = this.isWithinCompliantHours(options.now || new Date());
      if (!hoursCheck.isAllowed) {
        logger.warn(`🌙 UAE Quiet Hours active (${hoursCheck.currentHourGST}:00 GST). Holding cold outreach.`);
        return {
          success: false,
          action: 'quiet_hours_active',
          currentHourGST: hoursCheck.currentHourGST,
          reason: hoursCheck.reason,
          lead,
        };
      }
    }

    const { dryRun = false } = options;
    const clientPhone = lead.phone;
    const clientDigits = phoneKey(clientPhone);

    // 1. Cross-Account Multi-Layer History Audit
    const history = await auditCrossAccountHistory(clientDigits, {
      accountClients: this.accountClients,
      accountConfigManager: this.accountConfigManager,
    });

    // 2. Existing Conversation Branch -> Alert Sub-Agent
    if (history.hasPriorChat) {
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

    // 3. Fresh Lead Branch -> Check dynamic warmup quota and send greeting
    const available = this.findAvailableAccount();
    if (!available) {
      return {
        success: false,
        action: 'quota_exhausted_for_today',
        lead,
      };
    }

    const { accountPhone, client, limit } = available;
    const greetingText = formatFreshGreeting(lead.name);
    const targetJid = `${clientDigits}@c.us`;

    if (dryRun) {
      const usedAfter = this.recordUsage(accountPhone);
      this.recordDispatchedOwner(lead, accountPhone, `dryrun_${Date.now()}`);
      return {
        success: true,
        action: 'fresh_greeting_simulated',
        sendingAgent: accountPhone,
        quotaUsed: usedAfter,
        quotaLimit: limit,
        greetingText,
        lead,
      };
    }

    try {
      const sendRes = await sendHumanizedMessage(client, targetJid, greetingText, { instant: options.instant });
      const usedAfter = this.recordUsage(accountPhone);
      const msgId = sendRes?.id?.id || `msg_${Date.now()}`;
      this.recordDispatchedOwner(lead, accountPhone, msgId);

      if (options.syncSheet) {
        await this._syncSheetStatus(lead, `Sent ${this.getTodayKey()} via ${accountPhone}`, options);
      }

      return {
        success: true,
        action: 'fresh_greeting_sent',
        messageId: msgId,
        sendingAgent: accountPhone,
        quotaUsed: usedAfter,
        quotaLimit: limit,
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

  /**
   * Trigger an immediate compliant batch run across all linked accounts for a target cluster.
   * Enforces UAE quiet hours (09:00-20:00 GST), warmup limits (1 to 15/day), and 15s-45s Gaussian jitter.
   */
  async dispatchNowBatch(clusterInput = 'ALL', options = {}) {
    if (outreachSafetyController.isPaused()) {
      const state = outreachSafetyController.getState();
      return {
        success: false,
        status: 'PAUSED',
        cluster: String(clusterInput || 'ALL').toUpperCase(),
        reason: state.reason || 'Campaign is paused',
        dispatchedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    const now = options.now || new Date();
    const hoursCheck = this.isWithinCompliantHours(now);
    if (!hoursCheck.isAllowed && !options.ignoreQuietHours) {
      return {
        success: false,
        status: 'QUIET_HOURS_BLOCKED',
        cluster: String(clusterInput || 'ALL').toUpperCase(),
        currentHourGST: hoursCheck.currentHourGST,
        reason: hoursCheck.reason,
        dispatchedCount: 0,
        skippedCount: 0,
        results: [],
      };
    }

    const clusterKey = String(clusterInput || 'ALL').trim().toUpperCase();
    let leads = options.leads;
    if (!Array.isArray(leads) || leads.length === 0) {
      if (clusterKey === 'ALL') {
        leads = Object.values(CLUSTER_SAMPLE_LEADS).flat();
      } else {
        leads = CLUSTER_SAMPLE_LEADS[clusterKey] || [
          { name: `${clusterKey} Owner`, phone: '+971504128890', community: 'Damac Hills 2', cluster: clusterKey, unit: `${clusterKey} Villa 1` },
        ];
      }
    }

    const results = [];
    const skipJitterSleep = Boolean(options.instant || options.dryRun);

    for (let i = 0; i < leads.length; i++) {
      const jitterMs = i > 0 ? this.getNextJitterDelayMs() : 0;
      if (jitterMs > 0 && !skipJitterSleep) {
        await this.sleep(jitterMs);
      }

      const res = await this.processLead(leads[i], {
        dryRun: Boolean(options.dryRun),
        instant: Boolean(options.instant ?? true),
        enforceQuietHours: false,
      });
      results.push({ ...res, jitterMs });
      if (res.action === 'quota_exhausted_for_today') break;
    }

    const dispatchedCount = results.filter(r =>
      r.action === 'fresh_greeting_sent' || r.action === 'fresh_greeting_simulated'
    ).length;
    const supervisorReminders = results.filter(r =>
      r.action === 'supervisor_reminder_dispatched' || r.action === 'supervisor_reminder_simulated'
    ).length;
    const skippedCount = results.length - dispatchedCount - supervisorReminders;

    return {
      success: true,
      status: 'BATCH_COMPLETED',
      cluster: clusterKey,
      currentHourGST: hoursCheck.currentHourGST,
      dispatchedCount,
      supervisorReminders,
      skippedCount,
      totalProcessed: results.length,
      results,
    };
  }

  /**
   * Handle an inbound WhatsApp reply from a DAMAC Hills 2 property owner on any line in the pool:
   *   1. Classify owner intent via InboundIntentCategorizer.
   *   2. Sync lead to White-Caves-Server CRM via whiteCavesServerBridge.
   *   3. Forward an instant VIP alert to Primary Master (+971505760056) with unit, cluster, phone, and reply text.
   */
  async handleOwnerReply({ ownerPhone, replyText, receivingAgentPhone, ownerMeta = {}, primaryClient = null }) {
    const cleanOwner = phoneKey(ownerPhone);
    const formattedPhone = `+${cleanOwner}`;
    const storedOwner = this.getDispatchedOwner(cleanOwner) || {};
    const pendingList = supervisorFollowUpTracker.getPendingAssignments?.() || [];
    const pendingMatch = pendingList.find(p => phoneKey(p.clientPhone) === cleanOwner) || {};

    const ownerName = ownerMeta.name || storedOwner.name || pendingMatch.ownerName || 'DAMAC Hills 2 Owner';
    const unit = ownerMeta.unit || storedOwner.unit || pendingMatch.unit || 'Villa';
    const cluster = ownerMeta.cluster || storedOwner.cluster || pendingMatch.community || 'VARDON';

    // Mark follow-up completed if tracked
    supervisorFollowUpTracker.markCompleted?.(cleanOwner);
    this.recordDeliveryReceipt(cleanOwner, 'READ');

    const intent = this.categorizer.categorize(replyText);

    let crmSync = { success: false };
    try {
      crmSync = await this.crmSyncer({
        phone: formattedPhone,
        category: intent.category,
        name: ownerName,
        project: cluster,
        intentText: replyText,
        confidence: intent.confidence,
        source: 'whatsapp_damac_hills_2_owner_reply',
      });
    } catch (err) {
      crmSync = { success: false, error: err.message };
    }

    const acm = this.accountConfigManager || services.get('accountConfigManager');
    const primaryMasterPhone = acm?.getMasterPhoneNumber?.() || '+971505760056';
    const clients = this.accountClients || services.get('accountClients') || new Map();
    const masterClient = primaryClient || clients.get(primaryMasterPhone) || Array.from(clients.values())[0];

    const vipAlertText = [
      `👑 *VIP DAMAC HILLS 2 OWNER REPLY ESCALATION*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Owner:* ${ownerName}`,
      `📞 *Phone:* ${formattedPhone}`,
      `🏡 *Cluster:* ${cluster}`,
      `🔑 *Unit:* ${unit}`,
      `🏷️ *Classified Intent:* ${intent.category} (${Math.round((intent.confidence || 0.8) * 100)}%)`,
      receivingAgentPhone ? `📱 *Received On Line:* ${receivingAgentPhone}` : null,
      `🔄 *CRM Sync:* ${crmSync.success ? `✅ Synced (${crmSync.leadId || 'OK'})` : '⚠️ Queued'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💬 *Owner Reply:*`,
      `"${replyText}"`,
    ].filter(Boolean).join('\n');

    let vipAlertDispatched = false;
    if (masterClient && typeof masterClient.sendMessage === 'function') {
      try {
        const masterJid = `${phoneKey(primaryMasterPhone)}@c.us`;
        await masterClient.sendMessage(masterJid, vipAlertText, { allowClosedCirclePrompt: true });
        vipAlertDispatched = true;
      } catch (err) {
        logger.warn(`Failed to send VIP alert to Primary Master: ${err.message}`);
      }
    }

    return {
      success: true,
      ownerPhone: formattedPhone,
      ownerName,
      unit,
      cluster,
      intent,
      crmSync,
      vipAlertDispatched,
      primaryMasterPhone,
      vipAlertText,
    };
  }
}

export const damacHills2CampaignManager = new DamacHills2CampaignManager();
export default DamacHills2CampaignManager;
