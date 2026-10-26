/**
 * Property Catalog Engine
 * Manages property listings for sale and lease
 * 
 * Features:
 * - Store properties with seller/landlord attribution
 * - Track property status (listed, sold, leased)
 * - Link to seller/landlord personas
 * - Calculate property metrics
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PropertyCatalogEngine {
  constructor(config = {}) {
    this.properties = new Map();  // propertyId → property object
    this.propertyIndexByLocation = new Map();  // location → [propertyIds]
    this.propertyIndexByType = new Map();  // type → [propertyIds]
    this.catalogPath = config.propertyCatalogPath || './code/Data/property-database.json';
  }

  /**
   * Initialize engine - load properties from file/sheets
   */
  async initialize(sheetsService = null) {
    try {
      // First try to load from local file
      if (fs.existsSync(this.catalogPath)) {
        const data = JSON.parse(fs.readFileSync(this.catalogPath, 'utf8'));
        data.properties.forEach(p => {
          this.properties.set(p.id, p);
          this._indexProperty(p);
        });
        logger.info(`✅ Property Catalog initialized with ${data.properties.length} properties`);
      } else {
        logger.warn(`⚠️ Property catalog file not found, starting fresh`);
      }

      // TODO: Load from PowerAgent Sheets if available
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize PropertyCatalogEngine: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add property listing (for sale)
   */
  async addPropertyForSale(propertyDetails, sellerPhone, agentId = null) {
    try {
      const propertyId = `prop-${Date.now()}`;
      
      const property = {
        id: propertyId,
        type: propertyDetails.type || 'apartment',  // villa, apartment, townhouse, etc.
        address: propertyDetails.address,
        location: propertyDetails.location,
        area: propertyDetails.area,
        bedrooms: propertyDetails.bedrooms || 0,
        bathrooms: propertyDetails.bathrooms || 0,
        features: propertyDetails.features || [],
        imageUrls: propertyDetails.imageUrls || [],

        // Sale details
        forSale: true,
        sale: {
          price: propertyDetails.price,
          currency: propertyDetails.currency || 'AED',
          seller: {
            phone: sellerPhone,
            name: propertyDetails.sellerName || 'Unknown',
            commission: propertyDetails.commission || '5%',
            agentId: agentId,
            agentName: propertyDetails.agentName
          },
          status: 'listed',
          listedAt: new Date().toISOString(),
          views: 0,
          inquiries: 0,
          offers: 0
        },

        // Lease details (can list for both)
        forLease: propertyDetails.forLease || false,
        lease: propertyDetails.forLease ? {
          monthlyRent: propertyDetails.monthlyRent,
          currency: 'AED/month',
          landlord: propertyDetails.landlordPhone ? {
            phone: propertyDetails.landlordPhone,
            name: propertyDetails.landlordName || 'Unknown'
          } : null,
          terms: propertyDetails.leaseTerms || '12-month lease',
          utilities: propertyDetails.utilities || 'not included',
          furnished: propertyDetails.furnished || false,
          availableFrom: propertyDetails.availableFrom,
          status: 'available',
          inquiries: 0
        } : null,

        sourceAccount: propertyDetails.sourceAccount,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.properties.set(propertyId, property);
      this._indexProperty(property);
      await this._persistProperties();

      logger.info(`✅ Property added: ${propertyId} (${property.type} in ${property.location})`);
      return property;

    } catch (error) {
      logger.error(`❌ Error adding property: ${error.message}`);
      return null;
    }
  }

  /**
   * Add property listing (for lease)
   */
  async addPropertyForLease(propertyDetails, landlordPhone, agentId = null) {
    try {
      const propertyId = `prop-${Date.now()}`;

      const property = {
        id: propertyId,
        type: propertyDetails.type || 'apartment',
        address: propertyDetails.address,
        location: propertyDetails.location,
        area: propertyDetails.area,
        bedrooms: propertyDetails.bedrooms || 0,
        bathrooms: propertyDetails.bathrooms || 0,
        features: propertyDetails.features || [],
        imageUrls: propertyDetails.imageUrls || [],

        forSale: false,
        sale: null,

        forLease: true,
        lease: {
          monthlyRent: propertyDetails.monthlyRent,
          currency: 'AED/month',
          landlord: {
            phone: landlordPhone,
            name: propertyDetails.landlordName || 'Unknown',
            agentId: agentId,
            agentName: propertyDetails.agentName
          },
          terms: propertyDetails.leaseTerms || '12-month lease',
          utilities: propertyDetails.utilities || 'not included',
          furnished: propertyDetails.furnished || false,
          availableFrom: propertyDetails.availableFrom,
          status: 'available',
          inquiries: 0
        },

        sourceAccount: propertyDetails.sourceAccount,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      this.properties.set(propertyId, property);
      this._indexProperty(property);
      await this._persistProperties();

      logger.info(`✅ Property added for lease: ${propertyId} (${property.type} in ${property.location})`);
      return property;

    } catch (error) {
      logger.error(`❌ Error adding property for lease: ${error.message}`);
      return null;
    }
  }

  /**
   * Search properties by criteria
   */
  searchProperties(criteria) {
    let results = Array.from(this.properties.values());

    // Filter by location
    if (criteria.location) {
      results = results.filter(p => 
        p.location.toLowerCase().includes(criteria.location.toLowerCase())
      );
    }

    // Filter by type
    if (criteria.type) {
      results = results.filter(p => p.type === criteria.type);
    }

    // Filter by bedrooms
    if (criteria.bedrooms) {
      results = results.filter(p => p.bedrooms === criteria.bedrooms);
    }

    // Filter by price range (for sale)
    if (criteria.minPrice || criteria.maxPrice) {
      results = results.filter(p => {
        if (!p.forSale) return false;
        const price = p.sale.price;
        if (criteria.minPrice && price < criteria.minPrice) return false;
        if (criteria.maxPrice && price > criteria.maxPrice) return false;
        return true;
      });
    }

    // Filter by rent range (for lease)
    if (criteria.minRent || criteria.maxRent) {
      results = results.filter(p => {
        if (!p.forLease) return false;
        const rent = p.lease.monthlyRent;
        if (criteria.minRent && rent < criteria.minRent) return false;
        if (criteria.maxRent && rent > criteria.maxRent) return false;
        return true;
      });
    }

    // Filter for sale vs lease
    if (criteria.forSale !== undefined) {
      results = results.filter(p => p.forSale === criteria.forSale);
    }
    if (criteria.forLease !== undefined) {
      results = results.filter(p => p.forLease === criteria.forLease);
    }

    // Filter by status
    if (criteria.status) {
      results = results.filter(p => {
        if (p.forSale && p.sale.status === criteria.status) return true;
        if (p.forLease && p.lease.status === criteria.status) return true;
        return false;
      });
    }

    // Filter by featured
    if (criteria.hasParkingRequired) {
      results = results.filter(p => p.features.includes('parking'));
    }
    if (criteria.hasPoolRequired) {
      results = results.filter(p => p.features.includes('pool'));
    }

    return results;
  }

  /**
   * Get property by ID
   */
  getProperty(propertyId) {
    return this.properties.get(propertyId);
  }

  /**
   * Get all properties
   */
  getAllProperties() {
    return Array.from(this.properties.values());
  }

  /**
   * Update property status
   */
  async updatePropertyStatus(propertyId, newStatus, updateData = {}) {
    try {
      const property = this.properties.get(propertyId);
      if (!property) {
        logger.warn(`⚠️ Property not found: ${propertyId}`);
        return null;
      }

      if (property.forSale && property.sale) {
        property.sale.status = newStatus;
        if (newStatus === 'sold') {
          property.sale.soldAt = new Date().toISOString();
          property.sale.soldPrice = updateData.soldPrice || property.sale.price;
        }
      }

      if (property.forLease && property.lease) {
        property.lease.status = newStatus;
        if (newStatus === 'leased') {
          property.lease.leasedAt = new Date().toISOString();
        }
      }

      property.lastUpdated = new Date().toISOString();
      await this._persistProperties();

      logger.info(`✅ Property status updated: ${propertyId} → ${newStatus}`);
      return property;

    } catch (error) {
      logger.error(`❌ Error updating property: ${error.message}`);
      return null;
    }
  }

  /**
   * Record view on property
   */
  async recordView(propertyId) {
    try {
      const property = this.properties.get(propertyId);
      if (property && property.forSale && property.sale) {
        property.sale.views += 1;
      }
      if (property && property.forLease && property.lease) {
        property.lease.views = (property.lease.views || 0) + 1;
      }
      property.lastUpdated = new Date().toISOString();
      await this._persistProperties();
    } catch (error) {
      logger.error(`❌ Error recording view: ${error.message}`);
    }
  }

  /**
   * Record inquiry on property
   */
  async recordInquiry(propertyId) {
    try {
      const property = this.properties.get(propertyId);
      if (property && property.forSale && property.sale) {
        property.sale.inquiries += 1;
      }
      if (property && property.forLease && property.lease) {
        property.lease.inquiries += 1;
      }
      property.lastUpdated = new Date().toISOString();
      await this._persistProperties();
    } catch (error) {
      logger.error(`❌ Error recording inquiry: ${error.message}`);
    }
  }

  /**
   * Index property by location and type
   * @private
   */
  _indexProperty(property) {
    // Index by location
    if (!this.propertyIndexByLocation.has(property.location)) {
      this.propertyIndexByLocation.set(property.location, []);
    }
    this.propertyIndexByLocation.get(property.location).push(property.id);

    // Index by type
    if (!this.propertyIndexByType.has(property.type)) {
      this.propertyIndexByType.set(property.type, []);
    }
    this.propertyIndexByType.get(property.type).push(property.id);
  }

  /**
   * Persist properties to file
   * @private
   */
  async _persistProperties() {
    try {
      const data = {
        properties: Array.from(this.properties.values()),
        totalProperties: this.properties.size,
        activeListings: Array.from(this.properties.values()).filter(
          p => p.sale?.status === 'listed' || p.lease?.status === 'available'
        ).length,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      fs.writeFileSync(this.catalogPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`❌ Failed to persist properties: ${error.message}`);
    }
  }
}

export default PropertyCatalogEngine;
