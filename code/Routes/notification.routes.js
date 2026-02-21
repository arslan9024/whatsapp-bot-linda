/**
 * ========================================================================
 * NOTIFICATION API ROUTES
 * Phase 5: Feature 5 – Automated Notifications System
 * ========================================================================
 *
 * 22 RESTful endpoints for managing notification rules, notifications,
 * delivery processing, analytics, and system operations.
 *
 * Base path: /api/notifications
 *
 * @module notification.routes
 * @since Phase 5 Feature 5 – February 2026
 */

import { Router } from 'express';
import notificationService from '../Services/NotificationService.js';

const router = Router();

// ================================================================
//  RULE MANAGEMENT
// ================================================================

// POST /api/notifications/rules — Create a notification rule
router.post('/rules', async (req, res) => {
  try {
    const result = await notificationService.createRule(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/rules — List all rules
router.get('/rules', async (req, res) => {
  try {
    const result = await notificationService.listRules(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/rules/:id — Get a specific rule
router.get('/rules/:id', async (req, res) => {
  try {
    const result = await notificationService.getRule(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/notifications/rules/:id — Update a rule
router.put('/rules/:id', async (req, res) => {
  try {
    const result = await notificationService.updateRule(req.params.id, req.body);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notifications/rules/:id — Delete a rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const result = await notificationService.deleteRule(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/rules/:id/toggle — Toggle rule active/inactive
router.post('/rules/:id/toggle', async (req, res) => {
  try {
    const result = await notificationService.toggleRule(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/rules/seed — Seed default rules
router.post('/rules/seed', async (req, res) => {
  try {
    const result = await notificationService.seedDefaultRules();
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/rules/performance — Rule performance report
router.get('/rules/performance', async (req, res) => {
  try {
    const result = await notificationService.getRulePerformance();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
//  NOTIFICATION CRUD
// ================================================================

// POST /api/notifications — Create a notification
router.post('/', async (req, res) => {
  try {
    const result = await notificationService.createNotification(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications — List notifications
router.get('/', async (req, res) => {
  try {
    const result = await notificationService.listNotifications(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/stats — Quick stats
router.get('/stats', async (req, res) => {
  try {
    const result = await notificationService.getStats();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/:id — Get a notification
router.get('/:id', async (req, res) => {
  try {
    const result = await notificationService.getNotification(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
//  NOTIFICATION LIFECYCLE
// ================================================================

// POST /api/notifications/:id/send — Send a notification
router.post('/:id/send', async (req, res) => {
  try {
    const result = await notificationService.sendNotification(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/cancel — Cancel a notification
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await notificationService.cancelNotification(req.params.id, req.body.reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/acknowledge — Acknowledge a notification
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const result = await notificationService.acknowledgeNotification(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/snooze — Snooze a notification
router.post('/:id/snooze', async (req, res) => {
  try {
    const hours = parseInt(req.body.hours) || 4;
    const result = await notificationService.snoozeNotification(req.params.id, hours);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
//  PROCESSING & SCANNING
// ================================================================

// POST /api/notifications/process/pending — Process all pending notifications
router.post('/process/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await notificationService.processPending(limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/process/retry — Retry failed notifications
router.post('/process/retry', async (req, res) => {
  try {
    const result = await notificationService.retryFailed();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/process/escalate — Process escalations
router.post('/process/escalate', async (req, res) => {
  try {
    const result = await notificationService.processEscalations();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/scan/all — Run all scanners
router.post('/scan/all', async (req, res) => {
  try {
    const result = await notificationService.runAllScanners();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/suppress — Suppress notifications for a recipient
router.post('/suppress', async (req, res) => {
  try {
    const { phone, triggerType, hours } = req.body;
    if (!phone || !triggerType) return res.status(400).json({ success: false, error: 'phone and triggerType required' });
    const result = await notificationService.suppressForRecipient(phone, triggerType, hours);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
//  ANALYTICS & REPORTING
// ================================================================

// GET /api/notifications/reports/delivery — Delivery report
router.get('/reports/delivery', async (req, res) => {
  try {
    const result = await notificationService.getDeliveryReport(req.query.startDate, req.query.endDate);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/notifications/reports/recipient/:phone — Recipient history
router.get('/reports/recipient/:phone', async (req, res) => {
  try {
    const result = await notificationService.getRecipientHistory(req.params.phone, req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
