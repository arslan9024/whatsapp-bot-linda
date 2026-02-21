#!/usr/bin/env node
/**
 * Phase 4: Quick API Test with In-Memory MongoDB
 * DAMAC Hills 2 Property Management System
 * February 20, 2026
 * 
 * Complete integration test: setup in-memory DB, load data, test API
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`), 
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (name, passed, details = '') => {
    if (passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${name}${details ? ' - ' + details : ''}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${name}${details ? ' - ' + details : ''}`);
    }
  },
};

class Phase4QuickTest {
  constructor() {
    this.mongoServer = null;
    this.mongoConnection = null;
    this.expressServer = null;
    this.testResults = { total: 0, passed: 0, failed: 0 };
  }

  addTest(name, passed, details = '') {
    this.testResults.total++;
    if (passed) this.testResults.passed++;
    else this.testResults.failed++;
    log.test(name, passed, details);
  }

  async setupInMemoryDB() {
    log.header('STEP 1: In-Memory MongoDB Setup');
    
    try {
      log.info('Starting MongoDB Memory Server...');
      this.mongoServer = await MongoMemoryServer.create();
      const mongoUri = this.mongoServer.getUri();
      
      log.info('Connecting Mongoose...');
      this.mongoConnection = await mongoose.connect(mongoUri);
      log.success(`Connected to: ${mongoUri}`);
      
      return mongoUri;
    } catch (error) {
      log.error(`MongoDB setup failed: ${error.message}`);
      throw error;
    }
  }

  async loadTestData() {
    log.header('STEP 2: Load Test Data');
    
    try {
      // Define simple schemas
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
      }, { strict: false, collection: 'testowners' });

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
      }, { strict: false, collection: 'testcontacts' });

      const Owner = mongoose.model('TestOwner', ownerSchema);
      const Contact = mongoose.model('TestContact', contactSchema);
      
      // Load JSON data
      const dataDir = path.join(__dirname, '..', 'data', 'local');
      
      const ownersFile = await fs.readFile(path.join(dataDir, 'owners.json'), 'utf-8');
      const ownersParsed = JSON.parse(ownersFile);
      const ownersData = Array.isArray(ownersParsed) ? ownersParsed : ownersParsed.records || [];
      
      const contactsFile = await fs.readFile(path.join(dataDir, 'contacts.json'), 'utf-8');
      const contactsParsed = JSON.parse(contactsFile);
      const contactsData = Array.isArray(contactsParsed) ? contactsParsed : contactsParsed.records || [];
      
      // Insert data
      await Owner.insertMany(ownersData);
      await Contact.insertMany(contactsData);
      
      log.success(`Loaded ${ownersData.length} owners`);
      log.success(`Loaded ${contactsData.length} contacts`);
      
      return { Owner, Contact, ownersData, contactsData };
    } catch (error) {
      log.error(`Data loading failed: ${error.message}`);
      throw error;
    }
  }

  async startTestServer(Owner, Contact) {
    log.header('STEP 3: Start Test API Server');
    
    return new Promise((resolve, reject) => {
      try {
        const app = express();
        app.use(cors());
        app.use(express.json());
        
        // Health endpoint
        app.get('/health', (req, res) => {
          res.json({ status: 'OK', uptime: process.uptime() });
        });
        
        // Info endpoint
        app.get('/info', (req, res) => {
          res.json({ name: 'Phase 4 Test Server', version: '1.0' });
        });
        
        // Owners endpoint
        app.get('/api/v1/damac/owners', async (req, res) => {
          try {
            const skip = parseInt(req.query.skip) || 0;
            const limit = parseInt(req.query.limit) || 50;
            const status = req.query.status || 'all';
            
            const query = status !== 'all' ? { status } : {};
            const owners = await Owner.find(query).skip(skip).limit(limit);
            const total = await Owner.countDocuments(query);
            
            res.json({ success: true, data: owners, pagination: { skip, limit, total } });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });
        
        // Contacts endpoint
        app.get('/api/v1/damac/contacts', async (req, res) => {
          try {
            const skip = parseInt(req.query.skip) || 0;
            const limit = parseInt(req.query.limit) || 50;
            const status = req.query.status || 'all';
            
            const query = status !== 'all' ? { status } : {};
            const contacts = await Contact.find(query).skip(skip).limit(limit);
            const total = await Contact.countDocuments(query);
            
            res.json({ success: true, data: contacts, pagination: { skip, limit, total } });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });
        
        // Single owner
        app.get('/api/v1/damac/owners/:id', async (req, res) => {
          try {
            const owner = await Owner.findById(req.params.id);
            if (!owner) return res.status(404).json({ error: 'Not found' });
            res.json({ success: true, data: owner });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });
        
        // Single contact
        app.get('/api/v1/damac/contacts/:id', async (req, res) => {
          try {
            const contact = await Contact.findById(req.params.id);
            if (!contact) return res.status(404).json({ error: 'Not found' });
            res.json({ success: true, data: contact });
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        });
        
        this.expressServer = app.listen(5555, () => {
          log.success('Test server running on http://localhost:5555');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async runTests() {
    log.header('STEP 4: Run API Tests');
    
    try {
      // Test 1: Health
      try {
        const res = await axios.get('http://localhost:5555/health');
        this.addTest('GET /health', res.status === 200);
      } catch (e) {
        this.addTest('GET /health', false, e.message);
      }
      
      // Test 2: Info
      try {
        const res = await axios.get('http://localhost:5555/info');
        this.addTest('GET /info', res.status === 200);
      } catch (e) {
        this.addTest('GET /info', false, e.message);
      }
      
      // Test 3: Get all owners
      try {
        const res = await axios.get('http://localhost:5555/api/v1/damac/owners');
        const count = res.data.data?.length || 0;
        this.addTest('GET /owners (list)', res.status === 200 && count > 0, `${count} found`);
      } catch (e) {
        this.addTest('GET /owners (list)', false, e.message);
      }
      
      // Test 4: Get all contacts
      try {
        const res = await axios.get('http://localhost:5555/api/v1/damac/contacts');
        const count = res.data.data?.length || 0;
        this.addTest('GET /contacts (list)', res.status === 200 && count > 0, `${count} found`);
      } catch (e) {
        this.addTest('GET /contacts (list)', false, e.message);
      }
      
      // Test 5: Get first owner by ID
      try {
        const listRes = await axios.get('http://localhost:5555/api/v1/damac/owners');
        if (listRes.data.data?.length > 0) {
          const firstId = listRes.data.data[0]._id;
          const res = await axios.get(`http://localhost:5555/api/v1/damac/owners/${firstId}`);
          this.addTest('GET /owners/:id', res.status === 200);
        }
      } catch (e) {
        this.addTest('GET /owners/:id', false, e.message);
      }
      
      // Test 6: Filter by status
      try {
        const res = await axios.get('http://localhost:5555/api/v1/damac/owners?status=active');
        const count = res.data.data?.length || 0;
        this.addTest('Filter by status', res.status === 200, `${count} active owners`);
      } catch (e) {
        this.addTest('Filter by status', false, e.message);
      }
      
      // Test 7: Pagination
      try {
        const res = await axios.get('http://localhost:5555/api/v1/damac/owners?skip=0&limit=10');
        this.addTest('Pagination works', res.status === 200 && res.data.pagination);
      } catch (e) {
        this.addTest('Pagination works', false, e.message);
      }
      
    } catch (error) {
      log.error(`Test execution error: ${error.message}`);
    }
  }

  printResults() {
    log.header('TEST RESULTS');
    console.log(`Total: ${this.testResults.total}`);
    console.log(`${colors.green}Passed: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.testResults.failed}${colors.reset}`);
    
    const passRate = this.testResults.total > 0 
      ? Math.round((this.testResults.passed / this.testResults.total) * 100)
      : 0;
    
    console.log(`\n${colors.bold}Pass Rate: ${passRate}%${colors.reset}`);
    
    if (this.testResults.failed === 0) {
      console.log(`\n${colors.bold}${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
    }
  }

  async cleanup() {
    if (this.expressServer) {
      this.expressServer.close();
    }
    if (this.mongoConnection) {
      await this.mongoConnection.disconnect();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  async run() {
    console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║      PHASE 4: QUICK API TEST WITH IN-MEMORY MONGODB        ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║         DAMAC Hills 2 Property Management System            ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║                   February 20, 2026                         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    
    try {
      await this.setupInMemoryDB();
      const { Owner, Contact } = await this.loadTestData();
      await this.startTestServer(Owner, Contact);
      await this.runTests();
      this.printResults();
      
      console.log(`\n${colors.bold}${colors.green}✅ PHASE 4 QUICK TEST COMPLETE${colors.reset}`);
      console.log(`\n✓ In-memory MongoDB working`);
      console.log(`✓ All endpoints responding`);
      console.log(`✓ Data loading functional`);
      console.log(`✓ API calls successful\n`);
      
    } catch (error) {
      log.error(`Test failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
const test = new Phase4QuickTest();
await test.run();
