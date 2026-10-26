/**
 * ========================================================================
 * PROPERTY OWNER AUDIT LOG SCHEMA - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Tracks all changes to PropertyOwner, PropertyContact, and PropertyOwnerProperties:
 * - Change history (what changed, when, who)
 * - Before/after values for data integrity
 * - Compliance & audit trail
 * - Verification timestamps
 * 
 * @module PropertyOwnerAuditLogSchema
 * @since Phase 30 - February 19, 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// PROPERTY OWNER AUDIT LOG SCHEMA
// ========================================================================
// Immutable audit log for tracking all changes

const propertyOwnerAuditLogSchema = new mongoose.Schema({
  // ========================================================================
  // PRIMARY IDENTIFIER
  // ========================================================================
  auditId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    description: 'Unique identifier for the audit log entry'
  },

  // ========================================================================
  // CHANGE TRACKING
  // ========================================================================
  recordType: {
    type: String,
    enum: ['PropertyOwner', 'PropertyContact', 'PropertyOwnerProperties'],
    required: true,
    index: true,
    description: 'Type of record that was modified'
  },

  recordId: {
    type: String,
    required: true,
    index: true,
    description: 'ID of the record that was modified'
  },

  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'VERIFY', 'SYNC'],
    required: true,
    index: true,
    description: 'Action performed on the record'
  },

  // ========================================================================
  // USER/SYSTEM TRACKING
  // ========================================================================
  performedBy: {
    type: String,
    required: true,
    description: 'User ID or system name that made the change'
  },

  performedByName: {
    type: String,
    description: 'Name of user or system that made the change'
  },

  ipAddress: {
    type: String,
    sparse: true,
    description: 'IP address from which change was made'
  },

  userAgent: {
    type: String,
    sparse: true,
    description: 'User agent/browser information'
  },

  // ========================================================================
  // CHANGE DETAILS
  // ========================================================================
  changedFields: [
    {
      fieldName: {
        type: String,
        required: true,
        description: 'Name of field that changed'
      },
      oldValue: {
        type: mongoose.Schema.Types.Mixed,
        description: 'Previous value'
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed,
        description: 'New value'
      },
      valueType: {
        type: String,
        enum: ['string', 'number', 'boolean', 'date', 'object', 'array'],
        description: 'Data type of the field'
      }
    }
  ],

  // ========================================================================
  // BEFORE/AFTER SNAPSHOTS
  // ========================================================================
  beforeSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Complete record state before change'
  },

  afterSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Complete record state after change'
  },

  // ========================================================================
  // RELATED RECORDS
  // ========================================================================
  relatedRecords: [
    {
      type: String,
      description: 'IDs of related records (owners, properties, contacts)'
    }
  ],

  // ========================================================================
  // REASON & CONTEXT
  // ========================================================================
  reason: {
    type: String,
    enum: ['data_correction', 'user_update', 'system_sync', 'verification', 'compliance', 'other'],
    description: 'Reason for the change'
  },

  description: {
    type: String,
    maxlength: 500,
    description: 'Detailed description of the change'
  },

  // ========================================================================
  // SOURCE TRACKING
  // ========================================================================
  sourceSystem: {
    type: String,
    enum: ['google_sheets', 'terminal', 'api', 'web_ui', 'mobile_app', 'integration'],
    description: 'System through which change was made'
  },

  // ========================================================================
  // VERIFICATION STATUS
  // ========================================================================
  requiresVerification: {
    type: Boolean,
    default: false,
    description: 'Whether change needs verification'
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_review'],
    default: 'approved',
    description: 'Verification status of the change'
  },

  verifiedBy: {
    type: String,
    sparse: true,
    description: 'User who verified the change'
  },

  verificationNotes: {
    type: String,
    sparse: true,
    description: 'Notes from verification'
  },

  verificationDate: {
    type: Date,
    sparse: true,
    description: 'When change was verified'
  },

  // ========================================================================
  // NOTIFICATIONS & ALERTS
  // ========================================================================
  alertSent: {
    type: Boolean,
    default: false,
    description: 'Whether alert notification was sent'
  },

  alertType: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    sparse: true,
    description: 'Priority level of alert'
  },

  // ========================================================================
  // TIMESTAMPS
  // ========================================================================
  changedAt: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'Timestamp when change occurred'
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'Timestamp when audit log entry was created'
  },

  // ========================================================================
  // RETENTION & COMPLIANCE
  // ========================================================================
  retentionUntil: {
    type: Date,
    description: 'Date until which log should be retained'
  },

  complianceLevel: {
    type: String,
    enum: ['standard', 'sensitive', 'critical'],
    default: 'standard',
    description: 'Compliance level for the record'
  },

  encrypted: {
    type: Boolean,
    default: false,
    description: 'Whether sensitive data is encrypted'
  }

}, {
  timestamps: false,
  strict: true,
  validateBeforeSave: true
});

// ========================================================================
// INDEXES FOR PERFORMANCE
// ========================================================================

// Primary lookup indexes
propertyOwnerAuditLogSchema.index({ auditId: 1 });
propertyOwnerAuditLogSchema.index({ recordId: 1 });
propertyOwnerAuditLogSchema.index({ recordType: 1, recordId: 1 });

// Action & filtering
propertyOwnerAuditLogSchema.index({ action: 1, changedAt: -1 });
propertyOwnerAuditLogSchema.index({ performedBy: 1, changedAt: -1 });

// Time-based queries
propertyOwnerAuditLogSchema.index({ changedAt: -1 });
propertyOwnerAuditLogSchema.index({ createdAt: -1 });

// Verification tracking
propertyOwnerAuditLogSchema.index({ verificationStatus: 1, changedAt: -1 });
propertyOwnerAuditLogSchema.index({ requiresVerification: 1, verificationStatus: 1 });

// Compliance
propertyOwnerAuditLogSchema.index({ complianceLevel: 1, retentionUntil: 1 });

// Alerts
propertyOwnerAuditLogSchema.index({ alertSent: 1, alertType: 1 });

// ========================================================================
// VIRTUALS
// ========================================================================

propertyOwnerAuditLogSchema.virtual('isRecent').get(function() {
  const daysDiff = (new Date() - this.changedAt) / (1000 * 60 * 60 * 24);
  return daysDiff <= 7; // Recent if within last 7 days
});

propertyOwnerAuditLogSchema.virtual('changeCount').get(function() {
  return this.changedFields ? this.changedFields.length : 0;
});

propertyOwnerAuditLogSchema.virtual('isVerified').get(function() {
  return this.verificationStatus === 'approved';
});

// ========================================================================
// HOOKS
// ========================================================================

// Prevent modification (immutable log)
propertyOwnerAuditLogSchema.pre('updateOne', function(next) {
  const error = new Error('Audit logs are immutable and cannot be updated');
  next(error);
});

propertyOwnerAuditLogSchema.pre('replaceOne', function(next) {
  const error = new Error('Audit logs are immutable and cannot be modified');
  next(error);
});

propertyOwnerAuditLogSchema.pre('findByIdAndUpdate', function(next) {
  const error = new Error('Audit logs cannot be updated after creation');
  next(error);
});

// ========================================================================
// METHODS
// ========================================================================

/**
 * Get human-readable summary of the change
 */
propertyOwnerAuditLogSchema.methods.getSummary = function() {
  return {
    recordType: this.recordType,
    recordId: this.recordId,
    action: this.action,
    performedBy: this.performedByName || this.performedBy,
    changedAt: this.changedAt,
    changesCount: this.changedFields.length,
    verified: this.isVerified,
    alertType: this.alertType
  };
};

/**
 * Get detailed change log
 */
propertyOwnerAuditLogSchema.methods.getDetailedLog = function() {
  return {
    audit: this.getSummary(),
    source: this.sourceSystem,
    reason: this.reason,
    description: this.description,
    changes: this.changedFields.map(field => ({
      field: field.fieldName,
      oldValue: field.oldValue,
      newValue: field.newValue,
      type: field.valueType
    })),
    verification: {
      required: this.requiresVerification,
      status: this.verificationStatus,
      verifiedBy: this.verifiedBy,
      date: this.verificationDate
    }
  };
};

/**
 * Mark as requiring review
 */
propertyOwnerAuditLogSchema.methods.flagForReview = function() {
  this.verificationStatus = 'needs_review';
  this.requiresVerification = true;
  return this; // Return for chaining, but don't save (immutable)
};

// ========================================================================
// STATICS
// ========================================================================

/**
 * Get audit trail for a record
 */
propertyOwnerAuditLogSchema.statics.getRecordHistory = function(recordId) {
  return this.find({ recordId })
    .sort({ changedAt: -1 })
    .lean();
};

/**
 * Get audit trail by user
 */
propertyOwnerAuditLogSchema.statics.getByUser = function(userId, limit = 50) {
  return this.find({ performedBy: userId })
    .sort({ changedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get recent changes
 */
propertyOwnerAuditLogSchema.statics.getRecentChanges = function(days = 7, limit = 100) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({ changedAt: { $gte: startDate } })
    .sort({ changedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get unverified changes
 */
propertyOwnerAuditLogSchema.statics.getUnverifiedChanges = function() {
  return this.find({ 
    requiresVerification: true,
    verificationStatus: { $ne: 'approved' }
  }).sort({ changedAt: -1 });
};

/**
 * Get changes by action type
 */
propertyOwnerAuditLogSchema.statics.getByAction = function(action, limit = 50) {
  return this.find({ action })
    .sort({ changedAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get compliance report
 */
propertyOwnerAuditLogSchema.statics.getComplianceReport = function(dateRange) {
  const matchStage = {
    changedAt: {
      $gte: dateRange.start,
      $lte: dateRange.end
    }
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        users: { $addToSet: '$performedBy' },
        recordTypes: { $addToSet: '$recordType' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

/**
 * Archive old logs (for retention)
 */
propertyOwnerAuditLogSchema.statics.archiveOldLogs = function(retentionDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return this.deleteMany({
    changedAt: { $lt: cutoffDate },
    retentionUntil: { $exists: false }
  });
};

// ========================================================================
// MODEL EXPORT
// ========================================================================

export default mongoose.model('PropertyOwnerAuditLog', propertyOwnerAuditLogSchema);
