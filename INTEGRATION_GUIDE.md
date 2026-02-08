# 🤖 Linda Bot - Organized Sheet Integration Guide

## Overview

Your Linda Bot is now configured to use the **Akoya-Oxygen-2023-Organized** sheet as its **primary live database**. This guide explains:

1. How to write new leads back to the sheet
2. How to generate analytics reports
3. How to integrate with your existing bot logic
4. How to monitor data quality

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Write-Back Service](#write-back-service)
- [Analytics Service](#analytics-service)
- [Bot Integration](#bot-integration)
- [API Endpoints](#api-endpoints)
- [Monitoring & Alerts](#monitoring--alerts)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Initialize Services in Your Bot

```javascript
import WriteBackService from './code/Services/WriteBackService.js';
import { AnalyticsService } from './code/Services/AnalyticsService.js';

// In your bot startup
async function initializeBotServices() {
  // Initialize write-back service
  const writeBack = new WriteBackService();
  await writeBack.initialize();
  
  // Initialize analytics
  const analytics = new AnalyticsService();
  await analytics.initialize();
  
  console.log('✅ Bot services ready');
  return { writeBack, analytics };
}
```

---

## Write-Back Service

### What It Does

- **Auto-appends new leads** to the organized sheet
- **Assigns unique codes** (P###, C###, F###) automatically
- **Validates data** before writing
- **Logs all writes** for audit trail
- **Handles batch operations** for efficiency

### Configuration

```javascript
// From: code/Config/OrganizedSheetBotConfig.js

WRITE_BACK: {
  enabled: true,
  targetSheet: '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk',
  autoAppend: true,
  batchSize: 100,
  validateBeforeWrite: true,
  assignCodes: true,
  codeFormat: {
    properties: 'P###',  // P001, P002, ...
    contacts: 'C###',    // C001, C002, ...
    financial: 'F###'    // F001, F002, ...
  }
}
```

### Usage: Single Lead

```javascript
const writeBack = new WriteBackService();
await writeBack.initialize();

// New lead data
const newLead = {
  name: 'Ahmed Al-Mansouri',
  phone: '+971501234567',
  email: 'ahmed@example.com',
  whatsapp: '+971501234567',
  location: 'Downtown Dubai',
  property_type: 'Apartment',
  bedrooms: '2',
  budget: '500000',
  source: 'WhatsApp',
  notes: 'Interested in 2BR apartments'
};

// Write to sheet
const result = await writeBack.appendLead(newLead, {
  source: 'whatsapp_bot',
  timestamp: new Date().toISOString()
});

if (result.success) {
  console.log(`✅ Lead saved with code: ${result.code}`);
} else {
  console.error(`❌ Failed: ${result.error}`);
}
```

### Usage: Batch Leads

```javascript
const leads = [
  { name: 'Person 1', phone: '...' },
  { name: 'Person 2', phone: '...' },
  { name: 'Person 3', phone: '...' }
];

const result = await writeBack.appendBatch(leads);

console.log(`✅ Appended: ${result.totalAppended}/${result.totalProcessed}`);
```

### Integration with Your Bot

**In your message handler (e.g., where you process new WhatsApp messages):**

```javascript
async function handleNewLead(message, chatData) {
  // Extract lead info from message
  const leadData = {
    name: extractName(message),
    phone: message.from,
    whatsapp: message.from,
    location: extractLocation(message),
    property_type: extractPropertyType(message),
    budget: extractBudget(message),
    source: 'WhatsApp',
    notes: message.body
  };

  // Write to sheet
  const result = await writeBack.appendLead(leadData);
  
  // Use the assigned code in bot responses
  if (result.success) {
    const response = `Thanks for reaching out! Your reference code is: ${result.code}`;
    await sendMessage(message.from, response);
  }
}
```

---

## Analytics Service

### What It Does

- **Analyzes organized sheet data** in real-time
- **Generates 5 types of reports:**
  - Record type distribution (P/C/F codes)
  - Location analysis (top areas)
  - Contact info completeness
  - Pricing/budget trends
  - Data quality metrics
- **Provides actionable insights**
- **Exports reports to files**

### Usage: Generate Report

```javascript
const analytics = new AnalyticsService();
await analytics.initialize();

// Generate comprehensive report
const report = await analytics.generateReport();

// Get formatted text report
const textReport = analytics.generateSheetReport(report);
console.log(textReport);

// Save to file
import fs from 'fs';
fs.writeFileSync('./reports/analytics.txt', textReport);
```

### Report Output Example

```
╔════════════════════════════════════════════════════════════════╗
║        AKOYA ORGANIZED SHEET - ANALYTICS REPORT                ║
╚════════════════════════════════════════════════════════════════╝

Generated: 2/8/2026 10:34:48 AM
Total Records: 10383

📊 RECORD TYPES
───────────────────────────────────────────────────────────────
  Properties (P):  7500 (72.2%)
  Contacts (C):    1800 (17.3%)
  Financial (F):   1083 (10.4%)

📍 TOP LOCATIONS
───────────────────────────────────────────────────────────────
  Dubai Downtown: 2345 records
  Dubai Marina: 1834 records
  JBR: 956 records
  ...

📞 CONTACT INFORMATION
───────────────────────────────────────────────────────────────
  Phone Numbers:   8923 (85.9%)
  Email Addresses: 7234 (69.6%)
  WhatsApp:        9156 (88.2%)

💰 PRICING ANALYSIS
───────────────────────────────────────────────────────────────
  Min: AED 150000
  Max: AED 5000000
  Avg: AED 850000
  Median: AED 780000

📈 DATA QUALITY
───────────────────────────────────────────────────────────────
  Fill Rate:       87.3%
  Quality:         Good
  Duplicate Codes: 0
```

### Schedule Daily Reports

```javascript
// In your bot initialization
import cron from 'node-cron';

function setupAnalyticsReporting(analytics) {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('📊 Generating daily analytics report...');
    
    const report = await analytics.generateReport();
    const textReport = analytics.generateSheetReport(report);
    
    // Save with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(
      `./reports/daily-${timestamp}.txt`,
      textReport
    );
    
    // Optional: Send to admin via WhatsApp
    // await sendToAdmin(textReport);
  });
}
```

---

## Bot Integration

### Complete Example: Full Integration

```javascript
// main.js - Bot initialization
import WhatsAppClient from './code/whatsapp-client.js';
import WriteBackService from './code/Services/WriteBackService.js';
import { AnalyticsService } from './code/Services/AnalyticsService.js';
import { BOT_CONFIG } from './code/Config/OrganizedSheetBotConfig.js';

class LindaBot {
  constructor() {
    this.client = null;
    this.writeBack = null;
    this.analytics = null;
  }

  async initialize() {
    console.log('🤖 Initializing Linda Bot...');

    // Initialize services
    this.writeBack = new WriteBackService();
    await this.writeBack.initialize();

    this.analytics = new AnalyticsService();
    await this.analytics.initialize();

    // Initialize WhatsApp client
    this.client = new WhatsAppClient();
    await this.client.initialize();

    // Set up message handlers
    this.setupHandlers();

    console.log('✅ Linda Bot ready!');
  }

  setupHandlers() {
    this.client.on('message', (message) => {
      // Check if this is a new lead
      if (this.isNewLeadMessage(message)) {
        this.handleNewLead(message);
      } else {
        this.handleFollowUp(message);
      }
    });
  }

  async handleNewLead(message) {
    // Extract lead information
    const leadData = {
      name: extractName(message),
      phone: message.from,
      whatsapp: message.from,
      location: extractLocation(message),
      property_type: extractPropertyType(message),
      budget: extractBudget(message),
      source: 'WhatsApp',
      notes: message.body,
      timestamp: new Date().toISOString()
    };

    // Write to organized sheet
    const result = await this.writeBack.appendLead(leadData);

    if (result.success) {
      // Send confirmation with code
      const response = `
Thanks for reaching out! 🎉

Your inquiry has been registered with code: *${result.code}*

We'll analyze your requirements and get back to you within 24 hours.

What type of property are you looking for?
1. Apartment
2. Villa
3. Studio
4. Other
      `;
      
      await message.reply(response);
    }
  }

  async handleFollowUp(message) {
    // Check organized sheet for previous interactions
    // Use AI to generate contextual responses
    // Log conversation back to sheet
  }

  isNewLeadMessage(message) {
    // Logic to determine if this is a new lead
    // vs a follow-up on existing lead
    return true;
  }
}

// Start bot
const bot = new LindaBot();
await bot.initialize();
```

---

## API Endpoints

### Available Endpoints

```
GET  /api/sheet/organized
     Fetch all organized lead data
     Response: { records: [], count, lastUpdated }

POST /api/sheet/leads
     Write new lead to sheet
     Body: { name, phone, location, ... }
     Response: { success, code }

GET  /api/analytics/report
     Get latest analytics report
     Response: { totalRecords, recordTypes, locations, ... }

GET  /api/sheet/search?q=string
     Search leads by name/phone/location
     Response: { results: [] }

PUT  /api/sheet/leads/:code
     Update lead by code
     Body: { field: value, ... }
     Response: { success }

DELETE /api/sheet/leads/:code
     Archive lead by code
     Response: { success }
```

### Example Usage:

```javascript
// Write lead via API
fetch('/api/sheet/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Ahmed',
    phone: '+971501234567',
    location: 'Dubai',
    budget: '500000'
  })
})
.then(r => r.json())
.then(data => console.log('Code:', data.code));

// Get analytics
fetch('/api/analytics/report')
  .then(r => r.json())
  .then(report => console.log(report));
```

---

## Monitoring & Alerts

### Data Quality Alerts

```javascript
// Monitor data quality metrics
async function monitorDataQuality(analytics) {
  const report = await analytics.generateReport();
  
  if (report.sections.dataQuality.fillRate < 70) {
    console.warn('⚠️  Data quality below 70%');
    // Send alert
  }

  if (report.sections.dataQuality.duplicateCodeCount > 0) {
    console.error('❌ Duplicate codes found!');
    // Alert admin
  }

  if (report.sections.contacts.phonePercentage < 80) {
    console.warn('⚠️  Phone completeness below 80%');
  }
}
```

### Real-Time Monitoring

```javascript
// Check write-back success rate
let writes = { success: 0, failed: 0 };

const result = await writeBack.appendLead(lead);
if (result.success) {
  writes.success++;
  if (writes.success % 10 === 0) {
    console.log(`✅ Successfully wrote ${writes.success} leads`);
  }
} else {
  writes.failed++;
  if (writes.failed > 5) {
    console.error('⚠️  High write failure rate!');
    // Alert admin
  }
}
```

---

## Troubleshooting

### Issue: Write-Back Not Working

**Error:** `Failed to authenticate with Google`

**Solution:**
1. Check keys.json is in `./code/GoogleAPI/`
2. Verify service account has editor access to the sheet
3. Run: `node testGoogleAuth.js`

### Issue: Duplicate Codes

**Problem:** Two leads have the same code

**Solution:**
```javascript
// The service automatically handles this with counters
// If it happens, check the log file and contact support
```

### Issue: Sheet Quota Exceeded

**Error:** `Rate Limit Exceeded`

**Solution:**
1. Use larger batch sizes (e.g., 100 instead of 10)
2. Space out requests: `await delay(1000)` between batches
3. Use caching for frequent reads

### Issue: Data Quality Low

**Problem:** Low fill rate or many empty cells

**Solution:**
1. Add validation rules in WRITE_BACK config
2. Require certain fields before writing
3. Clean up old records in the sheet

---

## Next Steps

1. ✅ **Review** - Read through this guide with your team
2. ✅ **Test** - Run `node examples/WriteBackAndAnalytics-Example.js`
3. ✅ **Integrate** - Add write-back to your bot message handler
4. ✅ **Monitor** - Set up analytics reporting
5. ✅ **Deploy** - Push changes to production

---

## Support & Resources

- 📂 Services: `./code/Services/`
- ⚙️ Config: `./code/Config/OrganizedSheetBotConfig.js`
- 📊 Sheet: https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk
- 📝 Logs: `./logs/bot.log`

---

**Last Updated:** Feb 8, 2026
**Status:** ✅ Production Ready
