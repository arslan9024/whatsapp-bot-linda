import mongoose from 'mongoose';

/**
 * Campaign Schema - Main campaign definitions and configuration
 * Stores campaign templates, filters, scheduling, and configuration
 */
const campaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    maxlength: 500
  },
  
  // Message template
  messageTemplate: {
    type: {
      text: {
        type: String,
        required: true,
        maxlength: 1000
      },
      mediaUrls: [{
        type: String,
        validate: {
          validator: (v) => /^https?:\/\//.test(v),
          message: 'Invalid URL format'
        }
      }],
      // Support placeholders: {name}, {phone}, {date}
      placeholders: [{
        type: String,
        enum: ['name', 'phone', 'date', 'company', 'custom']
      }]
    },
    required: true
  },
  
  // Contact targeting filters
  targetFilters: {
    namePattern: {
      type: String,
      description: 'Substring to match in contact name (case-insensitive)'
    },
    tags: [{
      type: String,
      description: 'Contact tags to include'
    }],
    minInteractions: {
      type: Number,
      default: 0,
      description: 'Minimum interaction count'
    },
    excludeNumbers: [{
      type: String,
      description: 'Phone numbers to exclude'
    }],
    caseSensitive: {
      type: Boolean,
      default: false
    }
  },
  
  // Rate limiting and batching
  limits: {
    messagesPerDay: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      max: 45, // WhatsApp daily limit
      description: 'Max messages per day for this campaign'
    },
    retryPolicy: {
      type: String,
      enum: ['next_day', 'immediate', 'never'],
      default: 'next_day',
      description: 'How to handle failed message retries'
    },
    delayBetweenMessages: {
      type: Number,
      default: 3000,
      description: 'Delay between messages in milliseconds'
    }
  },
  
  // Scheduling
  schedule: {
    sendTime: {
      type: String,
      default: '09:00',
      description: 'Time to send messages (HH:mm format, 24h)'
    },
    timezone: {
      type: String,
      default: 'Asia/Dubai',
      description: 'Timezone for scheduling'
    },
    enabled: {
      type: Boolean,
      default: true
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6,
      description: '0=Sunday, 6=Saturday. Empty = every day'
    }],
    cronExpression: {
      type: String,
      description: 'Optional cron expression for complex scheduling'
    }
  },
  
  // Campaign execution tracking
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'failed'],
    default: 'draft'
  },
  
  // Agent assignments - track which agent sends from which number
  agentAssignments: {
    type: Map,
    of: {
      assigned: Number,
      sent: Number,
      failed: Number,
      lastSentAt: Date
    }
  },
  
  // Campaign statistics
  stats: {
    totalContacts: {
      type: Number,
      default: 0,
      description: 'Total contacts matching filter'
    },
    sentCount: {
      type: Number,
      default: 0,
      index: true
    },
    failedCount: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    readCount: {
      type: Number,
      default: 0
    },
    skippedCount: {
      type: Number,
      default: 0
    },
    lastExecutionAt: Date,
    nextExecutionAt: Date
  },
  
  // Metadata
  createdBy: String,
  createdAt: {
    type: Date,
    default: () => new Date(),
    index: true
  },
  startedAt: Date,
  completedAt: Date,
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  timestamps: true,
  collection: 'campaigns'
});

/**
 * Daily Limit Schema - Tracks daily message counters for each campaign/account
 * Resets automatically at midnight
 */
const dailyLimitSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  
  accountNumber: {
    type: String,
    required: true,
    description: 'WhatsApp account phone number sending messages',
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true,
    description: 'Date (midnight UTC) for this daily counter'
  },
  
  // Message counting
  sentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  failedCount: {
    type: Number,
    default: 0
  },
  
  // Queue of failed messages to retry next day
  failedQueue: [{
    contactPhone: String,
    contactName: String,
    messageText: String,
    failedAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Execution metadata
  executionStarted: Date,
  executionCompleted: Date,
  resetAt: {
    type: Date,
    default: () => {
      const midnight = new Date();
      midnight.setUTCHours(0, 0, 0, 0);
      return new Date(midnight.getTime() + 24 * 60 * 60 * 1000);
    },
    description: 'When this daily counter automatically resets'
  },
  
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  timestamps: true,
  collection: 'campaign_daily_limits'
});

/**
 * Campaign Message Log Schema - Track every message sent by campaigns
 * Integrates with Phase 17 MessageActions for complete audit trail
 */
const campaignMessageLogSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  campaignId: {
    type: String,
    required: true,
    index: true
  },
  
  // Contact information
  contactPhone: {
    type: String,
    required: true,
    index: true
  },
  
  contactName: String,
  
  // Message details
  messageText: {
    type: String,
    required: true
  },
  
  // Timestamps
  queuedAt: Date,
  sentAt: {
    type: Date,
    index: true
  },
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  
  // Status tracking
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued',
    index: true
  },
  
  // Failure tracking
  errorReason: String,
  errorCode: String,
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRetryAt: Date,
  
  // Agent information
  agentPhone: String,
  agentNumber: String,
  
  // Source tracking
  campaignName: String,
  personalizationData: {
    type: Map,
    of: String
  },
  
  // Metadata for analytics
  metadata: {
    type: Map,
    of: String
  },
  
  createdAt: {
    type: Date,
    default: () => new Date(),
    index: true
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  }
}, {
  timestamps: true,
  collection: 'campaign_message_logs'
});

// Indexes for performance
campaignSchema.index({ campaignId: 1, createdAt: -1 });
campaignSchema.index({ status: 1, 'schedule.enabled': 1 });
campaignSchema.index({ 'stats.sentCount': -1 });

dailyLimitSchema.index({ campaignId: 1, accountNumber: 1, date: -1 });
dailyLimitSchema.index({ resetAt: 1 });

campaignMessageLogSchema.index({ campaignId: 1, contactPhone: 1, sentAt: -1 });
campaignMessageLogSchema.index({ status: 1, campaignId: 1 });
campaignMessageLogSchema.index({ createdAt: -1 });

// TTL Index: Auto-delete message logs after 90 days
campaignMessageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

/**
 * Methods and virtuals
 */

campaignSchema.methods.getTargetCount = function() {
  return this.stats.totalContacts;
};

campaignSchema.methods.getSentCount = function() {
  return this.stats.sentCount;
};

campaignSchema.methods.getSuccessRate = function() {
  if (this.stats.totalContacts === 0) return 0;
  return (this.stats.sentCount / this.stats.totalContacts * 100).toFixed(2);
};

dailyLimitSchema.methods.canSendMessage = function(messagesPerDay) {
  return this.sentCount < messagesPerDay;
};

dailyLimitSchema.methods.getRemainingQuota = function(messagesPerDay) {
  return Math.max(0, messagesPerDay - this.sentCount);
};

campaignMessageLogSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

campaignMessageLogSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

campaignMessageLogSchema.methods.markAsFailed = function(errorReason, errorCode) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorReason = errorReason;
  this.errorCode = errorCode;
  return this.save();
};

/**
 * Create and export models
 */
let Campaign, DailyLimit, CampaignMessageLog;

try {
  Campaign = mongoose.model('Campaign');
} catch {
  Campaign = mongoose.model('Campaign', campaignSchema);
}

try {
  DailyLimit = mongoose.model('DailyLimit');
} catch {
  DailyLimit = mongoose.model('DailyLimit', dailyLimitSchema);
}

try {
  CampaignMessageLog = mongoose.model('CampaignMessageLog');
} catch {
  CampaignMessageLog = mongoose.model('CampaignMessageLog', campaignMessageLogSchema);
}

export { Campaign, DailyLimit, CampaignMessageLog };
export { campaignSchema, dailyLimitSchema, campaignMessageLogSchema };
