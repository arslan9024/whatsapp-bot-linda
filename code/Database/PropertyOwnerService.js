/**
 * ========================================================================
 * PROPERTY OWNER SERVICE - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Service layer for PropertyOwner, PropertyContact, and PropertyOwnerProperties:
 * - Complete CRUD operations
 * - Data validation & transformation
 * - Relationship management
 * - Batch operations
 * - Query helpers
 * 
 * @module PropertyOwnerService
 * @since Phase 30 - February 19, 2026
 */

import PropertyOwner from './PropertyOwnerSchema.js';
import PropertyContact from './PropertyContactSchema.js';
import PropertyOwnerProperties from './PropertyOwnerPropertiesSchema.js';
import PropertyOwnerAuditLog from './PropertyOwnerAuditLogSchema.js';
import crypto from 'crypto';

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

/**
 * Generate unique ID
 */
function generateId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create audit log entry
 */
async function createAuditLog(recordType, recordId, action, performedBy, changes = {}) {
  const auditLog = new PropertyOwnerAuditLog({
    auditId: generateId('AUDIT'),
    recordType,
    recordId,
    action,
    performedBy,
    changedFields: changes.changedFields || [],
    beforeSnapshot: changes.before,
    afterSnapshot: changes.after,
    sourceSystem: changes.source || 'direct_entry',
    reason: changes.reason || 'user_update',
    description: changes.description
  });

  return await auditLog.save();
}

// ========================================================================
// PROPERTY OWNER SERVICE
// ========================================================================

export const PropertyOwnerService = {
  // ========================================================================
  // CREATE OPERATIONS
  // ========================================================================

  /**
   * Create a new property owner
   */
  async createOwner(ownerData, performedBy = 'system') {
    try {
      if (!ownerData.firstName || !ownerData.lastName || !ownerData.primaryPhone) {
        throw new Error('firstName, lastName, and primaryPhone are required');
      }

      const owner = new PropertyOwner({
        ownerId: generateId('OWNER'),
        ...ownerData,
        fullName: `${ownerData.firstName} ${ownerData.lastName}`,
        createdBy: performedBy,
        updatedBy: performedBy
      });

      const saved = await owner.save();

      // Create audit log
      await createAuditLog('PropertyOwner', saved.ownerId, 'CREATE', performedBy, {
        after: saved.toObject(),
        reason: 'user_update'
      });

      return saved;
    } catch (error) {
      console.error('Error creating owner:', error);
      throw error;
    }
  },

  /**
   * Create multiple owners from batch data
   */
  async createOwnersBatch(ownersData, performedBy = 'system') {
    try {
      if (!Array.isArray(ownersData) || ownersData.length === 0) {
        throw new Error('ownersData must be a non-empty array');
      }

      const owners = [];
      const errors = [];

      for (let i = 0; i < ownersData.length; i++) {
        try {
          const owner = await this.createOwner(ownersData[i], performedBy);
          owners.push(owner);
        } catch (error) {
          errors.push({
            index: i,
            data: ownersData[i],
            error: error.message
          });
        }
      }

      return {
        successful: owners,
        failed: errors,
        totalProcessed: ownersData.length,
        successRate: Math.round((owners.length / ownersData.length) * 100)
      };
    } catch (error) {
      console.error('Error creating owners batch:', error);
      throw error;
    }
  },

  /**
   * Create a new property contact
   */
  async createContact(contactData, performedBy = 'system') {
    try {
      if (!contactData.firstName || !contactData.primaryPhone || !contactData.contactType) {
        throw new Error('firstName, primaryPhone, and contactType are required');
      }

      const contact = new PropertyContact({
        contactId: generateId('CONTACT'),
        ...contactData,
        fullName: contactData.lastName 
          ? `${contactData.firstName} ${contactData.lastName}` 
          : contactData.firstName,
        createdBy: performedBy,
        updatedBy: performedBy
      });

      const saved = await contact.save();

      // Create audit log
      await createAuditLog('PropertyContact', saved.contactId, 'CREATE', performedBy, {
        after: saved.toObject(),
        reason: 'user_update'
      });

      return saved;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },

  /**
   * Link owner to property
   */
  async linkOwnerToProperty(ownerId, propertyId, linkData = {}, performedBy = 'system') {
    try {
      if (!ownerId || !propertyId) {
        throw new Error('ownerId and propertyId are required');
      }

      // Check for existing link
      const existing = await PropertyOwnerProperties.findOne({ ownerId, propertyId });
      if (existing) {
        throw new Error('This owner-property link already exists');
      }

      const link = new PropertyOwnerProperties({
        linkId: generateId('LINK'),
        ownerId,
        propertyId,
        ownershipPercentage: linkData.ownershipPercentage || 100,
        ownershipType: linkData.ownershipType || 'sole',
        acquisitionDate: linkData.acquisitionDate || new Date(),
        occupancyStatus: linkData.occupancyStatus || 'owner_occupied',
        ...linkData,
        createdBy: performedBy,
        updatedBy: performedBy
      });

      const saved = await link.save();

      // Update owner's linked properties
      await PropertyOwner.findByIdAndUpdate(
        ownerId,
        { 
          $addToSet: { linkedPropertyIds: propertyId },
          $inc: { propertyCount: 1 }
        },
        { new: true }
      );

      // Create audit log
      await createAuditLog('PropertyOwnerProperties', saved.linkId, 'CREATE', performedBy, {
        after: saved.toObject(),
        reason: 'user_update'
      });

      return saved;
    } catch (error) {
      console.error('Error linking owner to property:', error);
      throw error;
    }
  },

  // ========================================================================
  // READ OPERATIONS
  // ========================================================================

  /**
   * Get owner by ID
   */
  async getOwnerById(ownerId) {
    try {
      return await PropertyOwner.findOne({ ownerId });
    } catch (error) {
      console.error('Error getting owner:', error);
      throw error;
    }
  },

  /**
   * Get owner by phone
   */
  async getOwnerByPhone(phone) {
    try {
      return await PropertyOwner.findByPhone(phone);
    } catch (error) {
      console.error('Error getting owner by phone:', error);
      throw error;
    }
  },

  /**
   * Get owner by email
   */
  async getOwnerByEmail(email) {
    try {
      return await PropertyOwner.findByEmail(email);
    } catch (error) {
      console.error('Error getting owner by email:', error);
      throw error;
    }
  },

  /**
   * Get all active owners
   */
  async getAllActiveOwners(skip = 0, limit = 50) {
    try {
      return await PropertyOwner.find({ status: 'active' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting active owners:', error);
      throw error;
    }
  },

  /**
   * Search owners by name
   */
  async searchOwners(query, skip = 0, limit = 50) {
    try {
      return await PropertyOwner.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      console.error('Error searching owners:', error);
      throw error;
    }
  },

  /**
   * Get contact by ID
   */
  async getContactById(contactId) {
    try {
      return await PropertyContact.findOne({ contactId });
    } catch (error) {
      console.error('Error getting contact:', error);
      throw error;
    }
  },

  /**
   * Get contact by phone
   */
  async getContactByPhone(phone) {
    try {
      return await PropertyContact.findByPhone(phone);
    } catch (error) {
      console.error('Error getting contact by phone:', error);
      throw error;
    }
  },

  /**
   * Get all contacts by type
   */
  async getContactsByType(contactType, skip = 0, limit = 50) {
    try {
      return await PropertyContact.findByType(contactType)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting contacts by type:', error);
      throw error;
    }
  },

  /**
   * Get owner's properties
   */
  async getOwnerProperties(ownerId, skip = 0, limit = 50) {
    try {
      return await PropertyOwnerProperties.findByOwner(ownerId)
        .skip(skip)
        .limit(limit)
        .sort({ acquisitionDate: -1 });
    } catch (error) {
      console.error('Error getting owner properties:', error);
      throw error;
    }
  },

  /**
   * Get property owners
   */
  async getPropertyOwners(propertyId) {
    try {
      return await PropertyOwnerProperties.findByProperty(propertyId);
    } catch (error) {
      console.error('Error getting property owners:', error);
      throw error;
    }
  },

  // ========================================================================
  // UPDATE OPERATIONS
  // ========================================================================

  /**
   * Update owner information
   */
  async updateOwner(ownerId, updateData, performedBy = 'system') {
    try {
      const before = await PropertyOwner.findOne({ ownerId });
      if (!before) throw new Error('Owner not found');

      const updated = await PropertyOwner.findOneAndUpdate(
        { ownerId },
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true, runValidators: true }
      );

      // Create audit log with field-level changes
      const changedFields = Object.keys(updateData)
        .map(key => ({
          fieldName: key,
          oldValue: before[key],
          newValue: updateData[key],
          valueType: typeof updateData[key]
        }));

      await createAuditLog('PropertyOwner', ownerId, 'UPDATE', performedBy, {
        changedFields,
        before: before.toObject(),
        after: updated.toObject(),
        reason: 'user_update'
      });

      return updated;
    } catch (error) {
      console.error('Error updating owner:', error);
      throw error;
    }
  },

  /**
   * Update contact information
   */
  async updateContact(contactId, updateData, performedBy = 'system') {
    try {
      const before = await PropertyContact.findOne({ contactId });
      if (!before) throw new Error('Contact not found');

      const updated = await PropertyContact.findOneAndUpdate(
        { contactId },
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true, runValidators: true }
      );

      const changedFields = Object.keys(updateData)
        .map(key => ({
          fieldName: key,
          oldValue: before[key],
          newValue: updateData[key],
          valueType: typeof updateData[key]
        }));

      await createAuditLog('PropertyContact', contactId, 'UPDATE', performedBy, {
        changedFields,
        before: before.toObject(),
        after: updated.toObject(),
        reason: 'user_update'
      });

      return updated;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  /**
   * Update property ownership link
   */
  async updatePropertyLink(linkId, updateData, performedBy = 'system') {
    try {
      const before = await PropertyOwnerProperties.findOne({ linkId });
      if (!before) throw new Error('Link not found');

      const updated = await PropertyOwnerProperties.findOneAndUpdate(
        { linkId },
        {
          ...updateData,
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true, runValidators: true }
      );

      const changedFields = Object.keys(updateData)
        .map(key => ({
          fieldName: key,
          oldValue: before[key],
          newValue: updateData[key],
          valueType: typeof updateData[key]
        }));

      await createAuditLog('PropertyOwnerProperties', linkId, 'UPDATE', performedBy, {
        changedFields,
        before: before.toObject(),
        after: updated.toObject(),
        reason: 'user_update'
      });

      return updated;
    } catch (error) {
      console.error('Error updating property link:', error);
      throw error;
    }
  },

  // ========================================================================
  // DELETE OPERATIONS
  // ========================================================================

  /**
   * Archive owner (soft delete)
   */
  async archiveOwner(ownerId, performedBy = 'system') {
    try {
      const updated = await PropertyOwner.findOneAndUpdate(
        { ownerId },
        {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true }
      );

      await createAuditLog('PropertyOwner', ownerId, 'ARCHIVE', performedBy, {
        reason: 'user_update',
        description: `Owner archived by ${performedBy}`
      });

      return updated;
    } catch (error) {
      console.error('Error archiving owner:', error);
      throw error;
    }
  },

  /**
   * Archive contact (soft delete)
   */
  async archiveContact(contactId, performedBy = 'system') {
    try {
      const updated = await PropertyContact.findOneAndUpdate(
        { contactId },
        {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true }
      );

      await createAuditLog('PropertyContact', contactId, 'ARCHIVE', performedBy, {
        reason: 'user_update'
      });

      return updated;
    } catch (error) {
      console.error('Error archiving contact:', error);
      throw error;
    }
  },

  /**
   * Unlink owner from property
   */
  async unlinkProperty(linkId, performedBy = 'system') {
    try {
      const link = await PropertyOwnerProperties.findOne({ linkId });
      if (!link) throw new Error('Link not found');

      // Mark as sold instead of deleting
      const updated = await PropertyOwnerProperties.findOneAndUpdate(
        { linkId },
        {
          status: 'sold',
          disposalDate: new Date(),
          updatedAt: new Date(),
          updatedBy: performedBy
        },
        { new: true }
      );

      // Remove from owner's linked properties
      await PropertyOwner.findOneAndUpdate(
        { ownerId: link.ownerId },
        { 
          $pull: { linkedPropertyIds: link.propertyId },
          $dec: { propertyCount: 1 }
        }
      );

      await createAuditLog('PropertyOwnerProperties', linkId, 'DELETE', performedBy, {
        reason: 'property_disposal'
      });

      return updated;
    } catch (error) {
      console.error('Error unlinking property:', error);
      throw error;
    }
  },

  // ========================================================================
  // VERIFICATION OPERATIONS
  // ========================================================================

  /**
   * Verify an owner
   */
  async verifyOwner(ownerId, verificationMethod = 'document_scan', performedBy = 'system') {
    try {
      const updated = await PropertyOwner.findOneAndUpdate(
        { ownerId },
        {
          verified: true,
          verificationDate: new Date(),
          verificationMethod,
          updatedBy: performedBy
        },
        { new: true }
      );

      await createAuditLog('PropertyOwner', ownerId, 'VERIFY', performedBy, {
        reason: 'verification',
        description: `Owner verified via ${verificationMethod}`
      });

      return updated;
    } catch (error) {
      console.error('Error verifying owner:', error);
      throw error;
    }
  },

  /**
   * Verify a contact
   */
  async verifyContact(contactId, verificationMethod = 'phone_call', performedBy = 'system') {
    try {
      const updated = await PropertyContact.findOneAndUpdate(
        { contactId },
        {
          verified: true,
          verificationDate: new Date(),
          verificationMethod,
          updatedBy: performedBy
        },
        { new: true }
      );

      await createAuditLog('PropertyContact', contactId, 'VERIFY', performedBy, {
        reason: 'verification',
        description: `Contact verified via ${verificationMethod}`
      });

      return updated;
    } catch (error) {
      console.error('Error verifying contact:', error);
      throw error;
    }
  },

  // ========================================================================
  // STATISTICS & REPORTING
  // ========================================================================

  /**
   * Get owner statistics
   */
  async getOwnerStatistics() {
    try {
      return await PropertyOwner.getStatistics();
    } catch (error) {
      console.error('Error getting owner statistics:', error);
      throw error;
    }
  },

  /**
   * Get contact statistics
   */
  async getContactStatistics() {
    try {
      return await PropertyContact.getStatistics();
    } catch (error) {
      console.error('Error getting contact statistics:', error);
      throw error;
    }
  },

  /**
   * Get owner's portfolio statistics
   */
  async getOwnerPortfolioStats(ownerId) {
    try {
      return await PropertyOwnerProperties.getPortfolioStats(ownerId);
    } catch (error) {
      console.error('Error getting portfolio stats:', error);
      throw error;
    }
  },

  // ========================================================================
  // AUDIT & HISTORY
  // ========================================================================

  /**
   * Get audit trail for a record
   */
  async getAuditTrail(recordId) {
    try {
      return await PropertyOwnerAuditLog.getRecordHistory(recordId);
    } catch (error) {
      console.error('Error getting audit trail:', error);
      throw error;
    }
  },

  /**
   * Get recent changes
   */
  async getRecentChanges(days = 7) {
    try {
      return await PropertyOwnerAuditLog.getRecentChanges(days);
    } catch (error) {
      console.error('Error getting recent changes:', error);
      throw error;
    }
  }
};

// ========================================================================
// EXPORT
// ========================================================================

export default PropertyOwnerService;
