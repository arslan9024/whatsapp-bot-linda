/**
 * ContactsSyncService.js
 * Manages lightweight phone number references in MongoDB
 * Tracks sync status with Google Contacts
 * 
 * Storage Strategy:
 * - MongoDB: Phone number + metadata only (lightweight)
 * - Google: Full contact details (source of truth)
 * - Link: googleContactId bridges the two systems
 */

import { ContactReference } from '../Database/schemas.js';
import { validateContactNumber } from '../Contacts/validateContactNumber.js';

class ContactsSyncService {
  /**
   * Initialize service (optional - for cache setup)
   */
  async initialize() {
    try {
      console.log('✅ ContactsSyncService initialized');
    } catch (error) {
      console.error('Error initializing ContactsSyncService:', error);
      throw error;
    }
  }

  /**
   * Check if phone number exists in MongoDB
   * @param {string} phoneNumber - Raw phone number
   * @returns {Promise<boolean>} - True if exists
   */
  async checkIfPhoneExists(phoneNumber) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      const contact = await ContactReference.findOne({ phoneNumber: cleanPhone });
      return !!contact;
    } catch (error) {
      console.error('Error checking phone existence:', error);
      return false;
    }
  }

  /**
   * Get contact reference by phone number
   * @param {string} phoneNumber - Phone to search
   * @returns {Promise<Object|null>} - Contact reference or null
   */
  async getContactReference(phoneNumber) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      const contact = await ContactReference.findOne({ phoneNumber: cleanPhone });
      
      if (contact) {
        // Update interaction tracking
        contact.interactionCount = (contact.interactionCount || 0) + 1;
        contact.lastInteractionAt = new Date();
        await contact.save();
      }
      
      return contact;
    } catch (error) {
      console.error('Error getting contact reference:', error);
      return null;
    }
  }

  /**
   * Create new contact reference (only if doesn't exist)
   * @param {string} phoneNumber - Phone to add
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Created or existing contact reference
   */
  async createContactReference(phoneNumber, options = {}) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      
      // Check if already exists
      let contact = await ContactReference.findOne({ phoneNumber: cleanPhone });
      if (contact) {
        return contact; // Already exists
      }

      // Create new reference
      const countryCode = options.countryCode || this._extractCountryCode(cleanPhone);
      
      contact = new ContactReference({
        phoneNumber: cleanPhone,
        countryCode: countryCode,
        formattedPhone: this._formatPhoneDisplay(cleanPhone, countryCode),
        syncedToGoogle: false,
        googleContactId: options.googleContactId || null,
        source: options.source || 'whatsapp_message',
        metadata: {
          importedFrom: options.importedFrom || 'linda_bot',
          notes: options.notes || '',
        },
      });

      await contact.save();
      console.log(`✅ Created contact reference: ${cleanPhone}`);
      return contact;
    } catch (error) {
      console.error('Error creating contact reference:', error);
      throw error;
    }
  }

  /**
   * Update sync status after successful Google sync
   * @param {string} phoneNumber - Phone number
   * @param {string} googleContactId - Google's contact ID
   * @returns {Promise<Object>} - Updated contact reference
   */
  async updateSyncStatus(phoneNumber, googleContactId) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      
      const contact = await ContactReference.findOneAndUpdate(
        { phoneNumber: cleanPhone },
        {
          $set: {
            googleContactId: googleContactId,
            syncedToGoogle: true,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          }
        },
        { new: true }
      );

      if (contact) {
        console.log(`✅ Updated sync status for: ${cleanPhone}`);
      }
      return contact;
    } catch (error) {
      console.error('Error updating sync status:', error);
      throw error;
    }
  }

  /**
   * Get all unsynced contacts (for background sync)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of unsynced contacts
   */
  async getAllUnsynced(options = {}) {
    try {
      const limit = options.limit || 100;
      const contacts = await ContactReference.find({
        syncedToGoogle: false,
      })
        .sort({ createdAt: 1 })
        .limit(limit);

      return contacts;
    } catch (error) {
      console.error('Error getting unsynced contacts:', error);
      return [];
    }
  }

  /**
   * Get contacts that need refresh (older than X hours)
   * @param {number} hoursSinceSync - Hours threshold
   * @returns {Promise<Array>} - Contacts needing refresh
   */
  async getNeedsRefresh(hoursSinceSync = 24) {
    try {
      const cutoffDate = new Date(Date.now() - hoursSinceSync * 60 * 60 * 1000);
      
      const contacts = await ContactReference.find({
        syncedToGoogle: true,
        $or: [
          { lastSyncedAt: { $lt: cutoffDate } },
          { lastSyncedAt: null },
        ]
      })
        .sort({ lastSyncedAt: 1 })
        .limit(50);

      return contacts;
    } catch (error) {
      console.error('Error getting contacts needing refresh:', error);
      return [];
    }
  }

  /**
   * Update contact with cached details from Google
   * @param {string} phoneNumber - Phone number
   * @param {Object} details - Cached contact details {name, email, etc}
   * @returns {Promise<Object>} - Updated contact
   */
  async updateCachedDetails(phoneNumber, details) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      
      const contact = await ContactReference.findOneAndUpdate(
        { phoneNumber: cleanPhone },
        {
          $set: {
            name: details.name || null,
            email: details.email || null,
            updatedAt: new Date(),
          }
        },
        { new: true }
      );

      return contact;
    } catch (error) {
      console.error('Error updating cached details:', error);
      throw error;
    }
  }

  /**
   * Get recent interactions (for analytics/history)
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} - Recent contacts
   */
  async getRecentInteractions(days = 7) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const contacts = await ContactReference.find({
        lastInteractionAt: { $gte: cutoffDate }
      })
        .sort({ lastInteractionAt: -1 })
        .limit(100);

      return contacts;
    } catch (error) {
      console.error('Error getting recent interactions:', error);
      return [];
    }
  }

  /**
   * Delete contact reference (if needed)
   * @param {string} phoneNumber - Phone to delete
   * @returns {Promise<Object>} - Deleted document
   */
  async deleteContact(phoneNumber) {
    try {
      const cleanPhone = this._normalizePhone(phoneNumber);
      const deleted = await ContactReference.findOneAndDelete({ phoneNumber: cleanPhone });
      
      if (deleted) {
        console.log(`✅ Deleted contact reference: ${cleanPhone}`);
      }
      return deleted;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get statistics about contacts
   * @returns {Promise<Object>} - Contact statistics
   */
  async getStatistics() {
    try {
      const total = await ContactReference.countDocuments();
      const synced = await ContactReference.countDocuments({ syncedToGoogle: true });
      const unsynced = await ContactReference.countDocuments({ syncedToGoogle: false });
      
      return {
        totalContacts: total,
        syncedContacts: synced,
        unsyncedContacts: unsynced,
        syncPercentage: total > 0 ? Math.round((synced / total) * 100) : 0,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  /**
   * Clean up duplicate or invalid entries
   * @returns {Promise<Object>} - Cleanup results
   */
  async cleanup() {
    try {
      // Remove duplicates (keep oldest)
      const duplicates = await ContactReference.aggregate([
        {
          $group: {
            _id: '$phoneNumber',
            count: { $sum: 1 },
            ids: { $push: '$_id' }
          }
        },
        { $match: { count: { $gt: 1 } } }
      ]);

      let removed = 0;
      for (const dup of duplicates) {
        // Keep first, remove rest
        const toRemove = dup.ids.slice(1);
        await ContactReference.deleteMany({ _id: { $in: toRemove } });
        removed += toRemove.length;
      }

      console.log(`✅ Cleanup complete: removed ${removed} duplicate entries`);
      return { duplicatesRemoved: removed };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { error: error.message };
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Normalize phone number (remove non-digits, add country code if needed)
   */
  _normalizePhone(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If too short, likely already has country code or error
    if (cleaned.length < 7) {
      return cleaned;
    }

    // If doesn't start with country code, add UAE default
    if (!cleaned.startsWith('971') && !cleaned.match(/^[1-9]\d{1,3}/)) {
      cleaned = '971' + cleaned.slice(-9); // Take last 9 digits
    }

    return cleaned;
  }

  /**
   * Extract country code from phone number
   */
  _extractCountryCode(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Common patterns
    if (cleaned.startsWith('971')) return '971'; // UAE
    if (cleaned.startsWith('92')) return '92';   // Pakistan
    if (cleaned.startsWith('91')) return '91';   // India
    if (cleaned.startsWith('966')) return '966'; // Saudi
    
    return '971'; // Default to UAE
  }

  /**
   * Format phone for display
   */
  _formatPhoneDisplay(phoneNumber, countryCode) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Format as +971 50 123 4567
    if (cleaned.length === 12 && cleaned.startsWith(countryCode)) {
      const code = cleaned.slice(0, 3);
      const area = cleaned.slice(3, 5);
      const num1 = cleaned.slice(5, 8);
      const num2 = cleaned.slice(8);
      return `+${code} ${area} ${num1} ${num2}`;
    }

    return `+${countryCode} ${cleaned.slice(countryCode.length)}`;
  }
}

export default new ContactsSyncService();
