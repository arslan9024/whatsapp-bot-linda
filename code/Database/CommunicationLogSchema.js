import mongoose from 'mongoose';

/**
 * CommunicationLog Collection
 * PURPOSE: Track every message sent through templates or bulk messaging
 * COLLECTION: communicationlogs
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * Tracks:
 * - Individual message delivery status
 * - Bulk send campaigns
 * - Delivery confirmations
 * - Read receipts (when available)
 * - Error tracking & retry history
 */

const RetrySchema = new mongoose.Schema({
  attempt: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  error: { type: String },
  success: { type: Boolean, default: false }
}, { _id: false });

const CommunicationLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique log identifier, format: LOG-YYYYMMDD-XXXXX'
    },

    // Template reference (nullable for ad-hoc messages)
    templateId: {
      type: String,
      index: true,
      description: 'FK to CommunicationTemplate (null for ad-hoc messages)'
    },
    templateName: {
      type: String,
      description: 'Snapshot of template name at send time'
    },

    // Bulk operation grouping
    bulkId: {
      type: String,
      index: true,
      description: 'Groups messages from the same bulk send operation'
    },

    // Sender info
    sentBy: {
      type: String,
      required: true,
      description: 'PersonId or system identifier that triggered the send'
    },
    sentFrom: {
      type: String,
      description: 'WhatsApp account number used to send'
    },

    // Recipient info
    recipientId: {
      type: String,
      index: true,
      description: 'FK to Person collection'
    },
    recipientPhone: {
      type: String,
      required: true,
      description: 'Phone number the message was sent to'
    },
    recipientName: {
      type: String,
      description: 'Snapshot of recipient name at send time'
    },
    recipientType: {
      type: String,
      enum: ['tenant', 'owner', 'agent', 'buyer', 'contact', 'unknown'],
      default: 'unknown',
      description: 'Role of the recipient'
    },

    // Message content
    content: {
      type: String,
      required: true,
      maxlength: 4096,
      description: 'Actual rendered message content that was sent'
    },
    language: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en'
    },
    variablesUsed: {
      type: Map,
      of: String,
      default: {},
      description: 'Variables that were interpolated into the template'
    },

    // Delivery tracking
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
      description: 'Current delivery status'
    },
    queuedAt: {
      type: Date,
      default: Date.now,
      description: 'When message was added to send queue'
    },
    sentAt: {
      type: Date,
      description: 'When message was actually sent'
    },
    deliveredAt: {
      type: Date,
      description: 'When WhatsApp confirmed delivery'
    },
    readAt: {
      type: Date,
      description: 'When recipient read the message (if available)'
    },
    failedAt: {
      type: Date,
      description: 'When the send attempt failed'
    },

    // Error handling
    errorMessage: {
      type: String,
      description: 'Error message if send failed'
    },
    errorCode: {
      type: String,
      description: 'Error code for programmatic handling'
    },
    retries: {
      type: [RetrySchema],
      default: [],
      description: 'Retry attempt history'
    },
    maxRetries: {
      type: Number,
      default: 3,
      description: 'Maximum retry attempts allowed'
    },

    // Context
    context: {
      propertyId: { type: String, description: 'Related property if applicable' },
      tenancyId: { type: String, description: 'Related tenancy if applicable' },
      clusterId: { type: String, description: 'Related cluster if applicable' },
      campaignId: { type: String, description: 'Related campaign if applicable' }
    },

    // Scheduling
    scheduledFor: {
      type: Date,
      description: 'When the message is scheduled to be sent'
    },

    // Metadata
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email'],
      default: 'whatsapp',
      description: 'Communication channel used'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      description: 'Message priority for queue ordering'
    }
  },
  {
    timestamps: true,
    collection: 'communicationlogs'
  }
);

// ============================================
// INDEXES
// ============================================
CommunicationLogSchema.index({ status: 1, queuedAt: -1 });
CommunicationLogSchema.index({ recipientPhone: 1, createdAt: -1 });
CommunicationLogSchema.index({ bulkId: 1, status: 1 });
CommunicationLogSchema.index({ templateId: 1, createdAt: -1 });
CommunicationLogSchema.index({ sentBy: 1, createdAt: -1 });
CommunicationLogSchema.index({ scheduledFor: 1, status: 1 });
CommunicationLogSchema.index({ 'context.propertyId': 1 });
CommunicationLogSchema.index({ createdAt: -1 });

// TTL index: auto-delete logs older than 365 days
CommunicationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ============================================
// VIRTUALS
// ============================================
CommunicationLogSchema.virtual('deliveryDuration').get(function () {
  if (!this.sentAt || !this.deliveredAt) return null;
  return this.deliveredAt.getTime() - this.sentAt.getTime();
});

CommunicationLogSchema.virtual('isDelivered').get(function () {
  return ['delivered', 'read'].includes(this.status);
});

CommunicationLogSchema.virtual('canRetry').get(function () {
  return this.status === 'failed' && this.retries.length < this.maxRetries;
});

// ============================================
// METHODS
// ============================================

CommunicationLogSchema.methods.markSent = function () {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

CommunicationLogSchema.methods.markDelivered = function () {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

CommunicationLogSchema.methods.markRead = function () {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

CommunicationLogSchema.methods.markFailed = function (errorMessage, errorCode) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;
  this.retries.push({
    attempt: this.retries.length + 1,
    error: errorMessage,
    success: false
  });
  return this.save();
};

CommunicationLogSchema.methods.retry = function () {
  if (!this.canRetry) {
    throw new Error(`Cannot retry: max retries (${this.maxRetries}) reached`);
  }
  this.status = 'queued';
  return this.save();
};

// ============================================
// STATICS
// ============================================

CommunicationLogSchema.statics.generateLogId = function () {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LOG-${date}-${random}`;
};

CommunicationLogSchema.statics.getDeliveryStats = async function (filter = {}) {
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  const results = await this.aggregate(pipeline);

  const stats = { queued: 0, sending: 0, sent: 0, delivered: 0, read: 0, failed: 0, cancelled: 0 };
  results.forEach(r => { stats[r._id] = r.count; });

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  stats.total = total;
  stats.deliveryRate = total > 0 ? (((stats.delivered + stats.read) / total) * 100).toFixed(1) : '0.0';

  return stats;
};

CommunicationLogSchema.statics.getBulkStatus = async function (bulkId) {
  return this.getDeliveryStats({ bulkId });
};

CommunicationLogSchema.statics.getQueuedMessages = function (limit = 50) {
  return this.find({ status: 'queued' })
    .sort({ priority: -1, queuedAt: 1 })
    .limit(limit);
};

CommunicationLogSchema.statics.getFailedMessages = function (limit = 50) {
  return this.find({
    status: 'failed',
    $expr: { $lt: [{ $size: '$retries' }, '$maxRetries'] }
  })
    .sort({ failedAt: -1 })
    .limit(limit);
};

// Ensure virtual fields are included in JSON
CommunicationLogSchema.set('toJSON', { virtuals: true });
CommunicationLogSchema.set('toObject', { virtuals: true });

const CommunicationLog = mongoose.model('CommunicationLog', CommunicationLogSchema);

export default CommunicationLog;
