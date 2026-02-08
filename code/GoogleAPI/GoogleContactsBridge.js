/**
 * GoogleContactsBridge.js
 * Interface with Google Contacts API via GorahaBot service account
 * 
 * This module handles all operations with Google Contacts:
 * - Reading contacts from goraha.properties@gmail.com
 * - Searching contacts by phone, email, or name
 * - Creating and updating contacts
 * - Syncing with MongoDB ContactReference collection
 */

import { google } from 'googleapis';
import MultiAccountManager from '../GoogleAPI/MultiAccountManager.js';

class GoogleContactsBridge {
  constructor() {
    this.manager = null;
    this.peopleAPI = null;
    this.accountName = 'GorahaBot';
    this.initialized = false;
  }

  /**
   * Initialize the bridge with GorahaBot account
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.manager = await MultiAccountManager.getInstance();
      
      // Switch to GorahaBot for all operations
      await this.manager.switchTo(this.accountName);
      const auth = this.manager.currentAuth;
      
      // Create People API client
      this.peopleAPI = google.people({
        version: 'v1',
        auth: auth,
      });

      this.initialized = true;
      console.log('✅ GoogleContactsBridge initialized with GorahaBot');
    } catch (error) {
      console.error('Error initializing GoogleContactsBridge:', error);
      throw error;
    }
  }

  /**
   * Ensure bridge is initialized before use
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Fetch contact by phone number (search)
   * @param {string} phoneNumber - Phone to search
   * @returns {Promise<Object|null>} - Contact object or null
   */
  async fetchContactByPhone(phoneNumber) {
    try {
      await this._ensureInitialized();

      // Search for contact with this phone
      const result = await this.peopleAPI.people.searchContacts({
        query: phoneNumber,
        readMask: 'names,phoneNumbers,emailAddresses,photos,notes',
      });

      if (result.data.results && result.data.results.length > 0) {
        // Return the first match
        const contact = result.data.results[0].person;
        return this._formatContactResponse(contact);
      }

      return null;
    } catch (error) {
      console.error('Error fetching contact by phone:', error);
      return null;
    }
  }

  /**
   * Fetch contact by Google contact ID (direct lookup)
   * @param {string} googleContactId - Google contact resource ID
   * @returns {Promise<Object|null>} - Contact object or null
   */
  async fetchContactById(googleContactId) {
    try {
      await this._ensureInitialized();

      const result = await this.peopleAPI.people.get({
        resourceName: `people/${googleContactId}`,
        personFields: 'names,phoneNumbers,emailAddresses,photos,notes,nicknames,biographies',
      });

      return this._formatContactResponse(result.data);
    } catch (error) {
      console.error('Error fetching contact by ID:', error);
      return null;
    }
  }

  /**
   * Fetch all contacts (paginated)
   * @param {Object} options - {pageSize: 50, pageToken: null}
   * @returns {Promise<Object>} - {contacts: [], nextPageToken: null, totalCount: 0}
   */
  async listAllContacts(options = {}) {
    try {
      await this._ensureInitialized();

      const pageSize = options.pageSize || 50;
      const pageToken = options.pageToken || null;

      const result = await this.peopleAPI.people.connections.list({
        resourceName: 'people/me',
        pageSize: pageSize,
        pageToken: pageToken,
        personFields: 'names,phoneNumbers,emailAddresses,photos,notes',
        sortOrder: 'FIRST_NAME_ASCENDING',
      });

      const contacts = (result.data.connections || []).map(conn => 
        this._formatContactResponse(conn.person)
      );

      return {
        contacts: contacts,
        nextPageToken: result.data.nextPageToken || null,
        totalCount: result.data.totalPeople || contacts.length,
      };
    } catch (error) {
      console.error('Error listing contacts:', error);
      return { contacts: [], nextPageToken: null, totalCount: 0 };
    }
  }

  /**
   * Search contacts by query (name, email, etc)
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of matching contacts
   */
  async searchContacts(query) {
    try {
      await this._ensureInitialized();

      const result = await this.peopleAPI.people.searchContacts({
        query: query,
        readMask: 'names,phoneNumbers,emailAddresses,photos,notes',
      });

      if (result.data.results) {
        return result.data.results.map(r => this._formatContactResponse(r.person));
      }

      return [];
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Create a new contact
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} - Created contact with resourceName
   */
  async createContact(contactData) {
    try {
      await this._ensureInitialized();

      // Prepare contact object for Google
      const googleContact = {
        names: contactData.names || [{
          givenName: contactData.name || 'Unknown',
          displayName: contactData.name || 'Unknown',
        }],
        phoneNumbers: contactData.phoneNumbers || [],
        emailAddresses: contactData.emails || [],
        notes: {
          value: this._buildNotes(contactData),
        },
      };

      const result = await this.peopleAPI.people.createContact({
        requestBody: {
          etag: '%EAkqAjoICAMYqL00B',
          ...googleContact,
        },
      });

      console.log(`✅ Created contact in Google: ${contactData.name || 'Unknown'}`);
      return this._formatContactResponse(result.data);
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   * @param {string} googleContactId - Google contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated contact
   */
  async updateContact(googleContactId, updates) {
    try {
      await this._ensureInitialized();

      // Fetch current contact to get etag
      const current = await this.fetchContactById(googleContactId);
      if (!current) {
        throw new Error('Contact not found');
      }

      // Prepare update
      const updateObject = {
        etag: current.etag,
        ...current,
        ...updates,
      };

      const result = await this.peopleAPI.people.updateContact({
        resourceName: current.resourceName,
        updatePersonFields: 'names,phoneNumbers,emailAddresses,notes',
        requestBody: updateObject,
      });

      console.log(`✅ Updated contact in Google: ${googleContactId}`);
      return this._formatContactResponse(result.data);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   * @param {string} googleContactId - Google contact ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteContact(googleContactId) {
    try {
      await this._ensureInitialized();

      await this.peopleAPI.people.deleteContact({
        resourceName: `people/${googleContactId}`,
      });

      console.log(`✅ Deleted contact from Google: ${googleContactId}`);
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Batch fetch contacts by IDs
   * @param {Array<string>} googleContactIds - Array of Google contact IDs
   * @returns {Promise<Array>} - Array of contacts
   */
  async batchFetchContacts(googleContactIds) {
    try {
      await this._ensureInitialized();

      const contacts = [];
      for (const contactId of googleContactIds) {
        const contact = await this.fetchContactById(contactId);
        if (contact) {
          contacts.push(contact);
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error batch fetching contacts:', error);
      return [];
    }
  }

  /**
   * Get contact's detailed info
   * @param {string} identifier - Phone, email, or googleContactId
   * @returns {Promise<Object|null>} - Full contact details
   */
  async getContactDetails(identifier) {
    try {
      // Try as Google Contact ID first
      if (identifier.startsWith('c')) {
        return await this.fetchContactById(identifier);
      }

      // Try as phone
      if (identifier.match(/^\d+/)) {
        return await this.fetchContactByPhone(identifier);
      }

      // Try as email or name
      return (await this.searchContacts(identifier))[0] || null;
    } catch (error) {
      console.error('Error getting contact details:', error);
      return null;
    }
  }

  /**
   * Get account info (for verification)
   * @returns {Promise<Object>} - Account details
   */
  async getAccountInfo() {
    try {
      await this._ensureInitialized();

      const result = await this.peopleAPI.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos',
      });

      return {
        name: result.data.names?.[0]?.displayName || 'Unknown',
        email: result.data.emailAddresses?.[0]?.value || 'Unknown',
        resourceName: result.data.resourceName,
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      return null;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Format Google contact response to consistent structure
   */
  _formatContactResponse(googleContact) {
    if (!googleContact) return null;

    const names = googleContact.names || [];
    const phones = googleContact.phoneNumbers || [];
    const emails = googleContact.emailAddresses || [];
    const notes = googleContact.notes?.[0]?.value || '';

    return {
      googleContactId: googleContact.resourceName?.split('/')?.pop(),
      resourceName: googleContact.resourceName,
      etag: googleContact.etag,
      

      name: names[0]?.displayName || names[0]?.givenName || 'Unknown',
      givenName: names[0]?.givenName,
      familyName: names[0]?.familyName,

      phoneNumbers: phones.map(p => ({
        value: p.value,
        type: p.type || 'unspecified',
        formattedValue: p.canonicalForm,
      })),

      emails: emails.map(e => ({
        value: e.value,
        type: e.type || 'unspecified',
      })),

      primaryPhone: phones[0]?.value || null,
      primaryEmail: emails[0]?.value || null,

      notes: notes,
      photo: googleContact.photos?.[0]?.url || null,

      metadata: googleContact.metadata || {},
    };
  }

  /**
   * Build notes field with metadata
   */
  _buildNotes(contactData) {
    const notes = {
      source: contactData.source || 'whatsapp_bot_linda',
      importedDate: new Date().toISOString(),
      firstSeen: contactData.firstSeen || new Date().toISOString(),
    };

    if (contactData.notes) {
      notes.userNotes = contactData.notes;
    }

    return JSON.stringify(notes);
  }
}

export default GoogleContactsBridge;
