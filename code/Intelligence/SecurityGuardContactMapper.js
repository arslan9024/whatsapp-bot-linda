/**
 * Security Guard Contact Mapper
 * Maps Google Contacts to security guard personas
 * Syncs security contacts from Google Contacts API
 * Identifies security guards by role patterns (e.g., "D2 Security")
 * 
 * Features:
 * - Sync Google Contacts to local registry
 * - Parse contact names for roles (agent, buyer, tenant, owner, security_guard, agent_D2)
 * - Extract custom fields from Google Contacts
 * - Maintain master contact database
 * - Filter contacts by role and location
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityGuardContactMapper {
  constructor(config = {}) {
    this.contacts = new Map();  // phone → contact object
    this.contactsByRole = new Map();  // role → Set of phone numbers
    this.contactsByLocation = new Map();  // location → Set of phone numbers
    
    this.securityContactsDbPath = config.securityContactsDbPath || './code/Data/security-contacts-database.json';
    this.securityConfigPath = config.securityConfigPath || './code/Data/security-contacts-config.json';
    this.googleContactsService = config.googleContactsService;
    
    // Role patterns for identification
    this.rolePatterns = {
      security_guard: [
        /D2?\s*Security/i,
        /Security\s+Guard/i,
        /Guard\s*-?.*DAMAC/i,
        /Security\s+Officer/i,
        /🔐.*/i
      ],
      agent_D2: [
        /Agent.*D2/i,
        /D2.*Agent/i,
        /Agent.*DAMAC\s+Hills\s+2/i
      ],
      agent: [
        /agent|realtor|broker|real\s+estate/i
      ],
      tenant: [
        /tenant|renter|resident/i
      ],
      owner: [
        /owner|landlord|property\s+owner/i
      ],
      buyer: [
        /buyer|purchaser|customer/i
      ]
    };
    
    this.buildingClusters = {
      'DAMAC_HILLS_2': {
        keywords: ['D2', 'DAMAC Hills 2', 'DAMAC Hills', 'DH2'],
        prefix: 'D2 Security'
      },
      'JBR': {
        keywords: ['JBR', 'Jumeirah Beach Residence'],
        prefix: 'JBR Security'
      },
      'MARINA': {
        keywords: ['Marina', 'Dubai Marina'],
        prefix: 'Marina Security'
      }
    };
  }

  /**
   * Initialize mapper - load existing contacts
   */
  async initialize() {
    try {
      if (fs.existsSync(this.securityContactsDbPath)) {
        const data = JSON.parse(fs.readFileSync(this.securityContactsDbPath, 'utf8'));
        data.contacts.forEach(c => {
          this.contacts.set(c.phone, c);
          
          // Index by role
          if (c.roles && Array.isArray(c.roles)) {
            c.roles.forEach(role => {
              if (!this.contactsByRole.has(role)) {
                this.contactsByRole.set(role, new Set());
              }
              this.contactsByRole.get(role).add(c.phone);
            });
          }
          
          // Index by location
          if (c.assignedLocations && Array.isArray(c.assignedLocations)) {
            c.assignedLocations.forEach(loc => {
              if (!this.contactsByLocation.has(loc)) {
                this.contactsByLocation.set(loc, new Set());
              }
              this.contactsByLocation.get(loc).add(c.phone);
            });
          }
        });
        
        logger.info(`✅ Security contacts mapper initialized with ${data.contacts.length} contacts`);
      } else {
        logger.warn(`⚠️ Security contacts database not found, starting fresh`);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize SecurityGuardContactMapper: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect roles from contact name and organization
   * @param {string} name - Contact full name
   * @param {string} organization - Contact organization/company
   * @param {object} customFields - Custom contact fields
   * @returns {Array} Detected roles
   */
  detectRoles(name, organization = '', customFields = {}) {
    const detectedRoles = new Set();
    const searchText = `${name} ${organization}`.toLowerCase();

    // Check role patterns
    Object.entries(this.rolePatterns).forEach(([role, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(searchText)) {
          detectedRoles.add(role);
        }
      });
    });

    // Check custom fields
    if (customFields.role) {
      detectedRoles.add(customFields.role.toLowerCase());
    }

    if (customFields.type) {
      detectedRoles.add(customFields.type.toLowerCase());
    }

    return Array.from(detectedRoles);
  }

  /**
   * Detect assigned locations/clusters from name and organization
   * @param {string} name - Contact name
   * @param {string} organization - Contact organization
   * @returns {Array} Detected locations
   */
  detectLocations(name, organization = '') {
    const searchText = `${name} ${organization}`.toLowerCase();
    const locations = [];

    Object.entries(this.buildingClusters).forEach(([clusterId, clusterInfo]) => {
      clusterInfo.keywords.forEach(keyword => {
        if (searchText.includes(keyword.toLowerCase())) {
          locations.push(clusterId);
        }
      });
    });

    return locations;
  }

  /**
   * Add or update contact from Google Contact data
   * @param {object} googleContact - Contact from Google Contacts API
   * @returns {object} Processed contact
   */
  async addContactFromGoogle(googleContact) {
    try {
      const phone = googleContact.phoneNumbers?.[0]?.value || googleContact.phone;
      const email = googleContact.emailAddresses?.[0]?.value || googleContact.email;
      const name = googleContact.displayName || googleContact.name || 'Unknown';
      const organization = googleContact.organizations?.[0]?.title || '';

      // Detect roles and locations
      const roles = this.detectRoles(name, organization, googleContact.customFields);
      const locations = this.detectLocations(name, organization);

      const contact = {
        contactId: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        googleContactId: googleContact.resourceName || googleContact.id,
        name: name,
        phone: phone,
        email: email,
        roles: roles,
        assignedLocations: locations,
        organization: organization,
        displayName: googleContact.displayName || name,
        lastContacted: googleContact.lastContacted || null,
        campaignsReceived: [],
        knownContacts: [],
        syncedAt: new Date().toISOString(),
        metadata: {
          photoUrl: googleContact.photos?.[0]?.url,
          notes: googleContact.biographies?.[0]?.value,
          customFields: googleContact.customFields
        }
      };

      this.contacts.set(phone, contact);

      // Update role indices
      roles.forEach(role => {
        if (!this.contactsByRole.has(role)) {
          this.contactsByRole.set(role, new Set());
        }
        this.contactsByRole.get(role).add(phone);
      });

      // Update location indices
      locations.forEach(location => {
        if (!this.contactsByLocation.has(location)) {
          this.contactsByLocation.set(location, new Set());
        }
        this.contactsByLocation.get(location).add(phone);
      });

      await this._persistContacts();
      logger.info(`✅ Contact synced: ${name} (${phone}) - Roles: ${roles.join(', ')}`);

      return contact;

    } catch (error) {
      logger.error(`❌ Error adding contact from Google: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all contacts by role
   * @param {string} role - Role to filter by (e.g., "security_guard")
   * @returns {Array} Contact objects
   */
  getContactsByRole(role) {
    const phones = this.contactsByRole.get(role) || new Set();
    return Array.from(phones).map(phone => this.contacts.get(phone)).filter(c => c);
  }

  /**
   * Get contacts by location and optional role
   * @param {string} location - Location/cluster (e.g., "DAMAC_HILLS_2")
   * @param {string} role - Optional role filter
   * @returns {Array} Contact objects
   */
  getContactsByLocation(location, role = null) {
    const phones = this.contactsByLocation.get(location) || new Set();
    let results = Array.from(phones).map(phone => this.contacts.get(phone)).filter(c => c);

    if (role) {
      results = results.filter(c => c.roles.includes(role));
    }

    return results;
  }

  /**
   * Get security guards for a specific location
   * @param {string} location - Location (e.g., "DAMAC_HILLS_2")
   * @returns {Array} Security guard contacts
   */
  getSecurityGuards(location) {
    return this.getContactsByLocation(location, 'security_guard');
  }

  /**
   * Search contacts by name or phone
   * @param {string} query - Search query
   * @returns {Array} Matching contacts
   */
  searchContacts(query) {
    const searchLower = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.phone.includes(query) ||
      c.email?.includes(searchLower)
    );
  }

  /**
   * Update contact with campaign info
   * @param {string} phone - Contact phone
   * @param {string} campaignId - Campaign ID
   */
  async recordCampaignSent(phone, campaignId) {
    try {
      const contact = this.contacts.get(phone);
      if (!contact) {
        logger.warn(`Contact not found for campaign recording: ${phone}`);
        return false;
      }

      if (!contact.campaignsReceived.includes(campaignId)) {
        contact.campaignsReceived.push(campaignId);
      }
      contact.lastContacted = new Date().toISOString();

      await this._persistContacts();
      return true;
    } catch (error) {
      logger.error(`❌ Error recording campaign: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all contacts
   * @returns {Array} All contacts
   */
  getAllContacts() {
    return Array.from(this.contacts.values());
  }

  /**
   * Get statistics
   * @returns {object} Contact statistics
   */
  getStatistics() {
    const stats = {
      totalContacts: this.contacts.size,
      byRole: {},
      byLocation: {},
      recentlyContacted: 0,
      totalCampaigns: 0
    };

    // Count by role
    this.contactsByRole.forEach((phones, role) => {
      stats.byRole[role] = phones.size;
    });

    // Count by location
    this.contactsByLocation.forEach((phones, location) => {
      stats.byLocation[location] = phones.size;
    });

    // Recently contacted (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    stats.recentlyContacted = Array.from(this.contacts.values()).filter(c =>
      c.lastContacted && new Date(c.lastContacted) > new Date(weekAgo)
    ).length;

    // Total campaigns sent
    stats.totalCampaigns = Array.from(this.contacts.values()).reduce(
      (sum, c) => sum + (c.campaignsReceived?.length || 0),
      0
    );

    return stats;
  }

  /**
   * Persist contacts to file
   * @private
   */
  async _persistContacts() {
    try {
      const data = {
        contacts: Array.from(this.contacts.values()),
        totalContacts: this.contacts.size,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      const dir = path.dirname(this.securityContactsDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.securityContactsDbPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      logger.info(`✅ Security contacts persisted (${this.contacts.size} total)`);
    } catch (error) {
      logger.error(`❌ Failed to persist contacts: ${error.message}`);
    }
  }

  /**
   * Sync all contacts from Google Contacts
   * @param {Array} googleContacts - Array of contacts from Google API
   * @returns {object} Sync result
   */
  async syncFromGoogle(googleContacts) {
    try {
      let added = 0;
      let updated = 0;

      for (const googleContact of googleContacts) {
        const phone = googleContact.phoneNumbers?.[0]?.value;
        if (!phone) continue;

        const existing = this.contacts.has(phone);
        await this.addContactFromGoogle(googleContact);

        if (existing) {
          updated++;
        } else {
          added++;
        }
      }

      logger.info(`✅ Google Contacts sync complete: ${added} added, ${updated} updated`);
      return { added, updated, total: added + updated };

    } catch (error) {
      logger.error(`❌ Google Contacts sync failed: ${error.message}`);
      return { added: 0, updated: 0, total: 0, error: error.message };
    }
  }
}

export default SecurityGuardContactMapper;
