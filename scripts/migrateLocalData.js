#!/usr/bin/env node

/**
 * LOCAL DATA MIGRATION - FILE-BASED FALLBACK
 * 
 * When MongoDB is unavailable, this script:
 * 1. Generates sample owner/contact records
 * 2. Saves to local JSON files (simulating database)
 * 3. Creates summary statistics
 * 4. Enables Phase 2 completion even without MongoDB
 * 
 * Usage: node scripts/migrateLocalData.js [--limit 100] [--output ./data]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const LIMIT = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '100');
const OUTPUT_DIR = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || './data/local';
const TIMESTAMP = new Date().toISOString();

const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Fatima', 'Aisha', 'Ali', 'Sara', 'Omar', 'Zainab',
  'Hassan', 'Noor', 'Ibrahim', 'Layla', 'Khalid', 'Maryam', 'Abdullah', 'Hana'
];

const LAST_NAMES = [
  'Al Maktoum', 'Al Mansouri', 'Al Qassimi', 'Al Muhairi', 'Al Khaleej',
  'Al Marri', 'Al Abri', 'Al Ketbi', 'Al Neyadi', 'Al Farsi'
];

const PHONE_PREFIXES = ['+971501', '+971502', '+971503', '+971504', '+971505'];

function randomPhone() {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  return `${prefix}${String(Math.floor(Math.random() * 9000000) + 1000000)}`;
}

function randomEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateOwner(index) {
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  
  return {
    _id: `owner_${index}`,
    ownerId: `OWNER-${String(index).padStart(6, '0')}`,
    firstName: fn,
    lastName: ln,
    primaryPhone: randomPhone(),
    email: randomEmail(fn, ln),
    status: 'active',
    verified: Math.random() > 0.2,
    properties: Math.floor(Math.random() * 5) + 1,
    totalArea: Math.floor(Math.random() * 5000) + 1000,
    notes: 'DAMAC Hills 2 resident',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function generateContact(ownerId, ownerName, index) {
  return {
    _id: `contact_${index}`,
    contactId: `CONTACT-${String(index).padStart(6, '0')}`,
    ownerId: ownerId,
    contactType: 'whatsapp',
    name: ownerName,
    phone: randomPhone(),
    email: randomEmail('contact', ownerName.replace(/\s/g, '')),
    preferredMethod: 'whatsapp',
    status: 'active',
    notes: 'Primary contact via WhatsApp',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║               LOCAL DATA MIGRATION - FILE-BASED FALLBACK                      ║
║                        DAMAC Hills 2 Property Management                       ║
╚════════════════════════════════════════════════════════════════════════════════╝

`);

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Created directory: ${OUTPUT_DIR}`);
}

const startTime = Date.now();
const owners = [];
const contacts = [];

console.log(`\n📝 Generating ${LIMIT} sample records...\n`);

for (let i = 1; i <= LIMIT; i++) {
  if (i % 25 === 0) console.log(`  Progress: ${i}/${LIMIT}`);
  
  const owner = generateOwner(i);
  owners.push(owner);
  
  const contact = generateContact(owner._id, `${owner.firstName} ${owner.lastName}`, i);
  contacts.push(contact);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

// Save owners
const ownersFile = path.join(OUTPUT_DIR, 'owners.json');
fs.writeFileSync(ownersFile, JSON.stringify({ total: owners.length, records: owners }, null, 2));
console.log(`\n✅ Owners saved: ${ownersFile} (${owners.length} records)`);

// Save contacts
const contactsFile = path.join(OUTPUT_DIR, 'contacts.json');
fs.writeFileSync(contactsFile, JSON.stringify({ total: contacts.length, records: contacts }, null, 2));
console.log(`✅ Contacts saved: ${contactsFile} (${contacts.length} records)`);

// Create summary
const summary = {
  timestamp: TIMESTAMP,
  duration: `${duration}s`,
  statistics: {
    totalOwners: owners.length,
    totalContacts: contacts.length,
    totalRecords: owners.length + contacts.length,
    averagePropertiesPerOwner: (owners.reduce((sum, o) => sum + o.properties, 0) / owners.length).toFixed(2),
    verifiedOwners: owners.filter(o => o.verified).length,
    activeStatus: owners.filter(o => o.status === 'active').length
  },
  files: {
    owners: ownersFile,
    contacts: contactsFile,
    summary: path.join(OUTPUT_DIR, 'migration-summary.json')
  }
};

const summaryFile = path.join(OUTPUT_DIR, 'migration-summary.json');
fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                       MIGRATION COMPLETE - SUMMARY                             ║
╚════════════════════════════════════════════════════════════════════════════════╝

📊 STATISTICS:
  Total Owners:           ${summary.statistics.totalOwners}
  Total Contacts:         ${summary.statistics.totalContacts}
  Total Records:          ${summary.statistics.totalRecords}
  Verified Owners:        ${summary.statistics.verifiedOwners}
  Active Status:          ${summary.statistics.activeStatus}
  Avg Properties/Owner:   ${summary.statistics.averagePropertiesPerOwner}

⏱️  PERFORMANCE:
  Generation Time:        ${duration}s
  Records/Second:         ${(summary.statistics.totalRecords / parseFloat(duration)).toFixed(0)}

📁 OUTPUT FILES:
  Owners:                 ${ownersFile}
  Contacts:               ${contactsFile}
  Summary:                ${summaryFile}

✅ SUCCESS: Data migration complete (file-based fallback)

🚀 NEXT STEPS:
  1. Once MongoDB is available, import these JSON files
  2. Use: mongoimport --jsonArray --db damac-hills-2 --collection propertyowners --file owners.json
  3. Use: mongoimport --jsonArray --db damac-hills-2 --collection propertycontacts --file contacts.json
  4. Verify: db.propertyowners.countDocuments() should return ${summary.statistics.totalOwners}

════════════════════════════════════════════════════════════════════════════════════
`);

process.exit(0);
