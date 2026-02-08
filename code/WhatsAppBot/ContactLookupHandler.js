/**
 * ContactLookupHandler.js
 * Provides contact lookup and management for Linda WhatsApp Bot
 * 
 * This handler:
 * 1. Receives phone numbers from bot messages
 * 2. Checks MongoDB for reference
 * 3. Fetches full details from Google on-demand
 * 4. Returns contact information for bot responses
 */

import ContactsSyncService from '../Services/ContactsSyncService.js';
import GoogleContactsBridge from '../GoogleAPI/GoogleContactsBridge.js';
import { validateContactNumber } from '../Contacts/validateContactNumber.js';

class ContactLookupHandler {
  constructor() {
    this.bridge = null;
    this.initialized = false;
  }

  /**
   * Initialize the contact lookup handler
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.bridge = new GoogleContactsBridge();
      await this.bridge.initialize();
      this.initialized = true;
      console.log('✅ ContactLookupHandler initialized');
    } catch (error) {
      console.error('Error initializing ContactLookupHandler:', error);
      throw error;
    }
  }

  /**
   * Ensure handler is initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Main lookup method - returns full contact details
   * @param {string} phoneNumber - Phone to look up
   * @returns {Promise<Object>} - Contact details or null
   */
  async lookupContact(phoneNumber) {
    try {
      await this._ensureInitialized();

      // Validate and format phone
      const validPhone = this._validatePhone(phoneNumber);
      if (!validPhone) {
        return {
          success: false,
          error: 'Invalid phone number format',
          phone: phoneNumber,
        };
      }

      // Phase 1: Check MongoDB for reference
      let mongoRef = await ContactsSyncService.getContactReference(validPhone);

      if (!mongoRef) {
        // New contact - create reference
        mongoRef = await ContactsSyncService.createContactReference(validPhone, {
          source: 'whatsapp_lookup',
        });
      }

      // Phase 2: Get full details from Google
      let googleContact = null;

      if (mongoRef.googleContactId) {
        // Direct lookup if we have the ID
        googleContact = await this.bridge.fetchContactById(mongoRef.googleContactId);
      }

      if (!googleContact) {
        // Search if no ID or lookup failed
        googleContact = await this.bridge.fetchContactByPhone(validPhone);
      }

      if (googleContact) {
        // Found in Google - update MongoDB with ID if new
        if (!mongoRef.googleContactId) {
          await ContactsSyncService.updateSyncStatus(
            validPhone,
            googleContact.googleContactId
          );
        }

        // Cache details
        await ContactsSyncService.updateCachedDetails(validPhone, {
          name: googleContact.name,
          email: googleContact.primaryEmail,
        });

        return {
          success: true,
          type: 'found',
          phone: validPhone,
          googleContactId: googleContact.googleContactId,
          contact: {
            name: googleContact.name,
            phones: googleContact.phoneNumbers,
            emails: googleContact.emails,
            photo: googleContact.photo,
          },
          isSynced: true,
        };
      } else {
        // Not found in Google yet - will be created by background sync
        return {
          success: true,
          type: 'not_found',
          phone: validPhone,
          contact: {
            name: null,
            phones: [{ value: validPhone, type: 'mobile' }],
            emails: [],
          },
          isSynced: false,
          message: 'Contact not in Google - will be added during next sync',
        };
      }
    } catch (error) {
      console.error('Error in lookupContact:', error);
      return {
        success: false,
        error: error.message,
        phone: phoneNumber,
      };
    }
  }

  /**
   * Quick check if phone is in contacts
   * @param {string} phoneNumber - Phone to check
   * @returns {Promise<boolean>} - True if in contacts
   */
  async phoneExists(phoneNumber) {
    try {
      const validPhone = this._validatePhone(phoneNumber);
      if (!validPhone) return false;

      return await ContactsSyncService.checkIfPhoneExists(validPhone);
    } catch (error) {
      console.error('Error checking phone existence:', error);
      return false;
    }
  }

  /**
   * Get contact by any identifier (phone, email, ID)
   * @param {string} identifier - Phone, email, or Google contact ID
   * @returns {Promise<Object|null>} - Contact details
   */
  async getContact(identifier) {
    try {
      await this._ensureInitialized();

      let contact = null;

      // Try phone first (most common)
      if (identifier.match(/^\d+/)) {
        const validPhone = this._validatePhone(identifier);
        if (validPhone) {
          contact = await this.bridge.fetchContactByPhone(validPhone);
          if (contact) return this._formatResponse(contact, validPhone);
        }
      }

      // Try Google ID
      if (identifier.startsWith('c')) {
        contact = await this.bridge.fetchContactById(identifier);
        if (contact) return this._formatResponse(contact);
      }

      // Try search (name, email, etc)
      const results = await this.bridge.searchContacts(identifier);
      if (results.length > 0) {
        return this._formatResponse(results[0]);
      }

      return null;
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }

  /**
   * Save new contact to Google
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} - Result
   */
  async saveContact(contactData) {
    try {
      await this._ensureInitialized();

      // Validate phone
      const validPhone = this._validatePhone(contactData.phone);
      if (!validPhone) {
        return {
          success: false,
          error: 'Invalid phone number',
        };
      }

      // Check if already exists
      const exists = await ContactsSyncService.checkIfPhoneExists(validPhone);
      if (exists) {
        return {
          success: false,
          error: 'Contact already exists',
          phone: validPhone,
        };
      }

      // Create in Google
      const googleContact = await this.bridge.createContact({
        name: contactData.name || `Contact ${validPhone}`,
        phoneNumbers: [{
          value: validPhone,
          type: 'mobile',
        }],
        emails: contactData.email ? [{ value: contactData.email }] : [],
        source: contactData.source || 'whatsapp_bot_linda',
        notes: contactData.notes || '',
      });

      if (!googleContact) {
        return {
          success: false,
          error: 'Failed to create in Google',
        };
      }

      // Save to MongoDB
      await ContactsSyncService.createContactReference(validPhone, {
        googleContactId: googleContact.googleContactId,
        source: 'whatsapp_save',
      });

      return {
        success: true,
        contact: googleContact,
        message: `Saved contact: ${googleContact.name}`,
      };
    } catch (error) {
      console.error('Error saving contact:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update existing contact
   * @param {string} phoneNumber - Contact phone
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Result
   */
  async updateContact(phoneNumber, updates) {
    try {
      await this._ensureInitialized();

      const validPhone = this._validatePhone(phoneNumber);
      if (!validPhone) {
        return { success: false, error: 'Invalid phone number' };
      }

      // Get MongoDB reference
      const mongoRef = await ContactsSyncService.getContactReference(validPhone);
      if (!mongoRef || !mongoRef.googleContactId) {
        return { success: false, error: 'Contact not found' };
      }

      // Update in Google
      const updated = await this.bridge.updateContact(
        mongoRef.googleContactId,
        updates
      );

      if (!updated) {
        return { success: false, error: 'Failed to update contact' };
      }

      // Update cache in MongoDB
      if (updates.names || updates.names?.[0]?.displayName) {
        const name = updates.names?.[0]?.displayName || updated.name;
        await ContactsSyncService.updateCachedDetails(validPhone, { name });
      }

      return {
        success: true,
        contact: updated,
        message: 'Contact updated',
      };
    } catch (error) {
      console.error('Error updating contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete contact
   * @param {string} phoneNumber - Contact phone
   * @returns {Promise<Object>} - Result
   */
  async deleteContact(phoneNumber) {
    try {
      await this._ensureInitialized();

      const validPhone = this._validatePhone(phoneNumber);
      if (!validPhone) {
        return { success: false, error: 'Invalid phone number' };
      }

      // Get MongoDB reference
      const mongoRef = await ContactsSyncService.getContactReference(validPhone);
      if (!mongoRef || !mongoRef.googleContactId) {
        return { success: false, error: 'Contact not found' };
      }

      // Delete from Google
      const deleted = await this.bridge.deleteContact(mongoRef.googleContactId);
      if (!deleted) {
        return { success: false, error: 'Failed to delete contact' };
      }

      // Delete from MongoDB
      await ContactsSyncService.deleteContact(validPhone);

      return {
        success: true,
        message: `Deleted contact: ${validPhone}`,
      };
    } catch (error) {
      console.error('Error deleting contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format response for WhatsApp message
   * @param {Object} contact - Contact details
   * @param {string} phone - Phone number (optional)
   * @returns {string} - Formatted text response
   */
  formatContactForMessage(contact) {
    if (!contact) return 'Contact not found';

    let message = `*${contact.name}*\n\n`;

    // Phones
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      message += '📱 *Phones:*\n';
      contact.phoneNumbers.forEach(p => {
        message += `  • ${p.formattedValue || p.value} (${p.type})\n`;
      });
      message += '\n';
    }

    // Emails
    if (contact.emails && contact.emails.length > 0) {
      message += '📧 *Emails:*\n';
      contact.emails.forEach(e => {
        message += `  • ${e.value} (${e.type})\n`;
      });
      message += '\n';
    }

    return message;
  }

  /**
   * Get contact statistics
   * @returns {Promise<Object>} - Statistics
   */
  async getStatistics() {
    try {
      return await ContactsSyncService.getStatistics();
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Validate and format phone number
   */
  _validatePhone(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }

    // Remove non-digits
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Must be at least 7 digits
    if (cleaned.length < 7) {
      return null;
    }

    // Add country code if missing
    let final = cleaned;
    if (!cleaned.match(/^(971|92|91|966)/)) {
      final = '971' + cleaned.slice(-9); // Assume UAE, take last 9 digits
    }

    return final;
  }

  /**
   * Format contact response object
   */
  _formatResponse(contact, phone = null) {
    return {
      success: true,
      contact: {
        name: contact.name,
        googleContactId: contact.googleContactId,
        phones: contact.phoneNumbers,
        emails: contact.emails,
        photo: contact.photo,
      },
      phone: phone || contact.primaryPhone,
    };
  }
}

export default new ContactLookupHandler();
