#!/usr/bin/env node
/**
 * Phase 4: API Endpoint Testing
 * DAMAC Hills 2 Property Management System
 * February 20, 2026
 * 
 * Comprehensive testing of all REST API endpoints
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/v1/damac';
const HEALTH_CHECK_URL = 'http://localhost:5000/health';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Logging
const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (name, passed) => {
    if (passed) {
      console.log(`  ${colors.green}✓${colors.reset} ${name}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${name}`);
    }
  },
};

// Test Suite
class Phase4APITestSuite {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
    };
    this.serverHealthy = false;
    this.testData = {
      ownerToCreate: null,
      contactToCreate: null,
      createdOwnerId: null,
      createdContactId: null,
    };
  }

  addTest(name, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({ name, passed, details });
    log.test(name, passed);
  }

  async checkServerHealth() {
    log.header('PRE-FLIGHT CHECK: Server Health');
    
    try {
      log.info('Checking if Express server is running...');
      const response = await axios.get(HEALTH_CHECK_URL, { timeout: 5000 });
      
      if (response.status === 200) {
        log.success(`Server is healthy - uptime: ${response.data.uptime?.toFixed(2)}s`);
        this.serverHealthy = true;
        return true;
      }
    } catch (error) {
      log.error(`Server not responding at ${HEALTH_CHECK_URL}`);
      log.warning(`Make sure Express server is running: npm run express-dev`);
      return false;
    }
  }

  async testHealthAndInfo() {
    log.header('HEALTH & INFO ENDPOINTS');
    
    try {
      // Test health endpoint
      const healthRes = await axios.get(HEALTH_CHECK_URL);
      this.addTest('GET /health', healthRes.status === 200, `Uptime: ${healthRes.data.uptime?.toFixed(2)}s`);
      
      // Test info endpoint
      const infoRes = await axios.get('http://localhost:5000/info');
      this.addTest('GET /info', infoRes.status === 200, `API v${infoRes.data.version}`);
      
    } catch (error) {
      this.addTest('Health & Info Endpoints', false, error.message);
    }
  }

  async testOwnerEndpoints() {
    log.header('OWNER ENDPOINTS - CRUD OPERATIONS');
    
    try {
      // Test 1: GET all owners
      let allOwnersRes = await axios.get(`${API_BASE_URL}/owners`, { timeout: 5000 });
      const ownerCount = Array.isArray(allOwnersRes.data) ? allOwnersRes.data.length : 0;
      this.addTest(`GET /owners (${ownerCount} owners found)`, allOwnersRes.status === 200 && ownerCount > 0);
      
      // Test 2: GET first owner details
      if (ownerCount > 0) {
        const firstOwner = allOwnersRes.data[0];
        this.addTest(`Owner data structure`, 
          firstOwner && firstOwner._id && firstOwner.firstName && firstOwner.email,
          `Sample: ${firstOwner.firstName} ${firstOwner.lastName}`);
        
        // Test 3: GET specific owner
        try {
          const ownerRes = await axios.get(`${API_BASE_URL}/owners/${firstOwner._id}`);
          this.addTest(`GET /owners/:id (${firstOwner._id})`, ownerRes.status === 200);
        } catch (error) {
          this.addTest(`GET /owners/:id`, false, error.response?.data?.error || error.message);
        }
      }
      
      // Test 4: Test POST (create new owner) - if endpoint supports it
      try {
        const newOwner = {
          firstName: 'Test',
          lastName: 'Owner',
          email: `test.owner.${Date.now()}@example.com`,
          primaryPhone: '+971501234567',
          status: 'active'
        };
        
        const createRes = await axios.post(`${API_BASE_URL}/owners`, newOwner, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (createRes.status === 201 || createRes.status === 200) {
          this.addTest('POST /owners (create owner)', true, `Created: ${createRes.data._id || 'n/a'}`);
          this.testData.createdOwnerId = createRes.data._id;
        }
      } catch (error) {
        this.addTest('POST /owners (create owner)', false, error.response?.data?.error || error.message);
      }
      
    } catch (error) {
      log.error(`Owner endpoint test error: ${error.message}`);
    }
  }

  async testContactEndpoints() {
    log.header('CONTACT ENDPOINTS - CRUD OPERATIONS');
    
    try {
      // Test 1: GET all contacts
      let allContactsRes = await axios.get(`${API_BASE_URL}/contacts`, { timeout: 5000 });
      const contactCount = Array.isArray(allContactsRes.data) ? allContactsRes.data.length : 0;
      this.addTest(`GET /contacts (${contactCount} contacts found)`, allContactsRes.status === 200 && contactCount > 0);
      
      // Test 2: GET first contact details
      if (contactCount > 0) {
        const firstContact = allContactsRes.data[0];
        this.addTest(`Contact data structure`, 
          firstContact && firstContact._id && firstContact.firstName && firstContact.email,
          `Sample: ${firstContact.firstName} ${firstContact.lastName}`);
        
        // Test 3: GET specific contact
        try {
          const contactRes = await axios.get(`${API_BASE_URL}/contacts/${firstContact._id}`);
          this.addTest(`GET /contacts/:id (${firstContact._id})`, contactRes.status === 200);
        } catch (error) {
          this.addTest(`GET /contacts/:id`, false, error.response?.data?.error || error.message);
        }
      }
      
      // Test 4: Test POST (create new contact)
      try {
        const newContact = {
          firstName: 'Test',
          lastName: 'Contact',
          email: `test.contact.${Date.now()}@example.com`,
          phone: '+971501234567',
          role: 'property_manager',
          status: 'active'
        };
        
        const createRes = await axios.post(`${API_BASE_URL}/contacts`, newContact, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (createRes.status === 201 || createRes.status === 200) {
          this.addTest('POST /contacts (create contact)', true, `Created: ${createRes.data._id || 'n/a'}`);
          this.testData.createdContactId = createRes.data._id;
        }
      } catch (error) {
        this.addTest('POST /contacts (create contact)', false, error.response?.data?.error || error.message);
      }
      
    } catch (error) {
      log.error(`Contact endpoint test error: ${error.message}`);
    }
  }

  async testSearchAndFilter() {
    log.header('SEARCH & FILTER ENDPOINTS');
    
    try {
      // Test 1: Search by status
      try {
        const searchRes = await axios.get(`${API_BASE_URL}/owners?status=active`, { timeout: 5000 });
        this.addTest(`Filter owners by status`, searchRes.status === 200, `Found: ${Array.isArray(searchRes.data) ? searchRes.data.length : 'unknown'}`);
      } catch (error) {
        this.addTest('Filter owners by status', false, error.response?.data?.error || 'Endpoint unavailable');
      }
      
      // Test 2: Search endpoint
      try {
        const searchRes = await axios.get(`${API_BASE_URL}/search/owners?q=Ahmed`, { timeout: 5000 });
        this.addTest('Search /search/owners', searchRes.status === 200, `Results: ${Array.isArray(searchRes.data) ? searchRes.data.length : 'n/a'}`);
      } catch (error) {
        this.addTest('Search /search/owners', false, 'Endpoint may not exist yet');
      }
      
    } catch (error) {
      log.warning(`Search test skipped: ${error.message}`);
    }
  }

  async testAnalytics() {
    log.header('ANALYTICS ENDPOINTS');
    
    try {
      // Test 1: Owner statistics
      try {
        const statsRes = await axios.get(`${API_BASE_URL}/analytics/owners`, { timeout: 5000 });
        this.addTest('GET /analytics/owners', statsRes.status === 200, `Stats: ${JSON.stringify(statsRes.data).substring(0, 50)}...`);
      } catch (error) {
        this.addTest('GET /analytics/owners', false, 'Endpoint may not exist yet');
      }
      
      // Test 2: Summary statistics
      try {
        const summaryRes = await axios.get(`${API_BASE_URL}/analytics/summary`, { timeout: 5000 });
        this.addTest('GET /analytics/summary', summaryRes.status === 200, `Summary: ${summaryRes.data?.total ? summaryRes.data.total + ' records' : 'n/a'}`);
      } catch (error) {
        this.addTest('GET /analytics/summary', false, 'Endpoint may not exist yet');
      }
      
    } catch (error) {
      log.warning(`Analytics test skipped: ${error.message}`);
    }
  }

  async testErrorHandling() {
    log.header('ERROR HANDLING & EDGE CASES');
    
    try {
      // Test 1: Request to non-existent owner
      try {
        await axios.get(`${API_BASE_URL}/owners/nonexistent-id-12345`);
        this.addTest('404 on non-existent owner', false, 'Should return 404');
      } catch (error) {
        this.addTest('404 on non-existent owner', error.response?.status === 404, `Status: ${error.response?.status}`);
      }
      
      // Test 2: Invalid request body
      try {
        await axios.post(`${API_BASE_URL}/owners`, { invalid: 'data' });
        this.addTest('400 on invalid request', false, 'Should validate input');
      } catch (error) {
        this.addTest('400 on invalid request', error.response?.status === 400 || error.response?.status === 422, `Status: ${error.response?.status}`);
      }
      
      // Test 3: Missing required fields
      try {
        await axios.post(`${API_BASE_URL}/contacts`, { firstName: 'Test' });
        this.addTest('Validation of required fields', false, 'Should require email');
      } catch (error) {
        this.addTest('Validation of required fields', error.response?.status >= 400, `Status: ${error.response?.status}`);
      }
      
    } catch (error) {
      log.warning(`Error handling test warning: ${error.message}`);
    }
  }

  async printSummary() {
    log.header('TEST RESULTS SUMMARY');
    
    console.log(`Total Tests:  ${this.testResults.total}`);
    console.log(`${colors.green}Passed:       ${this.testResults.passed}${colors.reset}`);
    if (this.testResults.failed > 0) {
      console.log(`${colors.red}Failed:       ${this.testResults.failed}${colors.reset}`);
    } else {
      console.log(`${colors.green}Failed:       ${this.testResults.failed}${colors.reset}`);
    }
    
    const passRate = this.testResults.total > 0 ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(1) : 0;
    console.log(`\n${colors.bold}Pass Rate:    ${passRate}%${colors.reset}`);
    
    if (this.testResults.failed === 0) {
      console.log(`\n${colors.bold}${colors.green}✅ ALL TESTS PASSED!${colors.reset}`);
    } else {
      console.log(`\n${colors.bold}${colors.yellow}⚠️  ${this.testResults.failed} test(s) failed${colors.reset}`);
    }
  }

  async run() {
    try {
      console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.bold}${colors.cyan}║          PHASE 4: API ENDPOINT TESTING - DAMAC HILLS 2          ║${colors.reset}`);
      console.log(`${colors.bold}${colors.cyan}║                     February 20, 2026                            ║${colors.reset}`);
      console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
      
      // Check server health first
      if (!await this.checkServerHealth()) {
        log.error('Cannot proceed without running server');
        console.log(`\n${colors.yellow}❌ EXPRESS SERVER NOT RUNNING${colors.reset}`);
        console.log(`\nStart it with:\n  ${colors.bold}npm run express-dev${colors.reset}\n`);
        return;
      }
      
      // Run all tests
      await this.testHealthAndInfo();
      await this.testOwnerEndpoints();
      await this.testContactEndpoints();
      await this.testSearchAndFilter();
      await this.testAnalytics();
      await this.testErrorHandling();
      
      // Print summary
      await this.printSummary();
      
      // Final message
      console.log(`\n${colors.bold}${colors.green}✅ PHASE 4 API TESTING COMPLETE${colors.reset}`);
      console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
      console.log(`  1. Review endpoint responses above`);
      console.log(`  2. Start comprehensive testing (Phase 5)`);
      console.log(`  3. Move to deployment (Phase 6)\n`);
      
    } catch (error) {
      log.error(`Test suite failed: ${error.message}`);
    }
  }
}

// Run tests
const testSuite = new Phase4APITestSuite();
await testSuite.run();
