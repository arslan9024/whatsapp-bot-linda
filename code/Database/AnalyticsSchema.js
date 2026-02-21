/**
 * ========================================================================
 * ANALYTICS SCHEMA
 * Phase 5: Feature 3 - Analytics & Reporting Dashboard
 * ========================================================================
 * 
 * Pre-computed analytics collections for fast dashboard queries:
 * - DailySnapshot: Daily KPI snapshot (auto-generated)
 * - PropertyAnalytics: Per-property performance metrics
 * - AgentAnalytics: Per-agent performance over time
 * - CustomReport: Saved/generated reports
 * 
 * These aggregate data from existing collections:
 * - Properties, PropertyTenancy, PropertyOwnership, PropertyBuying
 * - Commission, Deal, AgentMetrics, Payment
 * - Message, Conversation, CommunicationLog
 * - Campaign, CampaignMessageLog
 * 
 * @module AnalyticsSchema
 * @since Phase 5 - February 2026
 */

import mongoose from 'mongoose';

// ========================================================================
// DAILY SNAPSHOT SCHEMA
// ========================================================================
// One record per day — captures full system KPIs

const dailySnapshotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },

  // Property Metrics
  properties: {
    total: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    vacant: { type: Number, default: 0 },
    forRent: { type: Number, default: 0 },
    forSale: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Tenancy Metrics
  tenancies: {
    active: { type: Number, default: 0 },
    expiringSoon: { type: Number, default: 0 },    // within 60 days
    expired: { type: Number, default: 0 },
    newThisMonth: { type: Number, default: 0 },
    endedThisMonth: { type: Number, default: 0 }
  },

  // Financial Metrics (AED)
  financial: {
    totalRentalRevenue: { type: Number, default: 0 },
    totalServiceCharges: { type: Number, default: 0 },
    totalCommissionsEarned: { type: Number, default: 0 },
    totalCommissionsPaid: { type: Number, default: 0 },
    totalCommissionsPending: { type: Number, default: 0 },
    totalSalesVolume: { type: Number, default: 0 },
    avgRentPerUnit: { type: Number, default: 0 },
    avgSalePrice: { type: Number, default: 0 }
  },

  // Deal Pipeline Metrics
  deals: {
    total: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    closedThisMonth: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 }
  },

  // People Metrics
  people: {
    totalContacts: { type: Number, default: 0 },
    tenants: { type: Number, default: 0 },
    owners: { type: Number, default: 0 },
    agents: { type: Number, default: 0 },
    newThisMonth: { type: Number, default: 0 }
  },

  // Communication Metrics
  communication: {
    messagesSent: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    templatesSent: { type: Number, default: 0 },
    templatesDelivered: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },  // minutes
    activeConversations: { type: Number, default: 0 }
  },

  // Campaign Metrics
  campaigns: {
    active: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    totalSent: { type: Number, default: 0 },
    totalDelivered: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0, min: 0, max: 100 }
  },

  // System Health
  system: {
    botUptime: { type: Number, default: 0, min: 0, max: 100 },  // percentage
    apiResponseTime: { type: Number, default: 0 },                // ms avg
    errorCount: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 }
  },

  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },

  generationDuration: {
    type: Number,  // milliseconds to generate
    default: 0
  }
});

dailySnapshotSchema.index({ date: -1 });

// ========================================================================
// PROPERTY ANALYTICS SCHEMA
// ========================================================================
// Per-property performance metrics, aggregated monthly

const propertyAnalyticsSchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    index: true
  },

  period: {
    type: String,   // 'YYYY-MM' format
    required: true,
    index: true
  },

  // Occupancy
  occupancyRate: { type: Number, default: 0, min: 0, max: 100 },
  daysOccupied: { type: Number, default: 0 },
  daysVacant: { type: Number, default: 0 },

  // Revenue
  rentalRevenue: { type: Number, default: 0 },
  serviceCharges: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  currency: { type: String, default: 'AED' },

  // Expenses
  maintenanceCosts: { type: Number, default: 0 },
  managementFees: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },

  // Profit
  netIncome: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },   // percentage
  roi: { type: Number, default: 0 },             // annualized return

  // Tenant Info
  tenantCount: { type: Number, default: 0 },
  avgTenantDuration: { type: Number, default: 0 },  // months
  renewalRate: { type: Number, default: 0, min: 0, max: 100 },

  // Issues
  maintenanceIssues: { type: Number, default: 0 },
  complaintCount: { type: Number, default: 0 },

  // Value
  estimatedValue: { type: Number, default: 0 },
  pricePerSqft: { type: Number, default: 0 },

  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

propertyAnalyticsSchema.index({ propertyId: 1, period: -1 });
propertyAnalyticsSchema.index({ period: 1 });

// ========================================================================
// AGENT ANALYTICS SCHEMA
// ========================================================================
// Per-agent performance metrics, aggregated monthly

const agentAnalyticsSchema = new mongoose.Schema({
  agentPhone: {
    type: String,
    required: true,
    index: true
  },

  agentName: String,

  period: {
    type: String,   // 'YYYY-MM' format
    required: true,
    index: true
  },

  // Deal Metrics
  newDeals: { type: Number, default: 0 },
  closedDeals: { type: Number, default: 0 },
  cancelledDeals: { type: Number, default: 0 },
  activeDeals: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0, min: 0, max: 100 },

  // Financial
  totalSalesVolume: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  totalCommissionPaid: { type: Number, default: 0 },
  avgDealValue: { type: Number, default: 0 },
  avgCommission: { type: Number, default: 0 },
  currency: { type: String, default: 'AED' },

  // Communication
  messagesSent: { type: Number, default: 0 },
  messagesReceived: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },  // minutes
  clientInteractions: { type: Number, default: 0 },

  // Ranking
  rank: { type: Number, default: 0 },   // relative to other agents
  rankBasis: { type: String, default: 'commission' },  // what the ranking is based on

  // Properties handled
  propertiesManaged: { type: Number, default: 0 },
  propertiesListed: { type: Number, default: 0 },
  propertiesSold: { type: Number, default: 0 },
  propertiesRented: { type: Number, default: 0 },

  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

agentAnalyticsSchema.index({ agentPhone: 1, period: -1 });
agentAnalyticsSchema.index({ period: 1 });

// ========================================================================
// CUSTOM REPORT SCHEMA
// ========================================================================
// Saved/generated reports for download or viewing

const customReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Report Identity
  name: {
    type: String,
    required: true,
    maxlength: 200
  },

  description: {
    type: String,
    maxlength: 1000
  },

  type: {
    type: String,
    enum: [
      'portfolio_overview',
      'financial_summary',
      'occupancy_report',
      'agent_performance',
      'commission_summary',
      'tenant_report',
      'deal_pipeline',
      'communication_report',
      'campaign_report',
      'custom'
    ],
    required: true
  },

  // Report Period
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  // Filters Applied
  filters: {
    propertyTypes: [String],
    clusters: [String],
    agents: [String],
    statuses: [String],
    minValue: Number,
    maxValue: Number,
    custom: mongoose.Schema.Types.Mixed
  },

  // Report Data (pre-computed)
  data: {
    summary: mongoose.Schema.Types.Mixed,
    details: [mongoose.Schema.Types.Mixed],
    charts: [{
      title: String,
      type: { type: String, enum: ['bar', 'line', 'pie', 'area', 'table'] },
      data: mongoose.Schema.Types.Mixed
    }]
  },

  // Export
  format: {
    type: String,
    enum: ['json', 'csv', 'pdf'],
    default: 'json'
  },

  exportUrl: String,

  // Access Control
  createdBy: String,
  sharedWith: [String],
  isPublic: { type: Boolean, default: false },

  // Status
  status: {
    type: String,
    enum: ['generating', 'ready', 'failed', 'expired'],
    default: 'generating'
  },

  errorMessage: String,

  // Audit
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  expiresAt: {
    type: Date,
    index: true
  }
});

customReportSchema.index({ type: 1, createdAt: -1 });
customReportSchema.index({ createdBy: 1, createdAt: -1 });
customReportSchema.index({ status: 1 });

// ========================================================================
// MODEL EXPORTS
// ========================================================================

export const DailySnapshot = mongoose.model('DailySnapshot', dailySnapshotSchema);
export const PropertyAnalytics = mongoose.model('PropertyAnalytics', propertyAnalyticsSchema);
export const AgentAnalytics = mongoose.model('AgentAnalytics', agentAnalyticsSchema);
export const CustomReport = mongoose.model('CustomReport', customReportSchema);
