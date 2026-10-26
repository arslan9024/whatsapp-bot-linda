/**
 * ========================================================================
 * COMMISSION RULE SCHEMA
 * Phase 5: Feature 2 - Commission Tracking System Enhancement
 * ========================================================================
 * 
 * Configurable commission rules that define HOW commissions are calculated.
 * Supports multiple rule types:
 * - Percentage: X% of transaction value
 * - Fixed: Fixed AED amount per transaction
 * - Tiered: Different rates based on value brackets
 * - Revenue Share: Split between agent/broker/company
 * 
 * Rules can be scoped to:
 * - Specific property types (villa, apartment, etc.)
 * - Specific agents
 * - Specific deal types (sale, lease, renewal)
 * - Date ranges (promotions, seasonal adjustments)
 * - Minimum/maximum transaction values
 * 
 * @module CommissionRuleSchema
 * @since Phase 5 - February 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// COMMISSION RULE SCHEMA
// ========================================================================

const commissionRuleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  // Rule Identity
  name: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },

  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },

  // Rule Type
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered', 'revenue_share'],
    required: true
  },

  // ===== For type: 'percentage' =====
  // commissionPercent is the rate applied to transaction value
  percentageConfig: {
    rate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // ===== For type: 'fixed' =====
  // A fixed amount per transaction regardless of value
  fixedConfig: {
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'AED'
    }
  },

  // ===== For type: 'tiered' =====
  // Different rates based on transaction value brackets
  tieredConfig: {
    tiers: [{
      minValue: {
        type: Number,
        required: true,
        min: 0
      },
      maxValue: {
        type: Number,  // null = unlimited
        min: 0
      },
      rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      label: {
        type: String,
        maxlength: 100
      }
    }],
    method: {
      type: String,
      enum: ['marginal', 'flat'],  // marginal = each tier calculates on its bracket; flat = whole amount at matched tier rate
      default: 'flat'
    }
  },

  // ===== For type: 'revenue_share' =====
  // Split commission between parties
  revenueShareConfig: {
    baseRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    splits: [{
      party: {
        type: String,
        enum: ['agent', 'broker', 'company', 'referrer', 'team_lead'],
        required: true
      },
      percent: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      }
    }]
  },

  // ===== Scope & Applicability =====
  
  // Which property types this rule applies to (empty = all)
  appliesToPropertyTypes: [{
    type: String,
    enum: ['residential', 'commercial', 'plot', 'villa', 'apartment', 'townhouse', 'office', 'warehouse', 'other']
  }],

  // Which transaction types this rule applies to (empty = all)
  appliesToTransactionTypes: [{
    type: String,
    enum: ['sale', 'lease_signup', 'lease_renewal', 'sublease', 'property_management', 'other']
  }],

  // Which agents this rule applies to (empty = all agents)
  appliesToAgents: [{
    type: String,
    trim: true
  }],

  // Which projects/communities this rule applies to (empty = all)
  appliesToProjects: [{
    type: String,
    trim: true
  }],

  // Value range constraints
  minTransactionValue: {
    type: Number,
    min: 0,
    default: 0
  },

  maxTransactionValue: {
    type: Number,
    min: 0  // null = unlimited
  },

  // ===== Rule Lifecycle =====

  // Priority: Higher priority rules are evaluated first
  priority: {
    type: Number,
    default: 0,
    index: true
  },

  // Active date range
  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: {
    type: Date  // null = no expiry
  },

  // Status
  active: {
    type: Boolean,
    default: true,
    index: true
  },

  // Approval workflow
  approvalRequired: {
    type: Boolean,
    default: false
  },

  approvalThreshold: {
    type: Number,  // auto-approve if commission below this amount
    min: 0
  },

  // ===== Metadata =====

  createdBy: {
    type: String,
    maxlength: 100
  },

  updatedBy: {
    type: String,
    maxlength: 100
  },

  tags: [{
    type: String,
    maxlength: 50
  }],

  notes: {
    type: String,
    maxlength: 2000
  },

  // Audit
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ========================================================================
// INDEXES
// ========================================================================

commissionRuleSchema.index({ active: 1, priority: -1 });
commissionRuleSchema.index({ type: 1, active: 1 });
commissionRuleSchema.index({ startDate: 1, endDate: 1 });
commissionRuleSchema.index({ appliesToPropertyTypes: 1 });
commissionRuleSchema.index({ appliesToTransactionTypes: 1 });

// ========================================================================
// PRE-SAVE MIDDLEWARE
// ========================================================================

commissionRuleSchema.pre('save', function () {
  this.updatedAt = new Date();

  // Validate tiered config
  if (this.type === 'tiered' && this.tieredConfig?.tiers) {
    const tiers = this.tieredConfig.tiers;
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].minValue < tiers[i - 1].minValue) {
        throw new Error('Tiered config: tiers must be in ascending order by minValue');
      }
    }
  }

  // Validate revenue share splits total to 100%
  if (this.type === 'revenue_share' && this.revenueShareConfig?.splits) {
    const totalPercent = this.revenueShareConfig.splits.reduce((sum, s) => sum + s.percent, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error(`Revenue share splits must total 100%, got ${totalPercent}%`);
    }
  }
});

// ========================================================================
// INSTANCE METHODS
// ========================================================================

/**
 * Check if this rule is currently active (date-aware)
 */
commissionRuleSchema.methods.isCurrentlyActive = function () {
  if (!this.active) return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

/**
 * Check if this rule applies to a specific transaction
 */
commissionRuleSchema.methods.appliesTo = function (transaction) {
  // Check property type
  if (this.appliesToPropertyTypes.length > 0) {
    if (!transaction.propertyType || !this.appliesToPropertyTypes.includes(transaction.propertyType)) {
      return false;
    }
  }

  // Check transaction type
  if (this.appliesToTransactionTypes.length > 0) {
    if (!transaction.transactionType || !this.appliesToTransactionTypes.includes(transaction.transactionType)) {
      return false;
    }
  }

  // Check agent
  if (this.appliesToAgents.length > 0) {
    if (!transaction.agentPhone || !this.appliesToAgents.includes(transaction.agentPhone)) {
      return false;
    }
  }

  // Check project
  if (this.appliesToProjects.length > 0) {
    if (!transaction.project || !this.appliesToProjects.includes(transaction.project)) {
      return false;
    }
  }

  // Check value range
  if (transaction.transactionValue) {
    if (this.minTransactionValue && transaction.transactionValue < this.minTransactionValue) {
      return false;
    }
    if (this.maxTransactionValue && transaction.transactionValue > this.maxTransactionValue) {
      return false;
    }
  }

  return true;
};

// ========================================================================
// COMMISSION CALCULATION RECORD SCHEMA
// ========================================================================
// Tracks individual calculations made by the engine

const calculationRecordSchema = new mongoose.Schema({
  calculationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  // What rule was applied
  ruleId: {
    type: String,
    required: true,
    index: true
  },

  ruleName: {
    type: String,
    maxlength: 200
  },

  ruleType: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered', 'revenue_share']
  },

  // Transaction being calculated
  transaction: {
    type: {
      type: String,
      enum: ['sale', 'lease_signup', 'lease_renewal', 'sublease', 'property_management', 'other']
    },
    transactionValue: {
      type: Number,
      required: true,
      min: 0
    },
    propertyType: String,
    propertyId: String,
    propertyAddress: String,
    project: String,
    date: {
      type: Date,
      default: Date.now
    }
  },

  // Agent
  agentPhone: {
    type: String,
    required: true,
    index: true
  },

  agentName: String,

  // Calculation Results
  result: {
    totalCommission: {
      type: Number,
      required: true,
      min: 0
    },
    breakdown: [{
      party: String,
      amount: Number,
      percent: Number,
      label: String
    }],
    effectiveRate: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'AED'
    }
  },

  // Approval Workflow
  status: {
    type: String,
    enum: ['calculated', 'pending_approval', 'approved', 'rejected', 'paid', 'voided'],
    default: 'calculated',
    index: true
  },

  approvalInfo: {
    requiredApproval: {
      type: Boolean,
      default: false
    },
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String
  },

  // Link to commission record (if created)
  commissionId: {
    type: String,
    index: true
  },

  // Notes
  notes: {
    type: String,
    maxlength: 1000
  },

  // Audit
  calculatedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

calculationRecordSchema.index({ agentPhone: 1, createdAt: -1 });
calculationRecordSchema.index({ ruleId: 1, status: 1 });
calculationRecordSchema.index({ status: 1, createdAt: -1 });

// ========================================================================
// MODEL EXPORTS
// ========================================================================

export const CommissionRule = mongoose.model('CommissionRule', commissionRuleSchema);
export const CalculationRecord = mongoose.model('CalculationRecord', calculationRecordSchema);

// ========================================================================
// SCHEMA SUMMARY
// ========================================================================
/*
  COLLECTIONS:
  ✓ commissionrules      - Configurable commission rules (percentage, fixed, tiered, revenue_share)
  ✓ calculationrecords   - Tracks every calculation made by the engine

  RULE TYPES:
  ✓ percentage     - X% of transaction value
  ✓ fixed          - Fixed AED amount per transaction
  ✓ tiered         - Different rates based on value brackets (marginal or flat)
  ✓ revenue_share  - Split between agent/broker/company/referrer

  FEATURES:
  ✓ Rule scoping (property types, transaction types, agents, projects, value ranges)
  ✓ Priority-based rule matching
  ✓ Date range activation (promotions, seasonal rates)
  ✓ Approval workflow (auto/manual based on threshold)
  ✓ Revenue share validation (splits must total 100%)
  ✓ Tiered rate validation (ascending order)
  ✓ Complete audit trail
  ✓ Calculation record tracking
*/
