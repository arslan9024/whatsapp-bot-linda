/**
 * Communication Routes - DAMAC Hills 2 API
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * Endpoints:
 * 
 * TEMPLATES:
 *   POST   /api/v1/damac/communication/templates           — Create template
 *   GET    /api/v1/damac/communication/templates           — List templates
 *   GET    /api/v1/damac/communication/templates/categories — Get categories
 *   GET    /api/v1/damac/communication/templates/:id       — Get template
 *   PUT    /api/v1/damac/communication/templates/:id       — Update template
 *   DELETE /api/v1/damac/communication/templates/:id       — Delete (archive)
 *   POST   /api/v1/damac/communication/templates/:id/approve   — Approve template
 *   POST   /api/v1/damac/communication/templates/:id/activate  — Activate template
 *   GET    /api/v1/damac/communication/templates/:id/preview   — Preview template
 *   GET    /api/v1/damac/communication/templates/:id/analytics — Template analytics
 * 
 * MESSAGING:
 *   POST   /api/v1/damac/communication/send                — Send template message
 *   POST   /api/v1/damac/communication/send-direct         — Send ad-hoc message
 *   POST   /api/v1/damac/communication/send-bulk           — Send bulk messages
 *   POST   /api/v1/damac/communication/schedule            — Schedule a message
 * 
 * LOGS & ANALYTICS:
 *   GET    /api/v1/damac/communication/logs                — List message logs
 *   GET    /api/v1/damac/communication/logs/:logId         — Get specific log
 *   GET    /api/v1/damac/communication/history/:phone      — Recipient history
 *   GET    /api/v1/damac/communication/bulk/:bulkId        — Bulk send status
 *   GET    /api/v1/damac/communication/dashboard           — Overall dashboard
 *   GET    /api/v1/damac/communication/delivery-stats      — Delivery statistics
 * 
 * QUEUE:
 *   POST   /api/v1/damac/communication/queue/process       — Process queued messages
 *   POST   /api/v1/damac/communication/queue/retry         — Retry failed messages
 *   GET    /api/v1/damac/communication/queue/scheduled      — Get due scheduled messages
 * 
 * SEED:
 *   POST   /api/v1/damac/communication/seed                — Seed default templates
 */

import express from 'express';
import CommunicationService from '../Database/CommunicationService.js';
import CommunicationLog from '../Database/CommunicationLogSchema.js';

const router = express.Router();

// ============================================================================
// TEMPLATE ENDPOINTS
// ============================================================================

/**
 * POST /templates
 * Create a new communication template
 */
router.post('/templates', async (req, res) => {
  try {
    const result = await CommunicationService.createTemplate(req.body);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.template,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        existingTemplate: result.existingTemplate,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /templates
 * List templates with filtering
 * Query params: category, status, tags, search, page, limit, sortBy, sortOrder
 */
router.get('/templates', async (req, res) => {
  try {
    const { category, status, tags, search, page, limit, sortBy, sortOrder } = req.query;

    const result = await CommunicationService.listTemplates({
      category,
      status,
      tags: tags ? tags.split(',') : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy,
      sortOrder: sortOrder ? parseInt(sortOrder) : -1
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.templates,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /templates/categories
 * Get all categories with counts
 */
router.get('/templates/categories', async (req, res) => {
  try {
    const result = await CommunicationService.getCategories();
    res.json({
      success: true,
      data: result.categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /templates/:id
 * Get a specific template
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const result = await CommunicationService.getTemplate(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        data: result.template,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * PUT /templates/:id
 * Update a template
 */
router.put('/templates/:id', async (req, res) => {
  try {
    const result = await CommunicationService.updateTemplate(req.params.id, req.body);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.template,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(result.error.includes('not found') ? 404 : 400).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * DELETE /templates/:id
 * Soft delete (archive) a template
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await CommunicationService.deleteTemplate(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /templates/:id/approve
 * Approve template for use
 */
router.post('/templates/:id/approve', async (req, res) => {
  try {
    const { approvedBy } = req.body;
    if (!approvedBy) {
      return res.status(400).json({ success: false, error: 'approvedBy is required', timestamp: new Date().toISOString() });
    }

    const result = await CommunicationService.approveTemplate(req.params.id, approvedBy);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.template,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(result.error.includes('not found') ? 404 : 400).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /templates/:id/activate
 * Activate template (skip approval)
 */
router.post('/templates/:id/activate', async (req, res) => {
  try {
    const result = await CommunicationService.activateTemplate(req.params.id);

    if (result.success) {
      res.json({ success: true, message: result.message, timestamp: new Date().toISOString() });
    } else {
      res.status(404).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /templates/:id/preview
 * Preview rendered template
 * Query params: lang, variables (JSON encoded)
 */
router.get('/templates/:id/preview', async (req, res) => {
  try {
    const variables = req.query.variables ? JSON.parse(req.query.variables) : {};
    const language = req.query.lang || 'en';

    const result = await CommunicationService.previewTemplate(req.params.id, variables, language);

    if (result.success) {
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /templates/:id/analytics
 * Get template usage analytics
 */
router.get('/templates/:id/analytics', async (req, res) => {
  try {
    const result = await CommunicationService.getTemplateAnalytics(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// ============================================================================
// MESSAGING ENDPOINTS
// ============================================================================

/**
 * POST /send
 * Send a message using a template
 */
router.post('/send', async (req, res) => {
  try {
    const { templateId, recipientPhone, variables, sentBy, recipientId, recipientName, recipientType, sentFrom, language, context, priority } = req.body;

    if (!templateId || !recipientPhone) {
      return res.status(400).json({
        success: false,
        error: 'templateId and recipientPhone are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await CommunicationService.sendTemplateMessage({
      templateId,
      recipientPhone,
      recipientId,
      recipientName,
      recipientType,
      variables: variables || {},
      sentBy: sentBy || 'api',
      sentFrom,
      language,
      context,
      priority
      // sendFn not provided — message is queued for bot to pick up
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.log,
        renderedContent: result.renderedContent,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /send-direct
 * Send ad-hoc message without template
 */
router.post('/send-direct', async (req, res) => {
  try {
    const { recipientPhone, content, sentBy, recipientId, recipientName, recipientType, sentFrom, language, context, priority } = req.body;

    if (!recipientPhone || !content) {
      return res.status(400).json({
        success: false,
        error: 'recipientPhone and content are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await CommunicationService.sendDirectMessage({
      recipientPhone,
      content,
      recipientId,
      recipientName,
      recipientType,
      sentBy: sentBy || 'api',
      sentFrom,
      language,
      context,
      priority
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.log,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /send-bulk
 * Send template message to multiple recipients
 */
router.post('/send-bulk', async (req, res) => {
  try {
    const { templateId, recipients, sentBy, sentFrom, language, context, delayMs } = req.body;

    if (!templateId || !recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'templateId and at least one recipient are required',
        timestamp: new Date().toISOString()
      });
    }

    if (recipients.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 500 recipients per bulk send',
        timestamp: new Date().toISOString()
      });
    }

    const result = await CommunicationService.sendBulkMessage({
      templateId,
      recipients,
      sentBy: sentBy || 'api',
      sentFrom,
      language,
      context,
      delayMs: delayMs || 1000
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        bulkId: result.bulkId,
        stats: result.stats,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /schedule
 * Schedule a message for later delivery
 */
router.post('/schedule', async (req, res) => {
  try {
    const { templateId, recipientPhone, variables, sentBy, scheduledFor, language, context, priority } = req.body;

    if (!templateId || !recipientPhone || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'templateId, recipientPhone, and scheduledFor are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await CommunicationService.scheduleMessage({
      templateId,
      recipientPhone,
      variables: variables || {},
      sentBy: sentBy || 'api',
      scheduledFor,
      language,
      context,
      priority
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.log,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// ============================================================================
// LOGS & ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /logs
 * List message logs with filtering
 */
router.get('/logs', async (req, res) => {
  try {
    const { status, templateId, recipientPhone, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (templateId) filter.templateId = templateId;
    if (recipientPhone) filter.recipientPhone = recipientPhone;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await CommunicationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CommunicationLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs.map(l => l.toObject()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /logs/:logId
 * Get specific log entry
 */
router.get('/logs/:logId', async (req, res) => {
  try {
    const log = await CommunicationLog.findOne({ logId: req.params.logId });

    if (log) {
      res.json({ success: true, data: log.toObject(), timestamp: new Date().toISOString() });
    } else {
      res.status(404).json({ success: false, error: 'Log not found', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /history/:phone
 * Get communication history for a phone number
 */
router.get('/history/:phone', async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const result = await CommunicationService.getRecipientHistory(req.params.phone, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /bulk/:bulkId
 * Get bulk send status
 */
router.get('/bulk/:bulkId', async (req, res) => {
  try {
    const result = await CommunicationService.getBulkStatus(req.params.bulkId);

    if (result.success) {
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /dashboard
 * Overall communication dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const result = await CommunicationService.getDashboard();

    if (result.success) {
      res.json({
        success: true,
        data: result.dashboard,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /delivery-stats
 * Get delivery statistics
 */
router.get('/delivery-stats', async (req, res) => {
  try {
    const { templateId, from, to } = req.query;
    const filter = {};
    if (templateId) filter.templateId = templateId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const result = await CommunicationService.getDeliveryStats(filter);

    if (result.success) {
      res.json({
        success: true,
        data: result.stats,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// ============================================================================
// QUEUE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /queue/process
 * Process all queued messages
 */
router.post('/queue/process', async (req, res) => {
  try {
    const { limit, delayMs } = req.body;

    // Note: In production, sendFn would be injected from bot integration
    // For API-only mode, messages remain queued for bot pickup
    const result = await CommunicationService.processQueue(
      null, // sendFn — will be handled by bot integration
      limit || 50,
      delayMs || 1000
    );

    res.json({
      success: true,
      data: result,
      note: 'Messages remain queued — bot integration will pick them up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * POST /queue/retry
 * Retry failed messages
 */
router.post('/queue/retry', async (req, res) => {
  try {
    const { limit } = req.body;

    const result = await CommunicationService.retryFailedMessages(null, limit || 20);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /queue/scheduled
 * Get scheduled messages due for sending
 */
router.get('/queue/scheduled', async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await CommunicationService.getDueScheduledMessages(limit ? parseInt(limit) : 50);

    if (result.success) {
      res.json({
        success: true,
        data: result.messages,
        count: result.count,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ success: false, error: result.error, timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// ============================================================================
// SEED ENDPOINT
// ============================================================================

/**
 * POST /seed
 * Seed default templates
 */
router.post('/seed', async (req, res) => {
  try {
    const result = await CommunicationService.seedDefaultTemplates();

    res.json({
      success: true,
      message: `Seeded ${result.seeded} templates, skipped ${result.skipped}`,
      data: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

export default router;
