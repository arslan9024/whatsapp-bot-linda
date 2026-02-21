/**
 * PropertyService.js
 * PURPOSE: Service layer for Property operations
 * HANDLES: CRUD, availability, occupancy status, tenant linking, asset management
 */

import Property from './PropertySchema.js';
import PropertyTenancy from './PropertyTenancySchema.js';
import PropertyOwnership from './PropertyOwnershipSchema.js';
import Cluster from './ClusterSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PropertyService {
  /**
   * Create new property
   * Validates: cluster exists, unit number unique in cluster, required fields
   */
  static async createProperty(propertyData) {
    try {
      // Validate cluster exists
      const cluster = await Cluster.findById(propertyData.clusterId);
      if (!cluster) {
        return { success: false, error: 'Cluster not found' };
      }

      // Check unit number uniqueness in cluster
      const existing = await Property.findOne({
        clusterId: propertyData.clusterId,
        unitNumber: propertyData.unitNumber
      });

      if (existing) {
        return { success: false, error: 'Unit number already exists in this cluster' };
      }

      // Generate propertyId
      const propertyId = `PROP-${propertyData.clusterId}-${propertyData.unitNumber}`.toUpperCase();

      // Create property
      const property = new Property({
        propertyId,
        clusterId: propertyData.clusterId,
        unitNumber: propertyData.unitNumber,
        unitType: propertyData.unitType, // Studio, 1BR, 2BR, etc.
        builtUpArea: propertyData.builtUpArea,
        plotArea: propertyData.plotArea,
        parkingSpaces: propertyData.parkingSpaces,
        furnishingStatus: propertyData.furnishingStatus,
        occupancyStatus: propertyData.occupancyStatus,
        availabilityStatus: propertyData.availabilityStatus,
        tier: propertyData.tier,
        facing: propertyData.facing, // North, South, East, West
        floor: propertyData.floor,
        amenities: propertyData.amenities || [],
        features: propertyData.features || [],
        images: propertyData.images || [],
        description: propertyData.description,
        pricePerSqft: propertyData.pricePerSqft,
        estimatedValue: propertyData.estimatedValue,
        currency: propertyData.currency || 'AED',
        notes: propertyData.notes
      });

      await property.save();

      return {
        success: true,
        property: property.toObject(),
        message: `Property created: ${propertyId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get property details with current tenant and owners
   */
  static async getFullDetails(propertyId) {
    try {
      const property = await Property.findOne({ propertyId })
        .populate('clusterId');

      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Get current tenant
      const tenancy = await PropertyTenancy.findOne({
        propertyId: property._id,
        status: 'active'
      }).populate('personId');

      // Get owners
      const ownerships = await PropertyOwnership.find({
        propertyId: property._id,
        status: 'active'
      }).populate('personId');

      return {
        success: true,
        property: property.toObject(),
        currentTenant: tenancy ? {
          personId: tenancy.personId._id,
          firstName: tenancy.personId.firstName,
          lastName: tenancy.personId.lastName,
          mobile: tenancy.personId.mobile,
          rentAmount: tenancy.rentAmount,
          startDate: tenancy.contractStartDate,
          endDate: tenancy.contractEndDate
        } : null,
        owners: ownerships.map(o => ({
          personId: o.personId._id,
          firstName: o.personId.firstName,
          lastName: o.personId.lastName,
          ownershipPercentage: o.ownershipPercentage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update property status
   */
  static async updateStatus(propertyId, statusType, statusValue) {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Valid status types
      const validTypes = ['occupancyStatus', 'availabilityStatus', 'furnishingStatus'];
      if (!validTypes.includes(statusType)) {
        return { success: false, error: `Invalid status type: ${statusType}` };
      }

      property[statusType] = statusValue;
      await property.save();

      return {
        success: true,
        property: property.toObject(),
        message: `${statusType} updated to ${statusValue}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update property valuation
   */
  static async updateValuation(propertyId, newValue) {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      property.estimatedValue = newValue;
      property.pricePerSqft = newValue / property.builtUpArea;
      await property.save();

      return {
        success: true,
        property: property.toObject(),
        message: 'Valuation updated'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add image to property
   */
  static async addImage(propertyId, imageUrl, caption = '') {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      property.images.push({
        url: imageUrl,
        caption,
        uploadedDate: new Date()
      });

      await property.save();

      return {
        success: true,
        property: property.toObject(),
        message: 'Image added'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available properties
   */
  static async getAvailable(filter = {}) {
    try {
      const query = {
        availabilityStatus: 'available',
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Get occupied properties
   */
  static async getOccupied(filter = {}) {
    try {
      const query = {
        occupancyStatus: 'occupied',
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Get vacant properties
   */
  static async getVacant(filter = {}) {
    try {
      const query = {
        occupancyStatus: 'vacant',
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Search properties in cluster
   */
  static async searchInCluster(clusterId, filter = {}) {
    try {
      const query = {
        clusterId,
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(50);

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
   * Get by type (Studio, 1BR, 2BR, etc.)
   */
  static async getByType(unitType, filter = {}) {
    try {
      const query = {
        unitType,
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Get by built-up area range
   */
  static async getByAreaRange(minArea, maxArea, filter = {}) {
    try {
      const query = {
        builtUpArea: { $gte: minArea, $lte: maxArea },
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Get by value range
   */
  static async getByValueRange(minValue, maxValue, filter = {}) {
    try {
      const query = {
        estimatedValue: { $gte: minValue, $lte: maxValue },
        ...filter
      };

      const properties = await Property.find(query)
        .populate('clusterId')
        .limit(100);

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
   * Get cluster portfolio statistics
   */
  static async getClusterStats(clusterId) {
    try {
      const stats = await QueryHelper.getClusterStats(Property, clusterId);

      return {
        success: true,
        stats: {
          total: stats.total,
          occupied: stats.occupied,
          vacant: stats.vacant,
          available: stats.available,
          occupancyRate: stats.occupancyRate,
          avgValue: stats.avgValue,
          totalValue: stats.totalValue,
          byType: stats.byType
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all properties statistics
   */
  static async getPortfolioStats() {
    try {
      const [
        total,
        occupied,
        vacant,
        available
      ] = await Promise.all([
        Property.countDocuments(),
        Property.countDocuments({ occupancyStatus: 'occupied' }),
        Property.countDocuments({ occupancyStatus: 'vacant' }),
        Property.countDocuments({ availabilityStatus: 'available' })
      ]);

      const valuation = await Property.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$estimatedValue' },
            avgValue: { $avg: '$estimatedValue' }
          }
        }
      ]);

      const byType = await Property.aggregate([
        {
          $group: {
            _id: '$unitType',
            count: { $sum: 1 },
            avgValue: { $avg: '$estimatedValue' }
          }
        }
      ]);

      return {
        success: true,
        stats: {
          total,
          byOccupancy: { occupied, vacant, available },
          occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : 0,
          valuation: valuation[0] || { totalValue: 0, avgValue: 0 },
          byType: byType
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get property by ID
   */
  static async findById(propertyId) {
    try {
      const property = await Property.findOne({ propertyId })
        .populate('clusterId');

      return {
        success: !!property,
        property: property ? property.toObject() : null,
        error: property ? null : 'Property not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete property (only if no tenancies or ownerships)
   */
  static async delete(propertyId) {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Check constraints
      const [tenancies, ownerships] = await Promise.all([
        PropertyTenancy.countDocuments({ propertyId: property._id }),
        PropertyOwnership.countDocuments({ propertyId: property._id })
      ]);

      if (tenancies > 0 || ownerships > 0) {
        return {
          success: false,
          error: 'Cannot delete property with active tenancies or ownerships'
        };
      }

      await Property.deleteOne({ propertyId });

      return {
        success: true,
        message: `Property deleted: ${propertyId}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PropertyService;
