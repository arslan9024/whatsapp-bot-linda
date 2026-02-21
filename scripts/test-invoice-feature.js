/**
 * ========================================================================
 * INVOICE & PAYMENT FEATURE — COMPREHENSIVE TEST SUITE
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * 20 test suites, 220+ test cases covering:
 *   Schemas (4 models), Service (10 method groups),
 *   Bot Commands (12 commands), Edge Cases & Error Resilience
 *
 * Runs with MongoMemoryServer — zero external dependencies.
 *
 * Usage:
 *   node scripts/test-invoice-feature.js
 *   npm run test:invoices
 *
 * @since Phase 5 Feature 4 – February 2026
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// ====================================================================
// TEST FRAMEWORK
// ====================================================================

let passed = 0, failed = 0, total = 0;
const failures = [];

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    failures.push(testName);
    console.log(`  ❌ ${testName}`);
  }
}

// ====================================================================
// SETUP / TEARDOWN
// ====================================================================

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('🔧 Connected to in-memory MongoDB\n');
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('\n🧹 Cleaned up test environment');
}

async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

// ====================================================================
// IMPORTS (after setup so models register fresh)
// ====================================================================
let Invoice, InvoicePayment, PaymentReceipt, ReconciliationLog;
let invoiceService;
let InvoiceCommands;

async function loadModules() {
  const schema = await import('../code/Database/InvoiceSchema.js');
  Invoice           = schema.Invoice;
  InvoicePayment    = schema.InvoicePayment;
  PaymentReceipt    = schema.PaymentReceipt;
  ReconciliationLog = schema.ReconciliationLog;

  const svc = await import('../code/Services/InvoicePaymentService.js');
  invoiceService = svc.default;

  const cmd = await import('../code/Commands/InvoiceCommands.js');
  InvoiceCommands = cmd.default;
}

// ====================================================================
// SEED DATA HELPER
// ====================================================================

async function seedInvoices() {
  const invoices = [];
  const baseDate = new Date();

  // Invoice 1: Draft rent invoice
  invoices.push(await invoiceService.createInvoice({
    type: 'rent',
    tenantPhone: '971501111111',
    tenantName: 'Ahmed Al Maktoum',
    propertyId: 'PROP-001',
    propertyName: 'Villa 23, DAMAC Hills 2',
    lineItems: [{ description: 'Monthly Rent - March 2026', amount: 85000, category: 'rent' }],
    totalAmount: 85000,
    dueDate: new Date(baseDate.getTime() + 10 * 86400000),
    createdBy: 'test'
  }));

  // Invoice 2: Overdue service charge
  invoices.push(await invoiceService.createInvoice({
    type: 'service_charge',
    tenantPhone: '971502222222',
    tenantName: 'Fatima Al Rashid',
    propertyId: 'PROP-002',
    propertyName: 'Apt 1204, Akoya',
    lineItems: [{ description: 'Q1 Service Charge', amount: 12500, category: 'service_charge' }],
    totalAmount: 12500,
    dueDate: new Date(baseDate.getTime() - 15 * 86400000), // 15 days ago
    createdBy: 'test'
  }));

  // Invoice 3: Paid maintenance
  const paid = await invoiceService.createInvoice({
    type: 'maintenance',
    tenantPhone: '971503333333',
    tenantName: 'Khalid bin Zayed',
    propertyId: 'PROP-003',
    lineItems: [
      { description: 'AC Repair', amount: 2500, category: 'maintenance' },
      { description: 'Plumbing Fix', amount: 1500, category: 'maintenance' }
    ],
    totalAmount: 4000,
    dueDate: new Date(baseDate.getTime() - 5 * 86400000),
    createdBy: 'test'
  });
  invoices.push(paid);

  return invoices;
}

// ====================================================================
// TEST SUITES
// ====================================================================

async function runTests() {
  await setup();
  await loadModules();

  // ================================================================
  // SUITE 1: Invoice Schema Basics
  // ================================================================
  console.log('\n📋 TEST SUITE 1: Invoice Schema Basics');
  console.log('─'.repeat(50));
  await clearDB();

  const inv1 = new Invoice({
    invoiceNumber: 'INV-TEST-001',
    type: 'rent',
    totalAmount: 50000,
    dueDate: new Date(Date.now() + 30 * 86400000),
    tenantPhone: '971501234567',
    tenantName: 'Test Tenant',
    lineItems: [{ description: 'Rent', amount: 50000, category: 'rent' }]
  });
  await inv1.save();

  assert(inv1.invoiceNumber === 'INV-TEST-001', '1.1 Invoice number saved');
  assert(inv1.type === 'rent', '1.2 Type is rent');
  assert(inv1.totalAmount === 50000, '1.3 Total amount correct');
  assert(inv1.currency === 'AED', '1.4 Default currency is AED');
  assert(inv1.status === 'draft', '1.5 Default status is draft');
  assert(inv1.paidAmount === 0, '1.6 Paid amount starts at 0');
  assert(inv1.balanceDue === 50000, '1.7 Balance due equals total');
  assert(inv1.lineItems.length === 1, '1.8 One line item');
  assert(inv1.lineItems[0].category === 'rent', '1.9 Line item category');
  assert(inv1.isRecurring === false, '1.10 Not recurring by default');
  assert(typeof inv1.createdAt !== 'undefined', '1.11 Timestamps created');

  // Test line item auto-calc
  const inv2 = new Invoice({
    invoiceNumber: 'INV-TEST-002',
    type: 'mixed',
    totalAmount: 0, // Will be recalculated
    dueDate: new Date(Date.now() + 30 * 86400000),
    lineItems: [
      { description: 'Rent', amount: 40000, category: 'rent' },
      { description: 'Service', amount: 5000, category: 'service_charge', taxRate: 5 }
    ]
  });
  await inv2.save();

  assert(inv2.subtotal === 45000, '1.12 Subtotal auto-calculated');
  assert(inv2.taxTotal === 250, '1.13 Tax calculated (5% of 5000)');
  assert(inv2.totalAmount === 45250, '1.14 Total includes tax');
  assert(inv2.lineItems[1].taxAmount === 250, '1.15 Line item tax amount');
  assert(inv2.lineItems[1].total === 5250, '1.16 Line item total with tax');

  // ================================================================
  // SUITE 2: Invoice Static Methods
  // ================================================================
  console.log('\n📋 TEST SUITE 2: Invoice Static Methods');
  console.log('─'.repeat(50));

  const genNum = await Invoice.generateInvoiceNumber();
  assert(genNum.startsWith('INV-'), '2.1 Generated number starts with INV-');
  assert(genNum.includes(String(new Date().getFullYear())), '2.2 Contains current year');

  const byTenant = await Invoice.findByTenant('971501234567');
  assert(byTenant.length >= 1, '2.3 FindByTenant returns results');

  // Create overdue invoice
  const overdueInv = new Invoice({
    invoiceNumber: 'INV-OVERDUE-001',
    type: 'utilities',
    totalAmount: 3000,
    dueDate: new Date(Date.now() - 30 * 86400000),
    status: 'sent'
  });
  await overdueInv.save();

  const overdueList = await Invoice.findOverdue();
  assert(overdueList.length >= 1, '2.4 FindOverdue returns overdue invoices');
  assert(overdueList.some(i => i.invoiceNumber === 'INV-OVERDUE-001'), '2.5 Our overdue invoice found');

  const byProperty = await Invoice.findByProperty('non-existent');
  assert(byProperty.length === 0, '2.6 FindByProperty returns empty for unknown');

  // ================================================================
  // SUITE 3: Invoice Instance Methods
  // ================================================================
  console.log('\n📋 TEST SUITE 3: Invoice Instance Methods');
  console.log('─'.repeat(50));
  await clearDB();

  const inv3 = new Invoice({
    invoiceNumber: 'INV-METHOD-001',
    type: 'rent',
    totalAmount: 100000,
    dueDate: new Date(Date.now() + 30 * 86400000),
    lineItems: [{ description: 'Rent', amount: 100000, category: 'rent' }]
  });
  await inv3.save();

  await inv3.markAsSent(['whatsapp', 'email']);
  assert(inv3.status === 'sent', '3.1 Mark as sent');
  assert(inv3.sentVia.includes('whatsapp'), '3.2 Sent via whatsapp');
  assert(inv3.sentVia.includes('email'), '3.3 Sent via email');
  assert(inv3.sentAt instanceof Date, '3.4 sentAt is Date');

  await inv3.markAsViewed();
  assert(inv3.status === 'viewed', '3.5 Mark as viewed');
  assert(inv3.viewedAt instanceof Date, '3.6 viewedAt is Date');

  await inv3.applyPayment(40000);
  assert(inv3.paidAmount === 40000, '3.7 Partial payment applied');
  assert(inv3.balanceDue === 60000, '3.8 Balance updated');
  assert(inv3.status === 'partially_paid', '3.9 Status is partially_paid');

  await inv3.applyPayment(60000);
  assert(inv3.paidAmount === 100000, '3.10 Full payment applied');
  assert(inv3.balanceDue === 0, '3.11 Balance is zero');
  assert(inv3.status === 'paid', '3.12 Status is paid');
  assert(inv3.paidDate instanceof Date, '3.13 paidDate set automatically');

  // ================================================================
  // SUITE 4: InvoicePayment Schema
  // ================================================================
  console.log('\n📋 TEST SUITE 4: InvoicePayment Schema');
  console.log('─'.repeat(50));
  await clearDB();

  const pay1 = new InvoicePayment({
    paymentId: 'PAY-TEST-001',
    amount: 50000,
    currency: 'AED',
    gateway: 'cash',
    method: 'cash',
    status: 'initiated',
    statusHistory: [{ status: 'initiated' }]
  });
  await pay1.save();

  assert(pay1.paymentId === 'PAY-TEST-001', '4.1 Payment ID saved');
  assert(pay1.amount === 50000, '4.2 Amount correct');
  assert(pay1.gateway === 'cash', '4.3 Gateway is cash');
  assert(pay1.status === 'initiated', '4.4 Status is initiated');
  assert(pay1.reconciled === false, '4.5 Not reconciled by default');
  assert(pay1.receiptGenerated === false, '4.6 Receipt not generated');

  // Complete
  await pay1.complete({ transactionId: 'TXN-001' });
  assert(pay1.status === 'completed', '4.7 Status changed to completed');
  assert(pay1.completedAt instanceof Date, '4.8 completedAt set');
  assert(pay1.gatewayConfig.transactionId === 'TXN-001', '4.9 Gateway txn ID saved');
  assert(pay1.statusHistory.length === 2, '4.10 Status history updated');

  // Refund
  const pay2 = new InvoicePayment({
    paymentId: 'PAY-TEST-002',
    amount: 25000,
    gateway: 'bank_transfer',
    method: 'bank_transfer',
    status: 'completed',
    completedAt: new Date()
  });
  await pay2.save();

  await pay2.refund(10000, 'Partial refund');
  assert(pay2.status === 'partially_refunded', '4.11 Partial refund status');
  assert(pay2.refundAmount === 10000, '4.12 Refund amount tracked');
  assert(pay2.refundReason === 'Partial refund', '4.13 Refund reason saved');

  // Full refund
  const pay3 = new InvoicePayment({
    paymentId: 'PAY-TEST-003',
    amount: 15000,
    gateway: 'cash',
    method: 'cash',
    status: 'completed'
  });
  await pay3.save();
  await pay3.refund(15000, 'Full refund');
  assert(pay3.status === 'refunded', '4.14 Full refund status');

  // Fail
  const pay4 = new InvoicePayment({
    paymentId: 'PAY-TEST-004',
    amount: 5000,
    gateway: 'stripe',
    method: 'credit_card',
    status: 'initiated'
  });
  await pay4.save();
  await pay4.fail('Card declined');
  assert(pay4.status === 'failed', '4.15 Failed status');
  assert(pay4.failedAt instanceof Date, '4.16 failedAt set');

  // Generate payment ID
  const genPayId = await InvoicePayment.generatePaymentId();
  assert(genPayId.startsWith('PAY-'), '4.17 Generated payment ID format');

  // ================================================================
  // SUITE 5: PaymentReceipt Schema
  // ================================================================
  console.log('\n📋 TEST SUITE 5: PaymentReceipt Schema');
  console.log('─'.repeat(50));
  await clearDB();

  const receipt = new PaymentReceipt({
    receiptId: 'RCT-TEST-001',
    paymentId: 'PAY-001',
    amount: 50000,
    currency: 'AED',
    payerName: 'Test Payer',
    receiptText: 'Test receipt'
  });
  await receipt.save();

  assert(receipt.receiptId === 'RCT-TEST-001', '5.1 Receipt ID saved');
  assert(receipt.amount === 50000, '5.2 Amount correct');
  assert(receipt.format === 'whatsapp', '5.3 Default format is whatsapp');

  const genRctId = await PaymentReceipt.generateReceiptId();
  assert(genRctId.startsWith('RCT-'), '5.4 Generated receipt ID format');

  // ================================================================
  // SUITE 6: ReconciliationLog Schema
  // ================================================================
  console.log('\n📋 TEST SUITE 6: ReconciliationLog Schema');
  console.log('─'.repeat(50));
  await clearDB();

  const recLog = new ReconciliationLog({
    reconciliationId: 'REC-TEST-001',
    type: 'auto',
    paymentId: 'PAY-001',
    invoiceNumber: 'INV-001',
    matchedAmount: 50000,
    matchConfidence: 'exact',
    matchCriteria: ['invoiceNumber'],
    performedBy: 'system'
  });
  await recLog.save();

  assert(recLog.reconciliationId === 'REC-TEST-001', '6.1 Reconciliation ID saved');
  assert(recLog.type === 'auto', '6.2 Type is auto');
  assert(recLog.matchConfidence === 'exact', '6.3 Match confidence');
  assert(recLog.status === 'confirmed', '6.4 Default status confirmed');
  assert(recLog.matchCriteria.includes('invoiceNumber'), '6.5 Match criteria saved');

  const genRecId = await ReconciliationLog.generateReconciliationId();
  assert(genRecId.startsWith('REC-'), '6.6 Generated reconciliation ID format');

  // ================================================================
  // SUITE 7: Service — Create Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 7: Service — Create Invoice');
  console.log('─'.repeat(50));
  await clearDB();

  const r1 = await invoiceService.createInvoice({
    type: 'rent',
    tenantPhone: '971501234567',
    tenantName: 'Test',
    lineItems: [{ description: 'Rent', amount: 60000, category: 'rent' }],
    totalAmount: 60000,
    dueDate: new Date(Date.now() + 30 * 86400000)
  });
  assert(r1.success === true, '7.1 Create invoice success');
  assert(r1.invoiceNumber.startsWith('INV-'), '7.2 Auto-generated number');
  assert(r1.invoice.totalAmount === 60000, '7.3 Amount preserved');
  assert(r1.invoice.status === 'draft', '7.4 Default status draft');

  // Missing required fields
  const r2 = await invoiceService.createInvoice({ type: 'rent' });
  assert(r2.success === false, '7.5 Fails without dueDate');

  // Custom invoice number
  const r3 = await invoiceService.createInvoice({
    invoiceNumber: 'CUSTOM-001',
    type: 'maintenance',
    totalAmount: 5000,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Fix', amount: 5000, category: 'maintenance' }]
  });
  assert(r3.success === true, '7.6 Custom invoice number');
  assert(r3.invoiceNumber === 'CUSTOM-001', '7.7 Number preserved');

  // Duplicate invoice number
  const r4 = await invoiceService.createInvoice({
    invoiceNumber: 'CUSTOM-001',
    type: 'rent',
    totalAmount: 1000,
    dueDate: new Date()
  });
  assert(r4.success === false, '7.8 Duplicate number rejected');

  // ================================================================
  // SUITE 8: Service — Get & List Invoices
  // ================================================================
  console.log('\n📋 TEST SUITE 8: Service — Get & List Invoices');
  console.log('─'.repeat(50));

  const g1 = await invoiceService.getInvoice(r1.invoiceNumber);
  assert(g1.success === true, '8.1 Get by number');
  assert(g1.invoice.invoiceNumber === r1.invoiceNumber, '8.2 Correct invoice returned');

  const g2 = await invoiceService.getInvoice(r1.invoice._id.toString());
  assert(g2.success === true, '8.3 Get by ObjectId');

  const g3 = await invoiceService.getInvoice('NON-EXISTENT');
  assert(g3.success === false, '8.4 Not found returns error');

  const l1 = await invoiceService.listInvoices({});
  assert(l1.success === true, '8.5 List all invoices');
  assert(l1.invoices.length >= 2, '8.6 Multiple invoices returned');
  assert(typeof l1.summary.totalAmount === 'number', '8.7 Summary has totalAmount');

  const l2 = await invoiceService.listInvoices({ tenantPhone: '971501234567' });
  assert(l2.success === true, '8.8 Filter by tenant');
  assert(l2.invoices.every(i => i.tenantPhone === '971501234567'), '8.9 All match tenant');

  const l3 = await invoiceService.listInvoices({ type: 'maintenance' });
  assert(l3.invoices.every(i => i.type === 'maintenance'), '8.10 Filter by type');

  const l4 = await invoiceService.listInvoices({ limit: 1 });
  assert(l4.invoices.length === 1, '8.11 Limit respected');

  // ================================================================
  // SUITE 9: Service — Update & Cancel Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 9: Service — Update & Cancel Invoice');
  console.log('─'.repeat(50));

  const u1 = await invoiceService.updateInvoice(r1.invoiceNumber, { notes: 'Updated' });
  assert(u1.success === true, '9.1 Update success');
  assert(u1.invoice.notes === 'Updated', '9.2 Notes updated');

  // Cancel
  const c1 = await invoiceService.cancelInvoice('CUSTOM-001', 'Testing');
  assert(c1.success === true, '9.3 Cancel success');
  assert(c1.invoice.status === 'cancelled', '9.4 Status is cancelled');
  assert(c1.invoice.internalNotes.includes('Testing'), '9.5 Reason recorded');

  // Cannot update cancelled
  const u2 = await invoiceService.updateInvoice('CUSTOM-001', { notes: 'Try' });
  assert(u2.success === false, '9.6 Cannot update cancelled');

  // Cannot cancel paid
  const paidInv = await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 1000,
    dueDate: new Date(),
    lineItems: [{ description: 'Test', amount: 1000, category: 'rent' }]
  });
  paidInv.invoice.paidAmount = 1000;
  paidInv.invoice.status = 'paid';
  await paidInv.invoice.save();
  const c2 = await invoiceService.cancelInvoice(paidInv.invoiceNumber, 'Try');
  assert(c2.success === false, '9.7 Cannot cancel paid');

  // Update not found
  const u3 = await invoiceService.updateInvoice('NONEXISTENT', { notes: 'x' });
  assert(u3.success === false, '9.8 Update not found');

  // ================================================================
  // SUITE 10: Service — Send Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 10: Service — Send Invoice');
  console.log('─'.repeat(50));
  await clearDB();

  const sendR = await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 30000,
    dueDate: new Date(Date.now() + 14 * 86400000),
    lineItems: [{ description: 'Rent', amount: 30000, category: 'rent' }]
  });

  const s1 = await invoiceService.sendInvoice(sendR.invoiceNumber, ['whatsapp']);
  assert(s1.success === true, '10.1 Send success');
  assert(s1.invoice.status === 'sent', '10.2 Status updated to sent');
  assert(s1.invoice.sentVia.includes('whatsapp'), '10.3 Sent via whatsapp');

  const s2 = await invoiceService.sendInvoice('NONEXISTENT');
  assert(s2.success === false, '10.4 Send not found');

  // ================================================================
  // SUITE 11: Service — Payment Processing
  // ================================================================
  console.log('\n📋 TEST SUITE 11: Service — Payment Processing');
  console.log('─'.repeat(50));
  await clearDB();

  const payInv = await invoiceService.createInvoice({
    type: 'rent',
    tenantPhone: '971501111111',
    tenantName: 'Payer',
    totalAmount: 100000,
    dueDate: new Date(Date.now() + 30 * 86400000),
    lineItems: [{ description: 'Rent', amount: 100000, category: 'rent' }]
  });

  // Cash payment (auto-completes)
  const p1 = await invoiceService.initiatePayment({
    invoiceNumber: payInv.invoiceNumber,
    amount: 50000,
    gateway: 'cash',
    method: 'cash',
    payerPhone: '971501111111'
  });
  assert(p1.success === true, '11.1 Payment initiated');
  assert(p1.payment.status === 'completed', '11.2 Cash auto-completed');
  assert(p1.payment.amount === 50000, '11.3 Amount correct');
  assert(p1.payment.paymentId.startsWith('PAY-'), '11.4 Payment ID generated');

  // Check invoice updated
  const checkInv = await invoiceService.getInvoice(payInv.invoiceNumber);
  assert(checkInv.invoice.paidAmount === 50000, '11.5 Invoice paid amount updated');
  assert(checkInv.invoice.status === 'partially_paid', '11.6 Invoice partially paid');

  // Second payment to complete
  const p2 = await invoiceService.initiatePayment({
    invoiceNumber: payInv.invoiceNumber,
    gateway: 'bank_transfer',
    method: 'bank_transfer'
    // No amount = pay remaining balance
  });
  assert(p2.success === true, '11.7 Second payment success');
  assert(p2.payment.amount === 50000, '11.8 Remaining balance paid');

  const checkInv2 = await invoiceService.getInvoice(payInv.invoiceNumber);
  assert(checkInv2.invoice.paidAmount === 100000, '11.9 Fully paid');
  assert(checkInv2.invoice.status === 'paid', '11.10 Status is paid');

  // Cannot pay a paid invoice
  const p3 = await invoiceService.initiatePayment({
    invoiceNumber: payInv.invoiceNumber,
    amount: 1000,
    gateway: 'cash',
    method: 'cash'
  });
  assert(p3.success === false, '11.11 Cannot pay paid invoice');

  // Cannot overpay
  const payInv2 = await invoiceService.createInvoice({
    type: 'maintenance',
    totalAmount: 5000,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Fix', amount: 5000, category: 'maintenance' }]
  });
  const p4 = await invoiceService.initiatePayment({
    invoiceNumber: payInv2.invoiceNumber,
    amount: 10000,
    gateway: 'cash',
    method: 'cash'
  });
  assert(p4.success === false, '11.12 Cannot overpay');

  // Pay non-existent invoice
  const p5 = await invoiceService.initiatePayment({
    invoiceNumber: 'FAKE-001',
    amount: 100,
    gateway: 'cash',
    method: 'cash'
  });
  assert(p5.success === false, '11.13 Non-existent invoice rejected');

  // ================================================================
  // SUITE 12: Service — Receipt Generation
  // ================================================================
  console.log('\n📋 TEST SUITE 12: Service — Receipt Generation');
  console.log('─'.repeat(50));

  // Receipt should have been auto-generated for p1
  assert(p1.receipt !== undefined, '12.1 Receipt auto-generated');

  const rr1 = await invoiceService.getReceiptByPayment(p1.payment.paymentId);
  assert(rr1.success === true, '12.2 Receipt found by payment ID');
  assert(rr1.receipt.receiptText.includes('PAYMENT RECEIPT'), '12.3 Receipt text formatted');
  assert(rr1.receipt.amount === 50000, '12.4 Receipt amount correct');
  assert(rr1.receipt.receiptId.startsWith('RCT-'), '12.5 Receipt ID format');

  const rr2 = await invoiceService.getReceipt(rr1.receipt.receiptId);
  assert(rr2.success === true, '12.6 Get receipt by ID');

  const rr3 = await invoiceService.getReceiptByPayment('FAKE-PAY');
  assert(rr3.success === false, '12.7 Receipt not found for fake payment');

  // ================================================================
  // SUITE 13: Service — Refund Processing
  // ================================================================
  console.log('\n📋 TEST SUITE 13: Service — Refund Processing');
  console.log('─'.repeat(50));
  await clearDB();

  // Create and pay an invoice
  const refInv = await invoiceService.createInvoice({
    type: 'deposit',
    totalAmount: 20000,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Security Deposit', amount: 20000, category: 'deposit' }]
  });
  const refPay = await invoiceService.initiatePayment({
    invoiceNumber: refInv.invoiceNumber,
    amount: 20000,
    gateway: 'cash',
    method: 'cash'
  });

  // Partial refund
  const ref1 = await invoiceService.processRefund(refPay.payment.paymentId, {
    amount: 5000,
    reason: 'Partial refund test'
  });
  assert(ref1.success === true, '13.1 Partial refund success');
  assert(ref1.payment.refundAmount === 5000, '13.2 Refund amount correct');
  assert(ref1.payment.status === 'partially_refunded', '13.3 Status partially_refunded');
  assert(ref1.invoice.paidAmount === 15000, '13.4 Invoice paid reduced');

  // Cannot refund more than paid
  const ref2 = await invoiceService.processRefund(refPay.payment.paymentId, { amount: 50000 });
  assert(ref2.success === false, '13.5 Cannot refund more than paid');

  // Refund non-existent
  const ref3 = await invoiceService.processRefund('FAKE-PAY');
  assert(ref3.success === false, '13.6 Non-existent payment');

  // Full refund on another payment
  const refInv2 = await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 10000,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Rent', amount: 10000, category: 'rent' }]
  });
  const refPay2 = await invoiceService.initiatePayment({
    invoiceNumber: refInv2.invoiceNumber,
    gateway: 'cash',
    method: 'cash'
  });
  const ref4 = await invoiceService.processRefund(refPay2.payment.paymentId, { reason: 'Full refund' });
  assert(ref4.success === true, '13.7 Full refund success');
  assert(ref4.payment.status === 'refunded', '13.8 Full refund status');
  assert(ref4.invoice.status === 'refunded', '13.9 Invoice marked refunded');

  // ================================================================
  // SUITE 14: Service — Overdue & Upcoming
  // ================================================================
  console.log('\n📋 TEST SUITE 14: Service — Overdue & Upcoming');
  console.log('─'.repeat(50));
  await clearDB();

  // Create overdue invoices
  await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 50000,
    dueDate: new Date(Date.now() - 5 * 86400000),
    status: 'sent',
    lineItems: [{ description: 'Rent', amount: 50000, category: 'rent' }]
  });
  await invoiceService.createInvoice({
    type: 'service_charge',
    totalAmount: 8000,
    dueDate: new Date(Date.now() - 45 * 86400000),
    status: 'sent',
    lineItems: [{ description: 'SC', amount: 8000, category: 'service_charge' }]
  });

  // Create upcoming
  await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 55000,
    dueDate: new Date(Date.now() + 3 * 86400000),
    status: 'sent',
    lineItems: [{ description: 'Rent', amount: 55000, category: 'rent' }]
  });

  const od = await invoiceService.getOverdueInvoices();
  assert(od.success === true, '14.1 Overdue query success');
  assert(od.overdue.length >= 2, '14.2 Found overdue invoices');
  assert(od.summary.totalOverdue > 0, '14.3 Total overdue amount');
  assert(typeof od.summary.byDaysOverdue.under7 === 'number', '14.4 Days breakdown exists');

  const up = await invoiceService.getUpcomingInvoices(7);
  assert(up.success === true, '14.5 Upcoming query success');
  assert(up.upcoming.length >= 1, '14.6 Found upcoming invoices');
  assert(up.totalDue > 0, '14.7 Total due amount');

  // ================================================================
  // SUITE 15: Service — Reconciliation
  // ================================================================
  console.log('\n📋 TEST SUITE 15: Service — Reconciliation');
  console.log('─'.repeat(50));
  await clearDB();

  // Create invoice and payment
  const recInv = await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 70000,
    dueDate: new Date(Date.now() + 14 * 86400000),
    lineItems: [{ description: 'Rent', amount: 70000, category: 'rent' }]
  });
  const recPay = await invoiceService.initiatePayment({
    invoiceNumber: recInv.invoiceNumber,
    amount: 70000,
    gateway: 'cash',
    method: 'cash'
  });

  // Auto-reconcile
  const ar = await invoiceService.autoReconcile();
  assert(ar.success === true, '15.1 Auto-reconcile success');
  // The cash payment was auto-completed and should have invoiceNumber
  assert(typeof ar.matched === 'number', '15.2 Matched count returned');
  assert(typeof ar.failed === 'number', '15.3 Failed count returned');

  // Manual reconcile
  const manInv = await invoiceService.createInvoice({
    type: 'maintenance',
    totalAmount: 3000,
    dueDate: new Date(),
    lineItems: [{ description: 'Fix', amount: 3000, category: 'maintenance' }]
  });
  const manPay = new InvoicePayment({
    paymentId: 'PAY-MANUAL-001',
    amount: 3000,
    gateway: 'bank_transfer',
    method: 'bank_transfer',
    status: 'completed',
    completedAt: new Date()
  });
  await manPay.save();

  const mr = await invoiceService.manualReconcile('PAY-MANUAL-001', manInv.invoiceNumber, 'admin');
  assert(mr.success === true, '15.4 Manual reconcile success');
  assert(mr.reconciliation.type === 'manual', '15.5 Type is manual');
  assert(mr.reconciliation.matchConfidence === 'forced', '15.6 Confidence is forced');

  // History
  const rh = await invoiceService.getReconciliationHistory({});
  assert(rh.success === true, '15.7 Reconciliation history success');
  assert(rh.logs.length >= 1, '15.8 History has entries');

  // ================================================================
  // SUITE 16: Service — Revenue Report
  // ================================================================
  console.log('\n📋 TEST SUITE 16: Service — Revenue Report');
  console.log('─'.repeat(50));

  const rev = await invoiceService.getRevenueReport({});
  assert(rev.success === true, '16.1 Revenue report success');
  assert(typeof rev.report.invoices.total === 'number', '16.2 Invoice count');
  assert(typeof rev.report.invoices.totalInvoiced === 'number', '16.3 Total invoiced');
  assert(typeof rev.report.payments.totalCollected === 'number', '16.4 Total collected');
  assert(typeof rev.report.byType === 'object', '16.5 ByType breakdown');
  assert(typeof rev.report.byGateway === 'object', '16.6 ByGateway breakdown');
  assert(rev.report.period.start instanceof Date, '16.7 Period start');
  assert(rev.report.period.end instanceof Date, '16.8 Period end');

  // ================================================================
  // SUITE 17: Service — Outstanding Report & Tenant History
  // ================================================================
  console.log('\n📋 TEST SUITE 17: Service — Outstanding & Tenant History');
  console.log('─'.repeat(50));
  await clearDB();
  await seedInvoices();

  const out = await invoiceService.getOutstandingReport();
  assert(out.success === true, '17.1 Outstanding report success');
  assert(typeof out.outstanding.totalInvoices === 'number', '17.2 Total invoices count');
  assert(typeof out.outstanding.totalOutstanding === 'number', '17.3 Total outstanding');

  const th = await invoiceService.getTenantPaymentHistory('971501111111');
  assert(th.success === true, '17.4 Tenant history success');
  assert(th.tenant.phone === '971501111111', '17.5 Correct tenant');
  assert(typeof th.tenant.totalInvoiced === 'number', '17.6 Total invoiced');
  assert(Array.isArray(th.invoices), '17.7 Invoices array');
  assert(Array.isArray(th.payments), '17.8 Payments array');

  // ================================================================
  // SUITE 18: Service — Recurring Invoices
  // ================================================================
  console.log('\n📋 TEST SUITE 18: Service — Recurring Invoices');
  console.log('─'.repeat(50));
  await clearDB();

  const ri = await invoiceService.createRecurringInvoice({
    type: 'rent',
    tenantPhone: '971501111111',
    totalAmount: 60000,
    dueDate: new Date(Date.now() - 86400000), // Yesterday (due for processing)
    nextDate: new Date(Date.now() - 86400000),
    frequency: 'monthly',
    autoSend: true,
    lineItems: [{ description: 'Monthly Rent', amount: 60000, category: 'rent' }]
  });
  assert(ri.success === true, '18.1 Recurring invoice created');
  assert(ri.invoice.isRecurring === true, '18.2 Is recurring');
  assert(ri.invoice.recurringConfig.frequency === 'monthly', '18.3 Frequency monthly');
  assert(ri.invoice.recurringConfig.autoSend === true, '18.4 Auto-send enabled');

  // Process recurring
  const pr = await invoiceService.processRecurringInvoices();
  assert(pr.success === true, '18.5 Process recurring success');
  assert(pr.generated >= 1, '18.6 At least 1 generated');
  assert(pr.invoices[0].isRecurring === false, '18.7 Generated copy not recurring');
  assert(pr.invoices[0].status === 'sent', '18.8 Auto-sent');

  // Verify next date updated
  const updatedTemplate = await Invoice.findById(ri.invoice._id);
  assert(updatedTemplate.recurringConfig.nextDate > new Date(), '18.9 Next date advanced');

  // ================================================================
  // SUITE 19: Service — Quick Stats
  // ================================================================
  console.log('\n📋 TEST SUITE 19: Service — Quick Stats');
  console.log('─'.repeat(50));

  const qs = await invoiceService.getQuickStats();
  assert(typeof qs === 'string', '19.1 Returns string');
  assert(qs.includes('INVOICE'), '19.2 Contains INVOICE');
  assert(qs.includes('Payments'), '19.3 Contains Payments');
  assert(qs.includes('Financials'), '19.4 Contains Financials');
  assert(qs.includes('AED'), '19.5 Contains currency');

  // ================================================================
  // SUITE 20: Service — Payment Get & List
  // ================================================================
  console.log('\n📋 TEST SUITE 20: Service — Payment Get & List');
  console.log('─'.repeat(50));
  await clearDB();

  // Create some payments
  const plInv = await invoiceService.createInvoice({
    type: 'rent',
    tenantPhone: '971509999999',
    totalAmount: 40000,
    dueDate: new Date(Date.now() + 14 * 86400000),
    lineItems: [{ description: 'Rent', amount: 40000, category: 'rent' }]
  });
  const plPay = await invoiceService.initiatePayment({
    invoiceNumber: plInv.invoiceNumber,
    amount: 20000,
    gateway: 'cash',
    method: 'cash',
    payerPhone: '971509999999'
  });

  const gp = await invoiceService.getPayment(plPay.payment.paymentId);
  assert(gp.success === true, '20.1 Get payment success');
  assert(gp.payment.amount === 20000, '20.2 Correct amount');

  const gpFake = await invoiceService.getPayment('FAKE');
  assert(gpFake.success === false, '20.3 Fake payment not found');

  const lp = await invoiceService.listPayments({ payerPhone: '971509999999' });
  assert(lp.success === true, '20.4 List payments success');
  assert(lp.payments.length >= 1, '20.5 Payments returned');
  assert(typeof lp.summary.total === 'number', '20.6 Summary total');
  assert(typeof lp.summary.completed === 'number', '20.7 Summary completed');

  const lpGateway = await invoiceService.listPayments({ gateway: 'cash' });
  assert(lpGateway.payments.every(p => p.gateway === 'cash'), '20.8 Filter by gateway');

  // Fail payment flow
  const failInv = await invoiceService.createInvoice({
    type: 'rent',
    totalAmount: 10000,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Rent', amount: 10000, category: 'rent' }]
  });
  // Create a stripe payment (won't auto-complete)
  const stripePay = new InvoicePayment({
    paymentId: 'PAY-STRIPE-001',
    invoiceId: failInv.invoice._id,
    invoiceNumber: failInv.invoiceNumber,
    amount: 10000,
    gateway: 'stripe',
    method: 'credit_card',
    status: 'pending'
  });
  await stripePay.save();

  const fp = await invoiceService.failPayment('PAY-STRIPE-001', 'Card declined');
  assert(fp.success === true, '20.9 Fail payment success');
  assert(fp.payment.status === 'failed', '20.10 Status is failed');

  const fpFake = await invoiceService.failPayment('FAKE');
  assert(fpFake.success === false, '20.11 Fail non-existent');

  // Complete payment flow
  const compPay = new InvoicePayment({
    paymentId: 'PAY-COMP-001',
    invoiceId: failInv.invoice._id,
    invoiceNumber: failInv.invoiceNumber,
    amount: 10000,
    gateway: 'paytabs',
    method: 'credit_card',
    status: 'pending'
  });
  await compPay.save();

  const cp = await invoiceService.completePayment('PAY-COMP-001', { transactionId: 'PT-12345' });
  assert(cp.success === true, '20.12 Complete payment success');
  assert(cp.payment.status === 'completed', '20.13 Status completed');
  assert(cp.receipt !== null, '20.14 Receipt generated on complete');

  // Already completed
  const cp2 = await invoiceService.completePayment('PAY-COMP-001');
  assert(cp2.success === true, '20.15 Already completed returns success');
  assert(cp2.message === 'Already completed', '20.16 Already completed message');

  // ================================================================
  // SUITE 21: Bot Commands — Basics
  // ================================================================
  console.log('\n📋 TEST SUITE 21: Bot Commands — Basics');
  console.log('─'.repeat(50));
  await clearDB();

  const cmds = InvoiceCommands.getCommands();
  assert(Object.keys(cmds).length === 12, '21.1 12 commands defined');
  assert('!create-invoice' in cmds, '21.2 create-invoice exists');
  assert('!pay-invoice' in cmds, '21.3 pay-invoice exists');
  assert('!invoice-stats' in cmds, '21.4 invoice-stats exists');

  // Unknown command
  const unk = await InvoiceCommands.handle('!unknown', '', {});
  assert(unk.includes('Unknown command'), '21.5 Unknown command handled');

  // ================================================================
  // SUITE 22: Bot Commands — Create Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 22: Bot Commands — Create Invoice');
  console.log('─'.repeat(50));

  // Help text
  const help = await InvoiceCommands.handle('!create-invoice', '', {});
  assert(help.includes('CREATE INVOICE'), '22.1 Help text shown');
  assert(help.includes('type'), '22.2 Help includes type');

  // Create
  const ci = await InvoiceCommands.handle('!create-invoice',
    'type=rent|amount=85000|tenant=971501111111|property=PROP-001|due=2026-04-01',
    { senderPhone: '971509999999' }
  );
  assert(ci.includes('INVOICE CREATED'), '22.3 Invoice created via bot');
  assert(ci.includes('INV-'), '22.4 Invoice number in response');
  assert(ci.includes('85,000'), '22.5 Amount formatted');

  // ================================================================
  // SUITE 23: Bot Commands — View & List Invoices
  // ================================================================
  console.log('\n📋 TEST SUITE 23: Bot Commands — View & List Invoices');
  console.log('─'.repeat(50));

  // Extract invoice number from creation response
  const invMatch = ci.match(/INV-\d{4}-\d{5}/);
  const createdInvNum = invMatch ? invMatch[0] : '';

  // View
  const vi = await InvoiceCommands.handle('!invoice', createdInvNum, {});
  assert(vi.includes('INVOICE:'), '23.1 Invoice details shown');
  assert(vi.includes('DRAFT'), '23.2 Status shown');
  assert(vi.includes('rent'), '23.3 Type shown');

  // View without args
  const vi2 = await InvoiceCommands.handle('!invoice', '', {});
  assert(vi2.includes('Usage'), '23.4 Usage shown without args');

  // My invoices
  const mi = await InvoiceCommands.handle('!my-invoices',
    'tenant=971501111111', { senderPhone: '971501111111' });
  assert(mi.includes('INVOICES FOR'), '23.5 Invoice list shown');

  // No invoices for unknown
  const mi2 = await InvoiceCommands.handle('!my-invoices',
    'tenant=000000000', {});
  assert(mi2.includes('No invoices'), '23.6 No invoices message');

  // ================================================================
  // SUITE 24: Bot Commands — Send Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 24: Bot Commands — Send Invoice');
  console.log('─'.repeat(50));

  const si = await InvoiceCommands.handle('!send-invoice', createdInvNum, {});
  assert(si.includes('INVOICE SENT'), '24.1 Invoice sent');
  assert(si.includes('WhatsApp'), '24.2 Sent via WhatsApp');

  const si2 = await InvoiceCommands.handle('!send-invoice', '', {});
  assert(si2.includes('Usage'), '24.3 Usage without args');

  const si3 = await InvoiceCommands.handle('!send-invoice', 'FAKE-001', {});
  assert(si3.includes('not found') || si3.includes('❌'), '24.4 Not found handled');

  // ================================================================
  // SUITE 25: Bot Commands — Pay Invoice
  // ================================================================
  console.log('\n📋 TEST SUITE 25: Bot Commands — Pay Invoice');
  console.log('─'.repeat(50));

  // Help
  const ph = await InvoiceCommands.handle('!pay-invoice', '', {});
  assert(ph.includes('PAY INVOICE'), '25.1 Payment help shown');

  // Pay
  const pi = await InvoiceCommands.handle('!pay-invoice',
    `${createdInvNum}|amount=85000|method=cash`,
    { senderPhone: '971501111111' }
  );
  assert(pi.includes('PAYMENT PROCESSED'), '25.2 Payment processed');
  assert(pi.includes('PAY-'), '25.3 Payment ID shown');

  // ================================================================
  // SUITE 26: Bot Commands — Payment Status & Receipt
  // ================================================================
  console.log('\n📋 TEST SUITE 26: Bot Commands — Payment Status & Receipt');
  console.log('─'.repeat(50));

  // Extract payment ID
  const payMatch = pi.match(/PAY-\d{4}-\d{6}/);
  const payId = payMatch ? payMatch[0] : '';

  const ps = await InvoiceCommands.handle('!payment-status', payId, {});
  assert(ps.includes('PAYMENT:'), '26.1 Payment status shown');
  assert(ps.includes('COMPLETED'), '26.2 Status is completed');

  const ps2 = await InvoiceCommands.handle('!payment-status', '', {});
  assert(ps2.includes('Usage'), '26.3 Usage without args');

  const pr2 = await InvoiceCommands.handle('!payment-receipt', payId, {});
  assert(pr2.includes('PAYMENT RECEIPT'), '26.4 Receipt text shown');

  const pr3 = await InvoiceCommands.handle('!payment-receipt', '', {});
  assert(pr3.includes('Usage'), '26.5 Usage without args');

  // ================================================================
  // SUITE 27: Bot Commands — Overdue, Revenue, Stats, Reconcile
  // ================================================================
  console.log('\n📋 TEST SUITE 27: Bot Commands — Overdue, Revenue, Stats, Reconcile');
  console.log('─'.repeat(50));

  const od2 = await InvoiceCommands.handle('!overdue-invoices', '', {});
  assert(od2.includes('overdue') || od2.includes('No overdue'), '27.1 Overdue response');

  const rr = await InvoiceCommands.handle('!revenue-report', '', {});
  assert(rr.includes('REVENUE REPORT'), '27.2 Revenue report shown');
  assert(rr.includes('Invoices'), '27.3 Has invoices section');
  assert(rr.includes('Payments'), '27.4 Has payments section');

  const is = await InvoiceCommands.handle('!invoice-stats', '', {});
  assert(is.includes('INVOICE'), '27.5 Stats shown');
  assert(is.includes('AED'), '27.6 Currency in stats');

  const rc = await InvoiceCommands.handle('!reconcile', '', {});
  assert(rc.includes('RECONCILIATION'), '27.7 Reconciliation response');

  // ================================================================
  // SUITE 28: Bot Commands — Refund
  // ================================================================
  console.log('\n📋 TEST SUITE 28: Bot Commands — Refund');
  console.log('─'.repeat(50));

  // Help
  const rfh = await InvoiceCommands.handle('!refund-payment', '', {});
  assert(rfh.includes('REFUND PAYMENT'), '28.1 Refund help shown');

  // Refund
  const rf = await InvoiceCommands.handle('!refund-payment',
    `${payId}|amount=10000|reason=Test refund`, {});
  assert(rf.includes('REFUND PROCESSED'), '28.2 Refund processed');
  assert(rf.includes('10,000'), '28.3 Refund amount shown');

  // ================================================================
  // SUITE 29: Bot Commands — Argument Parsing
  // ================================================================
  console.log('\n📋 TEST SUITE 29: Bot Commands — Argument Parsing');
  console.log('─'.repeat(50));

  const p29 = InvoiceCommands._parseArgs('type=rent|amount=50000|tenant=971501234567');
  assert(p29.type === 'rent', '29.1 Type parsed');
  assert(p29.amount === '50000', '29.2 Amount parsed');
  assert(p29.tenant === '971501234567', '29.3 Tenant parsed');

  const p29b = InvoiceCommands._parseArgs('INV-2026-00001|amount=25000');
  assert(p29b._positional === 'INV-2026-00001', '29.4 Positional parsed');
  assert(p29b.amount === '25000', '29.5 Named arg after positional');

  const p29c = InvoiceCommands._parseArgs('');
  assert(Object.keys(p29c).length === 0, '29.6 Empty returns empty');

  const p29d = InvoiceCommands._parseArgs(null);
  assert(Object.keys(p29d).length === 0, '29.7 Null returns empty');

  const p29e = InvoiceCommands._parseArgs('  type = rent | amount = 50000 ');
  assert(p29e.type === 'rent', '29.8 Spaces trimmed (key)');
  assert(p29e.amount === '50000', '29.9 Spaces trimmed (value)');

  // ================================================================
  // SUITE 30: Edge Cases & Error Resilience
  // ================================================================
  console.log('\n📋 TEST SUITE 30: Edge Cases & Error Resilience');
  console.log('─'.repeat(50));
  await clearDB();

  // Zero amount invoice
  const e1 = await invoiceService.createInvoice({
    type: 'other',
    totalAmount: 0,
    dueDate: new Date(Date.now() + 7 * 86400000),
    lineItems: [{ description: 'Free service', amount: 0, category: 'other' }]
  });
  assert(e1.success === true, '30.1 Zero amount allowed');

  // Stats on empty DB
  const e2 = await invoiceService.getQuickStats();
  assert(typeof e2 === 'string', '30.2 Stats on empty DB returns string');

  // Revenue report on empty DB
  const e3 = await invoiceService.getRevenueReport({});
  assert(e3.success === true, '30.3 Revenue report on empty DB');
  assert(e3.report.invoices.total >= 0, '30.4 Zero invoices OK');

  // Outstanding on empty DB
  const e4 = await invoiceService.getOutstandingReport();
  assert(e4.success === true, '30.5 Outstanding on empty DB');

  // Overdue on empty DB
  const e5 = await invoiceService.getOverdueInvoices();
  assert(e5.success === true, '30.6 Overdue on empty DB');

  // Upcoming on empty DB
  const e6 = await invoiceService.getUpcomingInvoices(7);
  assert(e6.success === true, '30.7 Upcoming on empty DB');

  // Reconciliation on empty DB
  const e7 = await invoiceService.autoReconcile();
  assert(e7.success === true, '30.8 Reconcile on empty DB');

  // Process recurring on empty DB
  const e8 = await invoiceService.processRecurringInvoices();
  assert(e8.success === true, '30.9 Recurring on empty DB');
  assert(e8.generated === 0, '30.10 Zero generated');

  // List with no results
  const e9 = await invoiceService.listPayments({ payerPhone: 'nonexistent' });
  assert(e9.success === true, '30.11 Empty payment list OK');
  assert(e9.payments.length === 0, '30.12 No payments');

  // Tenant history with no data
  const e10 = await invoiceService.getTenantPaymentHistory('000000000');
  assert(e10.success === true, '30.13 Empty tenant history OK');

  // ================================================================
  // SUMMARY
  // ================================================================
  await teardown();

  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Rate:   ${total > 0 ? Math.round(passed / total * 100) : 0}%`);

  if (failures.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failures) {
      console.log(`    ❌ ${f}`);
    }
  }

  console.log('═'.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ Test suite crashed:', err);
  process.exit(1);
});
