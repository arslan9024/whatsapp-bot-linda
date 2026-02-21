/**
 * ========================================================================
 * INVOICE & PAYMENT SCHEMA
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * Models:
 *   1. Invoice          — Line-item invoices for rent, services, maintenance
 *   2. InvoicePayment   — Gateway-agnostic payment records for invoices
 *   3. PaymentReceipt   — Generated receipts (PDF/WhatsApp/email)
 *   4. ReconciliationLog — Audit trail when payments are matched to invoices
 *
 * Key design principles:
 *   • Separated from the existing CommissionSchema Payment model
 *     (that one is strictly for agent commission payouts)
 *   • Gateway-agnostic: works with PayTabs, Stripe, bank transfer, cash
 *   • Auto-invoice generation from PropertyTenancy cheque schedules
 *   • Multi-currency with AED default
 *   • Full audit trail for every financial event
 *
 * @module InvoiceSchema
 * @since Phase 5 Feature 4 – February 2026
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
// 1. INVOICE
// ====================================================================

const InvoiceLineItemSchema = new Schema({
  description:  { type: String, required: true },
  amount:       { type: Number, required: true, min: 0 },
  quantity:     { type: Number, default: 1, min: 1 },
  unitPrice:    { type: Number, min: 0 },
  category: {
    type: String,
    enum: ['rent', 'service_charge', 'maintenance', 'utilities',
           'parking', 'deposit', 'penalty', 'commission', 'other'],
    default: 'other'
  },
  taxRate:      { type: Number, default: 0, min: 0 },       // percentage
  taxAmount:    { type: Number, default: 0, min: 0 },
  total:        { type: Number, min: 0 }                     // amount * quantity + tax
}, { _id: true });

InvoiceLineItemSchema.pre('validate', function () {
  if (!this.unitPrice && this.unitPrice !== 0) this.unitPrice = this.amount;
  this.taxAmount  = +(this.amount * this.quantity * this.taxRate / 100).toFixed(2);
  this.total      = +(this.amount * this.quantity + this.taxAmount).toFixed(2);
});

const InvoiceSchema = new Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  // Who is it for?
  tenantPhone:   { type: String, index: true },
  tenantName:    { type: String },
  ownerPhone:    { type: String },
  ownerName:     { type: String },
  agentPhone:    { type: String },

  // What property?
  propertyId:    { type: String, index: true },
  propertyName:  { type: String },
  tenancyId:     { type: String },                           // link to PropertyTenancy

  // Invoice details
  type: {
    type: String,
    enum: ['rent', 'service_charge', 'maintenance', 'utilities',
           'deposit', 'penalty', 'commission_payout', 'mixed', 'other'],
    required: true,
    index: true
  },
  lineItems: [InvoiceLineItemSchema],

  // Totals
  subtotal:      { type: Number, default: 0, min: 0 },
  taxTotal:      { type: Number, default: 0, min: 0 },
  totalAmount:   { type: Number, required: true, min: 0 },
  currency:      { type: String, default: 'AED', enum: ['AED', 'USD', 'EUR', 'GBP', 'SAR'] },
  paidAmount:    { type: Number, default: 0, min: 0 },
  balanceDue:    { type: Number, default: 0, min: 0 },

  // Dates
  issueDate:     { type: Date, default: Date.now, index: true },
  dueDate:       { type: Date, required: true, index: true },
  paidDate:      { type: Date },

  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partially_paid', 'paid',
           'overdue', 'cancelled', 'refunded', 'written_off'],
    default: 'draft',
    index: true
  },

  // Communication
  sentVia:       [{ type: String, enum: ['whatsapp', 'email', 'sms'] }],
  sentAt:        { type: Date },
  viewedAt:      { type: Date },

  // Notes
  notes:         { type: String },
  internalNotes: { type: String },
  terms:         { type: String },

  // Recurring
  isRecurring:   { type: Boolean, default: false },
  recurringConfig: {
    frequency:   { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual'] },
    nextDate:    { type: Date },
    endDate:     { type: Date },
    autoSend:    { type: Boolean, default: false }
  },

  // Metadata
  createdBy:     { type: String },
  updatedBy:     { type: String },
  tags:          [String]

}, { timestamps: true });

// Compound indexes
InvoiceSchema.index({ tenantPhone: 1, status: 1 });
InvoiceSchema.index({ propertyId: 1, dueDate: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ type: 1, issueDate: -1 });

// Pre-save: recalculate totals
InvoiceSchema.pre('save', function () {
  if (this.lineItems?.length) {
    this.subtotal   = +(this.lineItems.reduce((s, i) => s + (i.amount * (i.quantity || 1)), 0)).toFixed(2);
    this.taxTotal   = +(this.lineItems.reduce((s, i) => s + (i.taxAmount || 0), 0)).toFixed(2);
    this.totalAmount = +(this.subtotal + this.taxTotal).toFixed(2);
  }
  this.balanceDue = +(this.totalAmount - this.paidAmount).toFixed(2);
  if (this.balanceDue <= 0 && this.paidAmount > 0 && this.status !== 'cancelled') {
    this.status  = 'paid';
    this.paidDate = this.paidDate || new Date();
  } else if (this.paidAmount > 0 && this.balanceDue > 0) {
    this.status = 'partially_paid';
  }
});

// Virtuals
InvoiceSchema.virtual('isOverdue').get(function () {
  return this.dueDate < new Date() && !['paid', 'cancelled', 'refunded', 'written_off'].includes(this.status);
});

InvoiceSchema.virtual('daysUntilDue').get(function () {
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Methods
InvoiceSchema.methods.markAsSent = function (channels) {
  this.status  = 'sent';
  this.sentVia = channels || ['whatsapp'];
  this.sentAt  = new Date();
  return this.save();
};

InvoiceSchema.methods.markAsViewed = function () {
  if (this.status === 'sent') this.status = 'viewed';
  this.viewedAt = new Date();
  return this.save();
};

InvoiceSchema.methods.applyPayment = function (amount) {
  this.paidAmount = +(this.paidAmount + amount).toFixed(2);
  // status & balanceDue recalculated in pre-save
  return this.save();
};

// Statics
InvoiceSchema.statics.findOverdue = function () {
  return this.find({
    status: { $nin: ['paid', 'cancelled', 'refunded', 'written_off'] },
    dueDate: { $lt: new Date() }
  }).sort({ dueDate: 1 });
};

InvoiceSchema.statics.findByTenant = function (phone, opts = {}) {
  const q = { tenantPhone: phone };
  if (opts.status) q.status = opts.status;
  return this.find(q).sort({ issueDate: -1 }).limit(opts.limit || 50);
};

InvoiceSchema.statics.findByProperty = function (propertyId, opts = {}) {
  const q = { propertyId };
  if (opts.status) q.status = opts.status;
  return this.find(q).sort({ issueDate: -1 }).limit(opts.limit || 50);
};

InvoiceSchema.statics.generateInvoiceNumber = async function () {
  const year  = new Date().getFullYear();
  const count = await this.countDocuments({ invoiceNumber: new RegExp(`^INV-${year}-`) });
  return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

// ====================================================================
// 2. INVOICE PAYMENT
// ====================================================================

const InvoicePaymentSchema = new Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  invoiceId:     { type: Schema.Types.ObjectId, ref: 'Invoice', index: true },
  invoiceNumber: { type: String, index: true },

  // Payer
  payerPhone:    { type: String, index: true },
  payerName:     { type: String },

  // Amount
  amount:        { type: Number, required: true, min: 0 },
  currency:      { type: String, default: 'AED' },

  // Gateway
  gateway: {
    type: String,
    enum: ['paytabs', 'stripe', 'bank_transfer', 'cheque', 'cash', 'wallet', 'other'],
    required: true,
    index: true
  },
  gatewayConfig: {
    transactionId:  { type: String },
    referenceNumber: { type: String },
    authorizationCode: { type: String },
    responseCode:   { type: String },
    responseMessage: { type: String },
    redirectUrl:    { type: String },
    callbackUrl:    { type: String },
    metadata:       Schema.Types.Mixed
  },

  // Payment method details
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'cheque', 'cash', 'apple_pay', 'google_pay', 'other'],
    required: true
  },
  methodDetails: {
    cardBrand:    { type: String },       // Visa, Mastercard
    cardLast4:    { type: String },
    bankName:     { type: String },
    chequeNumber: { type: String },
    accountName:  { type: String },
    iban:         { type: String },
    reference:    { type: String }
  },

  // Status
  status: {
    type: String,
    enum: ['initiated', 'pending', 'processing', 'completed', 'failed',
           'cancelled', 'refunded', 'partially_refunded', 'expired'],
    default: 'initiated',
    index: true
  },
  statusHistory: [{
    status:    String,
    timestamp: { type: Date, default: Date.now },
    reason:    String,
    updatedBy: String
  }],

  // Refund
  refundAmount:   { type: Number, default: 0, min: 0 },
  refundReason:   { type: String },
  refundDate:     { type: Date },

  // Dates
  initiatedAt:    { type: Date, default: Date.now },
  completedAt:    { type: Date },
  failedAt:       { type: Date },

  // Receipt
  receiptId:      { type: String },
  receiptGenerated: { type: Boolean, default: false },

  // Reconciliation
  reconciled:     { type: Boolean, default: false, index: true },
  reconciledAt:   { type: Date },
  reconciledBy:   { type: String },

  // Created by
  createdBy:      { type: String },
  notes:          { type: String }

}, { timestamps: true });

// Compound indexes
InvoicePaymentSchema.index({ gateway: 1, status: 1 });
InvoicePaymentSchema.index({ payerPhone: 1, createdAt: -1 });

// Methods
InvoicePaymentSchema.methods.complete = function (gatewayResponse = {}) {
  this.status      = 'completed';
  this.completedAt = new Date();
  if (gatewayResponse.transactionId) this.gatewayConfig.transactionId = gatewayResponse.transactionId;
  if (gatewayResponse.referenceNumber) this.gatewayConfig.referenceNumber = gatewayResponse.referenceNumber;
  this.statusHistory.push({ status: 'completed', timestamp: new Date() });
  return this.save();
};

InvoicePaymentSchema.methods.fail = function (reason) {
  this.status   = 'failed';
  this.failedAt = new Date();
  this.statusHistory.push({ status: 'failed', timestamp: new Date(), reason });
  return this.save();
};

InvoicePaymentSchema.methods.refund = function (amount, reason) {
  this.refundAmount = amount || this.amount;
  this.refundReason = reason;
  this.refundDate   = new Date();
  this.status       = (this.refundAmount >= this.amount) ? 'refunded' : 'partially_refunded';
  this.statusHistory.push({ status: this.status, timestamp: new Date(), reason });
  return this.save();
};

InvoicePaymentSchema.statics.generatePaymentId = async function () {
  const year  = new Date().getFullYear();
  const count = await this.countDocuments({ paymentId: new RegExp(`^PAY-${year}-`) });
  return `PAY-${year}-${String(count + 1).padStart(6, '0')}`;
};

// ====================================================================
// 3. PAYMENT RECEIPT
// ====================================================================

const PaymentReceiptSchema = new Schema({
  receiptId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  paymentId:     { type: String, required: true, index: true },
  invoiceNumber: { type: String, index: true },

  // Parties
  payerName:     { type: String },
  payerPhone:    { type: String },
  payerEmail:    { type: String },
  receiverName:  { type: String },

  // Details
  amount:        { type: Number, required: true, min: 0 },
  currency:      { type: String, default: 'AED' },
  description:   { type: String },
  paymentMethod: { type: String },
  transactionRef: { type: String },

  // Property
  propertyId:    { type: String },
  propertyName:  { type: String },

  // Delivery
  format: {
    type: String,
    enum: ['pdf', 'whatsapp', 'email', 'sms'],
    default: 'whatsapp'
  },
  deliveredVia:  [{ type: String, enum: ['whatsapp', 'email', 'sms'] }],
  deliveredAt:   { type: Date },
  pdfUrl:        { type: String },

  // Generated text (for WhatsApp receipts)
  receiptText:   { type: String },

  createdAt:     { type: Date, default: Date.now }
}, { timestamps: false });

PaymentReceiptSchema.statics.generateReceiptId = async function () {
  const year  = new Date().getFullYear();
  const count = await this.countDocuments({ receiptId: new RegExp(`^RCT-${year}-`) });
  return `RCT-${year}-${String(count + 1).padStart(6, '0')}`;
};

// ====================================================================
// 4. RECONCILIATION LOG
// ====================================================================

const ReconciliationLogSchema = new Schema({
  reconciliationId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['auto', 'manual', 'bulk'],
    required: true
  },

  // Matched records
  paymentId:     { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  matchedAmount: { type: Number, required: true, min: 0 },
  currency:      { type: String, default: 'AED' },

  // Match quality
  matchConfidence: {
    type: String,
    enum: ['exact', 'partial', 'suggested', 'forced'],
    default: 'exact'
  },
  matchCriteria: [String],         // what was used to match

  // Before / after
  invoiceBalanceBefore: { type: Number },
  invoiceBalanceAfter:  { type: Number },

  // Status
  status: {
    type: String,
    enum: ['pending_review', 'confirmed', 'rejected', 'reversed'],
    default: 'confirmed'
  },

  // Audit
  performedBy:   { type: String, required: true },
  performedAt:   { type: Date, default: Date.now },
  reviewedBy:    { type: String },
  reviewedAt:    { type: Date },
  notes:         { type: String }

}, { timestamps: true });

ReconciliationLogSchema.index({ paymentId: 1 });
ReconciliationLogSchema.index({ invoiceNumber: 1 });
ReconciliationLogSchema.index({ type: 1, performedAt: -1 });

ReconciliationLogSchema.statics.generateReconciliationId = async function () {
  const year  = new Date().getFullYear();
  const count = await this.countDocuments({ reconciliationId: new RegExp(`^REC-${year}-`) });
  return `REC-${year}-${String(count + 1).padStart(6, '0')}`;
};

// ====================================================================
// EXPORTS
// ====================================================================

export const Invoice           = safeModel('Invoice', InvoiceSchema);
export const InvoicePayment    = safeModel('InvoicePayment', InvoicePaymentSchema);
export const PaymentReceipt    = safeModel('PaymentReceipt', PaymentReceiptSchema);
export const ReconciliationLog = safeModel('ReconciliationLog', ReconciliationLogSchema);
