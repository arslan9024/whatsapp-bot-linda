/**
 * Database Schema Index
 * PURPOSE: Central export point for all mongoose schemas and service layers
 * USAGE: import { Person, Property, PropertyTenancy, PersonService, ... } from './src/database/index.js'
 */

// ============================================
// REFERENCE/ENUM COLLECTIONS
// ============================================
export { default as FurnishingStatus } from './schemas/FurnishingStatusSchema.js';
export { default as OccupancyStatus } from './schemas/OccupancyStatusSchema.js';
export { default as AvailabilityStatus } from './schemas/AvailabilityStatusSchema.js';

// ============================================
// FOUNDATION COLLECTIONS
// ============================================
export { default as Developer } from './schemas/DeveloperSchema.js';
export { default as Cluster } from './schemas/ClusterSchema.js';

// ============================================
// CORE ENTITIES
// ============================================
export { default as Person } from './schemas/PersonSchema.js';
export { default as Property } from './schemas/PropertySchema.js';

// ============================================
// LINKING TABLES (RELATIONSHIPS)
// ============================================
export { default as PropertyOwnership } from './schemas/PropertyOwnershipSchema.js';
export { default as PropertyTenancy } from './schemas/PropertyTenancySchema.js';
export { default as PropertyBuying } from './schemas/PropertyBuyingSchema.js';
export { default as PropertyAgent } from './schemas/PropertyAgentSchema.js';

// ============================================
// SERVICE LAYERS
// ============================================
export { default as PersonService } from './services/PersonService.js';
export { default as PropertyService } from './services/PropertyService.js';
export { default as PropertyTenancyService } from './services/PropertyTenancyService.js';
export { default as PropertyOwnershipService } from './services/PropertyOwnershipService.js';
export { default as PropertyBuyingService } from './services/PropertyBuyingService.js';
export { default as PropertyAgentService } from './services/PropertyAgentService.js';
export { default as DeveloperService } from './services/DeveloperService.js';
export { default as ClusterService } from './services/ClusterService.js';

// ============================================
// COMMUNICATION (Phase 5)
// ============================================
export { default as CommunicationTemplate } from './schemas/CommunicationTemplateSchema.js';
export { default as CommunicationLog } from './schemas/CommunicationLogSchema.js';
export { default as CommunicationService } from './services/CommunicationService.js';

// ============================================
// UTILITIES
// ============================================
export { default as QueryHelper } from './QueryHelper.js';
export { default as ValidationHelper } from './ValidationHelper.js';

/**
 * INITIALIZATION HELPER
 * Initialize all mongoose models and indexes
 * USAGE: await initializeDatabase(mongoose, mongoUri)
 */
export async function initializeDatabase(mongoose, mongoUri) {
  try {
    console.log('Initializing database schemas...');

    // Connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB');
    }

    // Import all models to ensure they're registered
    const {
      FurnishingStatus,
      OccupancyStatus,
      AvailabilityStatus,
      Developer,
      Cluster,
      Person,
      Property,
      PropertyOwnership,
      PropertyTenancy,
      PropertyBuying,
      PropertyAgent
    } = await import('./index.js');

    console.log('✓ All schemas registered');

    // Create reference statuses if they don't exist
    await createReferenceStatuses(FurnishingStatus, OccupancyStatus, AvailabilityStatus);

    console.log('✓ Database initialization complete');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Create reference status records if they don't exist
 */
async function createReferenceStatuses(FurnishingStatus, OccupancyStatus, AvailabilityStatus) {
  try {
    // Check if status records already exist
    const furnishingCount = await FurnishingStatus.countDocuments();
    if (furnishingCount === 0) {
      await FurnishingStatus.insertMany([
        { status: 'furnished', description: 'Fully furnished property' },
        { status: 'unfurnished', description: 'Unfurnished property' },
        { status: 'semi-furnished', description: 'Semi-furnished property' }
      ]);
      console.log('✓ Created FurnishingStatus records');
    }

    const occupancyCount = await OccupancyStatus.countDocuments();
    if (occupancyCount === 0) {
      await OccupancyStatus.insertMany([
        { status: 'occupied_by_owner', description: 'Owner occupies the property' },
        { status: 'occupied_by_tenant', description: 'Tenant occupies the property' },
        { status: 'vacant', description: 'Property is vacant' }
      ]);
      console.log('✓ Created OccupancyStatus records');
    }

    const availabilityCount = await AvailabilityStatus.countDocuments();
    if (availabilityCount === 0) {
      await AvailabilityStatus.insertMany([
        { status: 'available_for_rent', category: 'active', description: 'Available for rental' },
        { status: 'available_for_sale', category: 'active', description: 'Available for sale' },
        { status: 'available_for_both', category: 'active', description: 'Available for rent and sale' },
        { status: 'not_available', category: 'inactive', description: 'Not available' },
        { status: 'sold', category: 'terminal', description: 'Property sold' }
      ]);
      console.log('✓ Created AvailabilityStatus records');
    }
  } catch (error) {
    // Ignore duplicate key errors (statuses already exist)
    if (error.code !== 11000) {
      throw error;
    }
  }
}

/**
 * GET ALL SCHEMAS - For bulk operations
 */
export async function getAllSchemas() {
  const {
    FurnishingStatus,
    OccupancyStatus,
    AvailabilityStatus,
    Developer,
    Cluster,
    Person,
    Property,
    PropertyOwnership,
    PropertyTenancy,
    PropertyBuying,
    PropertyAgent,
    QueryHelper,
    ValidationHelper
  } = await import('./index.js');

  return {
    // Reference
    FurnishingStatus,
    OccupancyStatus,
    AvailabilityStatus,
    // Foundation
    Developer,
    Cluster,
    // Core
    Person,
    Property,
    // Linking
    PropertyOwnership,
    PropertyTenancy,
    PropertyBuying,
    PropertyAgent,
    // Utilities
    QueryHelper,
    ValidationHelper
  };
}

/**
 * SCHEMA COUNT - For diagnostics
 */
export async function getSchemaCounts() {
  const {
    FurnishingStatus,
    OccupancyStatus,
    AvailabilityStatus,
    Developer,
    Cluster,
    Person,
    Property,
    PropertyOwnership,
    PropertyTenancy,
    PropertyBuying,
    PropertyAgent
  } = await import('./index.js');

  return {
    furnishingStatuses: await FurnishingStatus.countDocuments(),
    occupancyStatuses: await OccupancyStatus.countDocuments(),
    availabilityStatuses: await AvailabilityStatus.countDocuments(),
    developers: await Developer.countDocuments(),
    clusters: await Cluster.countDocuments(),
    people: await Person.countDocuments(),
    properties: await Property.countDocuments(),
    propertyOwnerships: await PropertyOwnership.countDocuments(),
    propertyTenancies: await PropertyTenancy.countDocuments(),
    propertyBuyings: await PropertyBuying.countDocuments(),
    propertyAgents: await PropertyAgent.countDocuments()
  };
}
