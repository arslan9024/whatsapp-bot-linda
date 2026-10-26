/**
 * ========================================================================
 * NOTIFICATION SCHEMA
 * Phase 5: Feature 5 – Automated Notifications System
 * ========================================================================
 *
 * Models:
 *   1. NotificationRule  — Configurable rules that define when and how to notify
 *   2. Notification      — Individual notification instances (scheduled or triggered)
 *   3. NotificationLog   — Delivery audit trail (sent, failed, retried, read)
 *
 * Key design principles:
 *   • Rule-based engine — admins create rules, system executes automatically
 *   • Multi-channel delivery (WhatsApp, SMS, email, in-app)
 *   • Deduplication via composite key (ruleId + entityId + period)
 *   • Template integration with CommunicationTemplate system
 *   • Full audit trail for every notification event
 *   • Configurable escalation chains (tenant → landlord → manager)
 *   • Snooze, acknowledge, and suppress support
 *
 * @module NotificationSchema
 * @since Phase 5 Feature 5 – February 2026
 */

import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

// ====================================================================
// HELPER: Safe model creation (avoids duplicate registration)
// ====================================================================
function safeModel(name, schema) {
  return models[name] || model(name, schema);
}

// ====================================================================
// 1. NOTIFICATION RULE SCHEMA
//    Defines what triggers a notification, who receives it, and how
// ====================================================================
const NotificationRuleSchema = new Schema({
  ruleId: {
    type: String,
    unique: true,
    default: () => `NR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  },

  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // What triggers this notification
  trigger: {
    type: {
      type: String,
      required: true,
      enum: [
        'lease_expiry',           // Contract expiring within N days
        'payment_due',            // Invoice due within N days
        'payment_overdue',        // Invoice past due date
        'cheque_due',             // Cheque due within N days
        'cheque_overdue',         // Cheque past due and unpaid
        'commission_pending',     // Commission awaiting approval
        'commission_approved',    // Commission approved/rejected
        'commission_rule_expiry', // Commission rule expiring
        'contract_renewal',       // Contract renewal reminder
        'maintenance_schedule',   // Maintenance due
        'agent_performance',      // Agent performance threshold
        'portfolio_alert',        // Portfolio-level KPI threshold
        'recurring_invoice',      // Recurring invoice generated
        'payment_received',       // Payment completed
        'payment_failed',         // Payment failed
        'welcome',                // New tenant welcome
        'custom'                  // Custom scheduled notification
      ]
    },
    // How many days before the event to trigger (e.g., 30, 15, 7, 1)
    daysBeforeEvent: { type: Number, default: 7, min: 0 },
    // For threshold-based triggers (e.g., occupancy < 80%)
    threshold: {
      field: { type: String },
      operator: { type: String, enum: ['lt', 'lte', 'gt', 'gte', 'eq', 'ne'] },
      value: { type: Schema.Types.Mixed }
    },
    // Cron expression for custom schedules (e.g., "0 9 * * *" for 9 AM daily)
    cronExpression: { type: String }
  },

  // Who receives the notification
  recipients: {
    target: {
      type: String,
      required: true,
      enum: [
        'tenant',           // The tenant involved
        'landlord',         // The property landlord
        'agent',            // The assigned agent
        'manager',          // Property manager
        'admin',            // System admin
        'custom_list',      // Custom phone list
        'all_agents',       // All agents
        'all_tenants'       // All tenants
      ]
    },
    customPhones: [{ type: String }],
    // Escalation: if not acknowledged within N hours, notify next level
    escalation: {
      enabled: { type: Boolean, default: false },
      escalateAfterHours: { type: Number, default: 24 },
      escalateTo: { type: String, enum: ['landlord', 'manager', 'admin'] }
    }
  },

  // How to deliver
  channels: [{
    type: String,
    enum: ['whatsapp', 'sms', 'email', 'in_app', 'slack'],
    default: 'whatsapp'
  }],

  // Template to use (references CommunicationTemplate)
  templateId: { type: Schema.Types.ObjectId },
  // Or inline message template with variable placeholders
  messageTemplate: { type: String },

  // Frequency control
  frequency: {
    type: { type: String, enum: ['once', 'daily', 'weekly', 'monthly', 'custom'], default: 'once' },
    maxSendsPerEntity: { type: Number, default: 5 },       // Max times to notify about the same entity
    cooldownHours: { type: Number, default: 24 },           // Min hours between notifications
    quietHoursStart: { type: Number, min: 0, max: 23 },    // Don't send after this hour (e.g., 22)
    quietHoursEnd: { type: Number, min: 0, max: 23 }       // Don't send before this hour (e.g., 7)
  },

  // Priority for ordering
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },

  active: { type: Boolean, default: true },

  // Stats
  stats: {
    totalSent: { type: Number, default: 0 },
    totalDelivered: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    totalAcknowledged: { type: Number, default: 0 },
    lastTriggered: { type: Date },
    lastDelivered: { type: Date }
  },

  createdBy: { type: String },
  updatedBy: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

NotificationRuleSchema.index({ 'trigger.type': 1, active: 1 });
NotificationRuleSchema.index({ priority: 1 });
NotificationRuleSchema.index({ active: 1, createdAt: -1 });

// Virtual: delivery success rate
NotificationRuleSchema.virtual('deliveryRate').get(function () {
  if (!this.stats?.totalSent) return 0;
  return Math.round((this.stats.totalDelivered / this.stats.totalSent) * 100);
});

// Static: find active rules by trigger type
NotificationRuleSchema.statics.findByTrigger = function (triggerType) {
  return this.find({ 'trigger.type': triggerType, active: true }).sort({ priority: 1 });
};

// Static: find all active rules
NotificationRuleSchema.statics.findActive = function () {
  return this.find({ active: true }).sort({ priority: 1, 'trigger.type': 1 });
};


// ====================================================================
// 2. NOTIFICATION SCHEMA
//    Individual notification instances — one per recipient per event
// ====================================================================
const NotificationSchema = new Schema({
  notificationId: {
    type: String,
    unique: true,
    default: () => `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  },

  // Link to the rule that created this
  ruleId: { type: Schema.Types.ObjectId, ref: 'NotificationRule' },
  ruleName: { type: String },

  // What triggered it
  triggerType: {
    type: String,
    required: true,
    enum: [
      'lease_expiry', 'payment_due', 'payment_overdue', 'cheque_due',
      'cheque_overdue', 'commission_pending', 'commission_approved',
      'commission_rule_expiry', 'contract_renewal', 'maintenance_schedule',
      'agent_performance', 'portfolio_alert', 'recurring_invoice',
      'payment_received', 'payment_failed', 'welcome', 'custom'
    ]
  },

  // The entity this notification is about
  entityType: {
    type: String,
    enum: ['property', 'tenancy', 'invoice', 'payment', 'commission', 'agent', 'tenant', 'system']
  },
  entityId: { type: String },
  entityRef: { type: Schema.Types.ObjectId },

  // Recipient
  recipient: {
    phone: { type: String },
    email: { type: String },
    name: { type: String },
    role: { type: String, enum: ['tenant', 'landlord', 'agent', 'manager', 'admin'] }
  },

  // Message content
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email', 'in_app', 'slack'],
    default: 'whatsapp'
  },
  subject: { type: String },
  message: { type: String, required: true },
  messageData: { type: Schema.Types.Mixed },  // Structured data for templates

  // Priority
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },

  // Lifecycle status
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sending', 'sent', 'delivered', 'read',
           'acknowledged', 'failed', 'cancelled', 'snoozed', 'escalated', 'suppressed'],
    default: 'pending'
  },

  // Scheduling
  scheduledFor: { type: Date, default: Date.now },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  acknowledgedAt: { type: Date },

  // Snooze
  snoozedUntil: { type: Date },
  snoozeCount: { type: Number, default: 0 },

  // Retry tracking
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  lastRetryAt: { type: Date },
  nextRetryAt: { type: Date },

  // Error tracking
  errorMessage: { type: String },
  errorHistory: [{
    error: String,
    timestamp: { type: Date, default: Date.now },
    retryNumber: Number
  }],

  // Escalation
  escalated: { type: Boolean, default: false },
  escalatedTo: { type: String },
  escalatedAt: { type: Date },
  parentNotificationId: { type: String },

  // Deduplication key: prevents sending the same notification twice
  deduplicationKey: { type: String },

  // Metadata
  metadata: { type: Schema.Types.Mixed },
  tags: [{ type: String }],

  createdBy: { type: String, default: 'system' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

NotificationSchema.index({ status: 1, scheduledFor: 1 });
NotificationSchema.index({ 'recipient.phone': 1, status: 1 });
NotificationSchema.index({ triggerType: 1, status: 1 });
NotificationSchema.index({ entityType: 1, entityId: 1 });
NotificationSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ ruleId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ priority: 1, scheduledFor: 1 });

// Virtual: is overdue for delivery
NotificationSchema.virtual('isOverdue').get(function () {
  if (['sent', 'delivered', 'read', 'acknowledged', 'cancelled', 'suppressed'].includes(this.status)) return false;
  return this.scheduledFor && this.scheduledFor < new Date();
});

// Virtual: can retry
NotificationSchema.virtual('canRetry').get(function () {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

// Instance: mark as sent
NotificationSchema.methods.markSent = function () {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance: mark as delivered
NotificationSchema.methods.markDelivered = function () {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Instance: mark as read
NotificationSchema.methods.markRead = function () {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance: acknowledge
NotificationSchema.methods.acknowledge = function () {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  return this.save();
};

// Instance: snooze for N hours
NotificationSchema.methods.snooze = function (hours = 4) {
  this.status = 'snoozed';
  this.snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.snoozeCount += 1;
  return this.save();
};

// Instance: mark failed
NotificationSchema.methods.markFailed = function (error) {
  this.status = 'failed';
  this.errorMessage = error;
  this.errorHistory.push({ error, retryNumber: this.retryCount });
  return this.save();
};

// Instance: schedule retry
NotificationSchema.methods.scheduleRetry = function (delayMinutes = 30) {
  if (this.retryCount >= this.maxRetries) return this.markFailed('Max retries exceeded');
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  this.status = 'pending';
  return this.save();
};

// Static: find pending for sending
NotificationSchema.statics.findPending = function (limit = 100) {
  return this.find({
    status: { $in: ['pending', 'snoozed'] },
    scheduledFor: { $lte: new Date() },
    $or: [
      { snoozedUntil: { $exists: false } },
      { snoozedUntil: { $lte: new Date() } }
    ]
  }).sort({ priority: 1, scheduledFor: 1 }).limit(limit);
};

// Static: find by recipient phone
NotificationSchema.statics.findByRecipient = function (phone, options = {}) {
  const query = { 'recipient.phone': phone };
  if (options.status) query.status = options.status;
  if (options.triggerType) query.triggerType = options.triggerType;
  return this.find(query).sort({ createdAt: -1 }).limit(options.limit || 50);
};

// Static: count by status
NotificationSchema.statics.countByStatus = function () {
  return this.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};


// ====================================================================
// 3. NOTIFICATION LOG SCHEMA
//    Detailed audit trail for every delivery attempt
// ====================================================================
const NotificationLogSchema = new Schema({
  logId: {
    type: String,
    unique: true,
    default: () => `NL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  },

  notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true },
  ruleId: { type: Schema.Types.ObjectId, ref: 'NotificationRule' },

  // Event type
  event: {
    type: String,
    required: true,
    enum: [
      'created', 'scheduled', 'sending', 'sent', 'delivered', 'read',
      'acknowledged', 'failed', 'retried', 'cancelled', 'snoozed',
      'unsnoozed', 'escalated', 'suppressed', 'expired'
    ]
  },

  // Delivery details
  channel: { type: String, enum: ['whatsapp', 'sms', 'email', 'in_app', 'slack'] },
  recipientPhone: { type: String },
  recipientEmail: { type: String },

  // Result
  success: { type: Boolean },
  error: { type: String },
  gatewayResponse: { type: Schema.Types.Mixed },
  deliveryTime: { type: Number },   // Milliseconds from send to delivery

  // Context
  metadata: { type: Schema.Types.Mixed },
  triggeredBy: { type: String, default: 'system' },
  ipAddress: { type: String }
}, {
  timestamps: true
});

NotificationLogSchema.index({ notificationId: 1, createdAt: -1 });
NotificationLogSchema.index({ event: 1, createdAt: -1 });
NotificationLogSchema.index({ recipientPhone: 1, createdAt: -1 });
NotificationLogSchema.index({ ruleId: 1, createdAt: -1 });
NotificationLogSchema.index({ success: 1, createdAt: -1 });


// ====================================================================
// EXPORTS
// ====================================================================
export const NotificationRule = safeModel('NotificationRule', NotificationRuleSchema);
export const Notification     = safeModel('Notification', NotificationSchema);
export const NotificationLog  = safeModel('NotificationLog', NotificationLogSchema);

export default { NotificationRule, Notification, NotificationLog };
