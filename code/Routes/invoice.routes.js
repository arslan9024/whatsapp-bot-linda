/**
 * ========================================================================
 * INVOICE & PAYMENT API ROUTES
 * Phase 5: Feature 4 – Payment & Invoice Management
 * ========================================================================
 *
 * Base path: /api/invoices
 *
 * Endpoints:
 *   Invoices  (8)  — CRUD, send, cancel, overdue, upcoming
 *   Payments  (7)  — Initiate, complete, fail, refund, list, receipt
 *   Reconcile (3)  — Auto, manual, history
 *   Reports   (3)  — Revenue, outstanding, tenant history
 *   Utility   (2)  — Quick stats, generate from tenancy
 *
 *   Total: 23 endpoints
 *
 * @module InvoiceRoutes
 * @since Phase 5 Feature 4 – February 2026
 */

import { Router } from 'express';
import invoiceService from '../Services/InvoicePaymentService.js';

const router = Router();

// ====================================================================
// INVOICES — CRUD
// ====================================================================

// POST /api/invoices — Create invoice
router.post('/', async (req, res) => {
  try {
    const result = await invoiceService.createInvoice(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices — List invoices
router.get('/', async (req, res) => {
  try {
    const result = await invoiceService.listInvoices(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/overdue — Get overdue invoices
router.get('/overdue', async (req, res) => {
  try {
    const result = await invoiceService.getOverdueInvoices();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/upcoming — Get upcoming invoices
router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await invoiceService.getUpcomingInvoices(days);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/quick-stats — Bot-friendly text stats
router.get('/quick-stats', async (req, res) => {
  try {
    const text = await invoiceService.getQuickStats();
    res.json({ success: true, stats: text });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/:id — Get invoice by ID or number
router.get('/:id', async (req, res) => {
  try {
    const result = await invoiceService.getInvoice(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/invoices/:id — Update invoice
router.put('/:id', async (req, res) => {
  try {
    const result = await invoiceService.updateInvoice(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/:id/send — Send invoice (WhatsApp/email)
router.post('/:id/send', async (req, res) => {
  try {
    const channels = req.body.channels || ['whatsapp'];
    const result = await invoiceService.sendInvoice(req.params.id, channels);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/:id/cancel — Cancel invoice
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await invoiceService.cancelInvoice(req.params.id, req.body.reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// AUTO-GENERATION
// ====================================================================

// POST /api/invoices/generate/tenancy — Generate from tenancy cheques
router.post('/generate/tenancy', async (req, res) => {
  try {
    const result = await invoiceService.generateFromTenancy(req.body.tenancyId);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/recurring — Create recurring invoice template
router.post('/recurring', async (req, res) => {
  try {
    const result = await invoiceService.createRecurringInvoice(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/recurring/process — Process due recurring invoices
router.post('/recurring/process', async (req, res) => {
  try {
    const result = await invoiceService.processRecurringInvoices();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// PAYMENTS
// ====================================================================

// POST /api/invoices/payments — Initiate a payment
router.post('/payments', async (req, res) => {
  try {
    const result = await invoiceService.initiatePayment(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/payments — List payments
router.get('/payments', async (req, res) => {
  try {
    const result = await invoiceService.listPayments(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Note: /payments must come BEFORE /:id so it matches first

// GET /api/invoices/payments/:paymentId — Get payment details
router.get('/payments/:paymentId', async (req, res) => {
  try {
    const result = await invoiceService.getPayment(req.params.paymentId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/payments/:paymentId/complete — Complete payment
router.post('/payments/:paymentId/complete', async (req, res) => {
  try {
    const result = await invoiceService.completePayment(req.params.paymentId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/payments/:paymentId/fail — Fail payment
router.post('/payments/:paymentId/fail', async (req, res) => {
  try {
    const result = await invoiceService.failPayment(req.params.paymentId, req.body.reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/payments/:paymentId/refund — Refund payment
router.post('/payments/:paymentId/refund', async (req, res) => {
  try {
    const result = await invoiceService.processRefund(req.params.paymentId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/payments/:paymentId/receipt — Get receipt
router.get('/payments/:paymentId/receipt', async (req, res) => {
  try {
    const result = await invoiceService.getReceiptByPayment(req.params.paymentId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// RECONCILIATION
// ====================================================================

// POST /api/invoices/reconcile/auto — Auto-reconcile
router.post('/reconcile/auto', async (req, res) => {
  try {
    const result = await invoiceService.autoReconcile();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/invoices/reconcile/manual — Manual reconciliation
router.post('/reconcile/manual', async (req, res) => {
  try {
    const { paymentId, invoiceNumber, performedBy } = req.body;
    const result = await invoiceService.manualReconcile(paymentId, invoiceNumber, performedBy);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/reconcile/history — Reconciliation history
router.get('/reconcile/history', async (req, res) => {
  try {
    const result = await invoiceService.getReconciliationHistory(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ====================================================================
// REPORTS
// ====================================================================

// GET /api/invoices/reports/revenue — Revenue report
router.get('/reports/revenue', async (req, res) => {
  try {
    const result = await invoiceService.getRevenueReport(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/reports/outstanding — Outstanding balances
router.get('/reports/outstanding', async (req, res) => {
  try {
    const result = await invoiceService.getOutstandingReport();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices/reports/tenant/:phone — Tenant payment history
router.get('/reports/tenant/:phone', async (req, res) => {
  try {
    const result = await invoiceService.getTenantPaymentHistory(req.params.phone, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
