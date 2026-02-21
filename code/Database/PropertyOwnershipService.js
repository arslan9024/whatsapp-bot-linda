/**
 * PropertyOwnershipService.js
 * PURPOSE: Service layer for PropertyOwnership operations
 * HANDLES: CRUD, ownership percentage tracking, portfolio management
 */

import PropertyOwnership from './PropertyOwnershipSchema.js';
import PropertyTenancy from './PropertyTenancySchema.js';
import Property from './PropertySchema.js';
import Person from './PersonSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PropertyOwnershipService {
  /**
   * Add owner to property
   * Validates: person exists, property exists, no duplicate link, percentage valid
   */
  static async createOwnership(ownershipData) {
    try {
      // Validate data
      const validation = await ValidationHelper.validatePropertyOwnership(
        PropertyOwnership,
        ownershipData,
        Person,
        Property
      );

      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        };
      }

      // Generate linkId
      const linkId = `OWNERSHIP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create ownership
      const ownership = new PropertyOwnership({
        linkId,
        personId: ownershipData.personId,
        propertyId: ownershipData.propertyId,
        ownershipPercentage: ownershipData.ownershipPercentage,
        ownershipType: ownershipData.ownershipType,
        acquisitionDate: ownershipData.acquisitionDate,
        acquisitionPrice: ownershipData.acquisitionPrice,
        currency: ownershipData.currency || 'AED',
        notes: ownershipData.notes
      });

      await ownership.save();

      return {
        success: true,
        ownership: ownership.toObject(),
        message: `Ownership created: ${linkId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find all owners of a property
   */
  static async findPropertyOwners(propertyId) {
    try {
      const owners = await QueryHelper.findAllOwners(PropertyOwnership, propertyId);
      return {
        success: true,
        count: owners.length,
        owners: owners.map(o => ({
          personId: o.personId._id,
          firstName: o.personId.firstName,
          lastName: o.personId.lastName,
          mobile: o.personId.mobile,
          ownershipPercentage: o.ownershipPercentage,
          acquisitionDate: o.acquisitionDate
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find all properties owned by a person
   */
  static async findPersonProperties(personId) {
    try {
      const properties = await PropertyOwnership.findByOwner(personId);
      return {
        success: true,
        count: properties.length,
        properties: properties.map(p => ({
          linkId: p.linkId,
          propertyId: p.propertyId._id,
          clusterId: p.propertyId.clusterId,
          unitNumber: p.propertyId.unitNumber,
          ownershipPercentage: p.ownershipPercentage,
          acquisitionDate: p.acquisitionDate,
          currentValue: p.currentEstimatedValue
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get co-owners of property
   */
  static async getCoOwners(propertyId) {
    try {
      const coOwners = await QueryHelper.getPropertyCoOwners(PropertyOwnership, propertyId);
      return {
        success: true,
        count: coOwners.length,
        coOwners: coOwners.map(o => ({
          personId: o.personId._id,
          firstName: o.personId.firstName,
          lastName: o.personId.lastName,
          mobile: o.personId.mobile,
          ownershipPercentage: o.ownershipPercentage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get portfolio statistics for owner
   */
  static async getPortfolioStats(personId) {
    try {
      const stats = await QueryHelper.getOwnerPortfolioStats(PropertyOwnership, personId);
      return {
        success: true,
        stats: {
          totalProperties: stats.totalProperties,
          totalOwnershipPercentage: stats.totalOwnershipPercentage,
          totalAcquisitionValue: stats.totalAcquisitionValue,
          totalCurrentValue: stats.totalCurrentValue,
          properties: stats.properties.map(p => ({
            linkId: p.linkId,
            ownershipPercentage: p.ownershipPercentage,
            acquisitionPrice: p.acquisitionPrice,
            currentValue: p.currentEstimatedValue
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark as disposed (sold)
   */
  static async markAsDisposed(linkId, disposalDate, disposalPrice) {
    try {
      const ownership = await PropertyOwnership.findOne({ linkId });
      if (!ownership) {
        return { success: false, error: 'Ownership record not found' };
      }

      await ownership.markAsDisposed(disposalDate, disposalPrice);

      return {
        success: true,
        ownership: ownership.toObject(),
        message: `Ownership marked as disposed: sold for ${disposalPrice}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update valuation
   */
  static async updateValuation(linkId, newValue, valuationDate = new Date()) {
    try {
      const ownership = await PropertyOwnership.findOne({ linkId });
      if (!ownership) {
        return { success: false, error: 'Ownership record not found' };
      }

      await ownership.updateValuation(newValue, valuationDate);

      return {
        success: true,
        ownership: ownership.toObject(),
        appreciation: ownership.appreciationAmount,
        appreciationPercentage: ownership.appreciationPercentage,
        message: 'Valuation updated'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get ownership by ID
   */
  static async findById(linkId) {
    try {
      const ownership = await PropertyOwnership.findOne({ linkId })
        .populate('personId')
        .populate('propertyId');

      return {
        success: !!ownership,
        ownership: ownership ? ownership.toObject() : null,
        error: ownership ? null : 'Ownership record not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active ownerships
   */
  static async getActive(limit = 100) {
    try {
      const ownerships = await PropertyOwnership.find({ status: 'active' })
        .populate('personId')
        .populate('propertyId')
        .limit(limit);

      return {
        success: true,
        count: ownerships.length,
        ownerships: ownerships.map(o => o.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find properties with financing
   */
  static async findFinancedProperties(personId) {
    try {
      const properties = await PropertyOwnership.find({
        personId,
        status: 'active',
        hasFinancing: true
      }).populate('propertyId');

      return {
        success: true,
        count: properties.length,
        properties: properties.map(p => p.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    try {
      const [total, active, sold] = await Promise.all([
        PropertyOwnership.countDocuments(),
        PropertyOwnership.countDocuments({ status: 'active' }),
        PropertyOwnership.countDocuments({ status: 'sold' })
      ]);

      const valuation = await PropertyOwnership.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalAcquisitionValue: { $sum: '$acquisitionPrice' },
            totalCurrentValue: { $sum: '$currentEstimatedValue' }
          }
        }
      ]);

      return {
        success: true,
        stats: {
          total,
          byStatus: { active, sold },
          valuation: valuation[0] || { totalAcquisitionValue: 0, totalCurrentValue: 0 }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PropertyOwnershipService;
