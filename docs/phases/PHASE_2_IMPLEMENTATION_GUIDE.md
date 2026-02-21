# PHASE 2 IMPLEMENTATION GUIDE
## DAMAC HILLS 2 - Data Integration + REST APIs
**February 19, 2026**

---

## 📋 OVERVIEW

This guide covers the complete implementation of:
- ✅ **DataMigrationService** - Load real DAMAC data from Google Sheets
- ✅ **DashboardDataService** - Terminal-based dashboard with analytics
- ✅ **REST API Routes** - 20+ complete API endpoints
- ✅ **Terminal Dashboard CLI** - Beautiful terminal displays
- ✅ **Integration** - Unified command handler system

**Total Deliverables:** 4 new services + 50+ new methods + REST API framework

---

## 🚀 QUICK START

### 1. Add REST API Routes to Express App

```javascript
// In your main Express app file (e.g., server.js)
import damacApiRoutes from './code/Routes/damacApiRoutes.js';

// Register routes
app.use('/api/v1/damac', damacApiRoutes);

// Verify with:
// GET http://localhost:5000/api/v1/damac/health
// GET http://localhost:5000/api/v1/damac/info
```

### 2. Import Services in Terminal

```javascript
import { handleDAMACCommand, getDAMACCommandHelp } from './code/Database/DAMACHills2Integration.js';
import DashboardCLI from './code/Terminal/DashboardCLI.js';

// Run dashboard command
const result = await handleDAMACCommand('dashboard', {});
console.log(result);
```

### 3. Load Real Data

```javascript
import DataMigrationService from './code/Database/DataMigrationService.js';

// From Google Sheets data
const report = await DataMigrationService.migrateOwnersFromSheets(sheetsData, {
  linkRelationships: true
});

console.log(report.summary);
```

---

## 🔌 REST API ENDPOINTS

### Base URL
```
http://localhost:5000/api/v1/damac
```

### Authentication
Currently no auth required (add authentication middleware as needed)

---

### **OWNERS ENDPOINTS**

#### Create Owner
```http
POST /owners
Content-Type: application/json

{
  "firstName": "Ahmed",
  "lastName": "Al Mansouri",
  "primaryPhone": "+971501234567",
  "email": "ahmed@example.com",
  "ownershipType": "individual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Owner created successfully",
  "data": {
    "_id": "...",
    "ownerId": "OWNER-20260219-XXXXX",
    "firstName": "Ahmed",
    "lastName": "Al Mansouri",
    ...
  }
}
```

#### List Owners
```http
GET /owners?skip=0&limit=50&status=active&verified=true
```

**Query Parameters:**
- `skip` (number) - Records to skip for pagination
- `limit` (number) - Records to return (default 50)
- `status` (string) - Filter by status: 'active', 'inactive', or 'all'
- `verified` (string) - Filter by verification: 'true', 'false', or 'all'

#### Get Owner by ID
```http
GET /owners/{id}
GET /owners/OWNER-20260219-XXXXX
```

#### Get Owner by Phone
```http
GET /owners/phone/{phone}
GET /owners/phone/+971501234567
```

#### Get Owner by Email
```http
GET /owners/email/{email}
GET /owners/email/ahmed@example.com
```

#### Search Owners
```http
GET /search/{query}?limit=20
GET /search/Ahmed?limit=20
```

#### Update Owner
```http
PUT /owners/{id}
Content-Type: application/json

{
  "email": "newemail@example.com",
  "primaryPhone": "+971505555555"
}
```

#### Delete/Archive Owner
```http
DELETE /owners/{id}
DELETE /owners/OWNER-20260219-XXXXX
```

**Note:** Deletes are soft deletes (archive only)

#### Verify Owner
```http
POST /owners/{id}/verify
Content-Type: application/json

{
  "method": "document",
  "userId": "user@example.com"
}
```

**Methods:** `document`, `email`, `phone_call`

#### Get Owner's Properties
```http
GET /owners/{id}/properties
GET /owners/OWNER-20260219-XXXXX/properties
```

#### Get Owner's Audit Trail
```http
GET /owners/{id}/audit-trail?limit=50
GET /owners/OWNER-20260219-XXXXX/audit-trail?limit=20
```

---

### **CONTACTS ENDPOINTS**

#### Create Contact
```http
POST /contacts
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "primaryPhone": "+971505760057",
  "contactType": "agent",
  "role": "Sales Agent"
}
```

**Contact Types:** `agent`, `broker`, `tenant`, `caretaker`, `manager`, `family_member`

#### List Contacts
```http
GET /contacts?skip=0&limit=50&type=agent
```

**Query Parameters:**
- `skip` - Records to skip
- `limit` - Records to return
- `type` - Filter by contact type

#### Get Contact by ID
```http
GET /contacts/{id}
GET /contacts/CONTACT-20260219-XXXXX
```

#### Update Contact
```http
PUT /contacts/{id}
Content-Type: application/json

{
  "role": "Senior Agent",
  "email": "jane.smith@realty.com"
}
```

#### Delete Contact
```http
DELETE /contacts/{id}
```

---

### **IMPORT & SYNC ENDPOINTS**

#### Bulk Import Owners
```http
POST /import/owners
Content-Type: application/json

{
  "data": [
    {
      "firstName": "Owner1",
      "lastName": "Name1",
      "primaryPhone": "+971501111111",
      "email": "owner1@example.com"
    },
    {
      "firstName": "Owner2",
      "lastName": "Name2",
      "primaryPhone": "+971502222222",
      "email": "owner2@example.com"
    }
  ],
  "options": {
    "linkRelationships": true,
    "skipDuplicates": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Owner import completed",
  "data": {
    "summary": {
      "total": 87,
      "successful": 85,
      "successRate": "97.7%",
      "status": "SUCCESS"
    },
    "created": 80,
    "updated": 5,
    "skipped": 2,
    "errors": [],
    "validation": {
      "passed": 85,
      "failed": 2,
      "duplicates": 1
    }
  }
}
```

#### Bulk Import Contacts
```http
POST /import/contacts
Content-Type: application/json

{
  "data": [
    {
      "firstName": "Contact1",
      "lastName": "Name1",
      "primaryPhone": "+9715033333333",
      "contactType": "agent"
    }
  ]
}
```

#### Sync Owners (Merge Existing + New)
```http
POST /sync/owners
Content-Type: application/json

{
  "data": [...],
  "options": {
    "overwrite": true  // Update existing records or notify of conflicts
  }
}
```

---

### **ANALYTICS & DASHBOARD ENDPOINTS**

#### Dashboard Overview
```http
GET /analytics/dashboard

Response:
{
  "success": true,
  "data": {
    "timestamp": "2026-02-19T...",
    "overview": {
      "Total Owners": 87,
      "Verified Owners": 74,
      "Active Owners": 82,
      "Total Contacts": 123,
      "Total Properties": 156,
      "Active Properties": 142,
      "Audit Log Entries": 345
    },
    "metrics": {
      "Verification Rate": "85.1%",
      "Active Owner Rate": "94.3%",
      "Property Count": 156,
      "Avg Properties/Owner": "1.79"
    }
  }
}
```

#### Owner Statistics
```http
GET /analytics/owners

Response includes:
- Total owners, verified, active counts
- Breakdown by ownership type
- Top cities
- Verification rates
```

#### Contact Statistics
```http
GET /analytics/contacts

Response includes:
- Total contacts, verified counts
- Breakdown by contact type
- Breakdown by role
- Verification rates
```

#### Property Statistics
```http
GET /analytics/properties

Response includes:
- Total properties, active, rented
- Total property value (AED)
- Average property value
- Total rental income
- Occupancy rates
```

#### Data Quality Score
```http
GET /analytics/quality

Response:
{
  "success": true,
  "data": {
    "overallScore": "87.5",
    "rating": "EXCELLENT",
    "total_records": 87,
    "issues": [],
    "recommendations": ["Maintain current standards"]
  }
}
```

#### Recent Activity
```http
GET /analytics/activity?limit=20

Response includes:
- List of recent changes
- User who made the change
- What entity was changed
- Timestamp
```

#### Migration Status
```http
GET /analytics/status

Response:
{
  "success": true,
  "data": {
    "timestamp": "2026-02-19T...",
    "owners": 87,
    "contacts": 123,
    "properties": 156,
    "auditLogs": 345,
    "verifiedOwners": 74,
    "activeOwners": 82
  }
}
```

---

### **HEALTH & INFO ENDPOINTS**

#### Health Check
```http
GET /health

Response:
{
  "status": "OK",
  "timestamp": "2026-02-19T...",
  "service": "DAMAC Hills 2 API"
}
```

#### API Information
```http
GET /info

Response:
{
  "name": "DAMAC Hills 2 Property Management API",
  "version": "1.0.0",
  "endpoints": {
    "owners": { ... },
    "contacts": { ... },
    "import": { ... },
    "analytics": { ... }
  }
}
```

---

## 📊 TERMINAL DASHBOARD COMMANDS

All dashboard commands available via terminal and REST API.

### Main Dashboard
```bash
handle-damac-command dashboard

Output:
╔════════════════════════════════╗
║   DAMAC HILLS 2 - DASHBOARD    ║
║   Time: HH:MM:SS               ║
╚════════════════════════════════╝

📊 OVERVIEW
├─ Total Owners: 87
├─ Verified: 74
├─ Total Contacts: 123
└─ Total Properties: 156
...
```

### Owner Statistics
```bash
handle-damac-command stats:owners

Shows:
- Total, verified, active counts
- Breakdown by ownership type
- Top cities by owner count
- Verification rates (%)
```

### Contact Statistics
```bash
handle-damac-command stats:contacts

Shows:
- Total contacts by type (agent, broker, etc.)
- Breakdown by role
- Verification status
```

### Property Statistics
```bash
handle-damac-command stats:properties

Shows:
- Total, active, rented properties
- Total property value (AED)
- Average property price (AED)
- Total rental income (AED)
- Occupancy rates (%)
```

### Data Quality Score
```bash
handle-damac-command quality:score

Shows:
- Overall score (0-100)
- Rating (EXCELLENT/GOOD/FAIR/POOR)
- Identified issues
- Recommendations for improvement
```

### Recent Activity
```bash
handle-damac-command activity:recent --limit 20

Shows:
- Last 20 changes
- Who made them
- What changed
- When (timestamp)
```

### Migration Status
```bash
handle-damac-command migration:status

Shows:
- Records per collection
- Verification counts
- Data readiness
```

### Data Summary
```bash
handle-damac-command data:summary

Generates:
- Complete overview report
- All statistics combined
- Quality metrics
- Activity summary
- Exportable text format
```

### Owner Portfolio
```bash
handle-damac-command portfolio --id OWNER-20260219-XXXXX

Shows:
- Owner details
- All properties owned
- Associated contacts
- Portfolio value
```

---

## 📝 DATA MIGRATION SERVICE

### Migrate from Google Sheets

```javascript
import DataMigrationService from './code/Database/DataMigrationService.js';

// From sheet data
const report = await DataMigrationService.migrateOwnersFromSheets(
  googleSheetData,
  {
    linkRelationships: true,  // Automatically link relationships
    updateExisting: false,     // Don't update existing owners
    skipDuplicates: true       // Skip if owner exists
  }
);

console.log(report.summary);
// { total: 87, successful: 85, successRate: '97.7%', status: 'SUCCESS' }
```

### Migrate from JSON File

```javascript
// From JSON files like DAMAC_HILLS_2_ACCURATE.json
const report = await DataMigrationService.migrateFromJSON(
  jsonData,
  'owner',  // 'owner', 'contact', or 'property'
  { updateExisting: true }
);
```

### Sync Data (Merge)

```javascript
// Merge new data with existing
const report = await DataMigrationService.syncOwnerData(
  newOwnerData,
  {
    overwrite: false  // Just report conflicts, don't overwrite
  }
);

// Check conflicts
report.conflicts_details.forEach(conflict => {
  console.log(`Conflict: ${conflict.phone} already exists`);
});
```

### Get Migration Status

```javascript
const status = await DataMigrationService.getMigrationStatus();

console.log(`Total Owners: ${status.owners}`);
console.log(`Total Contacts: ${status.contacts}`);
console.log(`Total Properties: ${status.properties}`);
console.log(`Verified: ${status.verifiedOwners}`);
```

---

## 📊 DASHBOARD DATA SERVICE

### Get Dashboard Overview

```javascript
import DashboardDataService from './code/Database/DashboardDataService.js';

const data = await DashboardDataService.getDashboardOverview();
// Returns all key metrics for main dashboard
```

### Get Statistics by Type

```javascript
const ownerStats = await DashboardDataService.getOwnerStatistics();
const contactStats = await DashboardDataService.getContactStatistics();
const propertyStats = await DashboardDataService.getPropertyStatistics();
```

### Get Data Quality Score

```javascript
const quality = await DashboardDataService.getDataQualityScore();

console.log(`Score: ${quality.overallScore}/100`);
console.log(`Rating: ${quality.rating}`);
quality.issues.forEach(issue => console.log(`- ${issue}`));
quality.recommendations.forEach(rec => console.log(`→ ${rec}`));
```

### Get Recent Activity

```javascript
const activity = await DashboardDataService.getRecentActivity(20);

activity.activities.forEach(act => {
  console.log(`${act.date}: ${act.action} on ${act.entity}`);
});
```

### Get Owner Portfolio

```javascript
const portfolio = await DashboardDataService.getOwnerPortfolio(ownerId);

console.log(`Owner: ${portfolio.owner.name}`);
console.log(`Properties: ${portfolio.portfolio['Total Properties']}`);
```

---

## 🧪 INTEGRATION TESTING

### Test REST API with cURL

```bash
# Health check
curl http://localhost:5000/api/v1/damac/health

# Get all owners
curl http://localhost:5000/api/v1/damac/owners?limit=10

# Create new owner
curl -X POST http://localhost:5000/api/v1/damac/owners \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Owner",
    "primaryPhone": "+971501234567",
    "email": "test@example.com"
  }'

# Get statistics
curl http://localhost:5000/api/v1/damac/analytics/owners
curl http://localhost:5000/api/v1/damac/analytics/dashboard

# Bulk import
curl -X POST http://localhost:5000/api/v1/damac/import/owners \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"firstName": "Owner1", "lastName": "Name1", "primaryPhone": "+971501111111"}
    ]
  }'
```

### Test Terminal Commands

```javascript
import { handleDAMACCommand } from './code/Database/DAMACHills2Integration.js';

// Test dashboard
const dashboard = await handleDAMACCommand('dashboard', {});
console.log(dashboard);

// Test statistics
const stats = await handleDAMACCommand('stats:owners', {});
console.log(stats);

// Test quality score
const quality = await handleDAMACCommand('quality:score', {});
console.log(quality);

// Test migration
const migration = await handleDAMACCommand('migration:status', {});
console.log(migration);
```

---

## ⚙️ CONFIGURATION

### Environment Variables (if needed)

```env
# API configuration
API_PORT=5000
API_HOST=localhost
NODE_ENV=production

# Database
MONGODB_URI=mongodb://...
DB_NAME=linda_bot

# PowerAgent for Google Sheets
POWERAGENT_API_KEY=AQ.Ab8RN6J1QZlmz8vSo0D1jLnDZsKn_NHcH2G4hmgD40vfpzi4mg
```

### Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "status": "ERROR_CODE"
}
```

Common status codes:
- `400` - Bad request (validation failed)
- `404` - Not found
- `500` - Server error

---

## 📚 FILE STRUCTURE

```
code/
├── Database/
│   ├── PropertyOwnerSchema.js           (✓ Existing)
│   ├── PropertyContactSchema.js         (✓ Existing)
│   ├── PropertyOwnerPropertiesSchema.js (✓ Existing)
│   ├── PropertyOwnerAuditLogSchema.js   (✓ Existing)
│   ├── PropertyOwnerService.js          (✓ Existing)
│   ├── PropertyImportService.js         (✓ Existing)
│   ├── DataMigrationService.js          (✨ NEW)
│   ├── DashboardDataService.js          (✨ NEW)
│   └── DAMACHills2Integration.js        (✓ Updated)
├── Routes/
│   └── damacApiRoutes.js                (✨ NEW)
└── Terminal/
    └── DashboardCLI.js                  (✨ NEW)
```

---

## 🚀 NEXT STEPS

### Immediate (1-2 hours)
1. ✅ Register REST routes in Express app
2. ✅ Test all endpoints with cURL/Postman
3. ✅ Verify terminal dashboard commands work

### Short-term (2-4 hours)
4. Load real DAMAC data using DataMigrationService
5. Review data quality score
6. Make any mapping adjustments needed

### Further (Optional)
7. Add API authentication/authorization
8. Create Postman collection for API testing
9. Set up API monitoring and logging
10. Build frontend dashboard (later)

---

## 🎯 SUCCESS CRITERIA

✅ All 20+ REST endpoints working  
✅ All dashboard commands displaying correctly  
✅ Real data migrated successfully  
✅ API returning accurate statistics  
✅ Terminal dashboard formatted properly  
✅ All relationships linked correctly  

---

## 📞 SUPPORT

### Common Issues

**Q: Routes not found (404)**
A: Make sure you've registered the routes in Express:
```javascript
app.use('/api/v1/damac', damacApiRoutes);
```

**Q: "Cannot find module" errors**
A: Verify import paths match your actual file structure

**Q: Dashboard output is garbled**
A: Ensure terminal supports ANSI color codes (most modern terminals do)

**Q: Data migration fails**
A: Check that your data format matches expected schema

---

**Document Version:** 1.0  
**Last Updated:** February 19, 2026  
**Status:** Complete & Production-Ready ✅
