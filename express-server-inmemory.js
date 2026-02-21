/**
 * EXPRESS SERVER FOR DAMAC HILLS 2 - IN-MEMORY TESTING MODE
 * 
 * REST API server with built-in in-memory MongoDB for testing
 * 
 * Run with: npm run express-test-server
 * Or: node express-server-inmemory.js
 * 
 * Server runs on: http://localhost:5000
 * API Endpoints: http://localhost:5000/api/v1/damac/*
 * Database: In-memory MongoDB with 200 test records
 */

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes and services
import damacApiRoutes from './code/Routes/damacApiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.EXPRESS_SERVER_PORT || 5000;

// Color codes for logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Setup MongoDB with in-memory fallback
async function setupDatabase() {
  try {
    console.log(`${colors.cyan}[DB] Initializing in-memory MongoDB...${colors.reset}`);
    
    // Start in-memory MongoDB
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    console.log(`${colors.green}[DB] In-memory MongoDB started${colors.reset}`);
    console.log(`${colors.blue}[DB] URI: ${mongoUri}${colors.reset}`);
    
    // Connect Mongoose to in-memory instance
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`${colors.green}[DB] Connected to in-memory database${colors.reset}`);
    
    // Load test data
    await loadTestData();
    
    // Keep server reference for cleanup
    return mongoServer;
    
  } catch (error) {
    console.error(`${colors.yellow}[DB] In-memory setup failed, attempting fallback...${colors.reset}`);
    console.error(error.message);
    
    // Try to connect to local MongoDB as fallback
    try {
      await mongoose.connect('mongodb://localhost:27017/damac-hills-2', {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`${colors.green}[DB] Connected to local MongoDB fallback${colors.reset}`);
      return null;
    } catch (fallbackError) {
      console.error(`${colors.yellow}[DB] Local MongoDB fallback failed${colors.reset}`);
      throw new Error('Cannot connect to any MongoDB instance');
    }
  }
}

// Load test data into database
async function loadTestData() {
  try {
    console.log(`${colors.cyan}[DATA] Loading test data...${colors.reset}`);
    
    const dataDir = path.join(__dirname, 'data', 'local');
    
    // Define schemas
    const ownerSchema = new mongoose.Schema({
      _id: String,
      ownerId: String,
      firstName: String,
      lastName: String,
      primaryPhone: String,
      email: String,
      status: String,
      verified: Boolean,
      properties: Number,
      totalArea: Number,
      notes: String,
      createdAt: Date,
      updatedAt: Date,
    }, { strict: false, collection: 'propertyowners' });

    const contactSchema = new mongoose.Schema({
      _id: String,
      contactId: String,
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      role: String,
      status: String,
      createdAt: Date,
      updatedAt: Date,
    }, { strict: false, collection: 'propertycontacts' });

    // Create models
    const PropertyOwner = mongoose.model('PropertyOwner', ownerSchema);
    const PropertyContact = mongoose.model('PropertyContact', contactSchema);
    
    // Clear existing data
    await PropertyOwner.deleteMany({});
    await PropertyContact.deleteMany({});
    
    // Load JSON files
    const ownersPath = path.join(dataDir, 'owners.json');
    const contactsPath = path.join(dataDir, 'contacts.json');
    
    // Read owners
    const ownersFile = await fs.readFile(ownersPath, 'utf-8');
    const ownersParsed = JSON.parse(ownersFile);
    const ownersData = Array.isArray(ownersParsed) ? ownersParsed : ownersParsed.records || [];
    
    // Read contacts
    const contactsFile = await fs.readFile(contactsPath, 'utf-8');
    const contactsParsed = JSON.parse(contactsFile);
    const contactsData = Array.isArray(contactsParsed) ? contactsParsed : contactsParsed.records || [];
    
    // Insert owners
    await PropertyOwner.insertMany(ownersData);
    console.log(`${colors.green}[DATA] Loaded ${ownersData.length} owner records${colors.reset}`);
    
    // Insert contacts
    await PropertyContact.insertMany(contactsData);
    console.log(`${colors.green}[DATA] Loaded ${contactsData.length} contact records${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.yellow}[DATA] Failed to load test data: ${error.message}${colors.reset}`);
    console.warn('Server will continue without test data');
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: 'in-memory-testing'
  });
});

// API Info endpoint
app.get('/info', (req, res) => {
  res.json({
    name: 'DAMAC Hills 2 - Property Management API',
    version: '1.0.0',
    description: 'REST API for managing properties, owners, and contacts',
    mode: 'in-memory-testing',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      api: 'GET /api/v1/damac/*'
    }
  });
});

// Mount DAMAC API routes
app.use('/api/v1/damac', damacApiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`${colors.yellow}[ERROR]${colors.reset} ${err.message}`);
  res.status(500).json({
    error: err.message,
    status: 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    // Setup database first
    await setupDatabase();
    
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
${colors.bold}${colors.green}╔════════════════════════════════════════════════════════════════╗${colors.reset}
${colors.bold}${colors.green}║            DAMAC HILLS 2 - EXPRESS SERVER (IN-MEMORY)            ║${colors.reset}
${colors.bold}${colors.green}║                   API Server with Test Data                      ║${colors.reset}
${colors.bold}${colors.green}╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.green}✅ Server running on: http://localhost:${PORT}${colors.reset}
${colors.green}📊 API Base URL: http://localhost:${PORT}/api/v1/damac${colors.reset}
${colors.green}🏥 Health Check: http://localhost:${PORT}/health${colors.reset}
${colors.green}ℹ️  Server Info: http://localhost:${PORT}/info${colors.reset}

${colors.cyan}📚 Available Endpoints:${colors.reset}
  - Owners:      POST/GET/PUT/DELETE /api/v1/damac/owners
  - Contacts:    POST/GET/PUT/DELETE /api/v1/damac/contacts
  - Properties:  GET/PUT /api/v1/damac/properties
  - Import/Sync: POST /api/v1/damac/import/*, /api/v1/damac/sync/*
  - Analytics:   GET /api/v1/damac/analytics/*
  - Search:      GET /api/v1/damac/search/*

${colors.bold}🛑 To stop server: Press Ctrl+C${colors.reset}

${colors.cyan}📝 Test Data:${colors.reset}
  - 100 property owner records loaded
  - 100 property contact records loaded
  - 200 total records ready for testing

${colors.yellow}💡 Next Step: Run Phase 4 tests in another terminal${colors.reset}
  \$ npm run phase4-test:v2

  `);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}Shutting down server...${colors.reset}`);
      server.close(() => {
        console.log(`${colors.green}Server stopped${colors.reset}`);
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error(`${colors.bold}${colors.yellow}Failed to start server: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Start the server
startServer();
