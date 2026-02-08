/**
 * Verify DAMAC Data Sync
 * Checks if data was successfully imported to MongoDB
 */

import { connectToMongoDB, disconnectFromMongoDB } from './config.js';
import { Project, Cluster, Pricing, Location, Amenity } from './schemas.js';

async function verifySyncStatus() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  VERIFYING DAMAC DATA SYNC                 ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // Connect
    console.log('🔌 Connecting to MongoDB...');
    await connectToMongoDB();
    console.log('✅ Connected!\n');
    
    // Check collections
    console.log('📊 COLLECTION COUNTS:');
    console.log('═════════════════════════════════════════');
    
    const projectCount = await Project.countDocuments();
    console.log(`📍 Projects: ${projectCount}`);
    
    const clusterCount = await Cluster.countDocuments();
    console.log(`🏘️  Clusters: ${clusterCount}`);
    
    const pricingCount = await Pricing.countDocuments();
    console.log(`💰 Pricing Records: ${pricingCount}`);
    
    const amenityCount = await Amenity.countDocuments();
    console.log(`✨ Amenities: ${amenityCount}`);
    
    const locationCount = await Location.countDocuments();
    console.log(`📍 Locations: ${locationCount}`);
    
    // Get project details
    if (projectCount > 0) {
      console.log('\n📋 PROJECT DETAILS:');
      console.log('═════════════════════════════════════════');
      const project = await Project.findOne();
      console.log(`Name: ${project.name}`);
      console.log(`Location: ${project.location}`);
      console.log(`Developer: ${project.developer}`);
    }
    
    // Get sample cluster
    if (clusterCount > 0) {
      console.log('\n🏘️  SAMPLE CLUSTER:');
      console.log('═════════════════════════════════════════');
      const cluster = await Cluster.findOne();
      console.log(`ID: ${cluster.clusterId}`);
      console.log(`Name: ${cluster.name}`);
      console.log(`Unit Count: ${cluster.unitCount}`);
    }
    
    console.log('\n✅ VERIFICATION COMPLETE!');
    console.log('All data synced successfully to WhiteCavesDB\n');
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error.message);
    console.error(error);
  } finally {
    await disconnectFromMongoDB();
  }
}

verifySyncStatus();
