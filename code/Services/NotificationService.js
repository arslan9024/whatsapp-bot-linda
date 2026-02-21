/**
 * ========================================================================
 * AUTOMATED NOTIFICATION SERVICE
 * Phase 5: Feature 5 – Automated Notifications System
 * ========================================================================
 *
 * Enterprise-grade notification engine that:
 *   • Scans data sources for trigger conditions (lease expiry, payment due, etc.)
 *   • Evaluates rules against current state
 *   • Generates and queues notifications with deduplication
 *   • Delivers via WhatsApp (primary), SMS, email, in-app
 *   • Manages snooze, acknowledge, escalation, and retries
 *   • Provides analytics on delivery success and engagement
 *
 * Integrates with:
 *   • PropertyTenancy — lease/cheque alerts
 *   • Invoice/InvoicePayment — payment reminders
 *   • CommissionRule/CalculationRecord — commission alerts
 *   • CommunicationTemplate — message templates
 *   • PortfolioAnalyticsService — portfolio threshold alerts
 *
 * @module NotificationService
 * @since Phase 5 Feature 5 – February 2026
 */

import mongoose from 'mongoose';

class NotificationService {

  // ── Safe model access ────────────────────────────────────────────
  _model(name) {
    try { return mongoose.model(name); } catch { return null; }
  }

  // ================================================================
  //  RULE MANAGEMENT
  // ================================================================

  /**
   * Create a notification rule
   */
  async createRule(data) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'NotificationRule model not available' };

      const rule = new Rule(data);
      await rule.save();
      return { success: true, rule, ruleId: rule.ruleId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a rule by ID or ruleId
   */
  async getRule(id) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rule = await Rule.findOne({
        $or: [
          { ruleId: id },
          ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
        ]
      });

      if (!rule) return { success: false, error: 'Rule not found' };
      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List rules with filters
   */
  async listRules(filters = {}) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const query = {};
      if (filters.active !== undefined) query.active = filters.active;
      if (filters.triggerType) query['trigger.type'] = filters.triggerType;
      if (filters.priority) query.priority = filters.priority;

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));

      const [rules, total] = await Promise.all([
        Rule.find(query).sort({ priority: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Rule.countDocuments(query)
      ]);

      return { success: true, rules, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a rule
   */
  async updateRule(id, updates) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rule = await Rule.findOne({
        $or: [{ ruleId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });
      if (!rule) return { success: false, error: 'Rule not found' };

      // Prevent changing ruleId
      delete updates.ruleId;
      Object.assign(rule, updates);
      await rule.save();
      return { success: true, rule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const result = await Rule.findOneAndDelete({
        $or: [{ ruleId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });

      if (!result) return { success: false, error: 'Rule not found' };
      return { success: true, deleted: result.ruleId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle a rule active/inactive
   */
  async toggleRule(id) {
    try {
      const res = await this.getRule(id);
      if (!res.success) return res;

      res.rule.active = !res.rule.active;
      await res.rule.save();
      return { success: true, rule: res.rule, active: res.rule.active };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  NOTIFICATION CRUD
  // ================================================================

  /**
   * Create a notification manually
   */
  async createNotification(data) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Notification model not available' };

      // Build dedup key if not supplied
      if (!data.deduplicationKey && data.ruleId && data.entityId) {
        const today = new Date().toISOString().split('T')[0];
        data.deduplicationKey = `${data.ruleId}-${data.entityId}-${today}`;
      }

      // Check dedup
      if (data.deduplicationKey) {
        const exists = await Notif.findOne({ deduplicationKey: data.deduplicationKey });
        if (exists) {
          return { success: true, notification: exists, deduplicated: true, message: 'Already exists' };
        }
      }

      const notification = new Notif(data);
      await notification.save();

      // Log creation
      await this._log(notification._id, notification.ruleId, 'created', {
        channel: notification.channel,
        recipientPhone: notification.recipient?.phone
      });

      return { success: true, notification, notificationId: notification.notificationId };
    } catch (error) {
      if (error.code === 11000) {
        return { success: true, deduplicated: true, message: 'Duplicate notification prevented' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a notification by ID or notificationId
   */
  async getNotification(id) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const notification = await Notif.findOne({
        $or: [{ notificationId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])]
      });

      if (!notification) return { success: false, error: 'Notification not found' };
      return { success: true, notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List notifications with filters
   */
  async listNotifications(filters = {}) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.triggerType) query.triggerType = filters.triggerType;
      if (filters.recipientPhone) query['recipient.phone'] = filters.recipientPhone;
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.entityId) query.entityId = filters.entityId;
      if (filters.priority) query.priority = filters.priority;
      if (filters.channel) query.channel = filters.channel;

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));

      const [notifications, total] = await Promise.all([
        Notif.find(query).sort({ priority: 1, scheduledFor: -1 }).skip((page - 1) * limit).limit(limit),
        Notif.countDocuments(query)
      ]);

      return { success: true, notifications, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a notification
   */
  async cancelNotification(id, reason) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      if (['sent', 'delivered', 'read', 'acknowledged'].includes(res.notification.status)) {
        return { success: false, error: `Cannot cancel notification in ${res.notification.status} status` };
      }

      res.notification.status = 'cancelled';
      res.notification.metadata = { ...res.notification.metadata, cancelReason: reason };
      await res.notification.save();

      await this._log(res.notification._id, res.notification.ruleId, 'cancelled', { reason });

      return { success: true, notification: res.notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  NOTIFICATION LIFECYCLE
  // ================================================================

  /**
   * Acknowledge a notification
   */
  async acknowledgeNotification(id) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      await res.notification.acknowledge();
      await this._log(res.notification._id, res.notification.ruleId, 'acknowledged', {
        channel: res.notification.channel
      });

      return { success: true, notification: res.notification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Snooze a notification
   */
  async snoozeNotification(id, hours = 4) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      await res.notification.snooze(hours);
      await this._log(res.notification._id, res.notification.ruleId, 'snoozed', {
        snoozedUntil: res.notification.snoozedUntil, hours
      });

      return { success: true, notification: res.notification, snoozedUntil: res.notification.snoozedUntil };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a notification (simulated — actual WhatsApp integration via CommunicationService)
   */
  async sendNotification(id) {
    try {
      const res = await this.getNotification(id);
      if (!res.success) return res;

      const notif = res.notification;
      if (!['pending', 'scheduled'].includes(notif.status) && notif.status !== 'snoozed') {
        return { success: false, error: `Cannot send notification in ${notif.status} status` };
      }

      // Mark as sending
      notif.status = 'sending';
      await notif.save();

      const startTime = Date.now();

      try {
        // Simulate channel delivery
        const delivered = await this._deliverViaChannel(notif);

        if (delivered) {
          await notif.markSent();
          await this._log(notif._id, notif.ruleId, 'sent', {
            channel: notif.channel,
            recipientPhone: notif.recipient?.phone,
            deliveryTime: Date.now() - startTime,
            success: true
          });

          // Update rule stats
          await this._updateRuleStats(notif.ruleId, 'sent');

          return { success: true, notification: notif, delivered: true };
        } else {
          await notif.markFailed('Delivery failed');
          await this._log(notif._id, notif.ruleId, 'failed', {
            channel: notif.channel,
            error: 'Delivery failed',
            success: false
          });
          return { success: true, notification: notif, delivered: false };
        }
      } catch (sendError) {
        await notif.markFailed(sendError.message);
        await this._log(notif._id, notif.ruleId, 'failed', {
          error: sendError.message, success: false
        });
        return { success: false, error: sendError.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process and send all pending notifications
   */
  async processPending(limit = 50) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const pending = await Notif.findPending(limit);

      const results = { sent: 0, failed: 0, skipped: 0, total: pending.length };

      for (const notif of pending) {
        // Check quiet hours
        if (this._isQuietHours()) {
          results.skipped++;
          continue;
        }

        const sendResult = await this.sendNotification(notif.notificationId);
        if (sendResult.success && sendResult.delivered) {
          results.sent++;
        } else {
          results.failed++;
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry all failed notifications that are eligible
   */
  async retryFailed() {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const failed = await Notif.find({
        status: 'failed',
        retryCount: { $lt: 3 },
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: { $lte: new Date() } }
        ]
      }).limit(50);

      const results = { retried: 0, stillFailed: 0, total: failed.length };

      for (const notif of failed) {
        await notif.scheduleRetry(30);
        const sendResult = await this.sendNotification(notif.notificationId);
        if (sendResult.success && sendResult.delivered) {
          results.retried++;
        } else {
          results.stillFailed++;
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  SCANNING ENGINES — Detect conditions and generate notifications
  // ================================================================

  /**
   * Run all scanners — the main daily cron entry point
   */
  async runAllScanners() {
    try {
      const results = {
        leaseExpiry: await this.scanLeaseExpiry(),
        paymentDue: await this.scanPaymentDue(),
        chequeDue: await this.scanChequeDue(),
        commissionPending: await this.scanCommissionPending(),
        overdueInvoices: await this.scanOverdueInvoices()
      };

      const totalGenerated = Object.values(results).reduce((sum, r) =>
        sum + (r.success ? (r.generated || 0) : 0), 0);

      return { success: true, results, totalGenerated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan for lease/contract expiry alerts
   */
  async scanLeaseExpiry() {
    try {
      const Tenancy = this._model('PropertyTenancy');
      const Rule = this._model('NotificationRule');
      if (!Tenancy || !Rule) return { success: false, error: 'Required models not available' };

      // Get active rules for lease expiry
      const rules = await Rule.findByTrigger('lease_expiry');
      if (!rules.length) return { success: true, generated: 0, message: 'No active lease_expiry rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 30;
        const expiring = await Tenancy.findUpcomingExpirations(days);

        for (const tenancy of expiring) {
          const expiryDate = tenancy.contractExpiryDate;
          const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
          const phone = tenancy.tenantPhone || tenancy.contactNumber;

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'lease_expiry',
            entityType: 'tenancy',
            entityId: tenancy._id?.toString(),
            entityRef: tenancy._id,
            recipient: {
              phone: phone,
              name: tenancy.tenantName,
              role: rule.recipients?.target || 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: daysLeft <= 7 ? 'high' : (daysLeft <= 15 ? 'medium' : 'low'),
            subject: `Lease Expiry Alert — ${daysLeft} days remaining`,
            message: rule.messageTemplate
              ? rule.messageTemplate
                  .replace('{{tenantName}}', tenancy.tenantName || 'Tenant')
                  .replace('{{daysLeft}}', daysLeft)
                  .replace('{{expiryDate}}', expiryDate.toLocaleDateString())
                  .replace('{{propertyId}}', tenancy.propertyId || 'N/A')
              : `⚠️ Lease Expiry Reminder\n\nDear ${tenancy.tenantName || 'Tenant'},\nYour lease expires in ${daysLeft} days (${expiryDate.toLocaleDateString()}).\nPlease contact your property manager for renewal.\n\n— Linda Property Bot`,
            messageData: { daysLeft, expiryDate, tenantName: tenancy.tenantName, propertyId: tenancy.propertyId },
            metadata: { source: 'lease_expiry_scanner', tenancyId: tenancy._id?.toString() }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan for upcoming payment due invoices
   */
  async scanPaymentDue() {
    try {
      const Invoice = this._model('Invoice');
      const Rule = this._model('NotificationRule');
      if (!Invoice || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('payment_due');
      if (!rules.length) return { success: true, generated: 0, message: 'No active payment_due rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 7;
        const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const invoices = await Invoice.find({
          status: { $in: ['draft', 'sent', 'partially_paid'] },
          dueDate: { $lte: futureDate, $gte: new Date() }
        }).limit(200);

        for (const inv of invoices) {
          const daysLeft = Math.ceil((inv.dueDate - new Date()) / (1000 * 60 * 60 * 24));

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'payment_due',
            entityType: 'invoice',
            entityId: inv.invoiceNumber || inv._id?.toString(),
            entityRef: inv._id,
            recipient: {
              phone: inv.tenantPhone || inv.tenantId,
              name: inv.tenantName,
              role: 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: daysLeft <= 3 ? 'high' : 'medium',
            subject: `Payment Due — ${inv.invoiceNumber}`,
            message: `💰 Payment Reminder\n\nInvoice: ${inv.invoiceNumber}\nAmount: AED ${(inv.balanceDue || inv.totalAmount || 0).toLocaleString()}\nDue: ${inv.dueDate.toLocaleDateString()} (${daysLeft} days)\n\nPlease arrange payment to avoid late fees.\n\n— Linda Property Bot`,
            messageData: { invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue || inv.totalAmount, daysLeft },
            metadata: { source: 'payment_due_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan for upcoming cheque due dates
   */
  async scanChequeDue() {
    try {
      const Tenancy = this._model('PropertyTenancy');
      const Rule = this._model('NotificationRule');
      if (!Tenancy || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('cheque_due');
      if (!rules.length) return { success: true, generated: 0, message: 'No active cheque_due rules' };

      let generated = 0;

      for (const rule of rules) {
        const days = rule.trigger.daysBeforeEvent || 7;
        const cheques = await Tenancy.findUpcomingCheques(days);

        for (const tenancy of cheques) {
          const upcomingCheques = (tenancy.paymentSchedule?.cheques || []).filter(c => {
            if (c.isPaid) return false;
            const due = new Date(c.chequeDueDate);
            return due >= new Date() && due <= new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          });

          for (const cheque of upcomingCheques) {
            const daysLeft = Math.ceil((new Date(cheque.chequeDueDate) - new Date()) / (1000 * 60 * 60 * 24));

            const result = await this.createNotification({
              ruleId: rule._id,
              ruleName: rule.name,
              triggerType: 'cheque_due',
              entityType: 'tenancy',
              entityId: `${tenancy._id}-cheque-${cheque.chequeNumber || 'unknown'}`,
              recipient: {
                phone: tenancy.tenantPhone || tenancy.contactNumber,
                name: tenancy.tenantName,
                role: 'tenant'
              },
              channel: rule.channels?.[0] || 'whatsapp',
              priority: daysLeft <= 3 ? 'high' : 'medium',
              subject: `Cheque Due — ${daysLeft} days`,
              message: `🏦 Cheque Reminder\n\nCheque #${cheque.chequeNumber || 'N/A'}\nAmount: AED ${(cheque.amount || 0).toLocaleString()}\nDue: ${new Date(cheque.chequeDueDate).toLocaleDateString()}\n\nPlease ensure funds are available.\n\n— Linda Property Bot`,
              messageData: { chequeNumber: cheque.chequeNumber, amount: cheque.amount, daysLeft },
              metadata: { source: 'cheque_due_scanner' }
            });

            if (result.success && !result.deduplicated) generated++;
          }
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan for overdue invoices
   */
  async scanOverdueInvoices() {
    try {
      const Invoice = this._model('Invoice');
      const Rule = this._model('NotificationRule');
      if (!Invoice || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('payment_overdue');
      if (!rules.length) return { success: true, generated: 0, message: 'No active payment_overdue rules' };

      let generated = 0;

      for (const rule of rules) {
        const overdue = await Invoice.find({
          status: { $in: ['sent', 'partially_paid', 'overdue'] },
          dueDate: { $lt: new Date() }
        }).limit(200);

        for (const inv of overdue) {
          const daysOverdue = Math.ceil((new Date() - inv.dueDate) / (1000 * 60 * 60 * 24));

          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'payment_overdue',
            entityType: 'invoice',
            entityId: inv.invoiceNumber || inv._id?.toString(),
            entityRef: inv._id,
            recipient: {
              phone: inv.tenantPhone || inv.tenantId,
              name: inv.tenantName,
              role: 'tenant'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: 'critical',
            subject: `OVERDUE — ${inv.invoiceNumber}`,
            message: `🚨 OVERDUE Payment\n\nInvoice: ${inv.invoiceNumber}\nAmount Due: AED ${(inv.balanceDue || inv.totalAmount || 0).toLocaleString()}\nOverdue by: ${daysOverdue} days\n\nImmediate payment required to avoid penalties.\n\n— Linda Property Bot`,
            messageData: { invoiceNumber: inv.invoiceNumber, amount: inv.balanceDue || inv.totalAmount, daysOverdue },
            metadata: { source: 'overdue_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan for commissions pending approval
   */
  async scanCommissionPending() {
    try {
      const CalcRecord = this._model('CalculationRecord');
      const Rule = this._model('NotificationRule');
      if (!CalcRecord || !Rule) return { success: false, error: 'Required models not available' };

      const rules = await Rule.findByTrigger('commission_pending');
      if (!rules.length) return { success: true, generated: 0, message: 'No active commission_pending rules' };

      let generated = 0;

      for (const rule of rules) {
        const pending = await CalcRecord.find({ status: 'pending_approval' }).limit(100);

        for (const record of pending) {
          const result = await this.createNotification({
            ruleId: rule._id,
            ruleName: rule.name,
            triggerType: 'commission_pending',
            entityType: 'commission',
            entityId: record.calculationId || record._id?.toString(),
            entityRef: record._id,
            recipient: {
              phone: rule.recipients?.customPhones?.[0],
              role: rule.recipients?.target || 'manager'
            },
            channel: rule.channels?.[0] || 'whatsapp',
            priority: 'high',
            subject: `Commission Approval Needed`,
            message: `📋 Commission Pending Approval\n\nAgent: ${record.agentPhone || 'N/A'}\nAmount: AED ${(record.commissionAmount || 0).toLocaleString()}\nDeal: ${record.dealId || 'N/A'}\n\nPlease review and approve/reject.\n\n— Linda Property Bot`,
            messageData: { agentPhone: record.agentPhone, amount: record.commissionAmount },
            metadata: { source: 'commission_pending_scanner' }
          });

          if (result.success && !result.deduplicated) generated++;
        }
      }

      return { success: true, generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  ESCALATION ENGINE
  // ================================================================

  /**
   * Process escalations — notifications not acknowledged within timeout
   */
  async processEscalations() {
    try {
      const Notif = this._model('Notification');
      const Rule = this._model('NotificationRule');
      if (!Notif || !Rule) return { success: false, error: 'Model not available' };

      // Find sent notifications that haven't been acknowledged and have escalation rules
      const escalatableNotifs = await Notif.find({
        status: { $in: ['sent', 'delivered'] },
        escalated: false,
        ruleId: { $exists: true }
      }).populate('ruleId').limit(100);

      let escalated = 0;

      for (const notif of escalatableNotifs) {
        const rule = notif.ruleId;
        if (!rule?.recipients?.escalation?.enabled) continue;

        const hoursSinceSent = (Date.now() - notif.sentAt) / (1000 * 60 * 60);
        if (hoursSinceSent < (rule.recipients.escalation.escalateAfterHours || 24)) continue;

        // Create escalation notification
        const escalateResult = await this.createNotification({
          ruleId: rule._id,
          ruleName: `[ESCALATION] ${rule.name}`,
          triggerType: notif.triggerType,
          entityType: notif.entityType,
          entityId: `ESC-${notif.entityId}`,
          recipient: {
            role: rule.recipients.escalation.escalateTo || 'manager'
          },
          channel: notif.channel,
          priority: 'critical',
          subject: `[ESCALATED] ${notif.subject}`,
          message: `🔺 ESCALATED NOTIFICATION\n\nOriginal notification was not acknowledged within ${rule.recipients.escalation.escalateAfterHours}h.\n\n${notif.message}`,
          parentNotificationId: notif.notificationId,
          metadata: { source: 'escalation_engine', originalNotificationId: notif.notificationId }
        });

        if (escalateResult.success && !escalateResult.deduplicated) {
          notif.escalated = true;
          notif.escalatedAt = new Date();
          notif.escalatedTo = rule.recipients.escalation.escalateTo;
          notif.status = 'escalated';
          await notif.save();
          escalated++;

          await this._log(notif._id, rule._id, 'escalated', {
            escalatedTo: rule.recipients.escalation.escalateTo
          });
        }
      }

      return { success: true, escalated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  SUPPRESSION
  // ================================================================

  /**
   * Suppress a notification type for a recipient temporarily
   */
  async suppressForRecipient(phone, triggerType, hours = 24) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const query = {
        'recipient.phone': phone,
        triggerType,
        status: { $in: ['pending', 'scheduled'] }
      };

      const result = await Notif.updateMany(query, {
        $set: { status: 'suppressed', metadata: { suppressedUntil: new Date(Date.now() + hours * 60 * 60 * 1000) } }
      });

      return { success: true, suppressed: result.modifiedCount, phone, triggerType, hours };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  ANALYTICS & REPORTING
  // ================================================================

  /**
   * Get notification statistics
   */
  async getStats() {
    try {
      const Notif = this._model('Notification');
      const Rule = this._model('NotificationRule');
      const Log = this._model('NotificationLog');
      if (!Notif || !Rule) return { success: false, error: 'Model not available' };

      const [statusCounts, triggerCounts, channelCounts, ruleCount, totalNotifs, recentFailed] = await Promise.all([
        Notif.countByStatus(),
        Notif.aggregate([{ $group: { _id: '$triggerType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Notif.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        Rule ? Rule.countDocuments({ active: true }) : 0,
        Notif.countDocuments(),
        Notif.countDocuments({ status: 'failed' })
      ]);

      const totalLogs = Log ? await Log.countDocuments() : 0;

      const byStatus = {};
      statusCounts.forEach(s => { byStatus[s._id] = s.count; });

      const byTrigger = {};
      triggerCounts.forEach(t => { byTrigger[t._id] = t.count; });

      const byChannel = {};
      channelCounts.forEach(c => { byChannel[c._id] = c.count; });

      const deliveryRate = totalNotifs > 0
        ? Math.round(((byStatus.sent || 0) + (byStatus.delivered || 0) + (byStatus.read || 0) + (byStatus.acknowledged || 0)) / totalNotifs * 100)
        : 0;

      return {
        success: true,
        stats: {
          totalNotifications: totalNotifs,
          activeRules: ruleCount,
          totalLogs: totalLogs,
          byStatus,
          byTrigger,
          byChannel,
          deliveryRate,
          failed: recentFailed,
          pending: byStatus.pending || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get delivery report for a time range
   */
  async getDeliveryReport(startDate, endDate) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const [sentCount, deliveredCount, failedCount, acknowledgedCount, escalatedCount, daily] = await Promise.all([
        Notif.countDocuments({ status: { $in: ['sent', 'delivered', 'read', 'acknowledged'] }, sentAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: { $in: ['delivered', 'read', 'acknowledged'] }, deliveredAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: 'failed', createdAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ status: 'acknowledged', acknowledgedAt: { $gte: start, $lte: end } }),
        Notif.countDocuments({ escalated: true, escalatedAt: { $gte: start, $lte: end } }),
        Notif.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read', 'acknowledged']] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }},
          { $sort: { _id: 1 } }
        ])
      ]);

      return {
        success: true,
        report: {
          period: { start, end },
          sent: sentCount,
          delivered: deliveredCount,
          failed: failedCount,
          acknowledged: acknowledgedCount,
          escalated: escalatedCount,
          deliveryRate: sentCount > 0 ? Math.round(deliveredCount / sentCount * 100) : 0,
          acknowledgeRate: sentCount > 0 ? Math.round(acknowledgedCount / sentCount * 100) : 0,
          daily
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification history for a specific recipient
   */
  async getRecipientHistory(phone, options = {}) {
    try {
      const Notif = this._model('Notification');
      if (!Notif) return { success: false, error: 'Model not available' };

      const limit = options.limit || 50;
      const notifications = await Notif.findByRecipient(phone, { limit, ...options });

      const stats = {
        total: notifications.length,
        sent: notifications.filter(n => ['sent', 'delivered', 'read', 'acknowledged'].includes(n.status)).length,
        pending: notifications.filter(n => n.status === 'pending').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        acknowledged: notifications.filter(n => n.status === 'acknowledged').length
      };

      return { success: true, notifications, stats, phone };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get rule performance report
   */
  async getRulePerformance() {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const rules = await Rule.find({ active: true }).sort({ 'stats.totalSent': -1 });

      const performance = rules.map(r => ({
        ruleId: r.ruleId,
        name: r.name,
        triggerType: r.trigger?.type,
        priority: r.priority,
        totalSent: r.stats?.totalSent || 0,
        totalDelivered: r.stats?.totalDelivered || 0,
        totalFailed: r.stats?.totalFailed || 0,
        deliveryRate: r.deliveryRate,
        lastTriggered: r.stats?.lastTriggered,
        lastDelivered: r.stats?.lastDelivered
      }));

      return { success: true, performance, totalRules: rules.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get quick stats formatted for WhatsApp bot
   */
  async getQuickStats() {
    try {
      const statsResult = await this.getStats();
      if (!statsResult.success) return '❌ Could not load notification stats';

      const s = statsResult.stats;

      return `📬 Notification Stats\n`
        + `━━━━━━━━━━━━━━━━━━━\n`
        + `📊 Total: ${s.totalNotifications}\n`
        + `📤 Pending: ${s.pending}\n`
        + `❌ Failed: ${s.failed}\n`
        + `📈 Delivery Rate: ${s.deliveryRate}%\n`
        + `📋 Active Rules: ${s.activeRules}\n`
        + `━━━━━━━━━━━━━━━━━━━\n`
        + `📌 By Type:\n`
        + Object.entries(s.byTrigger || {}).map(([k, v]) => `  • ${k}: ${v}`).join('\n')
        + `\n━━━━━━━━━━━━━━━━━━━\n`
        + `📡 By Channel:\n`
        + Object.entries(s.byChannel || {}).map(([k, v]) => `  • ${k}: ${v}`).join('\n');
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ================================================================
  //  SEED DEFAULT RULES
  // ================================================================

  /**
   * Seed default notification rules for common scenarios
   */
  async seedDefaultRules() {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule) return { success: false, error: 'Model not available' };

      const defaults = [
        {
          name: 'Lease Expiry — 30 Day Warning',
          trigger: { type: 'lease_expiry', daysBeforeEvent: 30 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 720 },
          messageTemplate: '⚠️ Dear {{tenantName}}, your lease expires in {{daysLeft}} days ({{expiryDate}}). Please contact us for renewal.'
        },
        {
          name: 'Lease Expiry — 7 Day Urgent',
          trigger: { type: 'lease_expiry', daysBeforeEvent: 7 },
          recipients: { target: 'tenant', escalation: { enabled: true, escalateAfterHours: 48, escalateTo: 'manager' } },
          channels: ['whatsapp'],
          priority: 'high',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 },
          messageTemplate: '🚨 Dear {{tenantName}}, your lease expires in {{daysLeft}} days! Urgent renewal needed.'
        },
        {
          name: 'Payment Due — 7 Day Reminder',
          trigger: { type: 'payment_due', daysBeforeEvent: 7 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 }
        },
        {
          name: 'Payment Overdue Alert',
          trigger: { type: 'payment_overdue', daysBeforeEvent: 0 },
          recipients: { target: 'tenant', escalation: { enabled: true, escalateAfterHours: 72, escalateTo: 'landlord' } },
          channels: ['whatsapp'],
          priority: 'critical',
          frequency: { type: 'daily', maxSendsPerEntity: 5, cooldownHours: 24 }
        },
        {
          name: 'Cheque Due — 7 Day Reminder',
          trigger: { type: 'cheque_due', daysBeforeEvent: 7 },
          recipients: { target: 'tenant' },
          channels: ['whatsapp'],
          priority: 'medium',
          frequency: { type: 'once', maxSendsPerEntity: 1, cooldownHours: 168 }
        },
        {
          name: 'Commission Pending Approval',
          trigger: { type: 'commission_pending', daysBeforeEvent: 0 },
          recipients: { target: 'manager' },
          channels: ['whatsapp'],
          priority: 'high',
          frequency: { type: 'once', maxSendsPerEntity: 2, cooldownHours: 24 }
        }
      ];

      let created = 0;
      let skipped = 0;

      for (const def of defaults) {
        const exists = await Rule.findOne({ name: def.name });
        if (exists) {
          skipped++;
          continue;
        }
        await Rule.create(def);
        created++;
      }

      return { success: true, created, skipped, total: defaults.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  //  PRIVATE HELPERS
  // ================================================================

  /**
   * Log a notification event
   */
  async _log(notificationId, ruleId, event, data = {}) {
    try {
      const Log = this._model('NotificationLog');
      if (!Log) return;

      await Log.create({
        notificationId,
        ruleId,
        event,
        channel: data.channel,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        success: data.success,
        error: data.error,
        gatewayResponse: data.gatewayResponse,
        deliveryTime: data.deliveryTime,
        metadata: data,
        triggeredBy: data.triggeredBy || 'system'
      });
    } catch {
      // Silently fail — logging shouldn't break the main flow
    }
  }

  /**
   * Update rule statistics after sending
   */
  async _updateRuleStats(ruleId, event) {
    try {
      const Rule = this._model('NotificationRule');
      if (!Rule || !ruleId) return;

      const update = {};
      if (event === 'sent') {
        update['stats.totalSent'] = 1;
        update['stats.totalDelivered'] = 1;
      } else if (event === 'failed') {
        update['stats.totalFailed'] = 1;
      } else if (event === 'acknowledged') {
        update['stats.totalAcknowledged'] = 1;
      }

      const setFields = {};
      if (event === 'sent') {
        setFields['stats.lastTriggered'] = new Date();
        setFields['stats.lastDelivered'] = new Date();
      }

      await Rule.findByIdAndUpdate(ruleId, {
        $inc: update,
        $set: setFields
      });
    } catch {
      // Silent fail
    }
  }

  /**
   * Simulate delivery via a channel (WhatsApp, SMS, email)
   * In production, this would integrate with CommunicationService
   */
  async _deliverViaChannel(notification) {
    // Simulated delivery — always succeeds in dev/test
    // In production, integrate with:
    // - CommunicationService.sendMessage() for WhatsApp
    // - Twilio for SMS
    // - SendGrid for email
    // - Slack API for Slack
    return true;
  }

  /**
   * Check if we're in quiet hours (don't send non-critical notifications)
   */
  _isQuietHours() {
    const hour = new Date().getHours();
    // Default quiet hours: 10 PM to 7 AM
    return hour >= 22 || hour < 7;
  }
}

export default new NotificationService();
