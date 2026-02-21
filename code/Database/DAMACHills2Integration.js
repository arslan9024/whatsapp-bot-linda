/**
 * ========================================================================
 * DAMAC HILLS 2 PROPERTY MANAGEMENT INTEGRATION
 * Phase 30: Advanced Property Management
 * ========================================================================
 * 
 * Central export point for all DAMAC Hills 2 property management utilities:
 * - Models (PropertyOwner, PropertyContact, PropertyOwnerProperties, AuditLog)
 * - Services (PropertyOwnerService, PropertyImportService)
 * - Utilities and helpers
 * 
 * @module DAMACHills2Integration
 * @since Phase 30 - February 19, 2026
 */

import PropertyOwner from './PropertyOwnerSchema.js';
import PropertyContact from './PropertyContactSchema.js';
import PropertyOwnerProperties from './PropertyOwnerPropertiesSchema.js';
import PropertyOwnerAuditLog from './PropertyOwnerAuditLogSchema.js';
import PropertyOwnerService from './PropertyOwnerService.js';
import PropertyImportService from './PropertyImportService.js';
import DataMigrationService from './DataMigrationService.js';
import DashboardDataService from './DashboardDataService.js';
import DashboardCLI from '../Terminal/DashboardCLI.js';

// ========================================================================
// CENTRAL EXPORT
// ========================================================================

export const DAMACHills2 = {
  /**
   * Database Models
   */
  models: {
    PropertyOwner,
    PropertyContact,
    PropertyOwnerProperties,
    PropertyOwnerAuditLog
  },

  /**
   * Services
   */
  services: {
    PropertyOwnerService,
    PropertyImportService,
    DataMigrationService,
    DashboardDataService,
    DashboardCLI
  },

  /**
   * Quick access aliases for common operations
   */
  createOwner: PropertyOwnerService.createOwner,
  createContact: PropertyOwnerService.createContact,
  linkOwnerToProperty: PropertyOwnerService.linkOwnerToProperty,
  getOwnerById: PropertyOwnerService.getOwnerById,
  getOwnerByPhone: PropertyOwnerService.getOwnerByPhone,
  getOwnerByEmail: PropertyOwnerService.getOwnerByEmail,
  getOwnerProperties: PropertyOwnerService.getOwnerProperties,
  importOwners: PropertyImportService.importOwners,
  importContacts: PropertyImportService.importContacts,
  syncOwners: PropertyImportService.syncOwners,
  migrateOwnersFromSheets: DataMigrationService.migrateOwnersFromSheets,
  syncOwnerData: DataMigrationService.syncOwnerData,
  getMigrationStatus: DataMigrationService.getMigrationStatus,
  getDashboard: DashboardDataService.getDashboardOverview,
  getDashboardCommand: DashboardCLI.handleCommand,

  /**
   * Statistics & Reporting
   */
  getOwnerStatistics: PropertyOwnerService.getOwnerStatistics,
  getContactStatistics: PropertyOwnerService.getContactStatistics,
  getOwnerPortfolioStats: PropertyOwnerService.getOwnerPortfolioStats,
  getDashboardStats: DashboardDataService.getDashboardOverview,
  getDataQualityScore: DashboardDataService.getDataQualityScore,

  /**
   * Audit & Compliance
   */
  getAuditTrail: PropertyOwnerService.getAuditTrail,
  getRecentChanges: PropertyOwnerService.getRecentChanges
};

// ========================================================================
// UTILITY FUNCTIONS FOR TERMINAL/CLI INTEGRATION
// ========================================================================

/**
 * Terminal command handler for DAMAC property management
 */
export async function handleDAMACCommand(command, args = {}, performedBy = 'terminal') {
  try {
    switch (command) {
      // Owner management
      case 'create-owner':
        return await PropertyOwnerService.createOwner(args.data, performedBy);

      case 'get-owner':
        if (args.id) return await PropertyOwnerService.getOwnerById(args.id);
        if (args.phone) return await PropertyOwnerService.getOwnerByPhone(args.phone);
        if (args.email) return await PropertyOwnerService.getOwnerByEmail(args.email);
        throw new Error('Provide id, phone, or email');

      case 'list-owners':
        return await PropertyOwnerService.getAllActiveOwners(args.skip || 0, args.limit || 50);

      case 'search-owners':
        return await PropertyOwnerService.searchOwners(args.query, args.skip || 0, args.limit || 50);

      case 'update-owner':
        return await PropertyOwnerService.updateOwner(args.id, args.data, performedBy);

      case 'verify-owner':
        return await PropertyOwnerService.verifyOwner(
          args.id,
          args.method || 'document_scan',
          performedBy
        );

      case 'archive-owner':
        return await PropertyOwnerService.archiveOwner(args.id, performedBy);

      // Contact management
      case 'create-contact':
        return await PropertyOwnerService.createContact(args.data, performedBy);

      case 'get-contact':
        if (args.id) return await PropertyOwnerService.getContactById(args.id);
        if (args.phone) return await PropertyOwnerService.getContactByPhone(args.phone);
        throw new Error('Provide id or phone');

      case 'list-contacts-by-type':
        return await PropertyOwnerService.getContactsByType(
          args.type,
          args.skip || 0,
          args.limit || 50
        );

      case 'verify-contact':
        return await PropertyOwnerService.verifyContact(
          args.id,
          args.method || 'phone_call',
          performedBy
        );

      // Property ownership
      case 'link-owner-property':
        return await PropertyOwnerService.linkOwnerToProperty(
          args.ownerId,
          args.propertyId,
          args.linkData || {},
          performedBy
        );

      case 'get-owner-properties':
        return await PropertyOwnerService.getOwnerProperties(
          args.ownerId,
          args.skip || 0,
          args.limit || 50
        );

      case 'unlink-property':
        return await PropertyOwnerService.unlinkProperty(args.linkId, performedBy);

      // Import & Sync
      case 'import-owners':
        return await PropertyImportService.importOwners(args.data, {
          updateExisting: args.updateExisting || false,
          performedBy,
          skipDuplicates: args.skipDuplicates || false
        });

      case 'import-contacts':
        return await PropertyImportService.importContacts(args.data, {
          updateExisting: args.updateExisting || false,
          performedBy,
          skipDuplicates: args.skipDuplicates || false
        });

      case 'sync-owners':
        return await PropertyImportService.syncOwners(args.data, performedBy);

      // Statistics
      case 'stats-owners':
        return await PropertyOwnerService.getOwnerStatistics();

      case 'stats-contacts':
        return await PropertyOwnerService.getContactStatistics();

      case 'stats-portfolio':
        return await PropertyOwnerService.getOwnerPortfolioStats(args.ownerId);

      // Audit
      case 'audit-trail':
        return await PropertyOwnerService.getAuditTrail(args.recordId);

      case 'recent-changes':
        return await PropertyOwnerService.getRecentChanges(args.days || 7);

      // Dashboard & Analytics
      case 'dashboard':
      case 'dashboard:show':
        return await DashboardCLI.handleCommand('dashboard', args, performedBy);

      case 'stats':
      case 'dashboard:stats':
        const statType = args.type || 'owners';
        return await DashboardCLI.handleCommand(`stats:${statType}`, args, performedBy);

      case 'stats:owners':
        return await DashboardCLI.handleCommand('stats:owners', args, performedBy);

      case 'stats:contacts':
        return await DashboardCLI.handleCommand('stats:contacts', args, performedBy);

      case 'stats:properties':
        return await DashboardCLI.handleCommand('stats:properties', args, performedBy);

      case 'quality:score':
      case 'data:quality':
        return await DashboardCLI.handleCommand('quality:score', args, performedBy);

      case 'activity:recent':
        return await DashboardCLI.handleCommand('activity:recent', args, performedBy);

      case 'migration:status':
        return await DashboardCLI.handleCommand('migration:status', args, performedBy);

      case 'data:summary':
        return await DashboardCLI.handleCommand('data:summary', args, performedBy);

      case 'portfolio':
        return await DashboardCLI.handleCommand('portfolio', args, performedBy);

      // Data Migration
      case 'migrate:owners':
        return await DataMigrationService.migrateOwnersFromSheets(args.data, args.options || {});

      case 'migrate:contacts':
        return await DataMigrationService.migrateContactsFromSheets(args.data, args.options || {});

      case 'migrate:from-json':
        return await DataMigrationService.migrateFromJSON(
          args.data,
          args.dataType || 'owner',
          args.options || {}
        );

      case 'sync:data':
        return await DataMigrationService.syncOwnerData(args.data, args.options || {});

      case 'migration:info':
        return await DataMigrationService.getMigrationStatus();

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`Error handling DAMAC command '${command}':`, error);
    throw error;
  }
}

/**
 * Get help/documentation for DAMAC commands
 */
export function getDAMACCommandHelp() {
  return {
    description: 'DAMAC Hills 2 Property Management System',
    commands: {
      'create-owner': {
        description: 'Create a new property owner',
        args: ['data (object with owner fields)'],
        example: 'create-owner {firstName:"John", lastName:"Doe", primaryPhone:"+971505760056"}'
      },
      'get-owner': {
        description: 'Get owner by id, phone, or email',
        args: ['id OR phone OR email'],
        example: 'get-owner --id OWNER-20260219-XXXXX'
      },
      'list-owners': {
        description: 'List all active owners',
        args: ['skip (default 0)', 'limit (default 50)'],
        example: 'list-owners --skip 0 --limit 50'
      },
      'search-owners': {
        description: 'Search owners by name',
        args: ['query', 'skip (optional)', 'limit (optional)'],
        example: 'search-owners "John Doe"'
      },
      'update-owner': {
        description: 'Update owner information',
        args: ['id', 'data (object with fields to update)'],
        example: 'update-owner OWNER-20260219-XXXXX {email:"newemail@example.com"}'
      },
      'verify-owner': {
        description: 'Verify owner identity',
        args: ['id', 'method (optional: document_scan, email_confirmation, sms_confirmation)'],
        example: 'verify-owner OWNER-20260219-XXXXX --method document_scan'
      },
      'archive-owner': {
        description: 'Archive owner record',
        args: ['id'],
        example: 'archive-owner OWNER-20260219-XXXXX'
      },
      'create-contact': {
        description: 'Create a new contact',
        args: ['data (object with contact fields)'],
        example: 'create-contact {firstName:"Jane", primaryPhone:"+971505760057", contactType:"agent"}'
      },
      'get-contact': {
        description: 'Get contact by id or phone',
        args: ['id OR phone'],
        example: 'get-contact --id CONTACT-20260219-XXXXX'
      },
      'list-contacts-by-type': {
        description: 'List contacts by type',
        args: ['type (agent, broker, tenant, etc.)', 'skip (optional)', 'limit (optional)'],
        example: 'list-contacts-by-type agent'
      },
      'link-owner-property': {
        description: 'Link owner to property',
        args: ['ownerId', 'propertyId', 'linkData (optional)'],
        example: 'link-owner-property OWNER-XXX PROPERTY-XXX {ownershipPercentage:100}'
      },
      'import-owners': {
        description: 'Import owners from Google Sheets data',
        args: ['data (array)', 'updateExisting (optional)', 'skipDuplicates (optional)'],
        example: 'import-owners [{"firstName":"John",...}]'
      },
      'sync-owners': {
        description: 'Sync owners from Google Sheets',
        args: ['data (array)'],
        example: 'sync-owners [{"firstName":"John",...}]'
      },
      'stats-owners': {
        description: 'Get owner statistics',
        args: [],
        example: 'stats-owners'
      },
      'audit-trail': {
        description: 'Get audit trail for a record',
        args: ['recordId'],
        example: 'audit-trail OWNER-20260219-XXXXX'
      },
      'dashboard': {
        description: 'Show main dashboard overview',
        args: [],
        example: 'dashboard'
      },
      'stats:owners': {
        description: 'Show owner statistics',
        args: [],
        example: 'stats:owners'
      },
      'stats:contacts': {
        description: 'Show contact statistics',
        args: [],
        example: 'stats:contacts'
      },
      'stats:properties': {
        description: 'Show property statistics',
        args: [],
        example: 'stats:properties'
      },
      'quality:score': {
        description: 'Show data quality assessment',
        args: [],
        example: 'quality:score'
      },
      'activity:recent': {
        description: 'Show recent activity',
        args: ['limit (optional, default 10)'],
        example: 'activity:recent --limit 20'
      },
      'migration:status': {
        description: 'Show migration/database status',
        args: [],
        example: 'migration:status'
      },
      'data:summary': {
        description: 'Generate comprehensive summary report',
        args: [],
        example: 'data:summary'
      },
      'portfolio': {
        description: 'Show owner portfolio details',
        args: ['id (owner ID)'],
        example: 'portfolio --id OWNER-20260219-XXXXX'
      },
      'migrate:owners': {
        description: 'Migrate owners from Google Sheets data',
        args: ['data (array)', 'options (optional)'],
        example: 'migrate:owners --data [...]'
      },
      'migrate:contacts': {
        description: 'Migrate contacts from Google Sheets data',
        args: ['data (array)', 'options (optional)'],
        example: 'migrate:contacts --data [...]'
      },
      'sync:data': {
        description: 'Sync data (merge existing + new)',
        args: ['data (array)', 'options (optional)'],
        example: 'sync:data --data [...] --overwrite true'
      }
    }
  };
}

// ========================================================================
// DEFAULT EXPORT
// ========================================================================

export default {
  DAMACHills2,
  handleDAMACCommand,
  getDAMACCommandHelp,
  services: {
    PropertyOwnerService,
    PropertyImportService,
    DataMigrationService,
    DashboardDataService,
    DashboardCLI
  },
  models: {
    PropertyOwner,
    PropertyContact,
    PropertyOwnerProperties,
    PropertyOwnerAuditLog
  }
};
