import campaignService from './CampaignService.js';
import contactFilterService from './ContactFilterService.js';
import campaignRateLimiter from './CampaignRateLimiter.js';
import campaignMessageDelayer from './CampaignMessageDelayer.js';
import { ContactLookupHandler } from '../WhatsAppBot/ContactLookupHandler.js';
import { sendMessageWithReport } from '../Message/sendMessageWithReport.js';
import { SelectingBotForCampaign } from '../Message/SelectingBotForCampaign.js';
import { Logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('CampaignExecutor');

/**
 * CampaignExecutor - Orchestrates the full campaign send flow
 * 
 * Workflow:
 * 1. Load campaign definition
 * 2. Get daily limit tracker
 * 3. Filter contacts by name pattern
 * 4. Distribute to agents (round-robin)
 * 5. For each contact:
 *    - Check rate limit
 *    - Get contact details
 *    - Personalize message
 *    - Send via WhatsApp
 *    - Record result
 *    - Apply intelligent delay
 * 6. Store execution results
 */
class CampaignExecutor {
  
  constructor() {
    this.executionId = null;
    this.campaignId = null;
    this.results = {
      campaignId: null,
      executionId: null,
      startedAt: null,
      completedAt: null,
      totalContacts: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      failureReasons: [],
      agentAssignments: {},
      executionLog: []
    };
  }
  
  /**
   * Execute a campaign send
   * 
   * @param {string} campaignId - Campaign ID to execute
   * @param {string} accountPhone - WhatsApp account phone to send from
   * @param {number} maxMessages - Max messages to send today
   * @param {Array} agents - Available WhatsApp clients
   * 
   * @returns {Object} Execution results
   */
  async executeCampaign(campaignId, accountPhone, maxMessages = 10, agents = []) {
    try {
      this.executionId = uuidv4();
      this.campaignId = campaignId;
      
      // Initialize results object
      this.results = {
        campaignId,
        executionId: this.executionId,
        startedAt: new Date(),
        completedAt: null,
        totalContacts: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        failureReasons: [],
        agentAssignments: {},
        executionLog: [],
        details: {
          accountPhone,
          maxMessages,
          agentCount: agents.length
        }
      };
      
      logger.info(`[${this.executionId}] Starting campaign execution: ${campaignId}`);
      
      // ========== STEP 1: Load campaign ==========
      const campaignResult = await CampaignService.getCampaignById(campaignId);
      if (!campaignResult.success) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }
      
      const campaign = campaignResult.campaign;
      const { targetFilters, limits, messageTemplate } = campaign;
      
      this._log(`Campaign loaded: ${campaign.name}`);
      
      // ========== STEP 2: Get daily limit tracker ==========
      const limitResult = await CampaignService.getOrCreateDailyLimit(campaignId, accountPhone);
      if (!limitResult.success) {
        throw new Error('Failed to retrieve daily limit');
      }
      
      const dailyLimit = limitResult.dailyLimit;
      const remaining = Math.max(0, maxMessages - dailyLimit.sentCount);
      
      this._log(`Daily limit: ${dailyLimit.sentCount}/${maxMessages} sent, ${remaining} remaining`);
      
      if (remaining === 0) {
        this._log('Daily limit reached, skipping execution');
        this.results.completedAt = new Date();
        return this.results;
      }
      
      // ========== STEP 3: Filter contacts ==========
      this._log('Filtering contacts by pattern...');
      
      const contacts = await ContactFilterService.getCampaignTargets({
        namePattern: targetFilters.namePattern,
        tags: targetFilters.tags,
        minInteractions: targetFilters.minInteractions,
        caseSensitive: targetFilters.caseSensitive,
        limit: remaining  // Only get as many as we can send today
      });
      
      this.results.totalContacts = contacts.length;
      this._log(`Found ${contacts.length} target contacts`);
      
      if (contacts.length === 0) {
        logger.warn(`[${this.executionId}] No contacts found for campaign`);
        this.results.completedAt = new Date();
        return this.results;
      }
      
      // ========== STEP 4-5: Send messages with rate limiting ==========
      CampaignMessageDelayer.resetBatchCounter();
      
      for (let i = 0; i < Math.min(contacts.length, remaining); i++) {
        const contact = contacts[i];
        
        try {
          // Check campaign & account rate limits
          const rateCheckResult = await CampaignRateLimiter.canSendMessage(
            campaignId,
            accountPhone,
            maxMessages
          );
          
          if (!rateCheckResult.allowed) {
            this._log(`Rate limit: ${rateCheckResult.reason}`);
            this.results.skippedCount++;
            this._recordFailure(contact, rateCheckResult.reason);
            break; // Stop sending for today
          }
          
          // Select agent (round-robin)
          const agentIndex = i % agents.length;
          const agent = agents[agentIndex];
          
          if (!agent) {
            throw new Error('No agents available');
          }
          
          // Get contact details from Google
          let contactName = contact.name;
          try {
            const contactDetails = await ContactLookupHandler.getContact(contact.googleId);
            if (contactDetails?.name) {
              contactName = contactDetails.name;
            }
          } catch (error) {
            logger.warn(`Failed to get contact details: ${error.message}`);
          }
          
          // Personalize message
          const message = this._personalizeMessage(
            messageTemplate.text,
            { name: contactName, phone: contact.phone, date: new Date() }
          );
          
          this._log(`Sending to ${contactName} (${contact.phone})...`);
          
          // Send message
          const sendResult = await sendMessageWithReport(
            contact.phone,
            agent,
            message
          );
          
          if (sendResult?.success) {
            this.results.successCount++;
            
            // Record in campaign service
            await CampaignService.recordMessageSent(
              campaignId,
              contact.phone,
              contactName,
              message,
              accountPhone
            );
            
            this._log(`✓ Sent to ${contactName}`);
            
            // Record agent assignment
            if (!this.results.agentAssignments[agentIndex]) {
              this.results.agentAssignments[agentIndex] = { assigned: 0, sent: 0, failed: 0 };
            }
            this.results.agentAssignments[agentIndex].assigned++;
            this.results.agentAssignments[agentIndex].sent++;
          } else {
            this.results.failureCount++;
            
            // Record as failed for retry
            const failureReason = sendResult?.error?.message || 'Unknown error';
            await CampaignService.recordMessageFailed(
              campaignId,
              accountPhone,
              contact.phone,
              contactName,
              message,
              failureReason
            );
            
            this._log(`✗ Failed to send to ${contactName}: ${failureReason}`);
            this._recordFailure(contact, failureReason);
            
            // Record failure
            if (!this.results.agentAssignments[agentIndex]) {
              this.results.agentAssignments[agentIndex] = { assigned: 0, sent: 0, failed: 0 };
            }
            this.results.agentAssignments[agentIndex].assigned++;
            this.results.agentAssignments[agentIndex].failed++;
          }
          
          // Apply intelligent delay before next message
          const delay = await CampaignMessageDelayer.getMessageDelay();
          await CampaignMessageDelayer.wait(delay);
          
        } catch (error) {
          logger.error(`Error sending to contact ${contact.phone}: ${error.message}`);
          this.results.failureCount++;
          this._recordFailure(contact, error.message);
        }
      }
      
      // ========== STEP 6: Complete execution ==========
      this.results.completedAt = new Date();
      
      logger.info(`[${this.executionId}] Campaign execution completed`);
      logger.info(`Results: ${this.results.successCount} sent, ${this.results.failureCount} failed, ${this.results.skippedCount} skipped`);
      
      return this.results;
      
    } catch (error) {
      logger.error(`[${this.executionId}] Campaign execution failed: ${error.message}`);
      this.results.completedAt = new Date();
      this.results.error = error.message;
      return this.results;
    }
  }
  
  /**
   * Personalize message with contact data
   * Replaces {name}, {phone}, {date}, etc.
   * @private
   */
  _personalizeMessage(template, data) {
    let message = template;
    
    // Replace placeholders
    if (data.name) {
      message = message.replace(/{name}/gi, data.name);
    }
    if (data.phone) {
      message = message.replace(/{phone}/gi, data.phone);
    }
    if (data.date) {
      const dateStr = data.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      message = message.replace(/{date}/gi, dateStr);
    }
    
    return message;
  }
  
  /**
   * Record execution log entry
   * @private
   */
  _log(message) {
    const logEntry = {
      timestamp: new Date(),
      message
    };
    
    this.results.executionLog.push(logEntry);
    logger.debug(`[${this.executionId}] ${message}`);
  }
  
  /**
   * Record failure reason
   * @private
   */
  _recordFailure(contact, reason) {
    this.results.failureReasons.push({
      contact: contact.phone,
      contactName: contact.name,
      reason,
      timestamp: new Date()
    });
  }
  
  /**
   * Get execution summary
   */
  getSummary() {
    if (!this.results.startedAt) {
      return null;
    }
    
    const durationMs = (this.results.completedAt || new Date()) - this.results.startedAt;
    const durationSec = Math.round(durationMs / 1000);
    
    return {
      executionId: this.results.executionId,
      campaignId: this.results.campaignId,
      status: this.results.completedAt ? 'completed' : 'running',
      duration: `${durationSec}s`,
      totalContacts: this.results.totalContacts,
      successCount: this.results.successCount,
      failureCount: this.results.failureCount,
      skippedCount: this.results.skippedCount,
      successRate: this.results.totalContacts > 0
        ? (this.results.successCount / this.results.totalContacts * 100).toFixed(2) + '%'
        : '0%',
      messagesPerSecond: durationSec > 0
        ? (this.results.successCount / durationSec).toFixed(2)
        : '0',
      startedAt: this.results.startedAt,
      completedAt: this.results.completedAt,
      agents: this.results.agentAssignments
    };
  }
  
  /**
   * Get full execution results
   */
  getResults() {
    return this.results;
  }
}

export default new CampaignExecutor();
