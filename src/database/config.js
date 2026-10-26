/**
 * MongoDB Configuration
 * Handles connection setup and environment variables
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentEnvFile = path.join(__dirname, '../../.env');

dotenv.config({ path: parentEnvFile });
dotenv.config(); // Also load from current directory

const MONGO_CONFIG = {
  // Existing MongoDB Atlas (Primary - from main .env)
  PRIMARY: process.env.MONGODB_URI || process.env.DATABASE_URL || null,
  
  // Local MongoDB
  LOCAL: process.env.MONGO_LOCAL_URI || 'mongodb://localhost:27017/damac-hills-2',
  
  // MongoDB Atlas (Cloud)
  ATLAS: process.env.MONGO_ATLAS_URI || null,
  
  // Custom Server
  CUSTOM: process.env.MONGO_CUSTOM_URI || null,
  
  // Connection options (Modern Mongoose - no deprecated options)
  OPTIONS: {
    retryWrites: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};

/**
 * Determine which connection URI to use
 * Priority: PRIMARY (existing) > Custom > Atlas > Local
 */
function getConnectionURI() {
  if (MONGO_CONFIG.PRIMARY) {
    console.log('🔌 Using existing MongoDB Atlas (WhiteCavesDB)...');
    return MONGO_CONFIG.PRIMARY;
  }
  
  if (MONGO_CONFIG.CUSTOM) {
    console.log('🔌 Using custom MongoDB server...');
    return MONGO_CONFIG.CUSTOM;
  }
  
  if (MONGO_CONFIG.ATLAS) {
    console.log('🔌 Using MongoDB Atlas (Cloud)...');
    return MONGO_CONFIG.ATLAS;
  }
  
  console.log('🔌 Using local MongoDB...');
  return MONGO_CONFIG.LOCAL;
}

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  try {
    const uri = getConnectionURI();
    
    await mongoose.connect(uri, MONGO_CONFIG.OPTIONS);
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (error.name === 'MongoServerError') {
      console.error('   → Database server is unreachable');
      console.error('   → Make sure MongoDB is running');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('   → Invalid connection string');
      console.error('   → Check MONGO_*_URI environment variables');
    }
    
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectFromMongoDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB Disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error.message);
  }
}

/**
 * Get current connection status
 */
function getConnectionStatus() {
  const connection = mongoose.connection;
  
  return {
    connected: connection.readyState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][connection.readyState],
    database: connection.name,
    host: connection.host,
    port: connection.port,
  };
}

export {
  mongoose,
  connectToMongoDB,
  disconnectFromMongoDB,
  getConnectionStatus,
  MONGO_CONFIG,
};
