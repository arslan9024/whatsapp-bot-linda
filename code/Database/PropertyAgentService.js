/**
 * PropertyAgentService.js
 * PURPOSE: Service layer for PropertyAgent operations
 * HANDLES: Agent commission tracking, property listing management, agent performance
 */

import PropertyAgent from './PropertyAgentSchema.js';
import Property from './PropertySchema.js';
import Person from './PersonSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PropertyAgentService {
  /**
   * Assign agent to property
   * Validates: person exists, property exists, no duplicate assignment
   */
  static async createListing(listingData) {
    try {
      // Validate agent exists
      const agent = await Person.findById(listingData.personId);
      if (!agent) {
        return { success: false, error: 'Agent (person) not found' };
      }

      // Validate property exists
      const property = await Property.findOne({ propertyId: listingData.propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Check for duplicate active listing
      const existing = await PropertyAgent.findOne({
        personId: listingData.personId,
        propertyId: property._id,
        status: 'active'
      });

      if (existing) {
        return { success: false, error: 'Agent already has active listing for this property' };
      }

      // Generate linkId
      const linkId = `AGENT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create listing
      const listing = new PropertyAgent({
        linkId,
        personId: listingData.personId,
        propertyId: property._id,
        listingPrice: listingData.listingPrice,
        listingType: listingData.listingType, // Lease, Sale, Both
        listingStartDate: listingData.listingStartDate,
        listingEndDate: listingData.listingEndDate,
        commissionPercentage: listingData.commissionPercentage,
        commissionStructure: listingData.commissionStructure,
        status: listingData.status || 'active',
        notes: listingData.notes
      });

      await listing.save();

      return {
        success: true,
        listing: listing.toObject(),
        message: `Listing created: ${linkId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get agent's active listings
   */
  static async getAgentListings(personId) {
    try {
      const listings = await PropertyAgent.find({
        personId,
        status: 'active'
      }).populate({
        path: 'propertyId',
        populate: { path: 'clusterId' }
      });

      return {
        success: true,
        count: listings.length,
        listings: listings.map(l => ({
          linkId: l.linkId,
          propertyId: l.propertyId.propertyId,
          clusterId: l.propertyId.clusterId.clusterId,
          unitNumber: l.propertyId.unitNumber,
          listingPrice: l.listingPrice,
          listingType: l.listingType,
          startDate: l.listingStartDate,
          endDate: l.listingEndDate,
          commissionPercentage: l.commissionPercentage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get property agents
   */
  static async getPropertyAgents(propertyId) {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      const agents = await PropertyAgent.find({
        propertyId: property._id,
        status: 'active'
      }).populate('personId');

      return {
        success: true,
        count: agents.length,
        agents: agents.map(a => ({
          linkId: a.linkId,
          personId: a.personId._id,
          firstName: a.personId.firstName,
          lastName: a.personId.lastName,
          mobile: a.personId.mobile,
          email: a.personId.email,
          listingPrice: a.listingPrice,
          listingType: a.listingType,
          commissionPercentage: a.commissionPercentage
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record sale transaction
   */
  static async recordSale(linkId, saleData) {
    try {
      const listing = await PropertyAgent.findOne({ linkId });
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Calculate commission
      const salePrice = saleData.salePrice;
      const commissionsAmount = (salePrice * listing.commissionPercentage) / 100;

      // Record transaction
      const transaction = {
        transactionType: 'sale',
        salePrice,
        commissionAmount: commissionsAmount,
        commissionPercentage: listing.commissionPercentage,
        saleDate: saleData.saleDate || new Date(),
        buyerName: saleData.buyerName,
        notes: saleData.notes
      };

      listing.transactions.push(transaction);
      listing.status = 'sold';
      listing.listingEndDate = saleData.saleDate || new Date();

      await listing.save();

      return {
        success: true,
        listing: listing.toObject(),
        transaction,
        commissionAmount: commissionsAmount,
        message: `Sale recorded: Commission due is ${commissionsAmount.toFixed(2)} AED`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record rental transaction
   */
  static async recordRental(linkId, rentalData) {
    try {
      const listing = await PropertyAgent.findOne({ linkId });
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Calculate commission
      const rentalAmount = rentalData.rentalAmount;
      const commissionsAmount = (rentalAmount * listing.commissionPercentage) / 100;

      // Record transaction
      const transaction = {
        transactionType: 'rental',
        rentalAmount,
        commissionAmount: commissionsAmount,
        commissionPercentage: listing.commissionPercentage,
        transactionDate: rentalData.transactionDate || new Date(),
        tenantName: rentalData.tenantName,
        period: rentalData.period, // Monthly, Yearly, etc.
        notes: rentalData.notes
      };

      listing.transactions.push(transaction);

      await listing.save();

      return {
        success: true,
        listing: listing.toObject(),
        transaction,
        commissionAmount: commissionsAmount,
        message: `Rental transaction recorded: Commission due is ${commissionsAmount.toFixed(2)} AED`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get agent performance stats
   */
  static async getAgentPerformance(personId) {
    try {
      const listings = await PropertyAgent.find({
        personId
      }).populate({
        path: 'propertyId',
        populate: { path: 'clusterId' }
      });

      const stats = {
        totalListings: listings.length,
        activeListings: listings.filter(l => l.status === 'active').length,
        soldListings: listings.filter(l => l.status === 'sold').length,
        leaseListings: listings.filter(l => l.listingType === 'Lease').length,
        saleListings: listings.filter(l => l.listingType === 'Sale').length,
        totalTransactions: 0,
        totalCommissionsEarned: 0,
        salesTransactions: 0,
        rentalTransactions: 0,
        byCluster: {}
      };

      // Calculate stats
      listings.forEach(listing => {
        const cluster = listing.propertyId.clusterId.clusterId;
        if (!stats.byCluster[cluster]) {
          stats.byCluster[cluster] = {
            listingCount: 0,
            transactionCount: 0,
            commissionsEarned: 0
          };
        }
        stats.byCluster[cluster].listingCount++;

        // Process transactions
        listing.transactions.forEach(txn => {
          stats.totalTransactions++;
          stats.totalCommissionsEarned += txn.commissionAmount;
          stats.byCluster[cluster].transactionCount++;
          stats.byCluster[cluster].commissionsEarned += txn.commissionAmount;

          if (txn.transactionType === 'sale') {
            stats.salesTransactions++;
          } else if (txn.transactionType === 'rental') {
            stats.rentalTransactions++;
          }
        });
      });

      return {
        success: true,
        stats
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Close/end listing
   */
  static async closeListing(linkId, reason = '') {
    try {
      const listing = await PropertyAgent.findOne({ linkId });
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      listing.status = 'closed';
      listing.listingEndDate = new Date();
      listing.notes = `${listing.notes || ''} Closed: ${reason}`.trim();

      await listing.save();

      return {
        success: true,
        listing: listing.toObject(),
        message: 'Listing closed'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update commission
   */
  static async updateCommission(linkId, newCommissionPercentage, notes = '') {
    try {
      const listing = await PropertyAgent.findOne({ linkId });
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      const oldCommission = listing.commissionPercentage;
      listing.commissionPercentage = newCommissionPercentage;
      listing.notes = `${listing.notes || ''} Commission changed from ${oldCommission}% to ${newCommissionPercentage}%: ${notes}`.trim();

      await listing.save();

      return {
        success: true,
        listing: listing.toObject(),
        message: `Commission updated from ${oldCommission}% to ${newCommissionPercentage}%`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get listing by ID
   */
  static async findById(linkId) {
    try {
      const listing = await PropertyAgent.findOne({ linkId })
        .populate('personId')
        .populate({
          path: 'propertyId',
          populate: { path: 'clusterId' }
        });

      return {
        success: !!listing,
        listing: listing ? listing.toObject() : null,
        error: listing ? null : 'Listing not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active listings
   */
  static async getActive(limit = 100) {
    try {
      const listings = await PropertyAgent.find({ status: 'active' })
        .populate('personId')
        .populate({
          path: 'propertyId',
          populate: { path: 'clusterId' }
        })
        .limit(limit);

      return {
        success: true,
        count: listings.length,
        listings: listings.map(l => l.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get commission statistics
   */
  static async getCommissionStats() {
    try {
      const [total, active, sold, closed] = await Promise.all([
        PropertyAgent.countDocuments(),
        PropertyAgent.countDocuments({ status: 'active' }),
        PropertyAgent.countDocuments({ status: 'sold' }),
        PropertyAgent.countDocuments({ status: 'closed' })
      ]);

      const commissions = await PropertyAgent.aggregate([
        {
          $unwind: '$transactions'
        },
        {
          $group: {
            _id: null,
            totalCommissions: { $sum: '$transactions.commissionAmount' },
            totalTransactions: { $sum: 1 },
            salesCommissions: {
              $sum: {
                $cond: [
                  { $eq: ['$transactions.transactionType', 'sale'] },
                  '$transactions.commissionAmount',
                  0
                ]
              }
            },
            rentalCommissions: {
              $sum: {
                $cond: [
                  { $eq: ['$transactions.transactionType', 'rental'] },
                  '$transactions.commissionAmount',
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        success: true,
        stats: {
          total,
          byStatus: { active, sold, closed },
          commissions: commissions[0] || {
            totalCommissions: 0,
            totalTransactions: 0,
            salesCommissions: 0,
            rentalCommissions: 0
          }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PropertyAgentService;
