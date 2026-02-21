/**
 * PropertyBuyingService.js
 * PURPOSE: Service layer for PropertyBuying operations
 * HANDLES: Purchase transactions, payment tracking, ownership transfer
 */

import PropertyBuying from './PropertyBuyingSchema.js';
import Property from './PropertySchema.js';
import Person from './PersonSchema.js';
import PropertyOwnership from './PropertyOwnershipSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PropertyBuyingService {
  /**
   * Create new buying record
   * Validates: buyer exists, property exists, seller exists
   */
  static async createBuyingRecord(buyingData) {
    try {
      // Validate buyer exists
      const buyer = await Person.findById(buyingData.buyerId);
      if (!buyer) {
        return { success: false, error: 'Buyer not found' };
      }

      // Validate property exists
      const property = await Property.findOne({ propertyId: buyingData.propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      // Validate seller exists
      const seller = await Person.findById(buyingData.sellerId);
      if (!seller) {
        return { success: false, error: 'Seller not found' };
      }

      // Generate linkId
      const linkId = `BUY-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create buying record
      const record = new PropertyBuying({
        linkId,
        buyerId: buyingData.buyerId,
        sellerId: buyingData.sellerId,
        propertyId: property._id,
        purchasePrice: buyingData.purchasePrice,
        currency: buyingData.currency || 'AED',
        purchaseDate: buyingData.purchaseDate,
        downPayment: buyingData.downPayment,
        mortgageAmount: buyingData.mortgageAmount,
        mortgageProvider: buyingData.mortgageProvider,
        mortgageTerm: buyingData.mortgageTerm,
        mortgageRate: buyingData.mortgageRate,
        transactionId: buyingData.transactionId,
        status: buyingData.status || 'pending',
        notes: buyingData.notes
      });

      await record.save();

      return {
        success: true,
        buying: record.toObject(),
        message: `Buying record created: ${linkId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get buyer's purchase history
   */
  static async getBuyerPurchases(buyerId) {
    try {
      const purchases = await PropertyBuying.find({
        buyerId
      }).populate({
        path: 'propertyId',
        populate: { path: 'clusterId' }
      }).populate('sellerId');

      return {
        success: true,
        count: purchases.length,
        purchases: purchases.map(p => ({
          linkId: p.linkId,
          propertyId: p.propertyId.propertyId,
          clusterId: p.propertyId.clusterId.clusterId,
          unitNumber: p.propertyId.unitNumber,
          sellerName: `${p.sellerId.firstName} ${p.sellerId.lastName}`,
          purchasePrice: p.purchasePrice,
          purchaseDate: p.purchaseDate,
          status: p.status,
          mortgageAmount: p.mortgageAmount
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get seller's sale history
   */
  static async getSellerSales(sellerId) {
    try {
      const sales = await PropertyBuying.find({
        sellerId
      }).populate({
        path: 'propertyId',
        populate: { path: 'clusterId' }
      }).populate('buyerId');

      return {
        success: true,
        count: sales.length,
        sales: sales.map(s => ({
          linkId: s.linkId,
          propertyId: s.propertyId.propertyId,
          clusterId: s.propertyId.clusterId.clusterId,
          unitNumber: s.propertyId.unitNumber,
          buyerName: `${s.buyerId.firstName} ${s.buyerId.lastName}`,
          purchasePrice: s.purchasePrice,
          purchaseDate: s.purchaseDate,
          status: s.status
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get property sales history
   */
  static async getPropertySalesHistory(propertyId) {
    try {
      const property = await Property.findOne({ propertyId });
      if (!property) {
        return { success: false, error: 'Property not found' };
      }

      const sales = await PropertyBuying.find({
        propertyId: property._id
      }).populate('buyerId').populate('sellerId');

      return {
        success: true,
        count: sales.length,
        sales: sales.map(s => ({
          linkId: s.linkId,
          buyerName: `${s.buyerId.firstName} ${s.buyerId.lastName}`,
          sellerName: `${s.sellerId.firstName} ${s.sellerId.lastName}`,
          purchasePrice: s.purchasePrice,
          purchaseDate: s.purchaseDate,
          status: s.status
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record payment
   */
  static async recordPayment(linkId, paymentData) {
    try {
      const record = await PropertyBuying.findOne({ linkId });
      if (!record) {
        return { success: false, error: 'Buying record not found' };
      }

      const payment = {
        paymentDate: paymentData.paymentDate || new Date(),
        amount: paymentData.amount,
        paymentType: paymentData.paymentType, // Down payment, Cheque installment, etc.
        chequeNumber: paymentData.chequeNumber,
        notes: paymentData.notes
      };

      record.payments.push(payment);
      record.totalPaidAmount += paymentData.amount;

      // Check if fully paid
      if (record.totalPaidAmount >= record.purchasePrice) {
        record.status = 'completed';
      }

      await record.save();

      return {
        success: true,
        buying: record.toObject(),
        payment,
        totalPaid: record.totalPaidAmount,
        remainingBalance: Math.max(0, record.purchasePrice - record.totalPaidAmount),
        message: `Payment recorded: ${paymentData.amount} AED`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(linkId) {
    try {
      const record = await PropertyBuying.findOne({ linkId });
      if (!record) {
        return { success: false, error: 'Buying record not found' };
      }

      const remainingBalance = Math.max(0, record.purchasePrice - record.totalPaidAmount);
      const paymentPercentage = (record.totalPaidAmount / record.purchasePrice) * 100;

      return {
        success: true,
        paymentStatus: {
          purchasePrice: record.purchasePrice,
          totalPaid: record.totalPaidAmount,
          remainingBalance,
          paymentPercentage: paymentPercentage.toFixed(2),
          paymentCount: record.payments.length,
          payments: record.payments.map(p => ({
            date: p.paymentDate,
            amount: p.amount,
            type: p.paymentType,
            chequeNumber: p.chequeNumber
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete transaction and create ownership
   */
  static async completeTransaction(linkId) {
    try {
      const record = await PropertyBuying.findOne({ linkId });
      if (!record) {
        return { success: false, error: 'Buying record not found' };
      }

      // Verify fully paid
      if (record.totalPaidAmount < record.purchasePrice) {
        return {
          success: false,
          error: 'Cannot complete transaction: balance remains',
          remainingBalance: record.purchasePrice - record.totalPaidAmount
        };
      }

      // Create ownership record
      const ownership = await PropertyOwnership.create({
        linkId: `OWN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        personId: record.buyerId,
        propertyId: record.propertyId,
        ownershipPercentage: 100,
        ownershipType: 'Full Owner',
        acquisitionDate: record.purchaseDate,
        acquisitionPrice: record.purchasePrice,
        currency: record.currency,
        currentEstimatedValue: record.purchasePrice,
        status: 'active'
      });

      // Update buying record status
      record.status = 'completed';
      await record.save();

      return {
        success: true,
        buying: record.toObject(),
        ownership: ownership.toObject(),
        message: 'Transaction completed and ownership created'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get purchasing power analysis
   */
  static async getPurchasingPower(buyerId) {
    try {
      const purchases = await PropertyBuying.find({
        buyerId,
        status: { $ne: 'cancelled' }
      });

      const stats = {
        totalPurchases: purchases.length,
        totalInvested: 0,
        totalDownPayments: 0,
        totalMortgageAmount: 0,
        avgPurchasePrice: 0,
        mortgagedProperties: 0,
        completedTransactions: 0,
        pendingTransactions: 0
      };

      purchases.forEach(purchase => {
        stats.totalInvested += purchase.purchasePrice;
        stats.totalDownPayments += purchase.downPayment;
        stats.totalMortgageAmount += purchase.mortgageAmount;

        if (purchase.mortgageAmount > 0) stats.mortgagedProperties++;
        if (purchase.status === 'completed') stats.completedTransactions++;
        if (purchase.status === 'pending') stats.pendingTransactions++;
      });

      if (purchases.length > 0) {
        stats.avgPurchasePrice = stats.totalInvested / purchases.length;
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
   * Get mortgage analysis
   */
  static async getMortgageAnalysis(buyerId) {
    try {
      const mortgaged = await PropertyBuying.find({
        buyerId,
        mortgageAmount: { $gt: 0 }
      });

      const stats = {
        totalMortgages: mortgaged.length,
        totalMortgageAmount: 0,
        totalDownPayments: 0,
        avgMortgageRate: 0,
        avgMortgageTerm: 0,
        byProvider: {}
      };

      mortgaged.forEach(purchase => {
        stats.totalMortgageAmount += purchase.mortgageAmount;
        stats.totalDownPayments += purchase.downPayment;
        stats.avgMortgageRate += purchase.mortgageRate;
        stats.avgMortgageTerm += purchase.mortgageTerm;

        if (!stats.byProvider[purchase.mortgageProvider]) {
          stats.byProvider[purchase.mortgageProvider] = {
            count: 0,
            totalAmount: 0
          };
        }
        stats.byProvider[purchase.mortgageProvider].count++;
        stats.byProvider[purchase.mortgageProvider].totalAmount += purchase.mortgageAmount;
      });

      if (mortgaged.length > 0) {
        stats.avgMortgageRate = (stats.avgMortgageRate / mortgaged.length).toFixed(2);
        stats.avgMortgageTerm = (stats.avgMortgageTerm / mortgaged.length).toFixed(1);
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
   * Get buying record by ID
   */
  static async findById(linkId) {
    try {
      const buying = await PropertyBuying.findOne({ linkId })
        .populate('buyerId')
        .populate('sellerId')
        .populate({
          path: 'propertyId',
          populate: { path: 'clusterId' }
        });

      return {
        success: !!buying,
        buying: buying ? buying.toObject() : null,
        error: buying ? null : 'Buying record not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all buying records
   */
  static async getAll(filter = {}, limit = 100) {
    try {
      const records = await PropertyBuying.find(filter)
        .populate('buyerId')
        .populate('sellerId')
        .populate({
          path: 'propertyId',
          populate: { path: 'clusterId' }
        })
        .limit(limit);

      return {
        success: true,
        count: records.length,
        records: records.map(r => r.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get market statistics
   */
  static async getMarketStats() {
    try {
      const [total, completed, pending, cancelled] = await Promise.all([
        PropertyBuying.countDocuments(),
        PropertyBuying.countDocuments({ status: 'completed' }),
        PropertyBuying.countDocuments({ status: 'pending' }),
        PropertyBuying.countDocuments({ status: 'cancelled' })
      ]);

      const pricing = await PropertyBuying.aggregate([
        {
          $group: {
            _id: null,
            totalInvested: { $sum: '$purchasePrice' },
            avgPrice: { $avg: '$purchasePrice' },
            minPrice: { $min: '$purchasePrice' },
            maxPrice: { $max: '$purchasePrice' }
          }
        }
      ]);

      const financing = await PropertyBuying.aggregate([
        {
          $group: {
            _id: null,
            totalMortgage: { $sum: '$mortgageAmount' },
            totalDownPayments: { $sum: '$downPayment' },
            mortgagedCount: {
              $sum: {
                $cond: [{ $gt: ['$mortgageAmount', 0] }, 1, 0]
              }
            }
          }
        }
      ]);

      return {
        success: true,
        stats: {
          total,
          byStatus: { completed, pending, cancelled },
          pricing: pricing[0] || { totalInvested: 0, avgPrice: 0 },
          financing: financing[0] || { totalMortgage: 0, totalDownPayments: 0 }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PropertyBuyingService;
