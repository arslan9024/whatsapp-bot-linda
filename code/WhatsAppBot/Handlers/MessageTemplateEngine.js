/**
 * Message Template Engine for WhatsApp Integration
 * Handles template-based messaging with variable substitution
 * 
 * Features:
 * - Template definition and management
 * - Variable substitution
 * - Conditional rendering
 * - Formatting options
 * - Template validation
 * - Batch template sending
 * - Template analytics
 * 
 * Version: 1.0.0
 * Created: February 26, 2026
 * Phase: 6 M2 Module 1
 */

const logger = require('../Integration/Google/utils/logger');

class MessageTemplateEngine {
  constructor(options = {}) {
    this.templates = new Map();
    this.templateHistory = [];
    this.defaultLocale = options.defaultLocale || 'en-US';
    // Updated pattern to support both single braces {var} and double braces {{var}}
    this.variablePattern = /\{\{?(\w+)\}?\}/g;
    this.conditionPattern = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;
    this.initialized = false;
  }

  /**
   * Initialize template engine
   */
  async initialize() {
    try {
      // Load default templates
      this.loadDefaultTemplates();
      this.initialized = true;
      logger.info('Message Template Engine initialized successfully');
      return { success: true, message: 'Template engine ready' };
    } catch (error) {
      logger.error('Failed to initialize template engine', { error: error.message });
      throw error;
    }
  }

  /**
   * Load default templates
   */
  loadDefaultTemplates() {
    const defaultTemplates = {
      'greeting': {
        name: 'greeting',
        content: 'Hello {{name}}! Welcome to Linda Bot.',
        variables: ['name'],
        category: 'greeting',
        locale: 'en-US'
      },
      'farewell': {
        name: 'farewell',
        content: 'Goodbye {{name}}! Have a great day!',
        variables: ['name'],
        category: 'farewell',
        locale: 'en-US'
      },
      'contact_created': {
        name: 'contact_created',
        content: 'Contact {{name}} ({{phone}}) has been created successfully.',
        variables: ['name', 'phone'],
        category: 'notification',
        locale: 'en-US'
      },
      'contact_updated': {
        name: 'contact_updated',
        content: 'Contact {{name}} has been updated. New details: {{details}}',
        variables: ['name', 'details'],
        category: 'notification',
        locale: 'en-US'
      },
      'sync_complete': {
        name: 'sync_complete',
        content: 'Sync completed! {{count}} contacts synchronized in {{duration}}ms.',
        variables: ['count', 'duration'],
        category: 'notification',
        locale: 'en-US'
      },
      'error_message': {
        name: 'error_message',
        content: 'Oops! An error occurred: {{errorMsg}}. Please try again or contact support.',
        variables: ['errorMsg'],
        category: 'error',
        locale: 'en-US'
      }
    };

    for (const [key, template] of Object.entries(defaultTemplates)) {
      this.templates.set(key, template);
    }
  }

  /**
   * Create a new template
   */
  createTemplate(templateConfig) {
    try {
      const templateId = templateConfig.id || this.generateTemplateId();
      const template = {
        id: templateId,
        name: templateConfig.name,
        content: templateConfig.content,
        variables: this.extractVariables(templateConfig.content),
        category: templateConfig.category || 'custom',
        locale: templateConfig.locale || this.defaultLocale,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsedAt: null
      };

      this.templates.set(templateId, template);
      logger.info('Template created', { templateId, name: template.name });

      return { success: true, templateId, template };
    } catch (error) {
      logger.error('Failed to create template', { error: error.message });
      throw error;
    }
  }

  /**
   * Register a template (alias for createTemplate)
   */
  registerTemplate(templateConfig) {
    try {
      const templateId = templateConfig.id || templateConfig.name || this.generateTemplateId();
      const template = {
        id: templateId,
        name: templateConfig.name || templateId,
        content: templateConfig.content,
        variables: this.extractVariables(templateConfig.content),
        category: templateConfig.category || 'custom',
        locale: templateConfig.locale || this.defaultLocale,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        lastUsedAt: null
      };

      this.templates.set(templateId, template);
      logger.info('Template registered', { templateId, name: template.name });

      return { success: true, templateId, template };
    } catch (error) {
      logger.error('Failed to register template', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content) {
    const variables = [];
    const matches = content.match(this.variablePattern);
    
    if (matches) {
      for (const match of matches) {
        const varName = match.replace(/[{}]/g, '');
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    }

    return variables;
  }

  /**
   * Render template with variable substitution
   * Supports both (templateId, variables) and (templateObject) signatures
   */
  renderTemplate(templateIdOrObject, variables = {}) {
    try {
      let template;
      let templateId;
      let finalVariables = variables;

      // Handle both parameter styles
      if (typeof templateIdOrObject === 'string') {
        // Old style: renderTemplate(id, variables)
        templateId = templateIdOrObject;
        template = this.templates.get(templateId);
        if (!template) {
          throw new Error(`Template not found: ${templateId}`);
        }
        finalVariables = variables || {};
      } else if (typeof templateIdOrObject === 'object') {
        // New style: renderTemplate({ name, content, variables })
        // First register the template if not already registered
        const name = templateIdOrObject.name || `temp_${Date.now()}`;
        templateId = name;

        // Register the template temporarily
        if (!this.templates.has(templateId)) {
          this.registerTemplate(templateIdOrObject);
        }

        template = this.templates.get(templateId);
        finalVariables = templateIdOrObject.variables || {};
      } else {
        throw new Error('Invalid template parameter: must be string ID or template object');
      }

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Validate variables
      for (const varName of template.variables) {
        if (!(varName in finalVariables)) {
          logger.warn('Missing variable in template rendering', { templateId, varName });
        }
      }

      let content = template.content;

      // Handle conditionals
      content = this.processConditionals(content, finalVariables);

      // Handle variable substitution
      content = content.replace(this.variablePattern, (match, varName) => {
        return finalVariables[varName] !== undefined ? finalVariables[varName] : match;
      });

      // Update usage statistics
      template.usageCount++;
      template.lastUsedAt = new Date().toISOString();

      this.templateHistory.push({
        templateId,
        timestamp: new Date().toISOString(),
        variables: Object.keys(finalVariables)
      });

      logger.info('Template rendered', { templateId, variableCount: Object.keys(finalVariables).length });

      return {
        success: true,
        templateId,
        content
      };
    } catch (error) {
      logger.error('Failed to render template', { error: error.message });
      throw error;
    }
  }

  /**
   * Process conditional blocks in template
   */
  processConditionals(content, variables) {
    return content.replace(this.conditionPattern, (match, condition, blockContent) => {
      return variables[condition] ? blockContent : '';
    });
  }

  /**
   * Render batch templates for multiple recipients
   */
  async renderBatchTemplates(templateId, recipients) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const results = [];
      const startTime = Date.now();

      for (const recipient of recipients) {
        const rendered = this.renderTemplate(templateId, recipient.variables);
        results.push({
          recipientId: recipient.id,
          recipientNumber: recipient.number,
          message: rendered.content,
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      }

      const duration = Date.now() - startTime;

      logger.info('Batch templates rendered', {
        templateId,
        recipientCount: recipients.length,
        duration
      });

      return {
        success: true,
        templateId,
        recipientCount: recipients.length,
        messages: results,
        duration
      };
    } catch (error) {
      logger.error('Failed to render batch templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name,
      content: template.content,
      variables: template.variables,
      category: template.category,
      locale: template.locale,
      usageCount: template.usageCount,
      createdAt: template.createdAt
    };
  }

  /**
   * Update template
   */
  updateTemplate(templateId, updates) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (updates.content) {
        template.content = updates.content;
        template.variables = this.extractVariables(updates.content);
      }

      if (updates.name) {
        template.name = updates.name;
      }

      if (updates.category) {
        template.category = updates.category;
      }

      template.updatedAt = new Date().toISOString();

      logger.info('Template updated', { templateId });

      return { success: true, templateId, template };
    } catch (error) {
      logger.error('Failed to update template', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId) {
    try {
      if (!this.templates.has(templateId)) {
        throw new Error(`Template not found: ${templateId}`);
      }

      this.templates.delete(templateId);
      logger.info('Template deleted', { templateId });

      return { success: true, templateId };
    } catch (error) {
      logger.error('Failed to delete template', { error: error.message });
      throw error;
    }
  }

  /**
   * List all templates
   */
  listTemplates(filter = {}) {
    let templates = Array.from(this.templates.values());

    // Apply filters
    if (filter.category) {
      templates = templates.filter(t => t.category === filter.category);
    }

    if (filter.locale) {
      templates = templates.filter(t => t.locale === filter.locale);
    }

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      variableCount: t.variables.length,
      usageCount: t.usageCount,
      createdAt: t.createdAt
    }));
  }

  /**
   * Get template usage statistics
   */
  getTemplateStats(templateId) {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const releventHistory = this.templateHistory.filter(h => h.templateId === templateId);

    return {
      templateId,
      name: template.name,
      totalUsage: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      recentUsage: releventHistory.slice(-10),
      category: template.category,
      variableCount: template.variables.length
    };
  }

  /**
   * Validate template syntax
   */
  validateTemplate(content) {
    try {
      // Check for mismatched braces
      const openBraces = (content.match(/\{\{/g) || []).length;
      const closeBraces = (content.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        return {
          valid: false,
          error: 'Mismatched template braces'
        };
      }

      // Check for valid variable names
      const invalidVars = content.match(/\{\{[^a-zA-Z0-9_#/\s][^}]*\}\}/g);
      if (invalidVars) {
        return {
          valid: false,
          error: `Invalid variable names: ${invalidVars.join(', ')}`
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate unique template ID
   */
  generateTemplateId() {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    return {
      totalTemplates: this.templates.size,
      totalRenderCalls: this.templateHistory.length,
      categories: Array.from(new Set(Array.from(this.templates.values()).map(t => t.category))),
      locales: Array.from(new Set(Array.from(this.templates.values()).map(t => t.locale))),
      mostUsedTemplate: this.getMostUsedTemplate(),
      averageVariablesPerTemplate: (Array.from(this.templates.values()).reduce((sum, t) => sum + t.variables.length, 0) / this.templates.size).toFixed(2)
    };
  }

  /**
   * Get most used template
   */
  getMostUsedTemplate() {
    let mostUsed = null;
    let maxUsage = 0;

    for (const template of this.templates.values()) {
      if (template.usageCount > maxUsage) {
        maxUsage = template.usageCount;
        mostUsed = template.id;
      }
    }

    return mostUsed;
  }

  /**
   * Reset engine state for test isolation
   */
  reset() {
    this.templates.clear();
    this.templateHistory = [];
    this.initialized = false;
    logger.debug('MessageTemplateEngine state reset');
  }
}

module.exports = MessageTemplateEngine;
