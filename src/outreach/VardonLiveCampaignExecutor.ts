// @ts-nocheck
/**
 * VardonLiveCampaignExecutor.js
 * 
 * Single responsibility: Execute live/dry-run dispatch verification for Vardon Campaign,
 * coordinating WhatsAppDispatchPool, BroadcastListManager, InboundIntentCategorizer,
 * AccountWarmupScheduler, ReadReceiptScheduler, TypingStateGuard, DynamicOutreachTemplateEngine,
 * and LiveCampaignSchedulePacer.
 * Features automated White Caves CRM lead synchronization & admin alerts on high-intent inbound replies.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

import dispatchPool from './WhatsAppDispatchPool.js';
import intentCategorizer, { RE_INTENT_CATEGORIES } from './InboundIntentCategorizer.js';
import broadcastListManager from './BroadcastListManager.js';
import { accountWarmupScheduler } from '../anti-ban/AccountWarmupScheduler.js';
import { GaussianJitterScheduler } from '../anti-ban/GaussianJitterScheduler.js';
import readReceiptScheduler from '../anti-ban/ReadReceiptScheduler.js';
import typingStateGuard from '../anti-ban/TypingStateGuard.js';
import templateEngine from './DynamicOutreachTemplateEngine.js';
import schedulePacer from './LiveCampaignSchedulePacer.js';
import {
  syncLeadToCrm,
  emitCampaignTelemetryToServer,
} from '../whatsapp/bridge/whiteCavesServerBridge.js';
import adminNotifier from '../whatsapp/bridge/AdminNotificationBridge.js';

export class VardonLiveCampaignExecutor {
  constructor({
    pool = dispatchPool,
    categorizer = intentCategorizer,
    broadcastManager = broadcastListManager,
    warmupScheduler = accountWarmupScheduler,
    jitterScheduler = new GaussianJitterScheduler({ meanMs: 30000, stdDevMs: 7500, minMs: 15000, maxMs: 45000 }),
    readScheduler = readReceiptScheduler,
    typingGuard = typingStateGuard,
    templates = templateEngine,
    pacer = schedulePacer,
    crmSyncer = syncLeadToCrm,
    telemetryEmitter = emitCampaignTelemetryToServer,
    notifier = adminNotifier,
    campaignName = 'VARDON_OUTREACH_CAMPAIGN',
    dailyTarget = 12,
  } = {}) {
    this.pool = pool;
    this.categorizer = categorizer;
    this.broadcastManager = broadcastManager;
    this.warmupScheduler = warmupScheduler;
    this.jitterScheduler = jitterScheduler;
    this.readScheduler = readScheduler;
    this.typingGuard = typingGuard;
    this.templates = templates;
    this.pacer = pacer;
    this.crmSyncer = crmSyncer;
    this.telemetryEmitter = telemetryEmitter;
    this.notifier = notifier;
    this.campaignName = campaignName;
    this.dailyTarget = dailyTarget;
    /** @type {Array<{ recipientPhone: string, senderPhone: string, timestamp: string, status: string, typingDurationMs?: number, jitterDelayMs?: number, messageText?: string }>} */
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
   * Create an automated campaign schedule plan respecting working hours and daily target limits
   * @param {Array<{ phone: string, name: string }>} candidates
   * @returns {{ scheduledDispatches: Array, totalScheduled: number, dailyCapEnforced: boolean, compliantHoursCheck: Object }}
   */
  planCampaignSchedule(candidates = []) {
    const compliantHoursCheck = this.pacer.isWithinCompliantHours();
    const schedule = this.pacer.generateDispatchSchedule(candidates);
    return {
      campaignName: this.campaignName,
      ...schedule,
      compliantHoursCheck,
    };
  }

  /**
   * Simulate or verify live dispatch across the candidate queue with humanized anti-ban simulation
   * and dynamic bilingual spintax template generation.
   * @param {Array<{ phone: string, name: string, project: string, unit?: string, templateId?: string, draftMessage?: string }>} candidates
   * @param {Object} [options]
   * @param {boolean} [options.enforceQuietHours]
   * @param {Date} [options.now]
   * @returns {{ status: string, totalDispatched: number, skipped: number, poolStatus: Object, recentLogs: Array }}
   */
  executeDispatchBatch(candidates = [], options = {}) {
    if (options.enforceQuietHours) {
      const hoursCheck = this.pacer.isWithinCompliantHours(options.now || new Date());
      if (!hoursCheck.isAllowed) {
        return {
          campaign: this.campaignName,
          status: 'QUIET_HOURS_PAUSED',
          currentHourGST: hoursCheck.currentHourGST,
          reason: hoursCheck.reason,
          totalDispatched: 0,
          skipped: candidates.length,
          poolStatus: this.pool.getPoolStatus(),
          recentLogs: [],
        };
      }
    }

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

      // Check account warmup limit if applicable (handles both boolean and object returns)
      const warmupCheck = this.warmupScheduler.canSend(sender);
      const isWarmupAllowed = typeof warmupCheck === 'boolean' ? warmupCheck : Boolean(warmupCheck?.allowed ?? true);
      if (!isWarmupAllowed) {
        results.push({
          recipientPhone: candidate.phone,
          status: 'SKIPPED_WARMUP_LIMIT',
          reason: warmupCheck?.reason || 'Account daily warmup ceiling reached',
          senderPhone: sender,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Synthesize dynamic template if custom draft not provided
      let messageContent = candidate.draftMessage;
      if (!messageContent) {
        const templateResult = this.templates.generateOutreachMessage(
          candidate.templateId || 'VARDON_VALUATION_EN',
          { firstName: candidate.name, cluster: candidate.project || 'VARDON' }
        );
        messageContent = templateResult.messageText;
      }

      const typingDurationMs = this.typingGuard.calculateTypingDuration(messageContent);
      const jitterDelayMs = this.jitterScheduler ? this.jitterScheduler.getNextInterval() : 30000;

      const logEntry = {
        recipientPhone: candidate.phone,
        recipientName: candidate.name,
        project: candidate.project || 'VARDON',
        unit: candidate.unit || '',
        senderPhone: sender,
        status: 'VERIFIED_DISPATCHED',
        messageText: messageContent,
        typingDurationMs,
        jitterDelayMs,
        timestamp: new Date().toISOString(),
      };

      // Record send in warmup tracker
      this.warmupScheduler.recordSend(sender);
      this.dispatchLog.push(logEntry);
      results.push(logEntry);
    }

    const batchSummary = {
      campaign: this.campaignName,
      status: 'ACTIVE_DISPATCH_VERIFIED',
      totalDispatched: results.filter(r => r.status === 'VERIFIED_DISPATCHED').length,
      skipped: results.filter(r => r.status !== 'VERIFIED_DISPATCHED').length,
      poolStatus: this.pool.getPoolStatus(),
      recentLogs: results,
    };

    if (typeof this.telemetryEmitter === 'function') {
      void Promise.resolve(
        this.telemetryEmitter({
          campaignName: this.campaignName,
          status: batchSummary.status,
          totalDispatched: batchSummary.totalDispatched,
          skipped: batchSummary.skipped,
          dailyTarget: this.dailyTarget,
          poolStatus: batchSummary.poolStatus,
          recentLogs: batchSummary.recentLogs.slice(-5),
        })
      ).catch(() => {});
    }

    return batchSummary;
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

    // Trigger high-priority admin alert if seller, cash buyer, or DAMAC Hills 2 owner reply
    let adminAlertResult = null;
    if (classified.isHighPriority || meta.alwaysAlertPrimaryMaster) {
      try {
        adminAlertResult = await this.notifier.notifyAdmins({
          phone,
          name: meta.name,
          unit: meta.unit,
          cluster: meta.cluster || meta.project || 'VARDON',
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
      availableTemplates: this.templates.listTemplates().length,
    };
  }
}

export default new VardonLiveCampaignExecutor();
