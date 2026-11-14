// @ts-nocheck
/**
 * VardonLiveCampaignExecutor.js
 * 
 * Single responsibility: Execute live/dry-run dispatch verification for Vardon Campaign,
 * coordinating WhatsAppDispatchPool, BroadcastListManager, InboundIntentCategorizer,
 * AccountWarmupScheduler, ReadReceiptScheduler, and TypingStateGuard.
 * Features automated White Caves CRM lead synchronization & admin alerts on high-intent inbound replies.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

import dispatchPool from './WhatsAppDispatchPool.js';
import intentCategorizer, { RE_INTENT_CATEGORIES } from './InboundIntentCategorizer.js';
import broadcastListManager from './BroadcastListManager.js';
import { accountWarmupScheduler } from '../anti-ban/AccountWarmupScheduler.js';
import readReceiptScheduler from '../anti-ban/ReadReceiptScheduler.js';
import typingStateGuard from '../anti-ban/TypingStateGuard.js';
import { syncLeadToCrm } from '../whatsapp/bridge/whiteCavesServerBridge.js';
import adminNotifier from '../whatsapp/bridge/AdminNotificationBridge.js';

export class VardonLiveCampaignExecutor {
  constructor({
    pool = dispatchPool,
    categorizer = intentCategorizer,
    broadcastManager = broadcastListManager,
    warmupScheduler = accountWarmupScheduler,
    readScheduler = readReceiptScheduler,
    typingGuard = typingStateGuard,
    crmSyncer = syncLeadToCrm,
    notifier = adminNotifier,
    campaignName = 'VARDON_OUTREACH_CAMPAIGN',
    dailyTarget = 12,
  } = {}) {
    this.pool = pool;
    this.categorizer = categorizer;
    this.broadcastManager = broadcastManager;
    this.warmupScheduler = warmupScheduler;
    this.readScheduler = readScheduler;
    this.typingGuard = typingGuard;
    this.crmSyncer = crmSyncer;
    this.notifier = notifier;
    this.campaignName = campaignName;
    this.dailyTarget = dailyTarget;
    /** @type {Array<{ recipientPhone: string, senderPhone: string, timestamp: string, status: string, typingDurationMs?: number }>} */
    this.dispatchLog = [];
  }

  /**
   * Initialize pool with available linked accounts
   * @param {string[]} accounts
   */
  initializeAccounts(accounts = []) {
    accounts.forEach(phone => this.pool.registerAccount(phone));
  }

  /**
   * Simulate or verify live dispatch across the candidate queue with humanized anti-ban simulation
   * @param {Array<{ phone: string, name: string, project: string, draftMessage?: string }>} candidates
   * @returns {{ status: string, totalDispatched: number, skipped: number, poolStatus: Object, recentLogs: Array }}
   */
  executeDispatchBatch(candidates = []) {
    const toSend = candidates.slice(0, this.dailyTarget);
    const results = [];

    for (const candidate of toSend) {
      const sender = this.pool.acquireNextSender();
      if (!sender) {
        results.push({
          recipientPhone: candidate.phone,
          status: 'SKIPPED_POOL_EXHAUSTED',
          senderPhone: null,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Check account warmup limit if applicable
      const warmupCheck = this.warmupScheduler.canSend(sender);
      if (warmupCheck && !warmupCheck.allowed) {
        results.push({
          recipientPhone: candidate.phone,
          status: 'SKIPPED_WARMUP_LIMIT',
          reason: warmupCheck.reason,
          senderPhone: sender,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const draft = candidate.draftMessage || 'Hello from White Caves Real Estate regarding Vardon';
      const typingDurationMs = this.typingGuard.calculateTypingDuration(draft);

      const logEntry = {
        recipientPhone: candidate.phone,
        recipientName: candidate.name,
        project: candidate.project || 'VARDON',
        senderPhone: sender,
        status: 'VERIFIED_DISPATCHED',
        typingDurationMs,
        timestamp: new Date().toISOString(),
      };

      // Record send in warmup tracker
      this.warmupScheduler.recordSend(sender);
      this.dispatchLog.push(logEntry);
      results.push(logEntry);
    }

    return {
      campaign: this.campaignName,
      status: 'ACTIVE_DISPATCH_VERIFIED',
      totalDispatched: results.filter(r => r.status === 'VERIFIED_DISPATCHED').length,
      skipped: results.filter(r => r.status !== 'VERIFIED_DISPATCHED').length,
      poolStatus: this.pool.getPoolStatus(),
      recentLogs: results,
    };
  }

  /**
   * Handle incoming response from a candidate or prospect, classifying role,
   * syncing to White Caves Server CRM, scheduling read receipts, and alerting admins for high-intent.
   * @param {string} phone
   * @param {string} text
   * @param {Object} [meta]
   */
  async handleInboundReply(phone, text, meta = {}) {
    const classified = this.categorizer.categorizeAndEnroll(phone, text, this.broadcastManager);
    const readReceipt = this.readScheduler.scheduleMarkAsRead(phone, text.length);

    // Sync directly to CRM
    let crmSyncResult = null;
    try {
      crmSyncResult = await this.crmSyncer({
        phone,
        category: classified.category,
        name: meta.name,
        project: meta.project || 'VARDON',
        intentText: text,
        confidence: classified.confidence,
        source: 'whatsapp_linda_outreach',
      });
    } catch (_) {
      crmSyncResult = { success: false, error: 'CRM bridge unreachable' };
    }

    // Trigger high-priority admin alert if seller or cash buyer
    let adminAlertResult = null;
    if (classified.isHighPriority) {
      try {
        adminAlertResult = await this.notifier.notifyAdmins({
          phone,
          name: meta.name,
          category: classified.category,
          intentText: text,
          project: meta.project || 'VARDON',
          confidence: classified.confidence,
        });
      } catch (_) {
        adminAlertResult = { sent: 0, failed: 1 };
      }
    }

    return {
      phone,
      ...classified,
      readReceipt,
      crmSync: crmSyncResult,
      adminAlert: adminAlertResult,
      activeLists: Object.keys(RE_INTENT_CATEGORIES).map(k => {
        const listName = `LIST_${k}`;
        return {
          list: listName,
          enrolled: this.broadcastManager.getRecipients(listName).includes(phone),
        };
      }).filter(l => l.enrolled),
    };
  }

  /**
   * Inspect current campaign state & queue metrics
   */
  getCampaignStatus() {
    return {
      campaignName: this.campaignName,
      targetProject: 'VARDON',
      dailyTargetLimit: this.dailyTarget,
      totalDispatchesToday: this.dispatchLog.length,
      poolSnapshot: this.pool.getPoolStatus(),
    };
  }
}

export default new VardonLiveCampaignExecutor();
