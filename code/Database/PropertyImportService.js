/**
 * ========================================================================
 * PROPERTY IMPORT SERVICE - DAMAC HILLS 2
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Handles importing and syncing property data from Google Sheets:
 * - Parse Google Sheets data
 * - Validate and transform data
 * - Batch import to MongoDB
 * - Duplicate detection and merging
 * - Sync status tracking
 * 
 * @module PropertyImportService
 * @since Phase 30 - February 19, 2026
 */

import PropertyOwnerService from './PropertyOwnerService.js';
import PropertyOwnerAuditLog from './PropertyOwnerAuditLogSchema.js';

// ========================================================================
// CONSTANTS
// ========================================================================

const OWNER_REQUIRED_FIELDS = ['firstName', 'lastName', 'primaryPhone'];
const CONTACT_REQUIRED_FIELDS = ['firstName', 'primaryPhone', 'contactType'];
const PROPERTY_LINK_REQUIRED_FIELDS = ['ownerId', 'propertyId', 'ownershipPercentage'];

const CONTACT_TYPE_ENUM = ['agent', 'broker', 'tenant', 'caretaker', 'manager', 'family_member', 'other'];
const OWNERSHIP_TYPE_ENUM = ['individual', 'company', 'joint', 'trust', 'estate'];

// ========================================================================
// VALIDATION FUNCTIONS
// ========================================================================

/**
 * Validate owner data from Google Sheets
 */
function validateOwnerData(row, rowIndex) {
  const errors = [];

  // Check required fields
  OWNER_REQUIRED_FIELDS.forEach(field => {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`Row ${rowIndex}: Missing required field '${field}'`);
    }
  });

  // Validate email format
  if (row.email && !/.+@.+\..+/.test(row.email)) {
    errors.push(`Row ${rowIndex}: Invalid email format`);
  }

  // Validate phone format
  if (row.primaryPhone && !/^\+?[0-9]{7,15}$/.test(String(row.primaryPhone).replace(/[^\d+]/g, ''))) {
    errors.push(`Row ${rowIndex}: Invalid phone format`);
  }

  // Validate ownership percentage
  if (row.ownershipPercentage) {
    const pct = parseFloat(row.ownershipPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      errors.push(`Row ${rowIndex}: Ownership percentage must be between 0 and 100`);
    }
  }

  // Validate ownership type
  if (row.ownershipType && !OWNERSHIP_TYPE_ENUM.includes(row.ownershipType)) {
    errors.push(`Row ${rowIndex}: Invalid ownership type. Must be one of: ${OWNERSHIP_TYPE_ENUM.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate contact data from Google Sheets
 */
function validateContactData(row, rowIndex) {
  const errors = [];

  // Check required fields
  CONTACT_REQUIRED_FIELDS.forEach(field => {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push(`Row ${rowIndex}: Missing required field '${field}'`);
    }
  });

  // Validate contact type
  if (row.contactType && !CONTACT_TYPE_ENUM.includes(row.contactType)) {
    errors.push(`Row ${rowIndex}: Invalid contact type. Must be one of: ${CONTACT_TYPE_ENUM.join(', ')}`);
  }

  // Validate phone format
  if (row.primaryPhone && !/^\+?[0-9]{7,15}$/.test(String(row.primaryPhone).replace(/[^\d+]/g, ''))) {
    errors.push(`Row ${rowIndex}: Invalid phone format`);
  }

  // Validate email format
  if (row.email && !/.+@.+\..+/.test(row.email)) {
    errors.push(`Row ${rowIndex}: Invalid email format`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ========================================================================
// DATA TRANSFORMATION FUNCTIONS
// ========================================================================

/**
 * Transform raw Google Sheets owner row to database format
 */
function transformOwnerRow(row) {
  return {
    firstName: String(row.firstName || '').trim(),
    lastName: String(row.lastName || '').trim(),
    primaryPhone: String(row.primaryPhone || '').trim().replace(/[^\d+]/g, ''),
    alternatePhone: row.alternatePhone ? String(row.alternatePhone).trim().replace(/[^\d+]/g, '') : undefined,
    email: row.email ? String(row.email).toLowerCase().trim() : undefined,
    alternateEmail: row.alternateEmail ? String(row.alternateEmail).toLowerCase().trim() : undefined,
    ownershipType: row.ownershipType || 'individual',
    ownershipPercentage: row.ownershipPercentage ? Math.min(100, Math.max(0, parseFloat(row.ownershipPercentage))) : 100,
    idType: row.idType || 'emirates_id',
    idNumber: row.idNumber ? String(row.idNumber).trim() : undefined,
    addressLine1: row.addressLine1 ? String(row.addressLine1).trim() : undefined,
    addressLine2: row.addressLine2 ? String(row.addressLine2).trim() : undefined,
    city: row.city ? String(row.city).trim() : undefined,
    country: row.country ? String(row.country).trim() : undefined,
    postalCode: row.postalCode ? String(row.postalCode).trim() : undefined,
    preferredContact: row.preferredContact || 'email',
    sourceSystem: 'google_sheets',
    externalId: row.externalId ? String(row.externalId).trim() : undefined,
    notes: row.notes ? String(row.notes).trim() : undefined
  };
}

/**
 * Transform raw Google Sheets contact row to database format
 */
function transformContactRow(row) {
  return {
    firstName: String(row.firstName || '').trim(),
    lastName: row.lastName ? String(row.lastName).trim() : undefined,
    primaryPhone: String(row.primaryPhone || '').trim().replace(/[^\d+]/g, ''),
    alternatePhone: row.alternatePhone ? String(row.alternatePhone).trim().replace(/[^\d+]/g, '') : undefined,
    email: row.email ? String(row.email).toLowerCase().trim() : undefined,
    alternateEmail: row.alternateEmail ? String(row.alternateEmail).toLowerCase().trim() : undefined,
    contactType: row.contactType || 'agent',
    role: row.role ? String(row.role).trim() : undefined,
    companyName: row.companyName ? String(row.companyName).trim() : undefined,
    designation: row.designation ? String(row.designation).trim() : undefined,
    preferredChannel: row.preferredChannel || 'phone',
    licenseNumber: row.licenseNumber ? String(row.licenseNumber).trim() : undefined,
    sourceSystem: 'google_sheets',
    externalId: row.externalId ? String(row.externalId).trim() : undefined,
    notes: row.notes ? String(row.notes).trim() : undefined,
    channels: {
      email: row.channels?.email === 'true' || row.channels?.email === true,
      phone: row.channels?.phone !== 'false' && row.channels?.phone !== false,
      sms: row.channels?.sms === 'true' || row.channels?.sms === true,
      whatsapp: row.channels?.whatsapp === 'true' || row.channels?.whatsapp === true
    }
  };
}

// ========================================================================
// DUPLICATE DETECTION
// ========================================================================

/**
 * Check if owner already exists (by phone, email, or ID)
 */
async function findDuplicateOwner(ownerData) {
  if (ownerData.primaryPhone) {
    const byPhone = await PropertyOwnerService.getOwnerByPhone(ownerData.primaryPhone);
    if (byPhone) return byPhone;
  }

  if (ownerData.email) {
    const byEmail = await PropertyOwnerService.getOwnerByEmail(ownerData.email);
    if (byEmail) return byEmail;
  }

  return null;
}

/**
 * Check if contact already exists (by phone or email)
 */
async function findDuplicateContact(contactData) {
  if (contactData.primaryPhone) {
    const byPhone = await PropertyOwnerService.getContactByPhone(contactData.primaryPhone);
    if (byPhone) return byPhone;
  }

  if (contactData.email) {
    const byEmail = await PropertyOwnerService.getContactByEmail(contactData.email);
    if (byEmail) return byEmail;
  }

  return null;
}

// ========================================================================
// GOOGLE SHEETS IMPORT SERVICE
// ========================================================================

export const PropertyImportService = {
  /**
   * Import owners from Google Sheets data
   */
  async importOwners(sheetsData, options = {}) {
    const {
      updateExisting = false,
      performedBy = 'system',
      skipDuplicates = false
    } = options;

    const results = {
      total: sheetsData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      createdOwners: [],
      messages: []
    };

    for (let i = 0; i < sheetsData.length; i++) {
      const row = sheetsData[i];
      const rowIndex = i + 1;

      try {
        // Validate
        const validation = validateOwnerData(row, rowIndex);
        if (!validation.isValid) {
          results.errors.push(...validation.errors);
          results.skipped++;
          continue;
        }

        // Transform
        const transformedData = transformOwnerRow(row);

        // Check for duplicates
        const duplicate = await findDuplicateOwner(transformedData);
        if (duplicate) {
          if (skipDuplicates) {
            results.skipped++;
            results.messages.push(`Row ${rowIndex}: Owner already exists (${duplicate.ownerId})`);
            continue;
          }

          if (updateExisting) {
            const updated = await PropertyOwnerService.updateOwner(
              duplicate.ownerId,
              transformedData,
              performedBy
            );
            results.updated++;
            results.messages.push(`Row ${rowIndex}: Updated owner ${duplicate.ownerId}`);
            continue;
          }
        }

        // Create new owner
        const created = await PropertyOwnerService.createOwner(transformedData, performedBy);
        results.created++;
        results.createdOwners.push({
          ownerId: created.ownerId,
          name: created.fullName,
          phone: created.primaryPhone
        });
        results.messages.push(`Row ${rowIndex}: Created owner ${created.ownerId}`);

      } catch (error) {
        results.errors.push(`Row ${rowIndex}: ${error.message}`);
      }
    }

    return results;
  },

  /**
   * Import contacts from Google Sheets data
   */
  async importContacts(sheetsData, options = {}) {
    const {
      updateExisting = false,
      performedBy = 'system',
      skipDuplicates = false
    } = options;

    const results = {
      total: sheetsData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      createdContacts: [],
      messages: []
    };

    for (let i = 0; i < sheetsData.length; i++) {
      const row = sheetsData[i];
      const rowIndex = i + 1;

      try {
        // Validate
        const validation = validateContactData(row, rowIndex);
        if (!validation.isValid) {
          results.errors.push(...validation.errors);
          results.skipped++;
          continue;
        }

        // Transform
        const transformedData = transformContactRow(row);

        // Check for duplicates
        const duplicate = await findDuplicateContact(transformedData);
        if (duplicate) {
          if (skipDuplicates) {
            results.skipped++;
            results.messages.push(`Row ${rowIndex}: Contact already exists (${duplicate.contactId})`);
            continue;
          }

          if (updateExisting) {
            const updated = await PropertyOwnerService.updateContact(
              duplicate.contactId,
              transformedData,
              performedBy
            );
            results.updated++;
            results.messages.push(`Row ${rowIndex}: Updated contact ${duplicate.contactId}`);
            continue;
          }
        }

        // Create new contact
        const created = await PropertyOwnerService.createContact(transformedData, performedBy);
        results.created++;
        results.createdContacts.push({
          contactId: created.contactId,
          name: created.fullName,
          type: created.contactType
        });
        results.messages.push(`Row ${rowIndex}: Created contact ${created.contactId}`);

      } catch (error) {
        results.errors.push(`Row ${rowIndex}: ${error.message}`);
      }
    }

    return results;
  },

  /**
   * Sync owners from Google Sheets (full sync with update detection)
   */
  async syncOwners(sheetsData, performedBy = 'system') {
    const results = {
      total: sheetsData.length,
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [],
      syncedOwners: [],
      startTime: new Date(),
      endTime: null,
      duration: null
    };

    for (let i = 0; i < sheetsData.length; i++) {
      const row = sheetsData[i];
      const rowIndex = i + 1;

      try {
        const validation = validateOwnerData(row, rowIndex);
        if (!validation.isValid) {
          results.errors.push(...validation.errors);
          continue;
        }

        const transformedData = transformOwnerRow(row);
        const duplicate = await findDuplicateOwner(transformedData);

        if (duplicate) {
          // Check if data has changed
          const hasChanges = Object.keys(transformedData).some(
            key => transformedData[key] !== duplicate[key]
          );

          if (hasChanges) {
            const updated = await PropertyOwnerService.updateOwner(
              duplicate.ownerId,
              transformedData,
              performedBy
            );
            results.updated++;
            results.syncedOwners.push({
              action: 'updated',
              ownerId: updated.ownerId,
              name: updated.fullName
            });
          } else {
            results.unchanged++;
            results.syncedOwners.push({
              action: 'unchanged',
              ownerId: duplicate.ownerId,
              name: duplicate.fullName
            });
          }
        } else {
          const created = await PropertyOwnerService.createOwner(transformedData, performedBy);
          results.created++;
          results.syncedOwners.push({
            action: 'created',
            ownerId: created.ownerId,
            name: created.fullName
          });
        }
      } catch (error) {
        results.errors.push(`Row ${rowIndex}: ${error.message}`);
      }
    }

    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;

    return results;
  },

  /**
   * Verify all imported data for compliance
   */
  async verifyImportedData(importStartDate, importEndDate) {
    try {
      const auditLogs = await PropertyOwnerAuditLog.getRecentChanges(30);
      
      const verification = {
        totalRecords: auditLogs.length,
        byAction: {},
        byRecordType: {},
        bySyncStatus: {
          synced: 0,
          needsSync: 0,
          failed: 0
        },
        records: []
      };

      for (const log of auditLogs) {
        // Count by action
        verification.byAction[log.action] = (verification.byAction[log.action] || 0) + 1;

        // Count by record type
        verification.byRecordType[log.recordType] = (verification.byRecordType[log.recordType] || 0) + 1;

        verification.records.push({
          recordId: log.recordId,
          action: log.action,
          type: log.recordType,
          timestamp: log.changedAt,
          performedBy: log.performedBy
        });
      }

      return verification;
    } catch (error) {
      console.error('Error verifying imported data:', error);
      throw error;
    }
  },

  /**
   * Export validation report
   */
  generateValidationReport(importResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: importResults.total,
        successful: importResults.created + (importResults.updated || 0),
        failed: importResults.errors.length,
        successRate: Math.round(
          ((importResults.created + (importResults.updated || 0)) / importResults.total) * 100
        )
      },
      details: {
        created: importResults.created,
        updated: importResults.updated || 0,
        errors: importResults.errors.length,
        skipped: importResults.skipped || 0
      },
      errorDetails: importResults.errors.slice(0, 20), // First 20 errors
      recommendations: []
    };

    if (report.summary.successRate < 90) {
      report.recommendations.push('Check data format and required fields');
    }

    if (importResults.errors.some(e => e.includes('duplicate'))) {
      report.recommendations.push('Review duplicate handling strategy');
    }

    return report;
  }
};

// ========================================================================
// EXPORT
// ========================================================================

export default PropertyImportService;
