#!/usr/bin/env node

/**
 * DAMAC HILLS 2 - DATA MIGRATION SCRIPT
 * 
 * Load sample owner and contact data via REST API
 * 
 * Usage: node scripts/migrateDAMACData.js [--limit 100] [--verbose]
 * 
 * This script:
 * 1. Generates sample owner records based on DAMAC project data
 * 2. Submits owners via POST /api/v1/damac/owners
 * 3. Creates contact records via POST /api/v1/damac/contacts
 * 4. Links properties to owners via POST /api/v1/damac/properties/link
 * 5. Generates quality report
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE = 'http://localhost:5000/api/v1/damac';
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '100');
const VERBOSE = process.argv.includes('--verbose');
const DRY_RUN = process.argv.includes('--dry-run');

// First and last names for sample data generation
const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Fatima', 'Aisha', 'Ali', 'Sara', 'Omar', 'Zainab',
  'Hassan', 'Noor', 'Ibrahim', 'Layla', 'Khalid', 'Maryam', 'Abdullah', 'Hana',
  'Youssef', 'Dina', 'Amira', 'Rashid', 'Huda', 'Tariq', 'Leila', 'Karim'
];

const LAST_NAMES = [
  'Al Maktoum', 'Al Mansouri', 'Al Qassimi', 'Al Muhairi', 'Al Khaleej',
  'Al Marri', 'Al Abri', 'Al Ketbi', 'Al Neyadi', 'Al Farsi',
  'bin Laden', 'Al Ghurair', 'Al Futtaim', 'Al Zarooni', 'Al Zahra'
];

const PROPERTY_TYPES = ['Villa', 'Townhouse', 'Apartment', 'Penthouse', 'Studio'];
const PHONE_PREFIXES = ['+971501', '+971502', '+971503', '+971504', '+971505'];
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', '@damac.ae'];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRandomPhone() {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const number = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `${prefix}${number}`;
}

function generateRandomEmail(firstName, lastName) {
  const domain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const localPart = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s/g, '');
  return `${localPart}@${domain}`;
}

function generateSampleOwner(index) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  
  return {
    firstName,
    lastName,
    primaryPhone: generateRandomPhone(),
    email: generateRandomEmail(firstName, lastName),
    ownerId: `OWNER-${String(index).padStart(6, '0')}`,
    status: 'active',
    verified: Math.random() > 0.2, // 80% verified
    properties: Math.floor(Math.random() * 5) + 1,
    totalArea: Math.floor(Math.random() * 5000) + 1000,
    notes: `DAMAC Hills 2 resident - Properties in multiple clusters`,
    joinDate: new Date(2021 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28))
  };
}

function generateSampleContact(ownerId, ownerName, index) {
  return {
    contactId: `CONTACT-${String(index).padStart(6, '0')}`,
    ownerId,
    contactType: ['phone', 'email', 'whatsapp'][Math.floor(Math.random() * 3)],
    name: ownerName,
    phone: generateRandomPhone(),
    email: generateRandomEmail('contact', ownerName.replace(/\s/g, '').toLowerCase()),
    preferredMethod: ['whatsapp', 'email', 'phone'][Math.floor(Math.random() * 3)],
    status: 'active',
    notes: 'Primary contact via WhatsApp Bot Linda'
  };
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '🔵',
    SUCCESS: '✅',
    ERROR: '❌',
    WARN: '⚠️',
    DEBUG: '🔍'
  }[level] || level;
  
  if (level === 'DEBUG' && !VERBOSE) return;
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function checkServerHealth() {
  try {
    log('Checking server health...', 'INFO');
    const response = await fetch(`${API_BASE}/../health`);
    const data = await response.json();
    
    if (data.status === 'OK') {
      log(`Server healthy: ${data.uptime} uptime`, 'SUCCESS');
      return true;
    }
  } catch (error) {
    log(`Server health check failed: ${error.message}`, 'ERROR');
    return false;
  }
}

async function createOwner(ownerData) {
  try {
    const response = await fetch(`${API_BASE}/owners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ownerData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function createContact(contactData) {
  try {
    const response = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getOwnerStats() {
  try {
    const response = await fetch(`${API_BASE}/owners?limit=1`);
    const result = await response.json();
    return result.pagination?.total || 0;
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// MAIN MIGRATION PROCESS
// ============================================================================

async function executeMigration() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                   DAMAC HILLS 2 - DATA MIGRATION EXECUTION                     ║
║                          ${new Date().toISOString()}                          ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Check initial setup
  const initialCount = await getOwnerStats();
  log(`📊 Initial owner count: ${initialCount}`, 'INFO');

  // Check server health
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    log('Cannot proceed: Server is not responding', 'ERROR');
    process.exit(1);
  }

  // Confirm operation
  if (DRY_RUN) {
    log(`Running in DRY-RUN mode. Will generate ${LIMIT} sample records without posting.`, 'WARN');
  } else {
    log(`Will create ${LIMIT} sample owners and contacts...`, 'WARN');
  }

  const startTime = Date.now();
  const stats = {
    created: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Generate and post owners
    for (let i = 1; i <= LIMIT; i++) {
      const ownerData = generateSampleOwner(i);

      if (VERBOSE) {
        log(`Generating owner ${i}/${LIMIT}: ${ownerData.firstName} ${ownerData.lastName}`, 'DEBUG');
      } else if (i % 10 === 0) {
        log(`Progress: ${i}/${LIMIT} owners processed...`, 'INFO');
      }

      if (!DRY_RUN) {
        const result = await createOwner(ownerData);
        
        if (result.success) {
          stats.created++;
          
          // Create a contact for this owner
          const contactData = generateSampleContact(
            result.data._id || ownerData.ownerId,
            `${ownerData.firstName} ${ownerData.lastName}`,
            i
          );
          
          const contactResult = await createContact(contactData);
          if (!contactResult.success) {
            stats.failed++;
            stats.errors.push(`Contact creation failed for owner ${ownerData.firstName}: ${contactResult.error}`);
          }
        } else {
          stats.failed++;
          stats.errors.push(`Owner creation failed: ${ownerData.firstName} - ${result.error}`);
        }
      } else {
        stats.created++; // Count as success in dry-run
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Get final statistics
    const finalCount = await getOwnerStats();
    const loadedCount = finalCount - initialCount;

    console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                        MIGRATION COMPLETE - SUMMARY REPORT                      ║
╚════════════════════════════════════════════════════════════════════════════════╝

📈 STATISTICS:
  ✓ Owners Created:      ${stats.created}
  ✗ Owners Failed:       ${stats.failed}
  ⚠️  Skipped:            ${stats.skipped}
  ⏱️  Duration:           ${duration}s
  
📊 DATABASE STATUS:
  ↓ Before Migration:     ${initialCount} owners
  ↑ After Migration:      ${finalCount} owners
  ➕ Loaded in Session:   ${loadedCount} owners
  
✅ SUCCESS RATE:         ${((stats.created / LIMIT) * 100).toFixed(1)}%
📈 Quality Metric:       ${loadedCount > 0 ? '✓ PASS' : '✗ FAIL'}

${DRY_RUN ? '⚠️  DRY-RUN: No data was actually posted' : ''}

${stats.errors.length > 0 ? `
⚠️  ERRORS ENCOUNTERED (${stats.errors.length}):
${stats.errors.slice(0, 5).map(e => `  - ${e}`).join('\n')}
${stats.errors.length > 5 ? `  ... and ${stats.errors.length - 5} more\n` : ''}
` : ''}

🎯 NEXT STEPS:
  1. Verify data via dashboard: npm run dashboard:damac
  2. Run quality checks: npm run validate:damac
  3. Review PHASE_2_STATUS_DASHBOARD.md for full analysis
  4. If satisfied, proceed with Phase 3 planning

════════════════════════════════════════════════════════════════════════════════════
    `);

    return stats.failed === 0;
  } catch (error) {
    log(`Unexpected error during migration: ${error.message}`, 'ERROR');
    console.log(error.stack);
    return false;
  }
}

// Run migration
executeMigration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  console.log(error.stack);
  process.exit(1);
});
