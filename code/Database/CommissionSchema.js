/**
 * ========================================================================
 * COMMISSION TRACKING SCHEMA
 * Phase 20: Advanced Features & Dashboard
 * ========================================================================
 * 
 * Stores all commission-related data:
 * - Individual commissions (per deal)
 * - Payment transactions
 * - Agent metrics
 * - Deal tracking
 * 
 * @module CommissionSchema
 * @since Phase 20 - February 17, 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// COMMISSION SCHEMA
// ========================================================================
// Represents individual commission earned by an agent

const commissionSchema = new mongoose.Schema({
  commissionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  // Agent Information
  agentPhone: {
    type: String,
    required: true,
    index: true,
    match: /^\+?[0-9]{7,15}$/
  },
  
  agentName: {
    type: String,
    maxlength: 100
  },
  
  // Deal Information
  dealId: {
    type: String,
    index: true
  },
  
  propertyAddress: {
    type: String,
    maxlength: 500
  },
  
  propertyType: {
    type: String,
    enum: ['residential', 'commercial', 'plot', 'villa', 'apartment', 'townhouse', 'other']
  },
  
  // Commission Calculation
  salePrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  commissionPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Commission Split (if multiple agents)
  commissionSplit: {
    agentPercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    brokerPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'earned', 'processing', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Dates
  earnedDate: {
    type: Date,
    default: Date.now
  },
  
  paidDate: {
    type: Date
  },
  
  dueDate: {
    type: Date
  },
  
  // Payment Details
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'wallet', 'check', 'cash', 'other']
  },
  
  transactionId: {
    type: String
  },
  
  // Notes and Metadata
  notes: {
    type: String,
    maxlength: 1000
  },
  
  tags: [{
    type: String,
    maxlength: 50
  }],
  
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

// Indexes for common queries
commissionSchema.index({ agentPhone: 1, earnedDate: -1 });
commissionSchema.index({ status: 1, earnedDate: -1 });
commissionSchema.index({ dealId: 1 });

// ========================================================================
// PAYMENT SCHEMA
// ========================================================================
// Represents bulk payment to agents

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  agentPhone: {
    type: String,
    required: true,
    index: true
  },
  
  // Commissions included in this payment
  commissionIds: [{
    type: String
  }],
  
  commissionCount: {
    type: Number,
    default: 0
  },
  
  // Amount
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'AED'
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'wallet', 'check', 'cash', 'other'],
    required: true
  },
  
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    swiftCode: String,
    iban: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'initiated', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Dates
  requestDate: {
    type: Date,
    default: Date.now
  },
  
  processDate: {
    type: Date
  },
  
  completeDate: {
    type: Date
  },
  
  // Documentation
  receipt: {
    type: String,
    validate: {
      validator: (v) => !v || /^https?:\/\//.test(v),
      message: 'Invalid receipt URL'
    }
  },
  
  reference: {
    type: String,
    maxlength: 100
  },
  
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // Audit
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.index({ agentPhone: 1, completeDate: -1 });
paymentSchema.index({ status: 1 });

// ========================================================================
// AGENT METRICS SCHEMA
// ========================================================================
// Aggregated metrics for each agent

const agentMetricsSchema = new mongoose.Schema({
  agentPhone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  agentName: {
    type: String,
    maxlength: 100
  },
  
  agentEmail: {
    type: String,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Deal Metrics
  metrics: {
    totalDeals: {
      type: Number,
      default: 0
    },
    
    closedDeals: {
      type: Number,
      default: 0
    },
    
    activeDeals: {
      type: Number,
      default: 0
    },
    
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Earnings
  earnings: {
    lifetime: {
      type: Number,
      default: 0
    },
    
    thisYear: {
      type: Number,
      default: 0
    },
    
    thisMonth: {
      type: Number,
      default: 0
    },
    
    pending: {
      type: Number,
      default: 0
    },
    
    paid: {
      type: Number,
      default: 0
    }
  },
  
  // Performance
  performance: {
    avgDealValue: {
      type: Number,
      default: 0
    },
    
    avgCommission: {
      type: Number,
      default: 0
    },
    
    dealsPerMonth: {
      type: Number,
      default: 0
    }
  },
  
  // Specialization
  specialization: [{
    type: String,
    enum: ['residential', 'commercial', 'plot', 'villa', 'apartment']
  }],
  
  // Last Activity
  lastActivityDate: {
    type: Date
  },
  
  // Audit
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ========================================================================
// DEAL SCHEMA
// ========================================================================
// Represents a real estate transaction

const dealSchema = new mongoose.Schema({
  dealId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  
  // Property Information
  propertyId: {
    type: String,
    index: true
  },
  
  propertyAddress: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  propertyType: {
    type: String,
    enum: ['residential', 'commercial', 'plot', 'villa', 'apartment', 'townhouse', 'other']
  },
  
  propertyValue: {
    type: Number,
    min: 0
  },
  
  // Parties Involved
  agentPhone: {
    type: String,
    required: true,
    index: true
  },
  
  buyerPhone: {
    type: String,
    index: true
  },
  
  sellerPhone: {
    type: String,
    index: true
  },
  
  buyerName: String,
  sellerName: String,
  
  // Transaction Details
  salePrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'AED'
  },
  
  commissionPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Commission Split
  commissionSplit: {
    agentPercent: {
      type: Number,
      default: 100
    },
    brokerPercent: {
      type: Number,
      default: 0
    },
    otherAgentPercent: {
      type: Number,
      default: 0
    }
  },
  
  // Deal Status Pipeline
  status: {
    type: String,
    enum: ['lead', 'interested', 'offer', 'negotiation', 'inspection', 'approval', 'closed', 'cancelled'],
    default: 'lead',
    index: true
  },
  
  // Timeline
  timeline: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    contactDate: Date,
    offerDate: Date,
    inspectionDate: Date,
    approvalDate: Date,
    closeDate: Date,
    paymentDate: Date
  },
  
  // Commission Tracking
  commissionGenerated: Boolean,
  commissionAmount: Number,
  commissionId: String,
  
  // Notes
  description: {
    type: String,
    maxlength: 1000
  },
  
  notes: [{
    date: Date,
    text: String,
    updatedBy: String
  }],
  
  // Metadata
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

dealSchema.index({ agentPhone: 1, status: 1 });
dealSchema.index({ agentPhone: 1, closeDate: -1 });

// ========================================================================
// COMMISSION REPORT SCHEMA
// ========================================================================
// Pre-calculated reports for quick access

const commissionReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  agentPhone: {
    type: String,
    required: true,
    index: true
  },
  
  reportPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  summary: {
    totalCommissions: Number,
    totalAmount: Number,
    paidAmount: Number,
    pendingAmount: Number,
    cancelledAmount: Number,
    dealsCompleted: Number,
    conversionRate: Number
  },
  
  breakdown: [{
    dealId: String,
    dealDate: Date,
    commissionAmount: Number,
    status: String
  }],
  
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

commissionReportSchema.index({ agentPhone: 1, 'reportPeriod.startDate': 1 });

// ========================================================================
// MODEL EXPORTS
// ========================================================================

export const Commission = mongoose.model('Commission', commissionSchema);
export const Payment = mongoose.model('Payment', paymentSchema);
export const AgentMetrics = mongoose.model('AgentMetrics', agentMetricsSchema);
export const Deal = mongoose.model('Deal', dealSchema);
export const CommissionReport = mongoose.model('CommissionReport', commissionReportSchema);

// ========================================================================
// SCHEMA SUMMARY
// ========================================================================
/*
  COLLECTIONS:
  ✓ commissions    - Individual commissions (indexed by agent, status, date)
  ✓ payments       - Payment transactions to agents
  ✓ agentmetrics   - Aggregated agent performance data
  ✓ deals          - Real estate transactions
  ✓ commissionreports - Pre-calculated reports

  INDEXES:
  ✓ agentPhone (all collections)
  ✓ status (commissions, payments, deals)
  ✓ dates for time-range queries
  ✓ dealId for junction queries

  FEATURES:
  ✓ Complete audit trail (createdAt, updatedAt)
  ✓ Status tracking for commissions and payments
  ✓ Multi-currency support
  ✓ Commission split tracking
  ✓ Payment method tracking
  ✓ Metrics aggregation
  ✓ Date range queries
*/
