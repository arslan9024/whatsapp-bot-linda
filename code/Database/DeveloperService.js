/**
 * DeveloperService.js
 * PURPOSE: Service layer for Developer operations
 * HANDLES: Developer management, cluster tracking, project portfolio
 */

import Developer from './DeveloperSchema.js';
import Cluster from './ClusterSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class DeveloperService {
  /**
   * Create new developer
   * Validates: required fields, unique name
   */
  static async create(developerData) {
    try {
      // Check if developer already exists
      const existing = await Developer.findOne({
        name: developerData.name
      });

      if (existing) {
        return { success: false, error: 'Developer with this name already exists' };
      }

      // Generate developerId
      const developerId = `DEV-${developerData.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create developer
      const developer = new Developer({
        developerId,
        name: developerData.name,
        arabicName: developerData.arabicName,
        type: developerData.type, // Public, Private, Contractor, etc.
        foundedYear: developerData.foundedYear,
        headquarters: developerData.headquarters,
        contactPerson: developerData.contactPerson,
        email: developerData.email,
        phone: developerData.phone,
        website: developerData.website,
        logo: developerData.logo,
        description: developerData.description,
        specialization: developerData.specialization,
        rating: developerData.rating || 0,
        notes: developerData.notes
      });

      await developer.save();

      return {
        success: true,
        developer: developer.toObject(),
        message: `Developer created: ${developerId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get developer's clusters/projects
   */
  static async getDeveloperProjects(developerId) {
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
        projects: clusters.map(c => ({
          clusterId: c.clusterId,
          name: c.name,
          arabicName: c.arabicName,
          location: c.location,
          totalUnits: c.totalUnits,
          completionStatus: c.completionStatus,
          launchDate: c.launchDate
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get developer portfolio statistics
   */
  static async getPortfolioStats(developerId) {
    try {
      const developer = await Developer.findOne({ developerId });
      if (!developer) {
        return { success: false, error: 'Developer not found' };
      }

      const clusters = await Cluster.find({
        developerId: developer._id
      });

      const stats = {
        totalProjects: clusters.length,
        totalUnits: 0,
        byStatus: {
          planning: 0,
          ongoing: 0,
          completed: 0,
          abandoned: 0
        },
        totalValue: 0,
        projects: []
      };

      for (const cluster of clusters) {
        stats.totalUnits += cluster.totalUnits;
        stats.byStatus[cluster.completionStatus] = (stats.byStatus[cluster.completionStatus] || 0) + 1;
        stats.totalValue += cluster.estimatedTotalValue || 0;

        stats.projects.push({
          clusterId: cluster.clusterId,
          name: cluster.name,
          units: cluster.totalUnits,
          status: cluster.completionStatus,
          totalValue: cluster.estimatedTotalValue
        });
      }

      return {
        success: true,
        stats
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update developer info
   */
  static async update(developerId, updateData) {
    try {
      const developer = await Developer.findOne({ developerId });
      if (!developer) {
        return { success: false, error: 'Developer not found' };
      }

      // Update allowed fields
      const allowedFields = [
        'website', 'contactPerson', 'email', 'phone', 'logo',
        'description', 'specialization', 'rating', 'notes'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          developer[field] = updateData[field];
        }
      });

      await developer.save();

      return {
        success: true,
        developer: developer.toObject(),
        message: 'Developer information updated'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get developer by ID
   */
  static async findById(developerId) {
    try {
      const developer = await Developer.findOne({ developerId });

      return {
        success: !!developer,
        developer: developer ? developer.toObject() : null,
        error: developer ? null : 'Developer not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all developers
   */
  static async getAll(limit = 100) {
    try {
      const developers = await Developer.find().limit(limit);

      return {
        success: true,
        count: developers.length,
        developers: developers.map(d => d.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search developers
   */
  static async search(query, limit = 50) {
    try {
      const developers = await Developer.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { arabicName: { $regex: query, $options: 'i' } },
          { specialization: { $regex: query, $options: 'i' } }
        ]
      }).limit(limit);

      return {
        success: true,
        count: developers.length,
        developers: developers.map(d => d.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get by type
   */
  static async getByType(type) {
    try {
      const developers = await Developer.find({ type });

      return {
        success: true,
        count: developers.length,
        developers: developers.map(d => d.toObject())
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
      const [total, byType] = await Promise.all([
        Developer.countDocuments(),
        Developer.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ])
      ]);

      return {
        success: true,
        stats: {
          total,
          byType: byType.reduce((acc, item) => {
            acc[item._id || 'Unknown'] = item.count;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default DeveloperService;
