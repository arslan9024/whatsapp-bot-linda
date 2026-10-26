/**
 * MongoDB Data Sync Script
 * Imports DAMAC Hills 2 JSON data into MongoDB
 * Usage: node sync-data.js [--full|--update] [--clean]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToMongoDB, disconnectFromMongoDB } from './config.js';
import {
  Project,
  Cluster,
  Property,
  Amenity,
  Pricing,
  Location,
  SyncLog,
  createIndexes
} from './schemas.js';

// Handle __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================
const JSON_FILE = path.join(__dirname, '../../DAMAC_HILLS_2_ACCURATE.json');
const BATCH_SIZE = 100;

let syncStats = {
  startTime: Date.now(),
  projectsCreated: 0,
  clustersCreated: 0,
  amenitiesCreated: 0,
  pricingRecordsCreated: 0,
  locationsCreated: 0,
  errors: [],
};

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Load JSON data from file
 */
function loadJSONData() {
  try {
    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`JSON file not found: ${JSON_FILE}`);
    }
    
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log('✅ JSON data loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Error loading JSON:', error.message);
    process.exit(1);
  }
}

/**
 * Sync Project data
 */
async function syncProjects(data) {
  console.log('\n📍 Syncing Projects...');
  
  try {
    if (!data.project) {
      console.log('⚠️  No project data found');
      return null;
    }
    
    const projectData = {
      name: data.project.name,
      alternateName: data.project.alternateName,
      location: data.project.location,
      developer: data.project.developer,
      projectStatus: data.project.projectStatus,
      launchYear: data.project.launchYear,
      handoverYear: data.project.handoverYear,
      projectType: data.project.projectType,
      totalUnits: data.project.totalUnits,
      totalArea: data.project.totalArea,
    };
    
    // Find or create project
    let project = await Project.findOne({ name: data.project.name });
    
    if (!project) {
      project = new Project(projectData);
      await project.save();
      syncStats.projectsCreated++;
      console.log(`✅ Project created: ${project.name}`);
    } else {
      await Project.updateOne({ _id: project._id }, projectData);
      console.log(`✅ Project updated: ${project.name}`);
    }
    
    return project;
  } catch (error) {
    const errorMsg = `Project sync error: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    syncStats.errors.push(errorMsg);
  }
}

/**
 * Sync Clusters data
 */
async function syncClusters(data, projectId) {
  console.log('\n🏘️  Syncing Clusters...');
  
  try {
    if (!data.clusters || !data.clusters.clustersList) {
      console.log('⚠️  No clusters data found');
      return [];
    }
    
    const clusters = [];
    
    for (const clusterData of data.clusters.clustersList) {
      try {
        const clusterDoc = {
          clusterId: clusterData.id,
          name: clusterData.name,
          projectId: projectId,
          unitCount: clusterData.unitCount,
          unitTypes: clusterData.unitTypes,
          amenities: clusterData.amenities,
        };
        
        let cluster = await Cluster.findOne({ clusterId: clusterData.id });
        
        if (!cluster) {
          cluster = new Cluster(clusterDoc);
          await cluster.save();
          syncStats.clustersCreated++;
        } else {
          await Cluster.updateOne({ _id: cluster._id }, clusterDoc);
        }
        
        clusters.push(cluster);
      } catch (error) {
        const errorMsg = `Cluster ${clusterData.name}: ${error.message}`;
        syncStats.errors.push(errorMsg);
        console.error(`⚠️  ${errorMsg}`);
      }
    }
    
    console.log(`✅ Synced ${clusters.length} clusters`);
    return clusters;
  } catch (error) {
    const errorMsg = `Clusters sync error: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    syncStats.errors.push(errorMsg);
    return [];
  }
}

/**
 * Sync Pricing data
 */
async function syncPricing(data) {
  console.log('\n💰 Syncing Pricing Data...');
  
  try {
    if (!data.propertyTypes) {
      console.log('⚠️  No pricing data found');
      return;
    }
    
    let count = 0;
    
    // Apartments
    if (data.propertyTypes.apartments && data.propertyTypes.apartments.bedrooms) {
      for (const [type, info] of Object.entries(data.propertyTypes.apartments.bedrooms)) {
        try {
          const pricingData = {
            bedroomType: type,
            propertyType: 'Apartment',
            avgPrice: {
              aed: parsePrice(info.avgPrice),
              usd: info.avgPrice ? Math.round(parsePrice(info.avgPrice) / 3.67) : 0,
            },
            avgSize: info.avgSizeM2 ? { sqm: info.avgSizeM2, sqft: info.avgSize } : {},
            count: info.count,
            rentalRange: {
              min: 30000,
              max: 400000,
              currency: 'AED',
              period: 'Year'
            }
          };
          
          await Pricing.updateOne(
            { bedroomType: type, propertyType: 'Apartment' },
            pricingData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Pricing ${type}: ${error.message}`);
        }
      }
    }
    
    // Townhouses
    if (data.propertyTypes.townhouses && data.propertyTypes.townhouses.bedrooms) {
      for (const [type, info] of Object.entries(data.propertyTypes.townhouses.bedrooms)) {
        try {
          const pricingData = {
            bedroomType: type,
            propertyType: 'Townhouse',
            avgPrice: {
              aed: parsePrice(info.avgPrice),
              usd: info.avgPrice ? Math.round(parsePrice(info.avgPrice) / 3.67) : 0,
            },
            avgSize: info.avgSizeM2 ? { sqm: info.avgSizeM2, sqft: info.avgSize } : {},
            count: info.count,
          };
          
          await Pricing.updateOne(
            { bedroomType: type, propertyType: 'Townhouse' },
            pricingData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Pricing ${type}: ${error.message}`);
        }
      }
    }
    
    // Villas
    if (data.propertyTypes.villas && data.propertyTypes.villas.bedrooms) {
      for (const [type, info] of Object.entries(data.propertyTypes.villas.bedrooms)) {
        try {
          const pricingData = {
            bedroomType: type,
            propertyType: 'Villa',
            avgPrice: {
              aed: parsePrice(info.avgPrice),
              usd: info.avgPrice ? Math.round(parsePrice(info.avgPrice) / 3.67) : 0,
            },
            avgSize: info.avgSizeM2 ? { sqm: info.avgSizeM2, sqft: info.avgSize } : {},
            count: info.count,
          };
          
          await Pricing.updateOne(
            { bedroomType: type, propertyType: 'Villa' },
            pricingData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Pricing ${type}: ${error.message}`);
        }
      }
    }
    
    syncStats.pricingRecordsCreated = count;
    console.log(`✅ Synced ${count} pricing records`);
  } catch (error) {
    const errorMsg = `Pricing sync error: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    syncStats.errors.push(errorMsg);
  }
}

/**
 * Sync Amenities data
 */
async function syncAmenities(data) {
  console.log('\n✨ Syncing Amenities...');
  
  try {
    if (!data.amenities) {
      console.log('⚠️  No amenities data found');
      return;
    }
    
    let count = 0;
    
    // Community-wide amenities
    if (data.amenities.communityWide) {
      for (const amenity of data.amenities.communityWide) {
        try {
          const amenityData = {
            name: amenity,
            category: categorizeAmenity(amenity),
            location: { community: true },
          };
          
          await Amenity.updateOne(
            { name: amenity },
            amenityData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Amenity ${amenity}: ${error.message}`);
        }
      }
    }
    
    syncStats.amenitiesCreated = count;
    console.log(`✅ Synced ${count} amenities`);
  } catch (error) {
    const errorMsg = `Amenities sync error: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    syncStats.errors.push(errorMsg);
  }
}

/**
 * Sync Locations/Facilities data
 */
async function syncLocations(data) {
  console.log('\n📍 Syncing Nearby Facilities...');
  
  try {
    let count = 0;
    
    // Schools
    if (data.schools) {
      for (const school of data.schools) {
        try {
          const locationData = {
            name: school.name,
            category: 'School',
            distance: { km: parseDistance(school.distance) },
            type: school.type,
          };
          
          await Location.updateOne(
            { name: school.name },
            locationData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Location ${school.name}: ${error.message}`);
        }
      }
    }
    
    // Medical Facilities
    if (data.medicalFacilities) {
      for (const facility of data.medicalFacilities) {
        try {
          const locationData = {
            name: facility.name,
            category: 'Hospital',
            distance: { km: parseDistance(facility.distance) },
            type: facility.type,
          };
          
          await Location.updateOne(
            { name: facility.name },
            locationData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Location ${facility.name}: ${error.message}`);
        }
      }
    }
    
    // Shopping Malls
    if (data.shoppingMalls) {
      for (const mall of data.shoppingMalls) {
        try {
          const locationData = {
            name: mall.name,
            category: 'Shopping',
            distance: { km: parseDistance(mall.distance) },
            type: mall.type,
          };
          
          await Location.updateOne(
            { name: mall.name },
            locationData,
            { upsert: true }
          );
          count++;
        } catch (error) {
          syncStats.errors.push(`Location ${mall.name}: ${error.message}`);
        }
      }
    }
    
    syncStats.locationsCreated = count;
    console.log(`✅ Synced ${count} locations`);
  } catch (error) {
    const errorMsg = `Locations sync error: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    syncStats.errors.push(errorMsg);
  }
}

/**
 * Create sync log entry
 */
async function createSyncLog() {
  try {
    const duration = Date.now() - syncStats.startTime;
    const status = syncStats.errors.length === 0 ? 'SUCCESS' : 'PARTIAL';
    
    const logEntry = new SyncLog({
      syncDate: new Date(),
      syncType: 'FULL',
      status: status,
      recordsProcessed: 
        syncStats.projectsCreated +
        syncStats.clustersCreated +
        syncStats.amenitiesCreated +
        syncStats.pricingRecordsCreated +
        syncStats.locationsCreated,
      recordsCreated:
        syncStats.projectsCreated +
        syncStats.clustersCreated +
        syncStats.amenitiesCreated,
      recordsUpdated: syncStats.pricingRecordsCreated,
      recordsFailed: syncStats.errors.length,
      errors: syncStats.errors.map(err => ({
        error: err,
        timestamp: new Date()
      })),
      sourceFile: 'DAMAC_HILLS_2_ACCURATE.json',
      duration: duration,
      notes: `Synced ${syncStats.projectsCreated} project, ${syncStats.clustersCreated} clusters, ${syncStats.amenitiesCreated} amenities`
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Error creating sync log:', error.message);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  
  const match = priceStr.toString().match(/\d+/g);
  if (!match) return 0;
  
  const num = parseInt(match.join(''));
  return priceStr.includes('K') ? num * 1000 : num;
}

function parseDistance(distStr) {
  if (!distStr) return 0;
  const match = distStr.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

function categorizeAmenity(name) {
  const nameStr = name.toLowerCase();
  
  if (nameStr.includes('pool') || nameStr.includes('gym') || nameStr.includes('court') || nameStr.includes('track')) {
    return 'Sports';
  }
  if (nameStr.includes('garden') || nameStr.includes('park') || nameStr.includes('spa') || nameStr.includes('sauna')) {
    return 'Recreation';
  }
  if (nameStr.includes('center') || nameStr.includes('hall') || nameStr.includes('community')) {
    return 'Community';
  }
  if (nameStr.includes('children') || nameStr.includes('play') || nameStr.includes('nursery')) {
    return 'Family';
  }
  if (nameStr.includes('shop') || nameStr.includes('retail') || nameStr.includes('cafe')) {
    return 'Retail';
  }
  
  return 'Recreation';
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================

async function syncAllData(options = {}) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  DAMAC HILLS 2 - MONGODB DATA SYNC         ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Create indexes
    await createIndexes();
    
    // Load JSON data
    const data = loadJSONData();
    
    // Clean database if requested
    if (options.clean) {
      console.log('\n🧹 Cleaning existing data...');
      await Project.deleteMany({});
      await Cluster.deleteMany({});
      await Amenity.deleteMany({});
      await Pricing.deleteMany({});
      await Location.deleteMany({});
      console.log('✅ Database cleaned');
    }
    
    // Sync data
    const project = await syncProjects(data);
    if (project) {
      await syncClusters(data, project._id);
    }
    await syncPricing(data);
    await syncAmenities(data);
    await syncLocations(data);
    
    // Create sync log
    const log = await createSyncLog();
    
    // Display results
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  SYNC COMPLETED SUCCESSFULLY               ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log('📊 SYNC SUMMARY:');
    console.log('═════════════════════════════════════════');
    console.log(`✅ Projects: ${syncStats.projectsCreated}`);
    console.log(`✅ Clusters: ${syncStats.clustersCreated}`);
    console.log(`✅ Amenities: ${syncStats.amenitiesCreated}`);
    console.log(`✅ Pricing Records: ${syncStats.pricingRecordsCreated}`);
    console.log(`✅ Locations: ${syncStats.locationsCreated}`);
    console.log(`⏱️  Duration: ${(Date.now() - syncStats.startTime) / 1000}s`);
    
    if (syncStats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${syncStats.errors.length}`);
      syncStats.errors.slice(0, 5).forEach(err => {
        console.log(`   • ${err}`);
      });
    } else {
      console.log(`\n✅ No errors!`);
    }
    
    console.log('\n✨ Data sync completed and logged!');
    
  } catch (error) {
    console.error('\n❌ Fatal error during sync:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await disconnectFromMongoDB();
  }
}

// ============================================
// COMMAND LINE INTERFACE
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    clean: args.includes('--clean'),
    full: args.includes('--full'),
  };
  
  syncAllData(options);
}

export {
  syncAllData,
  syncProjects,
  syncClusters,
  syncPricing,
  syncAmenities,
  syncLocations,
};
