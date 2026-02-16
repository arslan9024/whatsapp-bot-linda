import { ContactLookupHandler } from '../WhatsAppBot/ContactLookupHandler.js';
import { ContactReference } from '../Database/MessageSchema.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('ContactFilterService');

/**
 * ContactFilterService - Smart contact filtering and search
 * Handles filtering contacts for campaigns based on name patterns, tags, etc.
 */
class ContactFilterService {
  
  /**
   * Get campaign targets by filtering contacts
   * 
   * @param {Object} filters - Filter criteria
   *   - namePattern: String to search in contact names (case-insensitive)
   *   - tags: Array of tags to include
   *   - minInteractions: Minimum interaction count
   *   - excludeNumbers: Array of phone numbers to exclude
   *   - limit: Maximum contacts to return
   *   - caseSensitive: Whether name matching is case-sensitive
   * 
   * @returns Array of {phone, name, googleId, interactionCount, lastInteractedAt}
   */
  async getCampaignTargets(filters = {}) {
    try {
      logger.info(`Filtering contacts with pattern: ${filters.namePattern}`);
      
      const query = {};
      
      // Build MongoDB query
      if (filters.excludeNumbers && filters.excludeNumbers.length > 0) {
        query.phoneNumber = { $nin: filters.excludeNumbers };
      }
      
      if (filters.minInteractions) {
        query.interactionCount = { $gte: filters.minInteractions };
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query['metadata.tags'] = { $in: filters.tags };
      }
      
      // Fetch contacts from MongoDB
      let contacts = await ContactReference.find(query)
        .limit(filters.limit || 1000)
        .lean();
      
      logger.debug(`Found ${contacts.length} contacts in MongoDB`);
      
      // If no name pattern, return as-is
      if (!filters.namePattern) {
        return this._formatContacts(contacts);
      }
      
      // Filter by name pattern
      contacts = await this._filterByNamePattern(
        contacts,
        filters.namePattern,
        filters.caseSensitive === true
      );
      
      logger.info(`Filtered to ${contacts.length} contacts matching pattern: "${filters.namePattern}"`);
      
      return this._formatContacts(contacts);
    } catch (error) {
      logger.error(`Failed to filter campaign targets: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Filter contacts by name pattern using Google Contacts
   * @private
   */
  async _filterByNamePattern(contacts, pattern, caseSensitive = false) {
    try {
      const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
      
      // Fetch full contact details from Google to get names
      const filteredContacts = [];
      
      for (const contact of contacts) {
        try {
          // Try to get name from MongoDB metadata first
          let name = contact.metadata?.name || contact.metadata?.displayName;
          
          // If no name in metadata, fetch from Google
          if (!name && contact.googleContactId) {
            const googleContact = await ContactLookupHandler.getContact(contact.googleContactId);
            name = googleContact?.name || '';
          }
          
          // Check if name matches pattern
          const nameToCheck = caseSensitive ? name : (name || '').toLowerCase();
          
          if (nameToCheck && nameToCheck.includes(searchPattern)) {
            filteredContacts.push({
              ...contact,
              name: name || contact.phoneNumber
            });
          }
        } catch (error) {
          // Log error but continue with next contact
          logger.debug(`Error checking contact ${contact.phoneNumber}: ${error.message}`);
        }
      }
      
      return filteredContacts;
    } catch (error) {
      logger.error(`Failed to filter by name pattern: ${error.message}`);
      return contacts; // Return unfiltered on error
    }
  }
  
  /**
   * Format contacts for campaign use
   * @private
   */
  _formatContacts(contacts) {
    return contacts.map(contact => ({
      phone: contact.phoneNumber,
      name: contact.metadata?.name || contact.phoneNumber,
      googleId: contact.googleContactId,
      interactionCount: contact.interactionCount || 0,
      lastInteractedAt: contact.lastInteractionAt,
      syncedToGoogle: contact.syncedToGoogle || false,
      metadata: contact.metadata
    }));
  }
  
  /**
   * Get uncontacted contacts for a campaign
   * (Contacts that haven't received this campaign's message yet)
   */
  async getUncontactedContacts(campaignId, filters = {}) {
    try {
      logger.info(`Getting uncontacted contacts for campaign: ${campaignId}`);
      
      // Import CampaignMessageLog
      const { CampaignMessageLog } = await import('../Database/CampaignSchema.js');
      
      // Get all contacts who have received this campaign message
      const contactedNumbers = await CampaignMessageLog.distinct('contactPhone', {
        campaignId,
        status: 'sent'
      });
      
      // Get targets excluding contacted numbers
      const targets = await this.getCampaignTargets({
        ...filters,
        excludeNumbers: contactedNumbers
      });
      
      logger.info(`Found ${targets.length} uncontacted targets for ${campaignId} (${contactedNumbers.length} already contacted)`);
      
      return targets;
    } catch (error) {
      logger.error(`Failed to get uncontacted contacts: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Search for specific contact
   */
  async searchContact(query) {
    try {
      // Try by phone first
      const contact = await ContactReference.findOne({
        phoneNumber: {
          $regex: query.replace(/\D/g, ''),
          $options: 'i'
        }
      }).lean();
      
      if (contact) {
        return this._formatContacts([contact])[0];
      }
      
      // Try by name if available
      const byName = await ContactReference.findOne({
        $or: [
          { 'metadata.name': { $regex: query, $options: 'i' } },
          { 'metadata.displayName': { $regex: query, $options: 'i' } }
        ]
      }).lean();
      
      if (byName) {
        return this._formatContacts([byName])[0];
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to search contact: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get contact count for a filter
   */
  async countContacts(filters = {}) {
    try {
      const targets = await this.getCampaignTargets({
        ...filters,
        limit: 10000
      });
      
      return targets.length;
    } catch (error) {
      logger.error(`Failed to count contacts: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Get contacts matching multiple patterns
   * Used for complex filtering (e.g., "D2" AND "security")
   */
  async getContactsMatchingPatterns(patterns, matchAll = false) {
    try {
      logger.debug(`Filtering by ${patterns.length} patterns (matchAll=${matchAll})`);
      
      const contacts = await ContactReference.find({}).lean();
      
      return contacts.filter(contact => {
        let name = (contact.metadata?.name || contact.phoneNumber).toLowerCase();
        
        if (matchAll) {
          // All patterns must match
          return patterns.every(p => name.includes(p.toLowerCase()));
        } else {
          // Any pattern matches
          return patterns.some(p => name.includes(p.toLowerCase()));
        }
      }).map(c => ({
        phone: c.phoneNumber,
        name: c.metadata?.name || c.phoneNumber,
        googleId: c.googleContactId
      }));
    } catch (error) {
      logger.error(`Failed to filter by multiple patterns: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get statistics on contact distribution
   * Useful for campaign planning
   */
  async getContactStatistics(filters = {}) {
    try {
      const targets = await this.getCampaignTargets(filters);
      
      if (targets.length === 0) {
        return {
          totalCount: 0,
          averageInteractions: 0,
          minInteractions: 0,
          maxInteractions: 0,
          lastInteractionDistribution: {}
        };
      }
      
      const interactions = targets.map(t => t.interactionCount || 0);
      const avgInteractions = interactions.reduce((a, b) => a + b, 0) / interactions.length;
      
      return {
        totalCount: targets.length,
        averageInteractions: avgInteractions.toFixed(2),
        minInteractions: Math.min(...interactions),
        maxInteractions: Math.max(...interactions),
        distribution: {
          highEngagement: targets.filter(t => (t.interactionCount || 0) >= 5).length,
          mediumEngagement: targets.filter(t => (t.interactionCount || 0) >= 2 && (t.interactionCount || 0) < 5).length,
          lowEngagement: targets.filter(t => (t.interactionCount || 0) < 2).length
        }
      };
    } catch (error) {
      logger.error(`Failed to get contact statistics: ${error.message}`);
      return {};
    }
  }
}

export default new ContactFilterService();
