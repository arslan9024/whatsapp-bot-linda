/**
 * PropertyTenancyService.js
 * PURPOSE: Service layer for PropertyTenancy (rental contract) operations
 * HANDLES: CRUD, payment tracking, cheque management, contract lifecycle
 */

import PropertyTenancy from './PropertyTenancySchema.js';
import Property from './PropertySchema.js';
import Person from './PersonSchema.js';
import PropertyOwnership from './PropertyOwnershipSchema.js';
import ValidationHelper from './ValidationHelper.js';
import QueryHelper from './QueryHelper.js';

class PropertyTenancyService {
  /**
   * Create a new tenancy contract
   * Validates: tenant exists, landlords exist, property exists, cheques sum to contract amount
   */
  static async createTenancy(tenancyData) {
    try {
      // Validate all data
      const validation = await ValidationHelper.validatePropertyTenancy(
        PropertyTenancy,
        tenancyData,
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

      // Validate landlords own property
      const landlordCheck = await ValidationHelper.validateLandlordsOwnProperty(
        tenancyData.landlordPersonIds,
        tenancyData.propertyId,
        PropertyOwnership
      );

      if (!landlordCheck.valid) {
        return {
          success: false,
          error: 'Landlord validation failed',
          errors: landlordCheck.errors
        };
      }

      // Check for overlapping tenancies
      const conflictCheck = await ValidationHelper.checkTenancyConflict(
        PropertyTenancy,
        tenancyData.propertyId,
        {
          contractStartDate: tenancyData.contractStartDate,
          contractExpiryDate: tenancyData.contractExpiryDate
        }
      );

      if (!conflictCheck.valid) {
        return {
          success: false,
          error: conflictCheck.error
        };
      }

      // Generate tenancyId
      const tenancyId = `TENANCY-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create tenancy
      const tenancy = new PropertyTenancy({
        tenancyId,
        propertyId: tenancyData.propertyId,
        tenantPersonId: tenancyData.tenantPersonId,
        landlordPersonIds: tenancyData.landlordPersonIds,
        contractStartDate: tenancyData.contractStartDate,
        contractExpiryDate: tenancyData.contractExpiryDate,
        contractAmount: tenancyData.contractAmount,
        contractCurrency: tenancyData.contractCurrency || 'AED',
        paymentSchedule: tenancyData.paymentSchedule,
        maintenanceResponsibility: tenancyData.maintenanceResponsibility,
        utilitiesResponsibility: tenancyData.utilitiesResponsibility,
        allowPets: tenancyData.allowPets,
        allowSubletting: tenancyData.allowSubletting,
        depositAmount: tenancyData.depositAmount,
        status: 'active',
        notes: tenancyData.notes
      });

      await tenancy.save();

      // Update property with current tenancy
      await Property.updateOne(
        { _id: tenancyData.propertyId },
        {
          currentTenancyId: tenancy._id,
          currentTenantPersonId: tenancyData.tenantPersonId
        }
      );

      return {
        success: true,
        tenancy: tenancy.toObject(),
        message: `Tenancy created: ${tenancyId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find tenancy by ID
   */
  static async findById(tenancyId) {
    try {
      const tenancy = await PropertyTenancy.findOne({ tenancyId })
        .populate('propertyId')
        .populate('tenantPersonId')
        .populate('landlordPersonIds');

      return {
        success: !!tenancy,
        tenancy: tenancy ? tenancy.toObject() : null,
        error: tenancy ? null : 'Tenancy not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find active tenancy for property
   */
  static async findActiveByProperty(propertyId) {
    try {
      const tenancy = await QueryHelper.findActiveTenancy(PropertyTenancy, propertyId);
      return {
        success: !!tenancy,
        tenancy: tenancy ? tenancy.toObject() : null,
        error: tenancy ? null : 'No active tenancy found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find all tenancies for tenant
   */
  static async findByTenant(tenantPersonId) {
    try {
      const tenancies = await PropertyTenancy.findByTenant(tenantPersonId);
      return {
        success: true,
        count: tenancies.length,
        tenancies: tenancies.map(t => t.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Find all tenancies for landlord
   */
  static async findByLandlord(landlordPersonId) {
    try {
      const tenancies = await PropertyTenancy.findByLandlord(landlordPersonId);
      return {
        success: true,
        count: tenancies.length,
        tenancies: tenancies.map(t => t.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark cheque as paid
   */
  static async markChequeAsPaid(tenancyId, chequeNumber, paidDate = new Date()) {
    try {
      const tenancy = await PropertyTenancy.findOne({ tenancyId });
      if (!tenancy) {
        return { success: false, error: 'Tenancy not found' };
      }

      await tenancy.markChequeAsPaid(chequeNumber, paidDate);

      return {
        success: true,
        tenancy: tenancy.toObject(),
        cheque: tenancy.paymentSchedule.cheques.find(c => c.chequeNumber === chequeNumber),
        paymentStatus: tenancy.getPaymentStatus(),
        message: `Cheque ${chequeNumber} marked as paid`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark cheque as unpaid
   */
  static async markChequeAsUnpaid(tenancyId, chequeNumber) {
    try {
      const tenancy = await PropertyTenancy.findOne({ tenancyId });
      if (!tenancy) {
        return { success: false, error: 'Tenancy not found' };
      }

      await tenancy.markChequeAsUnpaid(chequeNumber);

      return {
        success: true,
        tenancy: tenancy.toObject(),
        cheque: tenancy.paymentSchedule.cheques.find(c => c.chequeNumber === chequeNumber),
        paymentStatus: tenancy.getPaymentStatus(),
        message: `Cheque ${chequeNumber} marked as unpaid`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(tenancyId) {
    try {
      const result = await QueryHelper.getTenancyPaymentSummary(PropertyTenancy, tenancyId);
      return {
        success: !!result,
        paymentStatus: result,
        error: result ? null : 'Tenancy not found'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get overdue cheques
   */
  static async getOverdueCheques() {
    try {
      const tenancies = await QueryHelper.findOverdueCheques(PropertyTenancy);
      const overdueList = tenancies.flatMap(t =>
        t.getOverdueCheques().map(c => ({
          tenancyId: t.tenancyId,
          propertyId: t.propertyId,
          tenant: t.tenantPersonId,
          ...c
        }))
      );

      return {
        success: true,
        count: overdueList.length,
        overdueList
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upcoming cheques
   */
  static async getUpcomingCheques(daysAhead = 7) {
    try {
      const tenancies = await QueryHelper.findUpcomingCheques(PropertyTenancy, daysAhead);
      const upcomingList = [];

      for (const t of tenancies) {
        const today = new Date();
        const future = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        const upcoming = t.paymentSchedule.cheques.filter(c => {
          const dueDate = new Date(c.chequeDueDate);
          return !c.isPaid && dueDate >= today && dueDate <= future;
        });

        upcoming.forEach(c => {
          upcomingList.push({
            tenancyId: t.tenancyId,
            propertyId: t.propertyId,
            tenant: t.tenantPersonId,
            ...c
          });
        });
      }

      return {
        success: true,
        count: upcomingList.length,
        daysAhead,
        upcomingList
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * End tenancy (normal completion)
   */
  static async endTenancy(tenancyId, endDate = new Date()) {
    try {
      const tenancy = await PropertyTenancy.findOne({ tenancyId });
      if (!tenancy) {
        return { success: false, error: 'Tenancy not found' };
      }

      await tenancy.endTenancy(endDate);

      // Clear current tenancy from property
      await Property.updateOne(
        { _id: tenancy.propertyId },
        { currentTenancyId: null, currentTenantPersonId: null }
      );

      return {
        success: true,
        tenancy: tenancy.toObject(),
        message: 'Tenancy ended'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Terminate tenancy (early, with reason)
   */
  static async terminateTenancy(tenancyId, terminationDate = new Date(), reason = null) {
    try {
      const tenancy = await PropertyTenancy.findOne({ tenancyId });
      if (!tenancy) {
        return { success: false, error: 'Tenancy not found' };
      }

      await tenancy.terminateTenancy(terminationDate, reason);

      // Clear current tenancy from property
      await Property.updateOne(
        { _id: tenancy.propertyId },
        { currentTenancyId: null, currentTenantPersonId: null }
      );

      return {
        success: true,
        tenancy: tenancy.toObject(),
        message: 'Tenancy terminated'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active tenancies
   */
  static async getActive(limit = 100) {
    try {
      const tenancies = await PropertyTenancy.findActive()
        .limit(limit)
        .populate('propertyId')
        .populate('tenantPersonId')
        .populate('landlordPersonIds');

      return {
        success: true,
        count: tenancies.length,
        tenancies: tenancies.map(t => t.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get expired contracts (still marked active)
   */
  static async getExpiredContracts() {
    try {
      const tenancies = await QueryHelper.getExpiredContracts(PropertyTenancy);
      return {
        success: true,
        count: tenancies.length,
        expiredContracts: tenancies.map(t => t.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upcoming expirations
   */
  static async getUpcomingExpirations(daysAhead = 30) {
    try {
      const tenancies = await QueryHelper.getUpcomingExpirations(PropertyTenancy, daysAhead);
      return {
        success: true,
        count: tenancies.length,
        daysAhead,
        expiringContracts: tenancies.map(t => t.toObject())
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get tenancy history for property
   */
  static async getPropertyHistory(propertyId) {
    try {
      const tenancies = await QueryHelper.getPropertyTenancyHistory(PropertyTenancy, propertyId);
      return {
        success: true,
        count: tenancies.length,
        history: tenancies.map(t => t.toObject())
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
      const [total, active, ended, expired, terminated] = await Promise.all([
        PropertyTenancy.countDocuments(),
        PropertyTenancy.countDocuments({ status: 'active' }),
        PropertyTenancy.countDocuments({ status: 'ended' }),
        PropertyTenancy.countDocuments({ status: 'expired' }),
        PropertyTenancy.countDocuments({ status: 'terminated' })
      ]);

      // Get payment statistics
      const paymentStats = await PropertyTenancy.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalContracts: { $sum: 1 },
            totalContractAmount: { $sum: '$contractAmount' },
            totalPaid: {
              $sum: {
                $sum: {
                  $map: {
                    input: { $filter: { input: '$paymentSchedule.cheques', as: 'cheque', cond: '$$cheque.isPaid' } },
                    as: 'cheque',
                    in: '$$cheque.chequeAmount'
                  }
                }
              }
            }
          }
        }
      ]);

      const overdueCount = (await QueryHelper.findOverdueCheques(PropertyTenancy)).length;

      return {
        success: true,
        stats: {
          total,
          byStatus: { active, ended, expired, terminated },
          payment: paymentStats[0] || { totalContracts: 0, totalContractAmount: 0, totalPaid: 0 },
          overdueCount
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default PropertyTenancyService;
