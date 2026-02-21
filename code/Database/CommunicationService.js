/**
 * CommunicationService.js
 * PURPOSE: Service layer for Communication Templates & Message Sending
 * PHASE: 5 Feature 1 - Advanced Tenant Communication
 * 
 * HANDLES:
 * - Template CRUD operations
 * - Message rendering with variable interpolation
 * - Bulk message sending
 * - Delivery tracking & analytics
 * - Scheduled message management
 * - Communication history per recipient
 */

import CommunicationTemplate from './CommunicationTemplateSchema.js';
import CommunicationLog from './CommunicationLogSchema.js';

class CommunicationService {

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================

  /**
   * Create a new communication template
   * @param {Object} templateData
   * @returns {{ success: boolean, template?: Object, error?: string }}
   */
  static async createTemplate(templateData) {
    try {
      // Check for duplicate name
      const existing = await CommunicationTemplate.findOne({ name: templateData.name });
      if (existing) {
        return {
          success: false,
          error: `Template with name "${templateData.name}" already exists`,
          existingTemplate: { templateId: existing.templateId, name: existing.name }
        };
      }

      const templateId = CommunicationTemplate.generateTemplateId();

      const template = new CommunicationTemplate({
        templateId,
        name: templateData.name.trim(),
        category: templateData.category,
        content: templateData.content.trim(),
        contentArabic: templateData.contentArabic?.trim(),
        variables: templateData.variables || [],
        language: templateData.language || 'en',
        tags: templateData.tags || [],
        status: templateData.approvalRequired ? 'pending_approval' : (templateData.status || 'draft'),
        approvalRequired: templateData.approvalRequired || false,
        scheduling: templateData.scheduling || {},
        createdBy: templateData.createdBy || 'system'
      });

      // Auto-detect variables from content
      if (template.variables.length === 0) {
        const detectedVars = CommunicationService.detectVariables(template.content);
        if (detectedVars.length > 0) {
          template.variables = detectedVars;
        }
      }

      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" created successfully`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      return {
        success: !!template,
        template: template ? template.toObject() : null,
        error: template ? null : `Template ${templateId} not found`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get template by name
   */
  static async getTemplateByName(name) {
    try {
      const template = await CommunicationTemplate.findOne({ name });
      return {
        success: !!template,
        template: template ? template.toObject() : null,
        error: template ? null : `Template "${name}" not found`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List templates with filtering
   * @param {Object} options - { category, status, tags, search, page, limit }
   */
  static async listTemplates(options = {}) {
    try {
      const {
        category,
        status,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (tags && tags.length > 0) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };

      let query;
      if (search) {
        query = CommunicationTemplate.find(
          { ...filter, $text: { $search: search } },
          { score: { $meta: 'textScore' } }
        ).sort({ score: { $meta: 'textScore' } });
      } else {
        query = CommunicationTemplate.find(filter).sort({ [sortBy]: sortOrder });
      }

      const skip = (page - 1) * limit;
      const templates = await query.skip(skip).limit(limit);
      const total = await CommunicationTemplate.countDocuments(filter);

      return {
        success: true,
        templates: templates.map(t => t.toObject()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a template
   */
  static async updateTemplate(templateId, updateData) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      // Prevent editing active templates without proper status change
      if (template.status === 'active' && !updateData.status) {
        updateData.status = 'draft'; // Revert to draft when editing active template
      }

      const allowedFields = [
        'name', 'category', 'content', 'contentArabic',
        'variables', 'language', 'tags', 'status',
        'approvalRequired', 'scheduling', 'updatedBy'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          template[field] = updateData[field];
        }
      }

      template.updatedBy = updateData.updatedBy || 'system';
      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" updated (v${template.version})`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a template (soft delete - archived)
   */
  static async deleteTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      template.status = 'archived';
      await template.save();

      return {
        success: true,
        message: `Template "${template.name}" archived`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Hard delete a template (permanent)
   */
  static async permanentDeleteTemplate(templateId) {
    try {
      const result = await CommunicationTemplate.deleteOne({ templateId });
      return {
        success: result.deletedCount > 0,
        message: result.deletedCount > 0 ? 'Template permanently deleted' : 'Template not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve a template
   */
  static async approveTemplate(templateId, approvedBy) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      if (template.status !== 'pending_approval' && template.status !== 'draft') {
        return { success: false, error: `Template is ${template.status}, cannot approve` };
      }

      template.status = 'active';
      template.approvedBy = approvedBy;
      template.approvedAt = new Date();
      await template.save();

      return {
        success: true,
        template: template.toObject(),
        message: `Template "${template.name}" approved and activated`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate a template (skip approval)
   */
  static async activateTemplate(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      template.status = 'active';
      await template.save();

      return {
        success: true,
        message: `Template "${template.name}" activated`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // MESSAGE SENDING
  // ============================================

  /**
   * Send a message using a template
   * @param {Object} options
   * @param {string} options.templateId - Template to use
   * @param {string} options.recipientPhone - Recipient phone number
   * @param {Object} options.variables - Variable values for interpolation
   * @param {string} options.sentBy - Who triggered this send
   * @param {string} [options.language] - Language override
   * @param {Function} [options.sendFn] - Actual message send function (injected)
   * @returns {{ success: boolean, log?: Object, error?: string }}
   */
  static async sendTemplateMessage(options) {
    try {
      const {
        templateId,
        recipientPhone,
        recipientId,
        recipientName,
        recipientType,
        variables = {},
        sentBy,
        sentFrom,
        language,
        context = {},
        priority = 'normal',
        sendFn
      } = options;

      // 1. Load template
      const template = await CommunicationTemplate.findOne({ templateId, status: 'active' });
      if (!template) {
        return { success: false, error: `Active template ${templateId} not found` };
      }

      // 2. Validate variables
      const validation = template.validateVariables(variables);
      if (!validation.valid) {
        return {
          success: false,
          error: `Missing required variables: ${validation.missing.join(', ')}`
        };
      }

      // 3. Render message
      const renderedContent = template.render(variables, language || template.language);

      // 4. Create log entry
      const log = new CommunicationLog({
        logId: CommunicationLog.generateLogId(),
        templateId: template.templateId,
        templateName: template.name,
        sentBy,
        sentFrom,
        recipientId,
        recipientPhone,
        recipientName,
        recipientType: recipientType || 'unknown',
        content: renderedContent,
        language: language || template.language,
        variablesUsed: variables,
        status: 'queued',
        context,
        priority
      });

      await log.save();

      // 5. Send message (if sendFn provided)
      if (sendFn) {
        try {
          await sendFn(recipientPhone, renderedContent);
          await log.markSent();

          // Update template usage
          template.usage.totalSent += 1;
          template.usage.lastUsedAt = new Date();
          await template.save();
        } catch (sendError) {
          await log.markFailed(sendError.message, 'SEND_FAILED');
          template.usage.totalFailed += 1;
          await template.save();

          return {
            success: false,
            error: `Message queued but send failed: ${sendError.message}`,
            log: log.toObject()
          };
        }
      }

      return {
        success: true,
        log: log.toObject(),
        renderedContent,
        message: sendFn ? 'Message sent successfully' : 'Message queued for sending'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send ad-hoc message (without template)
   */
  static async sendDirectMessage(options) {
    try {
      const {
        recipientPhone,
        recipientId,
        recipientName,
        recipientType,
        content,
        sentBy,
        sentFrom,
        language = 'en',
        context = {},
        priority = 'normal',
        sendFn
      } = options;

      if (!content || !recipientPhone) {
        return { success: false, error: 'Content and recipientPhone are required' };
      }

      const log = new CommunicationLog({
        logId: CommunicationLog.generateLogId(),
        sentBy: sentBy || 'system',
        sentFrom,
        recipientId,
        recipientPhone,
        recipientName,
        recipientType: recipientType || 'unknown',
        content,
        language,
        status: 'queued',
        context,
        priority
      });

      await log.save();

      if (sendFn) {
        try {
          await sendFn(recipientPhone, content);
          await log.markSent();
        } catch (sendError) {
          await log.markFailed(sendError.message, 'SEND_FAILED');
        }
      }

      return {
        success: true,
        log: log.toObject(),
        message: sendFn ? 'Direct message sent' : 'Direct message queued'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk messages using a template
   * @param {Object} options
   * @param {string} options.templateId
   * @param {Array<{ phone, id?, name?, type?, variables? }>} options.recipients
   * @param {string} options.sentBy
   * @param {Function} [options.sendFn]
   * @param {number} [options.delayMs=1000] - Delay between sends (rate limiting)
   * @returns {{ success: boolean, bulkId: string, results: Object[], stats: Object }}
   */
  static async sendBulkMessage(options) {
    try {
      const {
        templateId,
        recipients,
        sentBy,
        sentFrom,
        language,
        context = {},
        sendFn,
        delayMs = 1000
      } = options;

      if (!recipients || recipients.length === 0) {
        return { success: false, error: 'At least one recipient is required' };
      }

      // Load template
      const template = await CommunicationTemplate.findOne({ templateId, status: 'active' });
      if (!template) {
        return { success: false, error: `Active template ${templateId} not found` };
      }

      // Generate bulk ID
      const bulkId = `BULK-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const results = [];
      let sent = 0;
      let failed = 0;
      let queued = 0;

      for (const recipient of recipients) {
        const vars = recipient.variables || {};
        const renderedContent = template.render(vars, language || template.language);

        const log = new CommunicationLog({
          logId: CommunicationLog.generateLogId(),
          templateId: template.templateId,
          templateName: template.name,
          bulkId,
          sentBy,
          sentFrom,
          recipientId: recipient.id,
          recipientPhone: recipient.phone,
          recipientName: recipient.name,
          recipientType: recipient.type || 'unknown',
          content: renderedContent,
          language: language || template.language,
          variablesUsed: vars,
          status: 'queued',
          context,
          priority: 'normal'
        });

        await log.save();

        if (sendFn) {
          try {
            await sendFn(recipient.phone, renderedContent);
            await log.markSent();
            sent++;
            results.push({ phone: recipient.phone, status: 'sent', logId: log.logId });
          } catch (sendError) {
            await log.markFailed(sendError.message, 'BULK_SEND_FAILED');
            failed++;
            results.push({ phone: recipient.phone, status: 'failed', error: sendError.message, logId: log.logId });
          }

          // Rate limiting delay
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } else {
          queued++;
          results.push({ phone: recipient.phone, status: 'queued', logId: log.logId });
        }
      }

      // Update template usage
      template.usage.totalSent += sent;
      template.usage.totalFailed += failed;
      template.usage.lastUsedAt = new Date();
      await template.save();

      return {
        success: true,
        bulkId,
        stats: {
          total: recipients.length,
          sent,
          failed,
          queued,
          deliveryRate: recipients.length > 0 ? ((sent / recipients.length) * 100).toFixed(1) : '0.0'
        },
        results,
        message: `Bulk send complete: ${sent} sent, ${failed} failed, ${queued} queued`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // SCHEDULED MESSAGES
  // ============================================

  /**
   * Schedule a message for later delivery
   */
  static async scheduleMessage(options) {
    try {
      const { scheduledFor, ...sendOptions } = options;

      if (!scheduledFor) {
        return { success: false, error: 'scheduledFor date is required' };
      }

      const scheduleDate = new Date(scheduledFor);
      if (scheduleDate <= new Date()) {
        return { success: false, error: 'scheduledFor must be in the future' };
      }

      // Create without sending
      const result = await CommunicationService.sendTemplateMessage({
        ...sendOptions,
        sendFn: null // Don't send yet
      });

      if (result.success && result.log) {
        // Update schedule time
        await CommunicationLog.findOneAndUpdate(
          { logId: result.log.logId },
          { scheduledFor: scheduleDate }
        );

        return {
          success: true,
          log: { ...result.log, scheduledFor: scheduleDate },
          message: `Message scheduled for ${scheduleDate.toISOString()}`
        };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduled messages ready to send
   */
  static async getDueScheduledMessages(limit = 50) {
    try {
      const now = new Date();
      const messages = await CommunicationLog.find({
        status: 'queued',
        scheduledFor: { $lte: now }
      })
        .sort({ priority: -1, scheduledFor: 1 })
        .limit(limit);

      return {
        success: true,
        messages: messages.map(m => m.toObject()),
        count: messages.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // COMMUNICATION HISTORY & ANALYTICS
  // ============================================

  /**
   * Get communication history for a recipient
   */
  static async getRecipientHistory(recipientPhone, options = {}) {
    try {
      const { page = 1, limit = 20, status } = options;
      const filter = { recipientPhone };
      if (status) filter.status = status;

      const skip = (page - 1) * limit;
      const logs = await CommunicationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await CommunicationLog.countDocuments(filter);

      return {
        success: true,
        logs: logs.map(l => l.toObject()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get delivery statistics
   * @param {Object} filter - Date range, template, etc.
   */
  static async getDeliveryStats(filter = {}) {
    try {
      const stats = await CommunicationLog.getDeliveryStats(filter);
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bulk send status
   */
  static async getBulkStatus(bulkId) {
    try {
      const stats = await CommunicationLog.getBulkStatus(bulkId);
      const logs = await CommunicationLog.find({ bulkId }).sort({ createdAt: 1 });

      return {
        success: true,
        bulkId,
        stats,
        messages: logs.map(l => ({
          logId: l.logId,
          recipientPhone: l.recipientPhone,
          recipientName: l.recipientName,
          status: l.status,
          sentAt: l.sentAt,
          deliveredAt: l.deliveredAt,
          errorMessage: l.errorMessage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get template usage analytics
   */
  static async getTemplateAnalytics(templateId) {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      const stats = await CommunicationLog.getDeliveryStats({ templateId });

      // Daily usage for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyUsage = await CommunicationLog.aggregate([
        { $match: { templateId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        success: true,
        template: {
          templateId: template.templateId,
          name: template.name,
          category: template.category,
          status: template.status,
          usage: template.usage,
          deliveryRate: template.deliveryRate,
          version: template.version
        },
        deliveryStats: stats,
        dailyUsage,
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get overall communication dashboard data
   */
  static async getDashboard() {
    try {
      const [
        totalTemplates,
        activeTemplates,
        overallStats,
        topTemplates,
        recentMessages
      ] = await Promise.all([
        CommunicationTemplate.countDocuments(),
        CommunicationTemplate.countDocuments({ status: 'active' }),
        CommunicationLog.getDeliveryStats(),
        CommunicationTemplate.findMostUsed(5),
        CommunicationLog.find().sort({ createdAt: -1 }).limit(10)
      ]);

      return {
        success: true,
        dashboard: {
          templates: {
            total: totalTemplates,
            active: activeTemplates
          },
          messages: overallStats,
          topTemplates: topTemplates.map(t => ({
            templateId: t.templateId,
            name: t.name,
            category: t.category,
            totalSent: t.usage.totalSent,
            deliveryRate: t.deliveryRate
          })),
          recentMessages: recentMessages.map(m => ({
            logId: m.logId,
            recipientPhone: m.recipientPhone,
            templateName: m.templateName,
            status: m.status,
            createdAt: m.createdAt
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // RETRY & QUEUE MANAGEMENT
  // ============================================

  /**
   * Retry failed messages
   */
  static async retryFailedMessages(sendFn, limit = 20) {
    try {
      const failedMessages = await CommunicationLog.getFailedMessages(limit);

      const results = [];
      let retried = 0;
      let stillFailed = 0;

      for (const msg of failedMessages) {
        try {
          await msg.retry();
          if (sendFn) {
            await sendFn(msg.recipientPhone, msg.content);
            await msg.markSent();
            retried++;
            results.push({ logId: msg.logId, status: 'retried_successfully' });
          }
        } catch (retryError) {
          await msg.markFailed(retryError.message, 'RETRY_FAILED');
          stillFailed++;
          results.push({ logId: msg.logId, status: 'retry_failed', error: retryError.message });
        }
      }

      return {
        success: true,
        stats: { retried, stillFailed, total: failedMessages.length },
        results
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process queued messages
   */
  static async processQueue(sendFn, limit = 50, delayMs = 1000) {
    try {
      const queued = await CommunicationLog.getQueuedMessages(limit);

      let sent = 0;
      let failed = 0;

      for (const msg of queued) {
        try {
          msg.status = 'sending';
          await msg.save();

          await sendFn(msg.recipientPhone, msg.content);
          await msg.markSent();
          sent++;

          // Update template stats if applicable
          if (msg.templateId) {
            await CommunicationTemplate.findOneAndUpdate(
              { templateId: msg.templateId },
              {
                $inc: { 'usage.totalSent': 1 },
                $set: { 'usage.lastUsedAt': new Date() }
              }
            );
          }

          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (sendError) {
          await msg.markFailed(sendError.message, 'QUEUE_SEND_FAILED');
          failed++;

          if (msg.templateId) {
            await CommunicationTemplate.findOneAndUpdate(
              { templateId: msg.templateId },
              { $inc: { 'usage.totalFailed': 1 } }
            );
          }
        }
      }

      return {
        success: true,
        stats: { processed: queued.length, sent, failed },
        message: `Queue processed: ${sent} sent, ${failed} failed out of ${queued.length}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Auto-detect variables in template content
   * Finds patterns like {variableName}
   */
  static detectVariables(content) {
    const regex = /\{(\w+)\}/g;
    const variables = [];
    const seen = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (!seen.has(name)) {
        seen.add(name);
        variables.push({
          name,
          displayName: name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
          required: true,
          example: ''
        });
      }
    }

    return variables;
  }

  /**
   * Render a template preview
   */
  static async previewTemplate(templateId, variables = {}, language = 'en') {
    try {
      const template = await CommunicationTemplate.findOne({ templateId });
      if (!template) {
        return { success: false, error: `Template ${templateId} not found` };
      }

      const preview = Object.keys(variables).length > 0
        ? template.render(variables, language)
        : template.preview(language);

      return {
        success: true,
        template: {
          templateId: template.templateId,
          name: template.name,
          category: template.category
        },
        preview,
        variables: template.variables,
        language
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get categories with counts
   */
  static async getCategories() {
    try {
      const categories = await CommunicationTemplate.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { count: -1 } }
      ]);

      return {
        success: true,
        categories: categories.map(c => ({
          name: c._id,
          total: c.count,
          active: c.active
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Seed default templates
   */
  static async seedDefaultTemplates() {
    const defaults = [
      {
        name: 'Welcome Tenant',
        category: 'welcome',
        content: 'Welcome to DAMAC Hills 2, {tenantName}! 🏡\n\nYour unit {unitNumber} in {clusterName} is ready.\n\nKey contacts:\n📞 Maintenance: +971-XXX-XXXX\n📩 Management: property@damac.ae\n\nWe hope you enjoy your new home!',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Ahmed Ali' },
          { name: 'unitNumber', displayName: 'Unit Number', required: true, example: 'V-101' },
          { name: 'clusterName', displayName: 'Cluster Name', required: true, example: 'Amazonia' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Payment Reminder',
        category: 'payment_reminder',
        content: 'Hello {tenantName},\n\nThis is a friendly reminder that your rent payment of AED {amount} is due on {dueDate}.\n\nPlease ensure timely payment to avoid any late fees.\n\nThank you! 🏠',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Sara Khan' },
          { name: 'amount', displayName: 'Rent Amount', required: true, example: '45,000' },
          { name: 'dueDate', displayName: 'Due Date', required: true, example: 'March 1, 2026' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Lease Renewal Notice',
        category: 'lease_renewal',
        content: 'Dear {tenantName},\n\nYour lease for {unitNumber} ({clusterName}) is expiring on {expiryDate}.\n\nWe would love to have you continue as our tenant! Please let us know if you wish to renew.\n\nNew renewal offer: AED {newAmount}/year\n\nContact us to discuss. 📋',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Mohammed Ali' },
          { name: 'unitNumber', displayName: 'Unit Number', required: true, example: 'C-205' },
          { name: 'clusterName', displayName: 'Cluster Name', required: true, example: 'Clover' },
          { name: 'expiryDate', displayName: 'Expiry Date', required: true, example: 'May 31, 2026' },
          { name: 'newAmount', displayName: 'New Amount', required: true, example: '50,000' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Maintenance Request Received',
        category: 'maintenance',
        content: 'Hello {tenantName},\n\nYour maintenance request has been received ✅\n\n📋 Ticket #: {ticketNumber}\n🔧 Issue: {issueDescription}\n📅 Expected visit: {visitDate}\n\nOur team will contact you to confirm timing.\n\nThank you for your patience!',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Fatima Hassan' },
          { name: 'ticketNumber', displayName: 'Ticket Number', required: true, example: 'MT-2026-001' },
          { name: 'issueDescription', displayName: 'Issue', required: true, example: 'AC not cooling' },
          { name: 'visitDate', displayName: 'Visit Date', required: true, example: 'Feb 23, 2026' }
        ],
        createdBy: 'system',
        status: 'active'
      },
      {
        name: 'Emergency Notification',
        category: 'emergency',
        content: '🚨 IMPORTANT NOTICE 🚨\n\nDear {tenantName},\n\n{emergencyMessage}\n\nPlease follow all instructions from the building management.\n\nEmergency Contact: {emergencyContact}\n\nStay safe! 🙏',
        variables: [
          { name: 'tenantName', displayName: 'Tenant Name', required: true, example: 'Resident' },
          { name: 'emergencyMessage', displayName: 'Emergency Message', required: true, example: 'Water supply interruption scheduled for maintenance' },
          { name: 'emergencyContact', displayName: 'Emergency Contact', required: true, example: '+971-50-XXX-XXXX' }
        ],
        createdBy: 'system',
        status: 'active'
      }
    ];

    const results = [];
    for (const tmpl of defaults) {
      const existing = await CommunicationTemplate.findOne({ name: tmpl.name });
      if (!existing) {
        const result = await CommunicationService.createTemplate(tmpl);
        results.push({ name: tmpl.name, ...result });
      } else {
        results.push({ name: tmpl.name, success: true, message: 'Already exists', skipped: true });
      }
    }

    return {
      success: true,
      seeded: results.filter(r => !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      results
    };
  }
}

export default CommunicationService;
