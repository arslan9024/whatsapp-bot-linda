/**
 * Client Catalog Engine
 * Manages buyer, tenant, and security guard profiles
 * 
 * Features:
 * - Store buyer profiles with budget, preferences
 * - Store tenant profiles with lease requirements
 * - Store security guard profiles with location and company data from Google Contacts
 * - Track contract metadata (tenancy agreements, dates, expiry)
 * - Track search history
 * - Track active inquiries
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClientCatalogEngine {
  constructor(config = {}) {
    this.clients = new Map();  // clientId → client object
    this.clientsByPhone = new Map();  // phone → clientId
    this.clientCatalogPath = config.clientCatalogPath || './code/Data/client-database.json';
  }

  /**
   * Initialize engine
   */
  async initialize() {
    try {
      if (fs.existsSync(this.clientCatalogPath)) {
        const data = JSON.parse(fs.readFileSync(this.clientCatalogPath, 'utf8'));
        data.clients.forEach(c => {
          this.clients.set(c.id, c);
          this.clientsByPhone.set(c.phone, c.id);
        });
        logger.info(`✅ Client Catalog initialized with ${data.clients.length} clients`);
      } else {
        logger.warn(`⚠️ Client catalog file not found, starting fresh`);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize ClientCatalogEngine: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add buyer client
   */
  async addBuyer(phoneNumber, buyerDetails, personaId = null) {
    try {
      const clientId = `client-${Date.now()}`;

      const client = {
        id: clientId,
        phone: phoneNumber,
        name: buyerDetails.name || 'Unknown',
        type: 'buyer',
        personaId: personaId,

        // Google Contacts integration fields
        googleContactsData: {
          contactId: buyerDetails.contactId || null,
          email: buyerDetails.email || null,
          address: buyerDetails.address || null,
          linkedPersonas: buyerDetails.linkedPersonas || []
        },

        buyerProfile: {
          budget: {
            min: buyerDetails.minBudget,
            max: buyerDetails.maxBudget,
            currency: buyerDetails.currency || 'AED'
          },
          preferences: {
            locations: buyerDetails.preferredLocations || [],
            propertyTypes: buyerDetails.propertyTypes || ['villa', 'apartment'],
            bedrooms: buyerDetails.bedrooms || { min: 2, preferred: 3 },
            mustHaves: buyerDetails.mustHaves || [],
            niceToHaves: buyerDetails.niceToHaves || []
          },
          timeline: buyerDetails.timeline || 'flexible',
          financing: buyerDetails.financing || 'cash',
          inspectionReady: buyerDetails.inspectionReady !== false
        },

        // Contract metadata (for trackability)
        contractMetadata: {
          contracts: [],  // Array of contract objects
          activeContracts: 0,
          completedContracts: 0,
          lastContractDate: null
        },

        searchHistory: [],
        activeInquiries: [],
        favoritedProperties: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.clients.set(clientId, client);
      this.clientsByPhone.set(phoneNumber, clientId);
      await this._persistClients();

      logger.info(`✅ Buyer client added: ${clientId} (${phoneNumber})`);
      return client;

    } catch (error) {
      logger.error(`❌ Error adding buyer: ${error.message}`);
      return null;
    }
  }

  /**
   * Add tenant client
   */
  async addTenant(phoneNumber, tenantDetails, personaId = null) {
    try {
      const clientId = `client-${Date.now()}`;

      const client = {
        id: clientId,
        phone: phoneNumber,
        name: tenantDetails.name || 'Unknown',
        type: 'tenant',
        personaId: personaId,

        // Google Contacts integration fields
        googleContactsData: {
          contactId: tenantDetails.contactId || null,
          email: tenantDetails.email || null,
          address: tenantDetails.address || null,
          linkedPersonas: tenantDetails.linkedPersonas || []
        },

        tenantProfile: {
          budget: {
            monthlyRent: tenantDetails.monthlyRent,
            currency: 'AED'
          },
          preferences: {
            locations: tenantDetails.preferredLocations || [],
            propertyTypes: tenantDetails.propertyTypes || ['apartment'],
            bedrooms: tenantDetails.bedrooms || { min: 1, preferred: 2 },
            furnished: tenantDetails.furnished !== false,
            familySize: tenantDetails.familySize || 1,
            pets: tenantDetails.pets || 'no',
            leaseTerm: tenantDetails.leaseTerm || '12 months'
          },
          moveInDate: tenantDetails.moveInDate,
          duration: tenantDetails.duration || '12-24 months'
        },

        // Contract metadata
        contractMetadata: {
          contracts: [],  // Array of contract objects with expiry dates
          activeContracts: 0,
          completedContracts: 0,
          lastContractDate: null,
          nextRenewalDate: null
        },

        searchHistory: [],
        activeInquiries: [],
        favoritedProperties: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.clients.set(clientId, client);
      this.clientsByPhone.set(phoneNumber, clientId);
      await this._persistClients();

      logger.info(`✅ Tenant client added: ${clientId} (${phoneNumber})`);
      return client;

    } catch (error) {
      logger.error(`❌ Error adding tenant: ${error.message}`);
      return null;
    }
  }

  /**
   * Add security guard to catalog
   */
  async addSecurityGuard(phoneNumber, guardDetails, personaId = null) {
    try {
      const clientId = `client-${Date.now()}`;

      const client = {
        id: clientId,
        phone: phoneNumber,
        name: guardDetails.name || 'Unknown',
        type: 'security_guard',
        personaId: personaId,

        // Google Contacts integration fields
        googleContactsData: {
          contactId: guardDetails.contactId || null,
          email: guardDetails.email || null,
          address: guardDetails.address || null,
          linkedPersonas: guardDetails.linkedPersonas || []
        },

        securityGuardProfile: {
          location: guardDetails.location || null,
          company: guardDetails.company || null,
          companyId: guardDetails.companyId || null,
          buildingName: guardDetails.buildingName || null,
          shift: guardDetails.shift || 'day',
          phoneOnDuty: guardDetails.phoneOnDuty || phoneNumber,
          emergencyContact: guardDetails.emergencyContact || null,
          certifications: guardDetails.certifications || [],
          years_of_experience: guardDetails.yearsOfExperience || 0
        },

        // Campaign and notification tracking
        campaignTracking: {
          bulkCampaignsMembership: [],  // Array of campaign IDs
          preferredNotificationTimes: guardDetails.preferredNotificationTimes || ['08:00-10:00', '14:00-16:00'],
          communicationPreferences: guardDetails.communicationPreferences || ['whatsapp'],
          optedIn: guardDetails.optedIn !== false
        },

        activeInquiries: [],
        communicationHistory: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.clients.set(clientId, client);
      this.clientsByPhone.set(phoneNumber, clientId);
      await this._persistClients();

      logger.info(`✅ Security Guard client added: ${clientId} (${phoneNumber})`);
      return client;

    } catch (error) {
      logger.error(`❌ Error adding security guard: ${error.message}`);
      return null;
    }
  }

  /**
   * Get client by phone
   */
  getClientByPhone(phoneNumber) {
    const clientId = this.clientsByPhone.get(phoneNumber);
    return clientId ? this.clients.get(clientId) : null;
  }

  /**
   * Get client by ID
   */
  getClient(clientId) {
    return this.clients.get(clientId);
  }

  /**
   * Get all buyers
   */
  getAllBuyers() {
    return Array.from(this.clients.values()).filter(c => c.type === 'buyer');
  }

  /**
   * Get all tenants
   */
  getAllTenants() {
    return Array.from(this.clients.values()).filter(c => c.type === 'tenant');
  }

  /**
   * Get all security guards
   */
  getAllSecurityGuards() {
    return Array.from(this.clients.values()).filter(c => c.type === 'security_guard');
  }

  /**
   * Add property to search history
   */
  async addToSearchHistory(clientId, propertyId, interestLevel = 'medium') {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        logger.warn(`⚠️ Client not found: ${clientId}`);
        return null;
      }

      if (!client.searchHistory) client.searchHistory = [];
      
      client.searchHistory.push({
        propertyId: propertyId,
        viewedAt: new Date().toISOString(),
        interest: interestLevel
      });

      client.lastUpdated = new Date().toISOString();
      await this._persistClients();

      return client;
    } catch (error) {
      logger.error(`❌ Error adding to search history: ${error.message}`);
      return null;
    }
  }

  /**
   * Add property to inquiries
   */
  async addToInquiries(clientId, propertyId, inquiryDetails = {}) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        logger.warn(`⚠️ Client not found: ${clientId}`);
        return null;
      }

      if (!client.activeInquiries) client.activeInquiries = [];

      client.activeInquiries.push({
        propertyId: propertyId,
        inquiredAt: new Date().toISOString(),
        status: 'pending',
        details: inquiryDetails
      });

      client.lastUpdated = new Date().toISOString();
      await this._persistClients();

      return client;
    } catch (error) {
      logger.error(`❌ Error adding inquiry: ${error.message}`);
      return null;
    }
  }

  /**
   * Add property to favorites
   */
  async addToFavorites(clientId, propertyId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        logger.warn(`⚠️ Client not found: ${clientId}`);
        return null;
      }

      if (!client.favoritedProperties) client.favoritedProperties = [];
      if (!client.favoritedProperties.includes(propertyId)) {
        client.favoritedProperties.push(propertyId);
      }

      client.lastUpdated = new Date().toISOString();
      await this._persistClients();

      return client;
    } catch (error) {
      logger.error(`❌ Error adding to favorites: ${error.message}`);
      return null;
    }
  }

  /**
   * Update client profile
   */
  async updateClient(clientId, updates) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        logger.warn(`⚠️ Client not found: ${clientId}`);
        return null;
      }

      if (client.type === 'buyer' && updates.buyerProfile) {
        client.buyerProfile = { ...client.buyerProfile, ...updates.buyerProfile };
      }

      if (client.type === 'tenant' && updates.tenantProfile) {
        client.tenantProfile = { ...client.tenantProfile, ...updates.tenantProfile };
      }

      client.lastUpdated = new Date().toISOString();
      await this._persistClients();

      return client;
    } catch (error) {
      logger.error(`❌ Error updating client: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all clients
   */
  getAllClients() {
    return Array.from(this.clients.values());
  }

  /**
   * Persist clients to file
   * @private
   */
  async _persistClients() {
    try {
      const data = {
        clients: Array.from(this.clients.values()),
        totalClients: this.clients.size,
        totalBuyers: this.getAllBuyers().length,
        totalTenants: this.getAllTenants().length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      fs.writeFileSync(this.clientCatalogPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`❌ Failed to persist clients: ${error.message}`);
    }
  }
}

export default ClientCatalogEngine;
