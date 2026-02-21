/**
 * ========================================================================
 * INVOICE & PAYMENT BOT COMMANDS
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * WhatsApp bot commands for the invoice-to-payment lifecycle:
 *
 *  !create-invoice     — Create a new invoice
 *  !invoice            — View invoice details
 *  !my-invoices        — List invoices for a tenant
 *  !send-invoice       — Send invoice via WhatsApp
 *  !pay-invoice        — Initiate payment for an invoice
 *  !payment-status     — Check payment status
 *  !payment-receipt    — View/resend payment receipt
 *  !overdue-invoices   — List overdue invoices
 *  !revenue-report     — Generate revenue summary
 *  !invoice-stats      — Quick stats summary
 *  !reconcile          — Trigger auto-reconciliation
 *  !refund-payment     — Process refund
 *
 * @module InvoiceCommands
 * @since Phase 5 Feature 4 – February 2026
 */

import invoiceService from '../Services/InvoicePaymentService.js';

class InvoiceCommands {

  /**
   * Get all available commands
   */
  static getCommands() {
    return {
      '!create-invoice':   'Create a new invoice (type|amount|tenant|property|due)',
      '!invoice':          'View invoice details (!invoice INV-2026-00001)',
      '!my-invoices':      'List invoices for your phone or tenant phone',
      '!send-invoice':     'Send invoice via WhatsApp (!send-invoice INV-2026-00001)',
      '!pay-invoice':      'Pay an invoice (!pay-invoice INV-2026-00001|amount|method)',
      '!payment-status':   'Check payment status (!payment-status PAY-2026-000001)',
      '!payment-receipt':  'View receipt (!payment-receipt PAY-2026-000001)',
      '!overdue-invoices': 'List all overdue invoices',
      '!revenue-report':   'Revenue summary (!revenue-report start=2026-01-01|end=2026-12-31)',
      '!invoice-stats':    'Quick invoice & payment stats',
      '!reconcile':        'Auto-reconcile payments to invoices',
      '!refund-payment':   'Refund a payment (!refund-payment PAY-2026-000001|amount|reason)'
    };
  }

  /**
   * Main command router
   */
  static async handle(command, args, context = {}) {
    try {
      switch (command) {
        case '!create-invoice':   return await this.handleCreateInvoice(args, context);
        case '!invoice':          return await this.handleViewInvoice(args);
        case '!my-invoices':      return await this.handleMyInvoices(args, context);
        case '!send-invoice':     return await this.handleSendInvoice(args);
        case '!pay-invoice':      return await this.handlePayInvoice(args, context);
        case '!payment-status':   return await this.handlePaymentStatus(args);
        case '!payment-receipt':  return await this.handlePaymentReceipt(args);
        case '!overdue-invoices': return await this.handleOverdueInvoices();
        case '!revenue-report':   return await this.handleRevenueReport(args);
        case '!invoice-stats':    return await this.handleInvoiceStats();
        case '!reconcile':        return await this.handleReconcile();
        case '!refund-payment':   return await this.handleRefund(args);
        default:
          return `❌ Unknown command: ${command}\nUse one of: ${Object.keys(this.getCommands()).join(', ')}`;
      }
    } catch (error) {
      return `❌ Error: ${error.message}`;
    }
  }

  // ====================================================================
  // COMMAND HANDLERS
  // ====================================================================

  static async handleCreateInvoice(args, context) {
    const parsed = this._parseArgs(args);

    if (!parsed.type || !parsed.amount) {
      return [
        '📄 *CREATE INVOICE*',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        'Usage: `!create-invoice type=rent|amount=50000|tenant=971501234567|property=PROP001|due=2026-03-01`',
        '',
        '*Required:*',
        '  • type — rent, service_charge, maintenance, utilities, deposit, other',
        '  • amount — Invoice amount (AED)',
        '',
        '*Optional:*',
        '  • tenant — Tenant phone number',
        '  • property — Property ID',
        '  • due — Due date (YYYY-MM-DD)',
        '  • description — Line item description',
        '  • notes — Invoice notes',
      ].join('\n');
    }

    const dueDate = parsed.due ? new Date(parsed.due) : new Date(Date.now() + 30 * 86400000);

    const result = await invoiceService.createInvoice({
      type:        parsed.type,
      tenantPhone: parsed.tenant || context.senderPhone,
      propertyId:  parsed.property,
      lineItems: [{
        description: parsed.description || `${parsed.type} payment`,
        amount:      parseFloat(parsed.amount),
        category:    parsed.type
      }],
      totalAmount: parseFloat(parsed.amount),
      dueDate,
      notes:     parsed.notes,
      createdBy: context.senderPhone || 'bot'
    });

    if (!result.success) return `❌ ${result.error}`;

    const inv = result.invoice;
    return [
      '✅ *INVOICE CREATED*',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      `📋 Invoice: *${inv.invoiceNumber}*`,
      `📂 Type: ${inv.type}`,
      `💰 Amount: ${inv.currency} ${inv.totalAmount.toLocaleString()}`,
      `📅 Due: ${inv.dueDate.toLocaleDateString('en-AE')}`,
      `📊 Status: ${inv.status}`,
      inv.tenantPhone ? `👤 Tenant: ${inv.tenantPhone}` : '',
      inv.propertyId ? `🏠 Property: ${inv.propertyId}` : '',
      '',
      `Send it: \`!send-invoice ${inv.invoiceNumber}\``,
    ].filter(Boolean).join('\n');
  }

  static async handleViewInvoice(args) {
    const invoiceNumber = (args || '').trim();
    if (!invoiceNumber) return '❌ Usage: `!invoice INV-2026-00001`';

    const result = await invoiceService.getInvoice(invoiceNumber);
    if (!result.success) return `❌ ${result.error}`;

    const inv = result.invoice;
    const statusEmoji = {
      draft: '📝', sent: '📤', viewed: '👁️', partially_paid: '💳',
      paid: '✅', overdue: '⚠️', cancelled: '❌', refunded: '↩️'
    };

    const lines = [
      `📄 *INVOICE: ${inv.invoiceNumber}*`,
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `${statusEmoji[inv.status] || '📋'} Status: *${inv.status.toUpperCase()}*`,
      `📂 Type: ${inv.type}`,
      `💰 Total: ${inv.currency} ${inv.totalAmount.toLocaleString()}`,
      `✅ Paid: ${inv.currency} ${inv.paidAmount.toLocaleString()}`,
      `📝 Balance: ${inv.currency} ${inv.balanceDue.toLocaleString()}`,
      '',
      `📅 Issued: ${inv.issueDate.toLocaleDateString('en-AE')}`,
      `📅 Due: ${inv.dueDate.toLocaleDateString('en-AE')}`,
    ];

    if (inv.tenantPhone)  lines.push(`👤 Tenant: ${inv.tenantName || ''} (${inv.tenantPhone})`);
    if (inv.propertyId)   lines.push(`🏠 Property: ${inv.propertyName || inv.propertyId}`);

    if (inv.lineItems?.length) {
      lines.push('', '*Line Items:*');
      for (const li of inv.lineItems) {
        lines.push(`  • ${li.description}: ${inv.currency} ${li.total?.toLocaleString() || li.amount?.toLocaleString()}`);
      }
    }

    if (inv.notes) lines.push('', `📌 Notes: ${inv.notes}`);
    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━');

    if (inv.status !== 'paid' && inv.status !== 'cancelled') {
      lines.push(`Pay: \`!pay-invoice ${inv.invoiceNumber}\``);
    }

    return lines.join('\n');
  }

  static async handleMyInvoices(args, context) {
    const parsed = this._parseArgs(args);
    const phone  = parsed.tenant || parsed.phone || context.senderPhone;

    if (!phone) return '❌ Usage: `!my-invoices tenant=971501234567`';

    const result = await invoiceService.listInvoices({
      tenantPhone: phone,
      status: parsed.status,
      limit: parseInt(parsed.limit) || 10
    });

    if (!result.success) return `❌ ${result.error}`;
    if (!result.invoices.length) return `📄 No invoices found for ${phone}`;

    const lines = [
      `📄 *INVOICES FOR ${phone}*`,
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `Total: ${result.summary.count} | Amount: AED ${result.summary.totalAmount.toLocaleString()} | Balance: AED ${result.summary.totalBalance.toLocaleString()}`,
      '',
    ];

    for (const inv of result.invoices) {
      const emoji = inv.status === 'paid' ? '✅' : inv.status === 'overdue' ? '⚠️' : '📄';
      lines.push(`${emoji} ${inv.invoiceNumber} | ${inv.type} | AED ${inv.totalAmount.toLocaleString()} | ${inv.status} | Due: ${inv.dueDate.toLocaleDateString('en-AE')}`);
    }

    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
  }

  static async handleSendInvoice(args) {
    const invoiceNumber = (args || '').trim();
    if (!invoiceNumber) return '❌ Usage: `!send-invoice INV-2026-00001`';

    const result = await invoiceService.sendInvoice(invoiceNumber, ['whatsapp']);
    if (!result.success) return `❌ ${result.error}`;

    return [
      '📤 *INVOICE SENT*',
      '',
      `📋 ${result.invoice.invoiceNumber}`,
      `💰 ${result.invoice.currency} ${result.invoice.totalAmount.toLocaleString()}`,
      `📅 Due: ${result.invoice.dueDate.toLocaleDateString('en-AE')}`,
      `📱 Sent via: WhatsApp`,
    ].join('\n');
  }

  static async handlePayInvoice(args, context) {
    const parsed = this._parseArgs(args);
    const invoiceNumber = parsed._positional || parsed.invoice;

    if (!invoiceNumber) {
      return [
        '💳 *PAY INVOICE*',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        'Usage: `!pay-invoice INV-2026-00001|amount=50000|method=cash`',
        '',
        '*Methods:* cash, cheque, bank_transfer, credit_card, debit_card',
        '*Gateways:* cash, cheque, bank_transfer, paytabs, stripe',
      ].join('\n');
    }

    const result = await invoiceService.initiatePayment({
      invoiceNumber,
      amount:     parsed.amount ? parseFloat(parsed.amount) : undefined,
      gateway:    parsed.gateway || parsed.method || 'cash',
      method:     parsed.method || 'cash',
      payerPhone: context.senderPhone,
      createdBy:  context.senderPhone || 'bot'
    });

    if (!result.success) return `❌ ${result.error}`;

    const pay = result.payment;
    const lines = [
      '✅ *PAYMENT PROCESSED*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `💳 Payment: *${pay.paymentId}*`,
      `📄 Invoice: ${pay.invoiceNumber}`,
      `💰 Amount: ${pay.currency} ${pay.amount.toLocaleString()}`,
      `🏦 Method: ${pay.gateway} / ${pay.method}`,
      `📊 Status: ${pay.status}`,
    ];

    if (result.redirectUrl) {
      lines.push('', `🔗 Pay here: ${result.redirectUrl}`);
    }

    if (pay.receiptId) {
      lines.push('', `🧾 Receipt: ${pay.receiptId}`);
      lines.push(`View: \`!payment-receipt ${pay.paymentId}\``);
    }

    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
  }

  static async handlePaymentStatus(args) {
    const paymentId = (args || '').trim();
    if (!paymentId) return '❌ Usage: `!payment-status PAY-2026-000001`';

    const result = await invoiceService.getPayment(paymentId);
    if (!result.success) return `❌ ${result.error}`;

    const pay = result.payment;
    const statusEmoji = {
      initiated: '🔄', pending: '⏳', processing: '⚙️', completed: '✅',
      failed: '❌', cancelled: '🚫', refunded: '↩️'
    };

    return [
      `💳 *PAYMENT: ${pay.paymentId}*`,
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `${statusEmoji[pay.status] || '📋'} Status: *${pay.status.toUpperCase()}*`,
      `📄 Invoice: ${pay.invoiceNumber || 'N/A'}`,
      `💰 Amount: ${pay.currency} ${pay.amount.toLocaleString()}`,
      `🏦 Method: ${pay.gateway} / ${pay.method}`,
      `👤 Payer: ${pay.payerName || 'N/A'} (${pay.payerPhone || 'N/A'})`,
      `📅 Initiated: ${pay.initiatedAt?.toLocaleDateString('en-AE') || 'N/A'}`,
      pay.completedAt ? `✅ Completed: ${pay.completedAt.toLocaleDateString('en-AE')}` : '',
      pay.receiptId ? `🧾 Receipt: ${pay.receiptId}` : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━'
    ].filter(Boolean).join('\n');
  }

  static async handlePaymentReceipt(args) {
    const paymentId = (args || '').trim();
    if (!paymentId) return '❌ Usage: `!payment-receipt PAY-2026-000001`';

    const result = await invoiceService.getReceiptByPayment(paymentId);
    if (!result.success) return `❌ ${result.error}`;

    return result.receipt.receiptText || `🧾 Receipt ${result.receipt.receiptId} found (no formatted text available)`;
  }

  static async handleOverdueInvoices() {
    const result = await invoiceService.getOverdueInvoices();
    if (!result.success) return `❌ ${result.error}`;
    if (!result.overdue.length) return '✅ No overdue invoices! 🎉';

    const lines = [
      '⚠️ *OVERDUE INVOICES*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `Total: ${result.summary.count} | Amount: AED ${result.summary.totalOverdue.toLocaleString()}`,
      '',
      `📊 < 7 days: ${result.summary.byDaysOverdue.under7}`,
      `📊 7-30 days: ${result.summary.byDaysOverdue.days7to30}`,
      `📊 30-90 days: ${result.summary.byDaysOverdue.days30to90}`,
      `📊 > 90 days: ${result.summary.byDaysOverdue.over90}`,
      '',
    ];

    for (const inv of result.overdue.slice(0, 15)) {
      const daysOver = Math.floor((Date.now() - inv.dueDate) / 86400000);
      lines.push(`⚠️ ${inv.invoiceNumber} | AED ${inv.balanceDue.toLocaleString()} | ${daysOver}d overdue | ${inv.tenantPhone || 'N/A'}`);
    }

    if (result.overdue.length > 15) {
      lines.push(`... and ${result.overdue.length - 15} more`);
    }

    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
  }

  static async handleRevenueReport(args) {
    const parsed = this._parseArgs(args);
    const result = await invoiceService.getRevenueReport({
      startDate: parsed.start,
      endDate:   parsed.end
    });

    if (!result.success) return `❌ ${result.error}`;

    const r = result.report;
    const lines = [
      '📊 *REVENUE REPORT*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `📅 Period: ${r.period.start.toLocaleDateString('en-AE')} – ${r.period.end.toLocaleDateString('en-AE')}`,
      '',
      '📄 *Invoices*',
      `   Total: ${r.invoices.total}`,
      `   Invoiced: AED ${r.invoices.totalInvoiced.toLocaleString()}`,
      `   Collected: AED ${r.invoices.totalPaid.toLocaleString()}`,
      `   Outstanding: AED ${r.invoices.totalBalance.toLocaleString()}`,
      `   Paid: ${r.invoices.paidCount} | Overdue: ${r.invoices.overdueCount}`,
      '',
      '💳 *Payments*',
      `   Transactions: ${r.payments.total}`,
      `   Collected: AED ${r.payments.totalCollected.toLocaleString()}`,
    ];

    if (Object.keys(r.byType).length) {
      lines.push('', '📂 *By Type*');
      for (const [type, data] of Object.entries(r.byType)) {
        lines.push(`   ${type}: AED ${data.invoiced.toLocaleString()} (${data.count} invoices)`);
      }
    }

    if (Object.keys(r.byGateway).length) {
      lines.push('', '🏦 *By Gateway*');
      for (const [gw, data] of Object.entries(r.byGateway)) {
        lines.push(`   ${gw}: AED ${data.collected.toLocaleString()} (${data.count} payments)`);
      }
    }

    lines.push('', '━━━━━━━━━━━━━━━━━━━━━━━━');
    return lines.join('\n');
  }

  static async handleInvoiceStats() {
    const text = await invoiceService.getQuickStats();
    return text;
  }

  static async handleReconcile() {
    const result = await invoiceService.autoReconcile();
    if (!result.success) return `❌ ${result.error}`;

    return [
      '🔄 *AUTO-RECONCILIATION COMPLETE*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `📊 Total Processed: ${result.total}`,
      `✅ Matched: ${result.matched}`,
      `❌ Failed: ${result.failed}`,
      '',
      result.errors.length ? `⚠️ Errors:\n${result.errors.slice(0, 5).map(e => `  • ${e}`).join('\n')}` : '✅ No errors',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');
  }

  static async handleRefund(args) {
    const parsed = this._parseArgs(args);
    const paymentId = parsed._positional || parsed.payment;

    if (!paymentId) {
      return [
        '↩️ *REFUND PAYMENT*',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        'Usage: `!refund-payment PAY-2026-000001|amount=25000|reason=Duplicate payment`',
        '',
        '*Required:* payment ID',
        '*Optional:* amount (defaults to full), reason',
      ].join('\n');
    }

    const result = await invoiceService.processRefund(paymentId, {
      amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
      reason: parsed.reason || 'Refund via bot'
    });

    if (!result.success) return `❌ ${result.error}`;

    return [
      '↩️ *REFUND PROCESSED*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `💳 Payment: ${result.payment.paymentId}`,
      `💰 Refunded: ${result.payment.currency} ${result.payment.refundAmount.toLocaleString()}`,
      `📊 Status: ${result.payment.status}`,
      result.invoice ? `📄 Invoice: ${result.invoice.invoiceNumber} — Balance: ${result.invoice.currency} ${result.invoice.balanceDue.toLocaleString()}` : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━'
    ].filter(Boolean).join('\n');
  }

  // ====================================================================
  // ARGUMENT PARSER
  // ====================================================================

  static _parseArgs(argString) {
    if (!argString || !argString.trim()) return {};

    const result = {};
    const parts = argString.trim().split('|').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('=')) {
        const eqIdx = part.indexOf('=');
        const key   = part.substring(0, eqIdx).trim().toLowerCase();
        const value = part.substring(eqIdx + 1).trim();
        result[key] = value;
      } else if (!result._positional) {
        result._positional = part;
      }
    }

    return result;
  }
}

export default InvoiceCommands;
