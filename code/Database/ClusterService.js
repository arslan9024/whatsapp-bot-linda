/**
 * ClusterService.js
 * PURPOSE: Service layer for Cluster operations
 * HANDLES: Cluster/community management, inventory, statistics
 */

import Cluster from './ClusterSchema.js';
import Developer from './DeveloperSchema.js';
import Property from './PropertySchema.js';
import PropertyTenancy from './PropertyTenancySchema.js';
import PropertyOwnership from './PropertyOwnershipSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class ClusterService {
  /**
   * Create new cluster
   * Validates: developer exists, name unique
   */
  static async create(clusterData) {
    try {
      // Validate developer exists
      const developer = await Developer.findById(clusterData.developerId);
      if (!developer) {
        return { success: false, error: 'Developer not found' };
      }

      // Check cluster name uniqueness
      const existing = await Cluster.findOne({
        name: clusterData.name
      });

      if (existing) {
        return { success: false, error: 'Cluster with this name already exists' };
      }

      // Generate clusterId
      const clusterId = `CLUSTER-${clusterData.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create cluster
      const cluster = new Cluster({
        clusterId,
        developerId: clusterData.developerId,
        name: clusterData.name,
        arabicName: clusterData.arabicName,
        location: clusterData.location,
        emirate: clusterData.emirate,
        area: clusterData.area,
        coordinates: clusterData.coordinates,
        launchDate: clusterData.launchDate,
        completionDate: clusterData.completionDate,
        completionStatus: clusterData.completionStatus,
        totalUnits: clusterData.totalUnits,
        totalPlotArea: clusterData.totalPlotArea,
        estimatedTotalValue: clusterData.estimatedTotalValue,
        amenities: clusterData.amenities || [],
        features: clusterData.features || [],
        images: clusterData.images || [],
        description: clusterData.description,
        notes: clusterData.notes
      });

      await cluster.save();

      return {
        success: true,
        cluster: cluster.toObject(),
        message: `Cluster created: ${clusterId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cluster inventory
   */
  static async getInventory(clusterId) {
    try {
      const cluster = await Cluster.findOne({ clusterId });
      if (!cluster) {
        return { success: false, error: 'Cluster not found' };
      }

      const properties = await Property.find({
        clusterId: cluster._id
      });

      const stats = {
        total: properties.length,
        occupied: 0,
        vacant: 0,
        available: 0,
        byType: {},
        byFurnishing: {},
        byTier: {}
      };

      properties.forEach(prop => {
        // Count by occupancy status
        if (prop.occupancyStatus === 'occupied') stats.occupied++;
        else if (prop.occupancyStatus === 'vacant') stats.vacant++;

        // Count by availability
        if (prop.availabilityStatus === 'available') stats.available++;

        // Count by type
        stats.byType[prop.unitType] = (stats.byType[prop.unitType] || 0) + 1;

        // Count by furnishing
        stats.byFurnishing[prop.furnishingStatus] = (stats.byFurnishing[prop.furnishingStatus] || 0) + 1;

        // Count by tier
        stats.byTier[prop.tier || 'Standard'] = (stats.byTier[prop.tier || 'Standard'] || 0) + 1;
      });

      return {
        success: true,
        inventory: {
          total: stats.total,
          occupancyStats: {
            occupied: stats.occupied,
            vacant: stats.vacant,
            occupancyRate: stats.total > 0 ? ((stats.occupied / stats.total) * 100).toFixed(2) : 0
          },
          availabilityStats: {
            available: stats.available,
            notAvailable: stats.total - stats.available
          },
          byType: stats.byType,
          byFurnishing: stats.byFurnishing,
          byTier: stats.byTier
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cluster financial summary
   */
  static async getFinancialSummary(clusterId) {
    try {
      const cluster = await Cluster.findOne({ clusterId });
      if (!cluster) {
        return { success: false, error: 'Cluster not found' };
      }

      const properties = await Property.find({
        clusterId: cluster._id
      });

      const summary = {
        clusterValue: cluster.estimatedTotalValue,
        totalValue: 0,
        avgValue: 0,
        minValue: Infinity,
        maxValue: 0,
        totalRentalIncome: 0,
        tenantCount: 0,
        ownerCount: 0
      };

      for (const property of properties) {
        summary.totalValue += property.estimatedValue;
        summary.minValue = Math.min(summary.minValue, property.estimatedValue);
        summary.maxValue = Math.max(summary.maxValue, property.estimatedValue);
      }

      if (properties.length > 0) {
        summary.avgValue = summary.totalValue / properties.length;
      }

      // Get rental income
      const tenancies = await PropertyTenancy.aggregate([
        {
          $match: {
            propertyId: { $in: properties.map(p => p._id) }
          }
        },
        {
          $group: {
            _id: null,
            totalRent: { $sum: '$rentAmount' },
            count: { $sum: 1 }
          }
        }
      ]);

      if (tenancies.length > 0) {
        summary.totalRentalIncome = tenancies[0].totalRent;
        summary.tenantCount = tenancies[0].count;
      }

      // Get unique owners
      const owners = await PropertyOwnership.distinct('personId', {
        propertyId: { $in: properties.map(p => p._id) }
      });

      summary.ownerCount = owners.length;

      return {
        success: true,
        summary
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update cluster info
   */
  static async update(clusterId, updateData) {
    try {
      const cluster = await Cluster.findOne({ clusterId });
      if (!cluster) {
        return { success: false, error: 'Cluster not found' };
      }

      // Update allowed fields
      const allowedFields = [
        'features', 'amenities', 'images', 'description', 'notes',
        'completionStatus', 'completionDate'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          cluster[field] = updateData[field];
        }
      });

      await cluster.save();

      return {
        success: true,
        cluster: cluster.toObject(),
        message: 'Cluster information updated'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cluster by ID
   */
  static async findById(clusterId) {
    try {
      const cluster = await Cluster.findOne({ clusterId })
        .populate('developerId');

      return {
        success: !!cluster,
        cluster: cluster ? cluster.toObject() : null,
        error: cluster ? null : 'Cluster not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all clusters
   */
  static async getAll(limit = 100) {
    try {
      const clusters = await Cluster.find()
        .populate('developerId')
        .limit(limit);

      return {
        success: true,
        count: clusters.length,
        clusters: clusters.map(c => c.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get by emirate
   */
  static async getByEmirate(emirate) {
    try {
      const clusters = await Cluster.find({ emirate })
        .populate('developerId');

      return {
        success: true,
        count: clusters.length,
        clusters: clusters.map(c => c.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get by developer
   */
  static async getByDeveloper(developerId) {
    try {
      const developer = await Developer.findOne({ developerId });
      if (!developer) {
        return { success: false, error: 'Developer not found' };
      }

      const clusters = await Cluster.find({
        developerId: developer._id
      });

      return {
        success: true,
        count: clusters.length,
        clusters: clusters.map(c => c.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get by completion status
   */
  static async getByStatus(status) {
    try {
      const clusters = await Cluster.find({
        completionStatus: status
      }).populate('developerId');

      return {
        success: true,
        count: clusters.length,
        clusters: clusters.map(c => c.toObject())
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
      const [
        total,
        byEmirateData,
        byStatusData,
        valueData
      ] = await Promise.all([
        Cluster.countDocuments(),
        Cluster.aggregate([
          { $group: { _id: '$emirate', count: { $sum: 1 } } }
        ]),
        Cluster.aggregate([
          { $group: { _id: '$completionStatus', count: { $sum: 1 } } }
        ]),
        Cluster.aggregate([
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$estimatedTotalValue' },
              avgValue: { $avg: '$estimatedTotalValue' },
              totalUnits: { $sum: '$totalUnits' }
            }
          }
        ])
      ]);

      return {
        success: true,
        stats: {
          total,
          byEmirate: byEmirateData.reduce((acc, item) => {
            acc[item._id || 'Unknown'] = item.count;
            return acc;
          }, {}),
          byStatus: byStatusData.reduce((acc, item) => {
            acc[item._id || 'Unknown'] = item.count;
            return acc;
          }, {}),
          valuation: valueData[0] || { totalValue: 0, totalUnits: 0 }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default ClusterService;
