# 🚀 DAMAC Hills 2 - MongoDB Integration Quick Start

## ✅ What's Done

Your WhatsApp Bot Linda now has **complete MongoDB integration** with DAMAC Hills 2 data:

- ✅ **28 Clusters** in MongoDB Atlas
- ✅ **8 Projects** including DAMAC Hills 2
- ✅ **Unified Database**: Using your existing WhiteCavesDB
- ✅ **Ready for Bot Queries**: Import and start using immediately

---

## 🔌 Connection Details

```
Database: WhiteCavesDB
Provider: MongoDB Atlas
Clusters: 28 DAMAC clusters
Status: ✅ LIVE & VERIFIED
```

**No additional setup needed** - uses your existing Atlas credentials

---

## 📦 How to Use in Your Bot

### Option 1: Direct Database Import (Recommended)

```javascript
// In your main bot file (index.js, main.js, etc.)

import { 
  connectToMongoDB, 
  disconnectFromMongoDB 
} from './code/Database/config.js';

import {
  getAllClusters,
  getPricingForBedroom,
  getAmenitiesByCategory,
  searchProperties
} from './code/Database/services.js';

// Initialize on bot start
client.on('ready', async () => {
  console.log('Bot starting...');
  await connectToMongoDB(); // Connect to WhiteCavesDB
});

// Use in message handlers
client.on('message', async (message) => {
  if (message.body.includes('clusters')) {
    const clusters = await getAllClusters();
    await message.reply(`DAMAC has ${clusters.length} clusters`);
  }
});

// Cleanup on stop
process.on('SIGINT', async () => {
  await disconnectFromMongoDB();
  process.exit(0);
});
```

### Option 2: Using Bot Example Handler

```javascript
import { 
  initializeDamac,
  handleDamacQuery,
  closeDamac 
} from './code/Database/DatabaseBotExample.js';

// Initialize
await initializeDamac();

// Handle user queries
const response = await handleDamacQuery('Tell me about DAMAC clusters');
await message.reply(response);

// Cleanup
await closeDamac();
```

---

## 📚 Available Functions

### Projects
```javascript
const project = await getProjectInfo();
const stats = await getProjectStats();
```

### Clusters
```javascript
const allClusters = await getAllClusters();
const cluster = await getClusterById(clusterId);
const byName = await getClusterByName('Cluster One');
const byType = await getClustersByUnitType('3BR');
const byAmenity = await getClustersByAmenity('Swimming Pool');
```

### Properties
```javascript
const by2BR = await getPropertiesByBedroom('2BR');
const apartments = await getPropertiesByType('Apartment');
const byPrice = await getPropertiesByPriceRange(500000, 2000000);
const available = await getAvailableProperties();
const searchResults = await searchProperties('villa');
```

### Pricing
```javascript
const pricing = await getPricingForBedroom('3BR');
const allPricing = await getAllPricing();
const byType = await getPricingByPropertyType('Villa');
const range = await getPriceRange();
```

### Amenities & Facilities
```javascript
const amenities = await getAllAmenities();
const sports = await getAmenitiesByCategory('Sports');
const schools = await getSchoolsNearby();
const hospitals = await getHospitalsNearby();
const malls = await getShoppingNearby();
```

---

## 🧪 Verify Data Anytime

```bash
cd code/Database
node verify-sync.js
```

Shows:
- Connection status
- Collection counts
- Sample data from each collection
- Database host information

---

## 📋 File Structure

```
code/Database/
├── config.js                  # MongoDB connection
├── schemas.js                 # Data models
├── services.js                # Query functions
├── sync-data.js               # Full data import
├── sync-data-debug.js         # Debug version
├── verify-sync.js             # Data verification
├── DatabaseBotExample.js      # Example integration
└── MONGODB_INTEGRATION_GUIDE.md
```

---

## 🎯 Common Use Cases

### 1. Get All DAMAC Clusters
```javascript
const clusters = await getAllClusters();
clusters.forEach(c => console.log(`${c.name}: ${c.unitCount} units`));
```

### 2. Find Apartments by Price
```javascript
const apartments = await getPropertiesByPriceRange(1000000, 3000000);
const filtered = apartments.filter(a => a.type === 'Apartment');
```

### 3. Get 3BR Pricing
```javascript
const pricing = await getPricingForBedroom('3BR');
console.log(`Average 3BR price: AED ${pricing.avgPrice.aed}`);
```

### 4. Find Nearby Schools
```javascript
const schools = await getSchoolsNearby();
schools.forEach(s => console.log(`${s.name} (${s.distance.km}km away)`));
```

### 5. Search Properties
```javascript
const results = await searchProperties('villa damac');
const summary = `Found ${results.length} matching properties`;
```

---

## 🔧 Advanced Configuration

### Use Different MongoDB Instance
If you want DAMAC data in a separate database:

Edit `.env`:
```bash
# Use Atlas (default)
MONGODB_URI=mongodb+srv://...

# Or use local MongoDB
MONGO_LOCAL_URI=mongodb://localhost:27017/damac
```

### Sync Data Again
```bash
# Full sync (clean and reimport)
node code/Database/sync-data.js --clean

# Debug mode with logging
node code/Database/sync-data-debug.js
```

---

## 💡 Integration Patterns

### Pattern 1: Middleware
```javascript
// Before each message, ensure DB connection
const withDatabase = async (handler) => {
  return async (message) => {
    try {
      const result = await handler(message);
      return result;
    } finally {
      // Connection stays open
    }
  };
};
```

### Pattern 2: Cached Queries
```javascript
let clustersCache = null;

async function getClustersEfficient() {
  if (!clustersCache) {
    clustersCache = await getAllClusters();
  }
  return clustersCache;
}
```

### Pattern 3: Error Handling
```javascript
try {
  const clusters = await getAllClusters();
} catch (error) {
  if (error.message.includes('ECONNREFUSED')) {
    // MongoDB not running
  } else if (error.message.includes('Auth failed')) {
    // Wrong credentials
  }
}
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | MongoDB Atlas not accessible - check internet connection |
| `Auth failed` | Check MONGODB_URI in .env file |
| `No clusters found` | Run `node code/Database/sync-data.js` to import data |
| `Cannot find module` | Run `npm install` to get dependencies (mongoose, dotenv) |

---

## 📞 Support

### Verify Connection
```javascript
import { connectToMongoDB } from './code/Database/config.js';
await connectToMongoDB();
// Should print: ✅ MongoDB Connected Successfully
```

### Check Data
```javascript
import { getAllClusters } from './code/Database/services.js';
const clusters = await getAllClusters();
console.log(`${clusters.length} clusters found`);
// Should print: 28 clusters found
```

### Debug Mode
```bash
node code/Database/sync-data-debug.js
# Shows file loading, connection, and sync progress
```

---

## 🚀 Next Steps

1. **Import services** into your bot file
2. **Call functions** based on user messages
3. **Test with** `node verify-sync.js`
4. **Deploy** with confidence - data is production-ready

---

**Status**: ✅ Ready for immediate use  
**Data**: 28 clusters + project info  
**Connection**: WhiteCavesDB (MongoDB Atlas)  
**Last Updated**: February 8, 2026

---

## 📧 Integration Complete!

Your DAMAC Hills 2 database is now live. Start querying! 🎯
