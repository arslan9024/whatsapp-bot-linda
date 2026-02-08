# 🗂️ Database File Structure & Quick Reference

## 📁 Directory Structure

```
code/Database/
├── config.js                        # MongoDB connection configuration
├── schemas.js                       # Mongoose models/schemas
├── services.js                      # Query service layer
├── sync-data.js                     # Data import/sync script
├── DatabaseBotExample.js            # Bot message handler example
├── .env.example                     # Environment variables template
└── MONGODB_INTEGRATION_GUIDE.md     # Complete integration guide
```

---

## 📄 File Descriptions

### `config.js`
**Purpose:** MongoDB connection setup and configuration

**Key Functions:**
- `connectToMongoDB()` - Connects to MongoDB
- `disconnectFromMongoDB()` - Closes connection
- `getConnectionStatus()` - Returns current status

**Usage:**
```javascript
const { connectToMongoDB, disconnectFromMongoDB } = require('./config');

await connectToMongoDB();
// ... use database
await disconnectFromMongoDB();
```

---

### `schemas.js`
**Purpose:** Defines MongoDB data models using Mongoose

**Models Created:**
- `Project` - Main project info
- `Cluster` - 28 clusters data
- `Property` - Individual properties (future)
- `Amenity` - Amenity catalog
- `Pricing` - Price data by type
- `Location` - Nearby facilities
- `SyncLog` - Sync history

**Collections:** 7 collections created in MongoDB

**Usage:**
```javascript
const { Cluster, Pricing, Amenity } = require('./schemas');

const clusters = await Cluster.find();
const pricing = await Pricing.findOne({ bedroomType: '2BR' });
```

---

### `services.js`
**Purpose:** High-level query interface (RECOMMENDED FOR BOT USE)

**Key Functions:** 50+ service functions grouped by category

**Categories:**
- Project Services (3 functions)
- Cluster Services (5 functions)
- Property Services (7 functions)
- Pricing Services (4 functions)
- Amenity Services (4 functions)
- Location Services (5 functions)
- Analytics & Reporting (4 functions)
- Comparison Services (2 functions)
- Filter & Sorting (1 function)

**Usage:**
```javascript
const services = require('./services');

const pricing = await services.getPricingForBedroom('2BR');
const schools = await services.getSchoolsNearby(5);
const results = await services.searchProperties({ bedrooms: 3 });
```

---

### `sync-data.js`
**Purpose:** Imports DAMAC Hills 2 JSON data into MongoDB

**Command:**
```bash
node code/Database/sync-data.js [--clean] [--full]
```

**Options:**
- `--clean` - Delete all existing data before sync
- `--full` - Force full sync (default)

**Syncs:**
- Projects (1)
- Clusters (28)
- Pricing (9 records)
- Amenities (36+)
- Locations (50+)

**Output:** Sync logs stored in `sync_logs` collection

---

### `DatabaseBotExample.js`
**Purpose:** Example message handlers for WhatsApp bot integration

**Key Functions:**
- `initializeDamac()` - Setup when bot starts
- `closeDamac()` - Cleanup when bot stops
- `handleDamacQuery()` - Main query handler
- `getPriceResponse()` - Price information
- `getClusterResponse()` - Cluster details
- `getNearbyFacilitiesResponse()` - Find nearby amenities
- `getPropertySearchResponse()` - Search properties
- `getProjectStatsResponse()` - Project overview
- `getAmenitiesResponse()` - List all amenities

**Usage:**
```javascript
const { initializeDamac, handleDamacQuery } = require('./DatabaseBotExample');

// In bot startup
await initializeDamac();

// In message handler
const response = await handleDamacQuery(userMessage);
```

---

### `.env.example`
**Purpose:** Environment variables template

**Variables:**
```env
# MongoDB connection (choose one)
MONGO_LOCAL_URI=mongodb://localhost:27017/...
MONGO_ATLAS_URI=mongodb+srv://...
MONGO_CUSTOM_URI=mongodb://...

NODE_ENV=development
```

**How to use:**
1. Copy to `.env`: `copy .env.example .env`
2. Edit with your connection string
3. Never commit `.env` to git

---

## 🚀 Quick Start Commands

### 1. Install Dependencies
```bash
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda
npm install mongoose dotenv
```

### 2. Setup Environment
```bash
cd code/Database
copy .env.example .env
# Edit .env with your MongoDB connection string
```

### 3. Sync Data
```bash
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda
node code/Database/sync-data.js --clean
```

### 4. Test Connection
```javascript
const { connectToMongoDB, getConnectionStatus } = require('./code/Database/config');

connectToMongoDB().then(() => {
  console.log(getConnectionStatus());
});
```

---

## 📊 Database Collections

| Collection | Purpose | Count | Indexed Fields |
|-----------|---------|-------|-----------------|
| projects | Project metadata | 1 | name (unique) |
| clusters | 28 clusters | 28 | clusterId (unique), name |
| properties | Properties | 1500+ | bedrooms, price, status |
| pricing | Price data | 9 | bedroomType, propertyType |
| amenities | Amenities | 36+ | name (unique), category |
| locations | Nearby facilities | 50+ | name, category |
| sync_logs | Sync history | Log entries | syncDate |

---

## 💻 Integration Steps

### Step 1: Load Services
```javascript
const { connectToMongoDB } = require('./code/Database/config');
const services = require('./code/Database/services');

// Initialize
await connectToMongoDB();
```

### Step 2: Query Data
```javascript
// Get pricing
const price = await services.getPricingForBedroom('2BR');

// Search properties
const props = await services.searchProperties({ bedrooms: 3 });

// Get amenities
const amenities = await services.getAllAmenities();
```

### Step 3: Build Bot Responses
```javascript
// Use DatabaseBotExample.js as template
const { handleDamacQuery } = require('./DatabaseBotExample');

const response = await handleDamacQuery(userMessage);
```

---

## 🔍 Common Queries

### Get Project Information
```javascript
const project = await services.getProjectInfo();
// { name: 'DAMAC Hills 2', totalUnits: 1500, ... }
```

### Search Properties
```javascript
const results = await services.getPropertiesWithFilters(
  { bedrooms: 2, minPrice: 800000, maxPrice: 1200000 },
  { limit: 20, sortBy: 'price' }
);
```

### Get Pricing
```javascript
const price = await services.getPricingForBedroom('3BR', 'Apartment');
// { avgPrice: { aed: 1350000, usd: 367000 }, count: 350, ... }
```

### Get Nearby
```javascript
const schools = await services.getSchoolsNearby(5);
const hospitals = await services.getHospitalsNearby(5);
const shopping = await services.getShoppingNearby(5);
```

### Get Amenities
```javascript
const sports = await services.getAmenitiesByCategory('Sports');
const all = await services.getAllAmenities();
```

### Get Statistics
```javascript
const stats = await services.getPropertyStats();
// [ { _id: 'Apartment', count: 1200, avgPrice: 1200000, ... }, ... ]
```

---

## 📝 Sample Code Snippets

### For WhatsApp Bot

```javascript
// Handle "price" queries
if (message.includes('price') && message.includes('2BR')) {
  const price = await services.getPricingForBedroom('2BR');
  await bot.sendMessage(chatId, `
💰 2BR Apartment Price: AED ${price.avgPrice.aed.toLocaleString()}
📐 Average Size: ${price.avgSize.sqft} sqft
📊 Available: ${price.count} units
  `);
}

// Handle "cluster" queries
if (message.includes('cluster')) {
  const clusterNum = parseInt(message.match(/\d+/)[0]);
  const cluster = (await services.getAllClusters())[clusterNum - 1];
  await bot.sendMessage(chatId, `
🏘️ ${cluster.name}
📊 Units: ${cluster.unitCount}
🏠 Types: ${cluster.unitTypes.join(', ')}
✨ Amenities: ${cluster.amenities.join(', ')}
  `);
}

// Handle "schools" queries
if (message.includes('school')) {
  const schools = await services.getSchoolsNearby(5);
  let schoolsList = schools.map(s => `${s.name} - ${s.distance.km} km`).join('\n');
  await bot.sendMessage(chatId, `🏫 Nearby Schools:\n${schoolsList}`);
}
```

### For Telegram Bot

```javascript
bot.on('message', async (msg) => {
  const text = msg.text.toLowerCase();
  
  if (text.includes('damac')) {
    if (text.includes('price')) {
      const pricing = await services.getAllPricing();
      bot.sendMessage(msg.chat.id, JSON.stringify(pricing, null, 2));
    } else if (text.includes('cluster')) {
      const clusters = await services.getAllClusters();
      bot.sendMessage(msg.chat.id, `Available: ${clusters.length} clusters`);
    }
  }
});
```

---

## 🛠️ Troubleshooting

### MongoDB won't connect
```bash
# Check if MongoDB is running
netstat -ano | find "27017"

# If not running, start it (Windows)
mongod

# Or check Atlas connection string
# mongodb+srv://user:pass@cluster.mongodb.net/...
```

### Services not found
```javascript
// Make sure you're importing correctly
const services = require('./code/Database/services');
// NOT: require('./services')
// NOT: require('services')
```

### No data in database
```bash
# Run sync script
node code/Database/sync-data.js --clean

# Check sync logs
# In MongoDB shell:
use damac-hills-2
db.sync_logs.findOne()
```

### Connection pool exhausted
```env
# Increase pool size in .env
MONGO_POOL_SIZE=20
MONGO_SERVER_SELECTION_TIMEOUT=5000
```

---

## 📚 Reference Documentation

- **Full Integration Guide:** `MONGODB_INTEGRATION_GUIDE.md`
- **Bot Example:** `DatabaseBotExample.js`
- **Service Functions:** `services.js` (detailed comments)
- **Database Schemas:** `schemas.js` (field definitions)

---

## 🚀 Next Steps

1. ✅ Copy all files to `code/Database/` directory
2. ✅ Run `npm install mongoose dotenv`
3. ✅ Create `.env` file with MongoDB connection
4. ✅ Run `node sync-data.js --clean` to import data
5. ✅ Test with `const services = require('./services')`
6. ✅ Integrate into bot using `DatabaseBotExample.js`

---

**All files ready for MongoDB integration!** 🎉
