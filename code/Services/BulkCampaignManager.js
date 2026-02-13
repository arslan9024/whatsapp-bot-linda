/**
 * Bulk Campaign Manager
 * Creates and executes bulk message campaigns
 * Filters contacts by role, location, status
 * Sends personalized template messages to multiple recipients
 * Tracks delivery status and generates reports
 * 
 * Features:
 * - Create campaign templates with variable substitution
 * - Filter contacts by role (security_guard, agent_D2, tenant, etc.)
 * - Schedule bulk sends
 * - Track delivery status per contact
 * - Generate campaign reports and analytics
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BulkCampaignManager {
  constructor(config = {}) {
    this.campaigns = new Map();  // campaignId → campaign object
    this.templates = new Map();  // templateId → template object
    
    this.campaignsDbPath = config.campaignsDbPath || './code/Data/bulk-campaigns.json';
    this.securityContactMapper = config.securityContactMapper;
    this.whatsappManager = config.whatsappManager;
    
    this.campaignExecutions = [];
  }

  /**
   * Initialize manager
   */
  async initialize() {
    try {
      if (fs.existsSync(this.campaignsDbPath)) {
        const data = JSON.parse(fs.readFileSync(this.campaignsDbPath, 'utf8'));
        
        data.campaigns.forEach(c => this.campaigns.set(c.campaignId, c));
        data.templates.forEach(t => this.templates.set(t.templateId, t));
        
        logger.info(`✅ Bulk Campaign Manager initialized with ${data.campaigns.size} campaigns and ${data.templates.size} templates`);
      } else {
        logger.warn(`⚠️ Campaigns database not found, starting fresh`);
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize BulkCampaignManager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new campaign template
   * @param {object} templateData - Template definition
   * @returns {object} Created template
   */
  async createTemplate(templateData) {
    try {
      const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const template = {
        templateId: templateId,
        name: templateData.name,
        description: templateData.description || '',
        content: templateData.content,
        variables: this._extractVariables(templateData.content),
        category: templateData.category || 'general',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.templates.set(templateId, template);
      await this._persistCampaigns();

      logger.info(`✅ Template created: ${template.name} (${templateId})`);
      return template;

    } catch (error) {
      logger.error(`❌ Error creating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new campaign
   * @param {object} campaignData - Campaign configuration
   * @returns {object} Created campaign
   */
  async createCampaign(campaignData) {
    try {
      const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Validate template exists
      if (!this.templates.has(campaignData.templateId)) {
        throw new Error(`Template not found: ${campaignData.templateId}`);
      }

      const campaign = {
        campaignId: campaignId,
        name: campaignData.name,
        description: campaignData.description || '',
        templateId: campaignData.templateId,
        
        targeting: {
          roles: campaignData.roles || [],  // e.g., ["security_guard", "agent_D2"]
          locations: campaignData.locations || [],  // e.g., ["DAMAC_HILLS_2"]
          status: campaignData.status || 'all'  // active, inactive, all
        },

        schedule: {
          scheduleType: campaignData.scheduleType || 'immediate',  // immediate, scheduled, batch
          scheduledTime: campaignData.scheduledTime || null,
          batchSize: campaignData.batchSize || 10,  // Contacts per batch
          batchDelay: campaignData.batchDelay || 5000  // Delay (ms) between batches
        },

        createdAt: new Date().toISOString(),
        status: 'draft',
        
        execution: {
          startedAt: null,
          completedAt: null,
          totalRecipients: 0,
          sent: 0,
          failed: 0,
          skipped: 0
        },

        recipients: []  // Will be populated during execution
      };

      this.campaigns.set(campaignId, campaign);
      await this._persistCampaigns();

      logger.info(`✅ Campaign created: ${campaign.name} (${campaignId})`);
      return campaign;

    } catch (error) {
      logger.error(`❌ Error creating campaign: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get campaign details
   * @param {string} campaignId - Campaign ID
   * @returns {object} Campaign object
   */
  getCampaign(campaignId) {
    return this.campaigns.get(campaignId) || null;
  }

  /**
   * Get template details
   * @param {string} templateId - Template ID
   * @returns {object} Template object
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Filter contacts based on campaign targeting rules
   * @param {object} campaign - Campaign object
   * @returns {Array} Contact objects matching filters
   */
  filterContacts(campaign) {
    try {
      const { roles, locations } = campaign.targeting;
      let contacts = [];

      // If no filters, return all contacts
      if (roles.length === 0 && locations.length === 0) {
        contacts = this.securityContactMapper.getAllContacts();
      } else if (locations.length > 0 && roles.length === 0) {
        // Filter by locations only
        locations.forEach(location => {
          contacts.push(...this.securityContactMapper.getContactsByLocation(location));
        });
      } else if (roles.length > 0 && locations.length === 0) {
        // Filter by roles only
        roles.forEach(role => {
          contacts.push(...this.securityContactMapper.getContactsByRole(role));
        });
      } else {
        // Filter by both roles and locations (AND logic)
        locations.forEach(location => {
          roles.forEach(role => {
            const locContacts = this.securityContactMapper.getContactsByLocation(location, role);
            contacts.push(...locContacts);
          });
        });
      }

      // Remove duplicates
      const uniqueContacts = Array.from(
        new Map(contacts.map(c => [c.phone, c])).values()
      );

      logger.info(`🎯 Filtered ${uniqueContacts.length} contacts for campaign ${campaign.campaignId}`);
      return uniqueContacts;

    } catch (error) {
      logger.error(`❌ Error filtering contacts: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute a campaign (send messages to all recipients)
   * @param {string} campaignId - Campaign ID
   * @returns {object} Execution result
   */
  async executeCampaign(campaignId) {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      logger.info(`🚀 Starting campaign execution: ${campaign.name}`);

      // Get template
      const template = this.getTemplate(campaign.templateId);
      if (!template) {
        throw new Error(`Template not found: ${campaign.templateId}`);
      }

      // Filter contacts
      const contacts = this.filterContacts(campaign);
      if (contacts.length === 0) {
        logger.warn(`⚠️ No contacts found matching campaign filters`);
        return { success: false, error: 'No matching contacts' };
      }

      // Mark campaign as running
      campaign.status = 'running';
      campaign.execution.startedAt = new Date().toISOString();
      campaign.execution.totalRecipients = contacts.length;

      // Process contacts in batches
      const batchSize = campaign.schedule.batchSize || 10;
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        for (const contact of batch) {
          const result = await this._sendToContact(campaign, template, contact);
          
          if (result.success) {
            sent++;
          } else if (result.skipped) {
            skipped++;
          } else {
            failed++;
          }
        }

        // Delay between batches
        if (i + batchSize < contacts.length) {
          await this._sleep(campaign.schedule.batchDelay || 5000);
        }
      }

      // Mark campaign as complete
      campaign.status = 'completed';
      campaign.execution.completedAt = new Date().toISOString();
      campaign.execution.sent = sent;
      campaign.execution.failed = failed;
      campaign.execution.skipped = skipped;

      await this._persistCampaigns();

      const result = {
        success: true,
        campaignId: campaignId,
        totalRecipients: contacts.length,
        sent: sent,
        failed: failed,
        skipped: skipped,
        successRate: ((sent / contacts.length) * 100).toFixed(1) + '%'
      };

      logger.info(`✅ Campaign execution complete: ${sent}/${contacts.length} messages sent`);
      return result;

    } catch (error) {
      logger.error(`❌ Error executing campaign: ${error.message}`);
      const campaign = this.campaigns.get(campaignId);
      if (campaign) {
        campaign.status = 'failed';
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to single contact
   * @private
   */
  async _sendToContact(campaign, template, contact) {
    try {
      // Skip if no phone
      if (!contact.phone) {
        return { success: false, skipped: true };
      }

      // Personalize message
      const message = this._personalizeMessage(template.content, contact);

      // Send via WhatsApp
      if (this.whatsappManager) {
        const sent = await this.whatsappManager.sendMessage(contact.phone, message);
        
        if (sent) {
          // Record campaign sent in contact mapper
          await this.securityContactMapper.recordCampaignSent(contact.phone, campaign.campaignId);
          
          // Record recipient
          campaign.recipients.push({
            phone: contact.phone,
            name: contact.name,
            sentAt: new Date().toISOString(),
            status: 'sent'
          });

          return { success: true };
        }
      } else {
        // Fallback for testing
        campaign.recipients.push({
          phone: contact.phone,
          name: contact.name,
          sentAt: new Date().toISOString(),
          status: 'test'
        });
        return { success: true };
      }

      return { success: false };

    } catch (error) {
      logger.warn(`⚠️ Failed to send to ${contact.name}: ${error.message}`);
      campaign.recipients.push({
        phone: contact.phone,
        name: contact.name,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      return { success: false };
    }
  }

  /**
   * Personalize message template with contact variables
   * @private
   */
  _personalizeMessage(template, contact) {
    let message = template;

    // Replace common variables
    message = message.replace(/\{\{contactName\}\}/gi, contact.name);
    message = message.replace(/\{\{phone\}\}/gi, contact.phone);
    message = message.replace(/\{\{organization\}\}/gi, contact.organization || '');

    // Replace role-specific variables
    contact.roles?.forEach(role => {
      message = message.replace(new RegExp(`\\{\\{${role}\\}\\}`, 'gi'), role.replace('_', ' '));
    });

    // Replace location variables
    contact.assignedLocations?.forEach(location => {
      message = message.replace(new RegExp(`\\{\\{${location}\\}\\}`, 'gi'), location.replace('_', ' '));
    });

    return message;
  }

  /**
   * Extract variables from template
   * @private
   */
  _extractVariables(template) {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Sleep utility for delays
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all campaigns
   * @returns {Array} Campaign objects
   */
  getAllCampaigns() {
    return Array.from(this.campaigns.values());
  }

  /**
   * Get all templates
   * @returns {Array} Template objects
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get campaign report
   * @param {string} campaignId - Campaign ID
   * @returns {object} Campaign report
   */
  getCampaignReport(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return null;
    }

    return {
      campaignId: campaign.campaignId,
      name: campaign.name,
      status: campaign.status,
      createdAt: campaign.createdAt,
      startedAt: campaign.execution.startedAt,
      completedAt: campaign.execution.completedAt,
      targeting: campaign.targeting,
      execution: campaign.execution,
      recipients: campaign.recipients,
      report: {
        totalSent: campaign.execution.sent,
        totalFailed: campaign.execution.failed,
        totalSkipped: campaign.execution.skipped,
        totalRecipients: campaign.execution.totalRecipients,
        successRate: campaign.execution.totalRecipients > 0
          ? ((campaign.execution.sent / campaign.execution.totalRecipients) * 100).toFixed(1)
          : 0
      }
    };
  }

  /**
   * Get statistics
   * @returns {object} Manager statistics
   */
  getStatistics() {
    const campaigns = Array.from(this.campaigns.values());
    const completed = campaigns.filter(c => c.status === 'completed');
    
    let totalSent = 0;
    let totalFailed = 0;

    completed.forEach(c => {
      totalSent += c.execution.sent || 0;
      totalFailed += c.execution.failed || 0;
    });

    return {
      totalCampaigns: campaigns.length,
      completedCampaigns: completed.length,
      draftCampaigns: campaigns.filter(c => c.status === 'draft').length,
      runningCampaigns: campaigns.filter(c => c.status === 'running').length,
      totalTemplates: this.templates.size,
      totalMessagesSent: totalSent,
      totalMessagesFailed: totalFailed,
      overallSuccessRate: totalSent + totalFailed > 0
        ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Persist campaigns to file
   * @private
   */
  async _persistCampaigns() {
    try {
      const data = {
        campaigns: Array.from(this.campaigns.values()),
        templates: Array.from(this.templates.values()),
        totalCampaigns: this.campaigns.size,
        totalTemplates: this.templates.size,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      const dir = path.dirname(this.campaignsDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.campaignsDbPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      logger.info(`✅ Campaigns persisted (${this.campaigns.size} campaigns)`);
    } catch (error) {
      logger.error(`❌ Failed to persist campaigns: ${error.message}`);
    }
  }
}

export default BulkCampaignManager;
