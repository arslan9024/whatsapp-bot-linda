/**
 * ========================================================================
 * INVOICE & PAYMENT SERVICE
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * Enterprise-grade service layer for the full invoice-to-payment lifecycle:
 *
 *  1.  Invoice CRUD            — Create, read, update, cancel invoices
 *  2.  Auto-Invoice Generation — From PropertyTenancy cheque schedules
 *  3.  Payment Processing      — Gateway-agnostic (PayTabs, Stripe, cash …)
 *  4.  Receipt Generation      — WhatsApp, email, PDF-ready receipts
 *  5.  Reconciliation          — Auto & manual matching payments → invoices
 *  6.  Overdue Management      — Find overdue, send reminders
 *  7.  Reports                 — Revenue, outstanding, payment history
 *  8.  Recurring Invoices      — Monthly/quarterly auto-generation
 *  9.  Refunds                 — Full & partial refund processing
 * 10.  Quick Stats             — Bot-friendly text summary
 *
 * @module InvoicePaymentService
 * @since Phase 5 Feature 4 – February 2026
 */

import mongoose from 'mongoose';
import {
  Invoice,
  InvoicePayment,
  PaymentReceipt,
  ReconciliationLog
} from '../Database/InvoiceSchema.js';

class InvoicePaymentService {

  // ====================================================================
  // HELPER: Safe model access
  // ====================================================================
  _model(name) {
    try { return mongoose.model(name); }
    catch { return null; }
  }

  // ====================================================================
  // 1. INVOICE CRUD
  // ====================================================================

  /**
   * Create a new invoice
   */
  async createInvoice(data) {
    try {
      const invoiceNumber = data.invoiceNumber || await Invoice.generateInvoiceNumber();
      const invoice = new Invoice({ ...data, invoiceNumber });
      await invoice.save();
      return { success: true, invoice, invoiceNumber };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoice by ID or invoice number
   */
  async getInvoice(idOrNumber) {
    try {
      let invoice = null;
      if (mongoose.isValidObjectId(idOrNumber)) {
        invoice = await Invoice.findById(idOrNumber);
      }
      if (!invoice) {
        invoice = await Invoice.findOne({ invoiceNumber: idOrNumber });
      }
      if (!invoice) return { success: false, error: 'Invoice not found' };
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List invoices with filters
   */
  async listInvoices(opts = {}) {
    try {
      const query = {};
      if (opts.tenantPhone) query.tenantPhone = opts.tenantPhone;
      if (opts.propertyId)  query.propertyId  = opts.propertyId;
      if (opts.status)      query.status      = opts.status;
      if (opts.type)        query.type        = opts.type;

      if (opts.startDate || opts.endDate) {
        query.issueDate = {};
        if (opts.startDate) query.issueDate.$gte = new Date(opts.startDate);
        if (opts.endDate)   query.issueDate.$lte = new Date(opts.endDate);
      }

      const invoices = await Invoice.find(query)
        .sort({ issueDate: -1 })
        .limit(opts.limit || 50);

      const summary = {
        count: invoices.length,
        totalAmount:   invoices.reduce((s, i) => s + i.totalAmount, 0),
        totalPaid:     invoices.reduce((s, i) => s + i.paidAmount, 0),
        totalBalance:  invoices.reduce((s, i) => s + i.balanceDue, 0)
      };

      return { success: true, invoices, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an invoice (only if draft or sent)
   */
  async updateInvoice(idOrNumber, updates) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
        return { success: false, error: `Cannot edit invoice in '${invoice.status}' status` };
      }
      Object.assign(invoice, updates);
      await invoice.save();
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(idOrNumber, reason) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (invoice.status === 'paid') {
        return { success: false, error: 'Cannot cancel a paid invoice — use refund instead' };
      }
      invoice.status        = 'cancelled';
      invoice.internalNotes = (invoice.internalNotes || '') + `\nCancelled: ${reason || 'No reason'}`;
      await invoice.save();
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark invoice as sent
   */
  async sendInvoice(idOrNumber, channels = ['whatsapp']) {
    try {
      const { invoice } = await this.getInvoice(idOrNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      await invoice.markAsSent(channels);
      return { success: true, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 2. AUTO-INVOICE GENERATION (from tenancy cheques)
  // ====================================================================

  /**
   * Generate invoices from a PropertyTenancy cheque schedule
   */
  async generateFromTenancy(tenancyId) {
    try {
      const Tenancy = this._model('PropertyTenancy');
      if (!Tenancy) return { success: false, error: 'PropertyTenancy model not available' };

      const tenancy = await Tenancy.findById(tenancyId);
      if (!tenancy) return { success: false, error: 'Tenancy not found' };

      const cheques = tenancy.paymentSchedule?.cheques || [];
      if (!cheques.length) return { success: false, error: 'No cheques in payment schedule' };

      const generated = [];
      for (const cheque of cheques) {
        // Skip already-paid cheques or ones that already have invoices
        const existing = await Invoice.findOne({
          tenancyId: tenancyId.toString(),
          'lineItems.description': { $regex: `Cheque.*${cheque.chequeNumber}` }
        });
        if (existing) continue;

        const invoiceNumber = await Invoice.generateInvoiceNumber();
        const inv = new Invoice({
          invoiceNumber,
          tenantPhone:  tenancy.tenantPhone,
          tenantName:   tenancy.tenantName,
          ownerPhone:   tenancy.ownerPhone,
          propertyId:   tenancy.propertyId,
          tenancyId:    tenancyId.toString(),
          type: 'rent',
          lineItems: [{
            description: `Cheque #${cheque.chequeNumber} — Rent Payment`,
            amount:      cheque.chequeAmount || tenancy.contractAmount / (cheques.length || 1),
            category:    'rent'
          }],
          totalAmount:  cheque.chequeAmount || tenancy.contractAmount / (cheques.length || 1),
          dueDate:      cheque.chequeDueDate || new Date(),
          status:       cheque.isPaid ? 'paid' : 'draft',
          paidAmount:   cheque.isPaid ? (cheque.chequeAmount || 0) : 0,
          paidDate:     cheque.isPaid ? (cheque.paidDate || new Date()) : undefined,
          createdBy:    'system:auto-generate'
        });
        await inv.save();
        generated.push(inv);
      }

      return { success: true, generated: generated.length, invoices: generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 3. PAYMENT PROCESSING
  // ====================================================================

  /**
   * Initiate a payment for an invoice
   */
  async initiatePayment(data) {
    try {
      const { invoiceNumber, amount, gateway, method, payerPhone, payerName, createdBy, methodDetails } = data;

      // Validate invoice
      const { invoice } = await this.getInvoice(invoiceNumber);
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (['paid', 'cancelled', 'refunded'].includes(invoice.status)) {
        return { success: false, error: `Invoice is ${invoice.status}` };
      }

      const payAmount = amount || invoice.balanceDue;
      if (payAmount <= 0) return { success: false, error: 'Nothing to pay' };
      if (payAmount > invoice.balanceDue) {
        return { success: false, error: `Amount ${payAmount} exceeds balance ${invoice.balanceDue}` };
      }

      const paymentId = await InvoicePayment.generatePaymentId();
      const payment = new InvoicePayment({
        paymentId,
        invoiceId:     invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        payerPhone:    payerPhone || invoice.tenantPhone,
        payerName:     payerName || invoice.tenantName,
        amount:        payAmount,
        currency:      invoice.currency,
        gateway:       gateway || 'cash',
        method:        method || 'cash',
        methodDetails: methodDetails || {},
        status:        'initiated',
        statusHistory: [{ status: 'initiated', timestamp: new Date() }],
        createdBy
      });

      await payment.save();

      // For non-gateway payments (cash, cheque, bank_transfer), auto-complete
      if (['cash', 'cheque', 'bank_transfer'].includes(gateway)) {
        return await this.completePayment(paymentId);
      }

      // For gateway payments, return payment with redirect URL
      const gatewayResult = await this._initiateGateway(gateway, payment, invoice);
      if (gatewayResult.redirectUrl) {
        payment.gatewayConfig.redirectUrl = gatewayResult.redirectUrl;
        payment.status = 'pending';
        payment.statusHistory.push({ status: 'pending', timestamp: new Date() });
        await payment.save();
      }

      return { success: true, payment, paymentId, redirectUrl: gatewayResult.redirectUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete a payment (after gateway callback or manual)
   */
  async completePayment(paymentId, gatewayResponse = {}) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      if (payment.status === 'completed') return { success: true, payment, message: 'Already completed' };
      if (['failed', 'cancelled', 'refunded'].includes(payment.status)) {
        return { success: false, error: `Cannot complete a ${payment.status} payment` };
      }

      // Complete the payment
      await payment.complete(gatewayResponse);

      // Apply payment to invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        await invoice.applyPayment(payment.amount);
      }

      // Generate receipt
      const receipt = await this._generateReceipt(payment, invoice);

      return { success: true, payment, invoice, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fail a payment
   */
  async failPayment(paymentId, reason) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      await payment.fail(reason);
      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      return { success: true, payment };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List payments with filters
   */
  async listPayments(opts = {}) {
    try {
      const query = {};
      if (opts.payerPhone)    query.payerPhone    = opts.payerPhone;
      if (opts.invoiceNumber) query.invoiceNumber = opts.invoiceNumber;
      if (opts.gateway)       query.gateway       = opts.gateway;
      if (opts.status)        query.status        = opts.status;
      if (opts.reconciled !== undefined) query.reconciled = opts.reconciled;

      const payments = await InvoicePayment.find(query)
        .sort({ createdAt: -1 })
        .limit(opts.limit || 50);

      const summary = {
        count:    payments.length,
        total:    payments.reduce((s, p) => s + p.amount, 0),
        completed: payments.filter(p => p.status === 'completed').length,
        pending:   payments.filter(p => ['initiated', 'pending', 'processing'].includes(p.status)).length,
        failed:    payments.filter(p => p.status === 'failed').length
      };

      return { success: true, payments, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 4. REFUND PROCESSING
  // ====================================================================

  /**
   * Process a refund for a completed payment
   */
  async processRefund(paymentId, refundData = {}) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };
      if (payment.status !== 'completed') {
        return { success: false, error: `Cannot refund a ${payment.status} payment` };
      }

      const refundAmount = refundData.amount || payment.amount;
      if (refundAmount > payment.amount) {
        return { success: false, error: 'Refund exceeds payment amount' };
      }

      await payment.refund(refundAmount, refundData.reason || 'Refund requested');

      // Reverse payment on invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        invoice.paidAmount = Math.max(0, +(invoice.paidAmount - refundAmount).toFixed(2));
        if (refundAmount >= payment.amount) {
          invoice.status = 'refunded';
        }
        await invoice.save();
      }

      return { success: true, payment, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 5. RECEIPT GENERATION
  // ====================================================================

  /**
   * Generate a receipt (internal helper)
   */
  async _generateReceipt(payment, invoice) {
    try {
      const receiptId = await PaymentReceipt.generateReceiptId();

      const receiptText = this._formatReceiptText(payment, invoice);

      const receipt = new PaymentReceipt({
        receiptId,
        paymentId:      payment.paymentId,
        invoiceNumber:  payment.invoiceNumber,
        payerName:      payment.payerName,
        payerPhone:     payment.payerPhone,
        amount:         payment.amount,
        currency:       payment.currency,
        description:    `Payment for Invoice ${payment.invoiceNumber}`,
        paymentMethod:  `${payment.gateway} / ${payment.method}`,
        transactionRef: payment.gatewayConfig?.transactionId || payment.paymentId,
        propertyId:     invoice?.propertyId,
        propertyName:   invoice?.propertyName,
        format:         'whatsapp',
        receiptText
      });

      await receipt.save();

      // Update payment with receipt reference
      payment.receiptId        = receiptId;
      payment.receiptGenerated = true;
      await payment.save();

      return receipt;
    } catch (error) {
      console.error('Receipt generation error:', error.message);
      return null;
    }
  }

  /**
   * Format receipt as WhatsApp-friendly text
   */
  _formatReceiptText(payment, invoice) {
    const lines = [
      '🧾 *PAYMENT RECEIPT*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `📋 Receipt: ${payment.receiptId || 'Pending'}`,
      `💳 Payment: ${payment.paymentId}`,
      `📄 Invoice: ${payment.invoiceNumber || 'N/A'}`,
      '',
      `👤 Payer: ${payment.payerName || 'N/A'}`,
      `📱 Phone: ${payment.payerPhone || 'N/A'}`,
      '',
      `💰 Amount: ${payment.currency} ${payment.amount.toLocaleString()}`,
      `🏦 Method: ${payment.gateway} / ${payment.method}`,
      `📅 Date: ${new Date().toLocaleDateString('en-AE')}`,
      '',
    ];

    if (invoice) {
      lines.push(`🏠 Property: ${invoice.propertyName || invoice.propertyId || 'N/A'}`);
      lines.push(`📊 Invoice Total: ${invoice.currency} ${invoice.totalAmount.toLocaleString()}`);
      lines.push(`✅ Paid So Far: ${invoice.currency} ${invoice.paidAmount.toLocaleString()}`);
      lines.push(`📝 Balance: ${invoice.currency} ${invoice.balanceDue.toLocaleString()}`);
      lines.push('');
    }

    if (payment.gatewayConfig?.transactionId) {
      lines.push(`🔗 Ref: ${payment.gatewayConfig.transactionId}`);
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Thank you for your payment! ✅');

    return lines.join('\n');
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId) {
    try {
      const receipt = await PaymentReceipt.findOne({ receiptId });
      if (!receipt) return { success: false, error: 'Receipt not found' };
      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get receipt by payment ID
   */
  async getReceiptByPayment(paymentId) {
    try {
      const receipt = await PaymentReceipt.findOne({ paymentId });
      if (!receipt) return { success: false, error: 'Receipt not found for this payment' };
      return { success: true, receipt };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 6. RECONCILIATION
  // ====================================================================

  /**
   * Auto-reconcile unreconciled payments against invoices
   */
  async autoReconcile() {
    try {
      const unreconciled = await InvoicePayment.find({
        status: 'completed',
        reconciled: false,
        invoiceNumber: { $exists: true, $ne: null }
      });

      const results = { matched: 0, failed: 0, errors: [] };

      for (const payment of unreconciled) {
        try {
          const invoice = await Invoice.findOne({ invoiceNumber: payment.invoiceNumber });
          if (!invoice) {
            results.failed++;
            results.errors.push(`No invoice found for ${payment.invoiceNumber}`);
            continue;
          }

          const recId = await ReconciliationLog.generateReconciliationId();
          const log = new ReconciliationLog({
            reconciliationId:      recId,
            type:                  'auto',
            paymentId:             payment.paymentId,
            invoiceNumber:         payment.invoiceNumber,
            matchedAmount:         payment.amount,
            currency:              payment.currency,
            matchConfidence:       'exact',
            matchCriteria:         ['invoiceNumber'],
            invoiceBalanceBefore:  invoice.balanceDue,
            invoiceBalanceAfter:   Math.max(0, invoice.balanceDue - payment.amount),
            status:                'confirmed',
            performedBy:           'system:auto-reconcile'
          });
          await log.save();

          payment.reconciled   = true;
          payment.reconciledAt = new Date();
          payment.reconciledBy = 'system:auto-reconcile';
          await payment.save();

          results.matched++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Error reconciling ${payment.paymentId}: ${err.message}`);
        }
      }

      return { success: true, ...results, total: unreconciled.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Manual reconciliation — match a payment to a specific invoice
   */
  async manualReconcile(paymentId, invoiceNumber, performedBy) {
    try {
      const payment = await InvoicePayment.findOne({ paymentId });
      if (!payment) return { success: false, error: 'Payment not found' };

      const invoice = await Invoice.findOne({ invoiceNumber });
      if (!invoice) return { success: false, error: 'Invoice not found' };

      // Apply payment to invoice if not already
      if (!payment.reconciled) {
        await invoice.applyPayment(payment.amount);
      }

      const recId = await ReconciliationLog.generateReconciliationId();
      const log = new ReconciliationLog({
        reconciliationId:      recId,
        type:                  'manual',
        paymentId,
        invoiceNumber,
        matchedAmount:         payment.amount,
        currency:              payment.currency,
        matchConfidence:       'forced',
        matchCriteria:         ['manual_match'],
        invoiceBalanceBefore:  invoice.balanceDue + payment.amount,
        invoiceBalanceAfter:   invoice.balanceDue,
        status:                'confirmed',
        performedBy:           performedBy || 'admin'
      });
      await log.save();

      payment.reconciled     = true;
      payment.reconciledAt   = new Date();
      payment.reconciledBy   = performedBy || 'admin';
      payment.invoiceNumber  = invoiceNumber;
      payment.invoiceId      = invoice._id;
      await payment.save();

      return { success: true, reconciliation: log, payment, invoice };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reconciliation history
   */
  async getReconciliationHistory(opts = {}) {
    try {
      const query = {};
      if (opts.paymentId)     query.paymentId     = opts.paymentId;
      if (opts.invoiceNumber) query.invoiceNumber = opts.invoiceNumber;
      if (opts.type)          query.type          = opts.type;

      const logs = await ReconciliationLog.find(query)
        .sort({ performedAt: -1 })
        .limit(opts.limit || 50);

      return { success: true, logs, count: logs.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 7. OVERDUE MANAGEMENT
  // ====================================================================

  /**
   * Find all overdue invoices
   */
  async getOverdueInvoices() {
    try {
      const overdue = await Invoice.findOverdue();

      const summary = {
        count: overdue.length,
        totalOverdue: overdue.reduce((s, i) => s + i.balanceDue, 0),
        byDaysOverdue: {
          under7:   overdue.filter(i => (Date.now() - i.dueDate) / 86400000 < 7).length,
          days7to30: overdue.filter(i => {
            const d = (Date.now() - i.dueDate) / 86400000;
            return d >= 7 && d < 30;
          }).length,
          days30to90: overdue.filter(i => {
            const d = (Date.now() - i.dueDate) / 86400000;
            return d >= 30 && d < 90;
          }).length,
          over90: overdue.filter(i => (Date.now() - i.dueDate) / 86400000 >= 90).length
        }
      };

      return { success: true, overdue, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoices due soon (upcoming)
   */
  async getUpcomingInvoices(daysAhead = 7) {
    try {
      const now   = new Date();
      const until = new Date(now.getTime() + daysAhead * 86400000);

      const upcoming = await Invoice.find({
        status: { $in: ['draft', 'sent', 'viewed'] },
        dueDate: { $gte: now, $lte: until }
      }).sort({ dueDate: 1 });

      return {
        success: true,
        upcoming,
        count: upcoming.length,
        totalDue: upcoming.reduce((s, i) => s + i.balanceDue, 0)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 8. RECURRING INVOICES
  // ====================================================================

  /**
   * Process recurring invoices that are due
   */
  async processRecurringInvoices() {
    try {
      const now = new Date();
      const recurring = await Invoice.find({
        isRecurring: true,
        'recurringConfig.nextDate': { $lte: now },
        status: { $nin: ['cancelled', 'written_off'] }
      });

      const generated = [];

      for (const template of recurring) {
        const invoiceNumber = await Invoice.generateInvoiceNumber();
        const newDueDate = this._calcNextDate(template.recurringConfig.frequency, now);

        const inv = new Invoice({
          invoiceNumber,
          tenantPhone:  template.tenantPhone,
          tenantName:   template.tenantName,
          ownerPhone:   template.ownerPhone,
          propertyId:   template.propertyId,
          tenancyId:    template.tenancyId,
          type:         template.type,
          lineItems:    template.lineItems.map(li => ({
            description: li.description,
            amount:      li.amount,
            quantity:    li.quantity,
            category:    li.category,
            taxRate:     li.taxRate
          })),
          totalAmount:  template.totalAmount,
          dueDate:      newDueDate,
          status:       template.recurringConfig.autoSend ? 'sent' : 'draft',
          sentAt:       template.recurringConfig.autoSend ? new Date() : undefined,
          sentVia:      template.recurringConfig.autoSend ? ['whatsapp'] : [],
          isRecurring:  false,   // The generated copy is not itself recurring
          createdBy:    'system:recurring'
        });

        await inv.save();
        generated.push(inv);

        // Update next date on template
        template.recurringConfig.nextDate = this._calcNextDate(
          template.recurringConfig.frequency,
          newDueDate
        );
        // End if past end date
        if (template.recurringConfig.endDate && template.recurringConfig.nextDate > template.recurringConfig.endDate) {
          template.isRecurring = false;
        }
        await template.save();
      }

      return { success: true, generated: generated.length, invoices: generated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a recurring invoice template
   */
  async createRecurringInvoice(data) {
    try {
      const invoiceNumber = data.invoiceNumber || await Invoice.generateInvoiceNumber();
      const invoice = new Invoice({
        ...data,
        invoiceNumber,
        isRecurring: true,
        recurringConfig: {
          frequency: data.frequency || 'monthly',
          nextDate:  data.nextDate || data.dueDate || new Date(),
          endDate:   data.endDate,
          autoSend:  data.autoSend || false
        }
      });
      await invoice.save();
      return { success: true, invoice, invoiceNumber };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  _calcNextDate(frequency, fromDate) {
    const d = new Date(fromDate);
    switch (frequency) {
      case 'monthly':     d.setMonth(d.getMonth() + 1); break;
      case 'quarterly':   d.setMonth(d.getMonth() + 3); break;
      case 'semi_annual': d.setMonth(d.getMonth() + 6); break;
      case 'annual':      d.setFullYear(d.getFullYear() + 1); break;
      default:            d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  // ====================================================================
  // 9. REPORTS
  // ====================================================================

  /**
   * Revenue report — invoices & payments for a date range
   */
  async getRevenueReport(opts = {}) {
    try {
      const startDate = opts.startDate ? new Date(opts.startDate) : new Date(new Date().getFullYear(), 0, 1);
      const endDate   = opts.endDate   ? new Date(opts.endDate)   : new Date();

      const invoices = await Invoice.find({
        issueDate: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      });

      const payments = await InvoicePayment.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      // Revenue by type
      const byType = {};
      for (const inv of invoices) {
        if (!byType[inv.type]) byType[inv.type] = { invoiced: 0, count: 0 };
        byType[inv.type].invoiced += inv.totalAmount;
        byType[inv.type].count++;
      }

      // Payments by gateway
      const byGateway = {};
      for (const pay of payments) {
        if (!byGateway[pay.gateway]) byGateway[pay.gateway] = { collected: 0, count: 0 };
        byGateway[pay.gateway].collected += pay.amount;
        byGateway[pay.gateway].count++;
      }

      // Monthly breakdown
      const monthly = {};
      for (const pay of payments) {
        const key = `${pay.createdAt.getFullYear()}-${String(pay.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { collected: 0, count: 0 };
        monthly[key].collected += pay.amount;
        monthly[key].count++;
      }

      return {
        success: true,
        report: {
          period: { start: startDate, end: endDate },
          invoices: {
            total:          invoices.length,
            totalInvoiced:  invoices.reduce((s, i) => s + i.totalAmount, 0),
            totalPaid:      invoices.reduce((s, i) => s + i.paidAmount, 0),
            totalBalance:   invoices.reduce((s, i) => s + i.balanceDue, 0),
            paidCount:      invoices.filter(i => i.status === 'paid').length,
            overdueCount:   invoices.filter(i => i.dueDate < new Date() && !['paid', 'cancelled', 'refunded'].includes(i.status)).length
          },
          payments: {
            total:          payments.length,
            totalCollected: payments.reduce((s, p) => s + p.amount, 0)
          },
          byType,
          byGateway,
          monthly
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Outstanding report — unpaid invoices
   */
  async getOutstandingReport() {
    try {
      const unpaid = await Invoice.find({
        status: { $in: ['draft', 'sent', 'viewed', 'partially_paid', 'overdue'] },
        balanceDue: { $gt: 0 }
      }).sort({ dueDate: 1 });

      // Group by tenant
      const byTenant = {};
      for (const inv of unpaid) {
        const key = inv.tenantPhone || 'unknown';
        if (!byTenant[key]) byTenant[key] = {
          name: inv.tenantName || 'Unknown',
          phone: key,
          invoices: 0,
          totalDue: 0
        };
        byTenant[key].invoices++;
        byTenant[key].totalDue += inv.balanceDue;
      }

      return {
        success: true,
        outstanding: {
          totalInvoices:   unpaid.length,
          totalOutstanding: unpaid.reduce((s, i) => s + i.balanceDue, 0),
          overdueCount:    unpaid.filter(i => i.dueDate < new Date()).length,
          overdueAmount:   unpaid.filter(i => i.dueDate < new Date()).reduce((s, i) => s + i.balanceDue, 0),
          byTenant:        Object.values(byTenant).sort((a, b) => b.totalDue - a.totalDue)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Tenant payment history
   */
  async getTenantPaymentHistory(tenantPhone, opts = {}) {
    try {
      const invoices = await Invoice.findByTenant(tenantPhone, opts);
      const payments = await InvoicePayment.find({ payerPhone: tenantPhone })
        .sort({ createdAt: -1 })
        .limit(opts.limit || 50);

      return {
        success: true,
        tenant: {
          phone: tenantPhone,
          invoices:       invoices.length,
          payments:       payments.length,
          totalInvoiced:  invoices.reduce((s, i) => s + i.totalAmount, 0),
          totalPaid:      payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
          totalBalance:   invoices.reduce((s, i) => s + i.balanceDue, 0)
        },
        invoices,
        payments
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ====================================================================
  // 10. QUICK STATS (Bot-friendly)
  // ====================================================================

  /**
   * Get quick stats as WhatsApp-formatted text
   */
  async getQuickStats() {
    try {
      const [totalInv, paidInv, overdueInv, draftInv] = await Promise.all([
        Invoice.countDocuments({}),
        Invoice.countDocuments({ status: 'paid' }),
        Invoice.countDocuments({
          status: { $nin: ['paid', 'cancelled', 'refunded', 'written_off'] },
          dueDate: { $lt: new Date() }
        }),
        Invoice.countDocuments({ status: 'draft' })
      ]);

      const [totalPay, completedPay] = await Promise.all([
        InvoicePayment.countDocuments({}),
        InvoicePayment.countDocuments({ status: 'completed' })
      ]);

      const [invoiceAgg] = await Invoice.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: {
          _id: null,
          totalInvoiced: { $sum: '$totalAmount' },
          totalPaid:     { $sum: '$paidAmount' },
          totalBalance:  { $sum: '$balanceDue' }
        }}
      ]) || [{}];

      const stats = invoiceAgg || {};

      const lines = [
        '💰 *INVOICE & PAYMENT STATS*',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '📄 *Invoices*',
        `   Total: ${totalInv}`,
        `   Paid: ${paidInv} ✅`,
        `   Overdue: ${overdueInv} ⚠️`,
        `   Draft: ${draftInv}`,
        '',
        '💳 *Payments*',
        `   Total: ${totalPay}`,
        `   Completed: ${completedPay} ✅`,
        '',
        '📊 *Financials*',
        `   Invoiced: AED ${(stats.totalInvoiced || 0).toLocaleString()}`,
        `   Collected: AED ${(stats.totalPaid || 0).toLocaleString()}`,
        `   Outstanding: AED ${(stats.totalBalance || 0).toLocaleString()}`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━'
      ];

      return lines.join('\n');
    } catch (error) {
      return `❌ Error loading stats: ${error.message}`;
    }
  }

  // ====================================================================
  // GATEWAY ABSTRACTION (Placeholder — extend per gateway)
  // ====================================================================

  async _initiateGateway(gateway, payment, invoice) {
    // Placeholder — override per gateway in production
    switch (gateway) {
      case 'paytabs':
        return this._initiatePayTabs(payment, invoice);
      case 'stripe':
        return this._initiateStripe(payment, invoice);
      default:
        return { redirectUrl: null };
    }
  }

  async _initiatePayTabs(payment, invoice) {
    // PayTabs integration placeholder
    // In production: call PayTabs API to create payment page
    // Return: { redirectUrl: 'https://secure.paytabs.com/payment/...' }
    console.log(`[PayTabs] Would initiate payment ${payment.paymentId} for AED ${payment.amount}`);
    return {
      redirectUrl: null,
      transactionId: `PT-${Date.now()}`
    };
  }

  async _initiateStripe(payment, invoice) {
    // Stripe integration placeholder
    // In production: call Stripe API to create checkout session
    // Return: { redirectUrl: 'https://checkout.stripe.com/...' }
    console.log(`[Stripe] Would initiate payment ${payment.paymentId} for AED ${payment.amount}`);
    return {
      redirectUrl: null,
      transactionId: `STR-${Date.now()}`
    };
  }
}

export default new InvoicePaymentService();
