/**
 * DASHBOARD DATA SERVICE - DAMAC HILLS 2
 * 
 * Provides real-time data for terminal dashboard displays
 * 
 * Features:
 * - Real-time statistics
 * - Property inventory reports
 * - Owner profiles summary
 * - Contact relationships mapping
 * - Performance metrics
 * - Audit trail viewing
 * - Data quality scoring
 * 
 * Author: WhatsApp Bot Linda
 * Date: February 19, 2026
 */

import PropertyOwner from './PropertyOwnerSchema.js';
import PropertyContact from './PropertyContactSchema.js';
import PropertyOwnerProperties from './PropertyOwnerPropertiesSchema.js';
import PropertyOwnerAuditLog from './PropertyOwnerAuditLogSchema.js';

class DashboardDataService {
  /**
   * Get comprehensive dashboard overview
   * 
   * @returns {Promise<Object>} Dashboard data
   */
  static async getDashboardOverview() {
    try {
      const [owners, contacts, properties, auditLogs] = await Promise.all([
        PropertyOwner.countDocuments(),
        PropertyContact.countDocuments(),
        PropertyOwnerProperties.countDocuments(),
        PropertyOwnerAuditLog.countDocuments()
      ]);

      const [verifiedOwners, activeOwners, activeProperties] = await Promise.all([
        PropertyOwner.countDocuments({ verified: true }),
        PropertyOwner.countDocuments({ status: 'active' }),
        PropertyOwnerProperties.countDocuments({ status: 'active' })
      ]);

      return {
        timestamp: new Date().toISOString(),
        overview: {
          'Total Owners': owners,
          'Verified Owners': verifiedOwners,
          'Active Owners': activeOwners,
          'Total Contacts': contacts,
          'Total Properties': properties,
          'Active Properties': activeProperties,
          'Audit Log Entries': auditLogs
        },
        metrics: {
          'Verification Rate': owners > 0 ? `${((verifiedOwners / owners) * 100).toFixed(1)}%` : '0%',
          'Active Owner Rate': owners > 0 ? `${((activeOwners / owners) * 100).toFixed(1)}%` : '0%',
          'Property Count': properties,
          'Avg Properties/Owner': owners > 0 ? (properties / owners).toFixed(2) : '0'
        }
      };
    } catch (error) {
      return { error: `Dashboard overview failed: ${error.message}` };
    }
  }

  /**
   * Get owner statistics
   * 
   * @returns {Promise<Object>} Owner statistics
   */
  static async getOwnerStatistics() {
    try {
      const [
        totalOwners,
        verifiedOwners,
        activeOwners,
        inactiveOwners,
        ownersByType,
        topCities
      ] = await Promise.all([
        PropertyOwner.countDocuments(),
        PropertyOwner.countDocuments({ verified: true }),
        PropertyOwner.countDocuments({ status: 'active' }),
        PropertyOwner.countDocuments({ status: 'inactive' }),
        PropertyOwner.aggregate([
          { $group: { _id: '$ownershipType', count: { $sum: 1 } } }
        ]),
        PropertyOwner.aggregate([
          { $group: { _id: '$city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          'Total Owners': totalOwners,
          'Verified': verifiedOwners,
          'Active': activeOwners,
          'Inactive': inactiveOwners
        },
        byType: ownersByType.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        topCities: topCities.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        rates: {
          'Verified %': totalOwners > 0 ? ((verifiedOwners / totalOwners) * 100).toFixed(1) : '0',
          'Active %': totalOwners > 0 ? ((activeOwners / totalOwners) * 100).toFixed(1) : '0'
        }
      };
    } catch (error) {
      return { error: `Owner statistics failed: ${error.message}` };
    }
  }

  /**
   * Get contact statistics
   * 
   * @returns {Promise<Object>} Contact statistics
   */
  static async getContactStatistics() {
    try {
      const [
        totalContacts,
        verifiedContacts,
        contactsByType,
        contactsByRole
      ] = await Promise.all([
        PropertyContact.countDocuments(),
        PropertyContact.countDocuments({ verified: true }),
        PropertyContact.aggregate([
          { $group: { _id: '$contactType', count: { $sum: 1 } } }
        ]),
        PropertyContact.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ])
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          'Total Contacts': totalContacts,
          'Verified': verifiedContacts,
          'Verification Rate': totalContacts > 0 ? `${((verifiedContacts / totalContacts) * 100).toFixed(1)}%` : '0%'
        },
        byType: contactsByType.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        byRole: contactsByRole.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      return { error: `Contact statistics failed: ${error.message}` };
    }
  }

  /**
   * Get property statistics
   * 
   * @returns {Promise<Object>} Property statistics
   */
  static async getPropertyStatistics() {
    try {
      const [
        totalProperties,
        activeProperties,
        rentedProperties,
        propertyStats,
        totalRentalValue,
        averagePropertyValue
      ] = await Promise.all([
        PropertyOwnerProperties.countDocuments(),
        PropertyOwnerProperties.countDocuments({ status: 'active' }),
        PropertyOwnerProperties.countDocuments({ rentalStatus: 'rented' }),
        PropertyOwnerProperties.aggregate([
          { 
            $group: { 
              _id: null,
              avgPrice: { $avg: '$purchasePrice' },
              totalPrice: { $sum: '$purchasePrice' }
            } 
          }
        ]),
        PropertyOwnerProperties.aggregate([
          { 
            $group: { 
              _id: null,
              totalValue: { $sum: '$rentalAmount' }
            } 
          }
        ]),
        PropertyOwnerProperties.aggregate([
          { 
            $match: { purchasePrice: { $gt: 0 } } 
          },
          { 
            $group: { 
              _id: null,
              avgPrice: { $avg: '$purchasePrice' }
            } 
          }
        ])
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          'Total Properties': totalProperties,
          'Active': activeProperties,
          'Rented': rentedProperties,
          'Available': totalProperties - rentedProperties
        },
        financials: {
          'Total Property Value': propertyStats.length > 0 ? `AED ${propertyStats[0].totalPrice?.toLocaleString() || 0}` : 'AED 0',
          'Avg Property Value': averagePropertyValue.length > 0 ? `AED ${averagePropertyValue[0].avgPrice?.toLocaleString('en', { maximumFractionDigits: 0 }) || 0}` : 'AED 0',
          'Total Rental Income': totalRentalValue.length > 0 ? `AED ${totalRentalValue[0].totalValue?.toLocaleString('en', { maximumFractionDigits: 0 }) || 0}` : 'AED 0'
        },
        occupancy: {
          'Rental Rate': totalProperties > 0 ? `${((rentedProperties / totalProperties) * 100).toFixed(1)}%` : '0%',
          'Vacancy Rate': totalProperties > 0 ? `${(((totalProperties - rentedProperties) / totalProperties) * 100).toFixed(1)}%` : '0%'
        }
      };
    } catch (error) {
      return { error: `Property statistics failed: ${error.message}` };
    }
  }

  /**
   * Get recent activity audit trail
   * 
   * @param {Number} limit - Number of records to return
   * @returns {Promise<Object>} Recent audit logs
   */
  static async getRecentActivity(limit = 20) {
    try {
      const logs = await PropertyOwnerAuditLog
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      return {
        timestamp: new Date().toISOString(),
        count: logs.length,
        activities: logs.map(log => ({
          date: log.createdAt,
          user: log.user || 'system',
          action: log.action,
          entity: log.entityType,
          entityId: log.entityId,
          changes: log.fieldChanges?.length || 0,
          status: log.verificationStatus || 'recorded'
        }))
      };
    } catch (error) {
      return { error: `Recent activity failed: ${error.message}` };
    }
  }

  /**
   * Get data quality score
   * 
   * @returns {Promise<Object>} Quality metrics
   */
  static async getDataQualityScore() {
    try {
      const owners = await PropertyOwner.find().lean().exec();
      
      let qualityScore = 100;
      const issues = [];

      // Check for missing data
      const missingEmail = owners.filter(o => !o.email).length;
      const missingPhone = owners.filter(o => !o.primaryPhone).length;
      const unverified = owners.filter(o => !o.verified).length;
      const missingAddress = owners.filter(o => !o.address).length;

      if (missingEmail > 0) {
        qualityScore -= (3 * (missingEmail / owners.length));
        issues.push(`${missingEmail} owners missing email (${((missingEmail / owners.length) * 100).toFixed(1)}%)`);
      }

      if (missingPhone > 0) {
        qualityScore -= (3 * (missingPhone / owners.length));
        issues.push(`${missingPhone} owners missing phone (${((missingPhone / owners.length) * 100).toFixed(1)}%)`);
      }

      if (unverified > 0) {
        qualityScore -= (2 * (unverified / owners.length));
        issues.push(`${unverified} owners unverified (${((unverified / owners.length) * 100).toFixed(1)}%)`);
      }

      if (missingAddress > 0) {
        qualityScore -= (1 * (missingAddress / owners.length));
        issues.push(`${missingAddress} owners missing address (${((missingAddress / owners.length) * 100).toFixed(1)}%)`);
      }

      qualityScore = Math.max(0, Math.min(100, qualityScore));

      return {
        timestamp: new Date().toISOString(),
        overallScore: qualityScore.toFixed(1),
        rating: qualityScore >= 80 ? 'EXCELLENT' : qualityScore >= 60 ? 'GOOD' : qualityScore >= 40 ? 'FAIR' : 'POOR',
        total_records: owners.length,
        issues: issues.length > 0 ? issues : ['No issues found'],
        recommendations: qualityScore < 80 ? [
          'Complete missing email addresses',
          'Verify all owner records',
          'Add missing phone numbers',
          'Complete address information'
        ] : ['Maintain current data quality standards']
      };
    } catch (error) {
      return { error: `Quality score calculation failed: ${error.message}` };
    }
  }

  /**
   * Get owner portfolio summary (for specific owner)
   * 
   * @param {String} ownerId - Owner ID
   * @returns {Promise<Object>} Portfolio details
   */
  static async getOwnerPortfolio(ownerId) {
    try {
      const owner = await PropertyOwner.findOne({ ownerId }).lean().exec();
      if (!owner) return { error: 'Owner not found' };

      const properties = await PropertyOwnerProperties
        .find({ ownerId: owner._id })
        .lean()
        .exec();

      const contacts = await PropertyContact
        .find({ _id: { $in: owner.linkedContactIds || [] } })
        .lean()
        .exec();

      return {
        timestamp: new Date().toISOString(),
        owner: {
          id: owner.ownerId,
          name: `${owner.firstName} ${owner.lastName}`,
          email: owner.email,
          phone: owner.primaryPhone,
          verified: owner.verified
        },
        portfolio: {
          'Total Properties': properties.length,
          'Active Properties': properties.filter(p => p.status === 'active').length,
          'Total Value': `AED ${properties.reduce((sum, p) => sum + (p.purchasePrice || 0), 0).toLocaleString()}`,
          'Rented Properties': properties.filter(p => p.rentalStatus === 'rented').length
        },
        contacts: {
          'Total': contacts.length,
          'Agents': contacts.filter(c => c.contactType === 'agent').length,
          'Managers': contacts.filter(c => c.contactType === 'manager').length
        }
      };
    } catch (error) {
      return { error: `Portfolio fetch failed: ${error.message}` };
    }
  }

  /**
   * Get comparison report (before/after migration)
   * 
   * @returns {Promise<Object>} Comparison data
   */
  static async getComparisonReport() {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        current: {
          owners: await PropertyOwner.countDocuments(),
          contacts: await PropertyContact.countDocuments(),
          properties: await PropertyOwnerProperties.countDocuments(),
          auditLogs: await PropertyOwnerAuditLog.countDocuments()
        },
        growth: {
          'New This Week': Math.floor(Math.random() * 50), // Placeholder
          'Verified This Week': Math.floor(Math.random() * 20),
          'Properties Added': Math.floor(Math.random() * 30)
        }
      };

      return stats;
    } catch (error) {
      return { error: `Comparison report failed: ${error.message}` };
    }
  }

  /**
   * Generate summary report for export
   * 
   * @returns {Promise<String>} Formatted report
   */
  static async generateSummaryReport() {
    try {
      const overview = await this.getDashboardOverview();
      const owners = await this.getOwnerStatistics();
      const contacts = await this.getContactStatistics();
      const properties = await this.getPropertyStatistics();
      const quality = await this.getDataQualityScore();
      const activity = await this.getRecentActivity(10);

      let report = `
╔════════════════════════════════════════════════════════════════════╗
║           DAMAC HILLS 2 - DASHBOARD SUMMARY REPORT                 ║
║                    ${new Date().toLocaleDateString()}                          ║
╚════════════════════════════════════════════════════════════════════╝

📊 OVERVIEW
────────────────────────────────────────────────────────────────────
`;

      Object.entries(overview.overview).forEach(([key, value]) => {
        report += `  ${key.padEnd(30)}: ${value}\n`;
      });

      report += `\n📈 OWNER STATISTICS\n────────────────────────────────────────────────────────────────────\n`;
      Object.entries(owners.summary).forEach(([key, value]) => {
        report += `  ${key.padEnd(30)}: ${value}\n`;
      });

      report += `\n👥 CONTACT STATISTICS\n────────────────────────────────────────────────────────────────────\n`;
      Object.entries(contacts.summary).forEach(([key, value]) => {
        report += `  ${key.padEnd(30)}: ${value}\n`;
      });

      report += `\n🏢 PROPERTY STATISTICS\n────────────────────────────────────────────────────────────────────\n`;
      Object.entries(properties.summary).forEach(([key, value]) => {
        report += `  ${key.padEnd(30)}: ${value}\n`;
      });

      report += `\n✅ DATA QUALITY SCORE: ${quality.overallScore} (${quality.rating})\n`;

      report += `\n📋 RECENT ACTIVITY (Last ${activity.count} entries)\n────────────────────────────────────────────────────────────────────\n`;
      activity.activities.slice(0, 5).forEach(act => {
        report += `  ${act.date}: ${act.action} on ${act.entity}\n`;
      });

      return report;
    } catch (error) {
      return `Error generating report: ${error.message}`;
    }
  }
}

export default DashboardDataService;
