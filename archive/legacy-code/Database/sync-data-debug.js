/**
 * MongoDB Data Sync Script - DEBUG Version
 * Imports DAMAC Hills 2 JSON data into MongoDB with detailed logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToMongoDB, disconnectFromMongoDB } from './config.js';
import {
  Project,
  Cluster,
  Pricing,
  Amenity,
  Location,
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

console.log('\n🔍 DEBUG - Sync Configuration:');
console.log(`JSON_FILE path: ${JSON_FILE}`);
console.log(`File exists: ${fs.existsSync(JSON_FILE)}`);
console.log();

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
// LOAD JSON
// ============================================
function loadJSONData() {
  console.log('📂 Loading JSON data...');
  try {
    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`JSON file not found: ${JSON_FILE}`);
    }
    
    const content = fs.readFileSync(JSON_FILE, 'utf8');
    console.log(`✅ JSON file read: ${content.length} bytes`);
    
    const data = JSON.parse(content);
    console.log(`✅ JSON parsed successfully`);
    console.log(`   - Keys: ${Object.keys(data).join(', ')}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error loading JSON:', error.message);
    throw error;
  }
}

// ============================================
// MAIN SYNC
// ============================================
async function syncAllData() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  DAMAC HILLS 2 - MONGODB DATA SYNC (DEBUG) ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // Connect
    console.log('🔌 Connecting to MongoDB...');
    await connectToMongoDB();
    console.log('✅ Connected!\n');
    
    // Load JSON
    const data = loadJSONData();
    console.log();
    
    // Sync Projects
    console.log('📍 Syncing Projects...');
    if (data.project) {
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
    } else {
      console.log('⚠️  No project data');
    }
    console.log();
    
    // Sync Clusters
    console.log('🏘️  Syncing Clusters...');
    if (data.clusters && data.clusters.clustersList) {
      console.log(`Found ${data.clusters.clustersList.length} clusters`);
      
      for (const clusterData of data.clusters.clustersList) {
        try {
          const clusterDoc = {
            clusterId: clusterData.id,
            name: clusterData.name,
            unitCount: clusterData.unitCount,
            unitTypes: clusterData.unitTypes,
            amenities: clusterData.amenities,
          };
          
          let cluster = await Cluster.findOne({ clusterId: clusterData.id });
          if (!cluster) {
            cluster = new Cluster(clusterDoc);
            await cluster.save();
            syncStats.clustersCreated++;
          }
        } catch (error) {
          console.error(`⚠️  Cluster ${clusterData.name}: ${error.message}`);
          syncStats.errors.push(`Cluster ${clusterData.name}: ${error.message}`);
        }
      }
      console.log(`✅ Synced ${syncStats.clustersCreated} clusters`);
    } else {
      console.log('⚠️  No clusters data');
    }
    console.log();
    
    // Summary
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  SYNC COMPLETED                            ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log('📊 SYNC SUMMARY:');
    console.log('═════════════════════════════════════════');
    console.log(`✅ Projects: ${syncStats.projectsCreated}`);
    console.log(`✅ Clusters: ${syncStats.clustersCreated}`);
    console.log(`⏱️  Duration: ${(Date.now() - syncStats.startTime) / 1000}s`);
    
    if (syncStats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${syncStats.errors.length}`);
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await disconnectFromMongoDB();
  }
}

syncAllData();
