# 🗄️ MongoDB Integration Guide - DAMAC Hills 2

**Complete guide to connect, sync, and query DAMAC Hills 2 data in MongoDB**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Sync](#database-sync)
5. [Using the Data](#using-the-data)
6. [API Examples](#api-examples)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required
- **Node.js** v14+ and npm
- **MongoDB** (Local, Atlas Cloud, or Custom Server)

### Optional
- MongoDB Compass (GUI for exploring data)
- Postman (for API testing)

---

## 📦 Installation

### Step 1: Install Required Packages

```bash
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda

npm install mongoose dotenv
```

### Step 2: Verify Files

Check that these files exist in `code/Database/`:
```
config.js          # MongoDB connection config
schemas.js         # Database models/schemas
services.js        # Database query services
sync-data.js       # Data sync script
.env.example       # Environment variables template
```

---

## ⚙️ Configuration

### Option 1: Local MongoDB

If MongoDB is installed locally on your machine:

**Create `.env` file:**
```bash
# Copy the example
copy code\Database\.env.example code\Database\.env
```

**Edit `code/Database/.env`:**
```
NODE_ENV=development
MONGO_LOCAL_URI=mongodb://localhost:27017/damac-hills-2
```

**Start MongoDB:**
```bash
# Windows (if using MongoDB Community Edition)
# MongoDB should be running as a service or via mongod command
mongod
```

### Option 2: MongoDB Atlas (Cloud)

1. **Create Free Account:** https://www.mongodb.com/cloud/atlas
2. **Create Cluster** (free tier available)
3. **Get Connection String:**
   - Click "Connect"
   - Choose "Drivers"
   - Copy connection string
   - Replace `<password>` with your password

4. **Update `.env`:**
```env
MONGO_ATLAS_URI=mongodb+srv://yourUsername:yourPassword@cluster0.xyz.mongodb.net/damac-hills-2?retryWrites=true&w=majority
```

### Option 3: Custom Server

If you have MongoDB hosted on a custom server:

```env
MONGO_CUSTOM_URI=mongodb://username:password@your-server.com:27017/damac-hills-2
```

---

## 🔄 Database Sync

### Sync the JSON Data to MongoDB

**Run the sync script:**

```bash
# Navigate to project directory
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda

# First sync (clean database)
node code/Database/sync-data.js --clean

# Or regular sync (update existing)
node code/Database/sync-data.js
```

**Expected Output:**
```
╔════════════════════════════════════════════╗
║  DAMAC HILLS 2 - MONGODB DATA SYNC         ║
╚════════════════════════════════════════════╝

🔌 Using local MongoDB...
✅ MongoDB Connected Successfully
📊 Database: damac-hills-2
🔗 Host: localhost

✅ Database indexes created
✅ JSON data loaded successfully

📍 Syncing Projects...
✅ Project created: DAMAC Hills 2

🏘️  Syncing Clusters...
✅ Synced 28 clusters

💰 Syncing Pricing Data...
✅ Synced [X] pricing records

✨ Syncing Amenities...
✅ Synced [X] amenities

📍 Syncing Nearby Facilities...
✅ Synced [X] locations

╔════════════════════════════════════════════╗
║  SYNC COMPLETED SUCCESSFULLY               ║
╚════════════════════════════════════════════╝

📊 SYNC SUMMARY:
═════════════════════════════════════════
✅ Projects: 1
✅ Clusters: 28
✅ Amenities: 36
✅ Pricing Records: 9
✅ Locations: 25
⏱️  Duration: 2.5s

✅ No errors!
```

### View Sync Logs

```bash
# Connect to MongoDB and check sync logs
# Using MongoDB Compass or shell:
db.sync_logs.find().sort({ syncDate: -1 })
```

---

## 📚 Using the Data

### Method 1: Direct Service Usage (Recommended)

In your bot code (`index.js`, `main.js`, etc.):

```javascript
// At the top of your file
const { connectToMongoDB, disconnectFromMongoDB } = require('./code/Database/config');
const services = require('./code/Database/services');

// Initialize when bot starts
async function initializeBot() {
  try {
    // Connect to database
    await connectToMongoDB();
    console.log('✅ Bot connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Use in your message handlers
async function handleUserMessage(message) {
  // Query the database
  const pricing = await services.getPricingForBedroom('2BR', 'Apartment');
  // ... use the pricing data
}

// Cleanup when bot stops
async function stopBot() {
  await disconnectFromMongoDB();
}
```

### Method 2: Mongoose Connection

```javascript
const mongoose = require('mongoose');

// Connect directly
await mongoose.connect(process.env.MONGO_LOCAL_URI);

// Use any model
const { Cluster, Pricing, Property } = require('./code/Database/schemas');

const clusters = await Cluster.find();
```

---

## 📖 API Examples

### Get Project Information

```javascript
const { getProjectInfo, getProjectStats } = require('./code/Database/services');

// Get basic project info
const project = await getProjectInfo();
console.log(project.name, project.totalUnits);

// Get complete statistics
const stats = await getProjectStats();
console.log(stats);
// Output:
// {
//   name: "DAMAC Hills 2",
//   totalUnits: 1500,
//   totalClusters: 28,
//   location: {...},
//   developer: {...},
//   amenities: 36
// }
```

### Search Properties

```javascript
const { searchProperties, getPropertiesWithFilters } = require('./code/Database/services');

// Simple search by filters
const apartments = await searchProperties({
  bedrooms: 2,
  propertyType: 'Apartment',
});

// Advanced search with sorting and pagination
const results = await getPropertiesWithFilters(
  {
    bedrooms: 3,
    minPrice: 1000000,
    maxPrice: 1500000,
  },
  {
    sortBy: 'price',
    sortOrder: 1,
    limit: 20,
    skip: 0
  }
);

console.log(`Found ${results.data.length} properties`);
```

### Get Pricing Information

```javascript
const { getPricingForBedroom, getAllPricing, getPriceRange } = require('./code/Database/services');

// Get price for specific unit type
const price2BR = await getPricingForBedroom('2BR', 'Apartment');
console.log(`2BR Average Price: AED ${price2BR.avgPrice.aed}`);

// Get all pricing
const allPricing = await getAllPricing();

// Get price range for property type
const priceRange = await getPriceRange('Apartment');
console.log(priceRange);
// Output:
// {
//   min: 450000,
//   max: 1900000,
//   avg: 1200000
// }
```

### Get Amenities

```javascript
const { getAllAmenities, getAmenitiesByCategory, getAmenitiesSummary } = require('./code/Database/services');

// Get all amenities
const amenities = await getAllAmenities();

// Get specific category
const sports = await getAmenitiesByCategory('Sports');

// Get summary by category
const summary = await getAmenitiesSummary();
// Output:
// [
//   { _id: 'Sports', count: 15, amenities: [...] },
//   { _id: 'Recreation', count: 12, amenities: [...] },
//   ...
// ]
```

### Get Nearby Facilities

```javascript
const { getSchoolsNearby, getHospitalsNearby, getShoppingNearby } = require('./code/Database/services');

// Get nearby schools
const schools = await getSchoolsNearby(5);
schools.forEach(school => {
  console.log(`${school.name} - ${school.distance.km} km away`);
});

// Get nearby hospitals
const hospitals = await getHospitalsNearby(3);

// Get shopping options
const malls = await getShoppingNearby(5);
```

### Cluster Operations

```javascript
const { getAllClusters, getClusterByName, getClustersByAmenity } = require('./code/Database/services');

// Get all clusters
const clusters = await getAllClusters();

// Find specific cluster
const cluster1 = await getClusterByName('One');
console.log(`Cluster ${cluster1.name}: ${cluster1.unitCount} units`);

// Find clusters with specific amenity
const poolClusters = await getClustersByAmenity('Pool');
```

### Analytics & Reporting

```javascript
const { getPropertyStats, getPropertyDistributionByBedroom, getPriceStatistics } = require('./code/Database/services');

// Get property statistics
const stats = await getPropertyStats();
// Output:
// [
//   {
//     _id: 'Apartment',
//     count: 1200,
//     avgPrice: 1200000,
//     minPrice: 450000,
//     maxPrice: 1900000
//   },
//   ...
// ]

// Distribution by bedroom
const bedroomDist = await getPropertyDistributionByBedroom();

// Price statistics
const priceStats = await getPriceStatistics();
```

---

## 💬 WhatsApp Bot Integration Examples

### Example 1: Price Query

```javascript
// User: "How much is a 3BR apartment?"

const services = require('./code/Database/services');

async function handlePriceQuery(bedroomType) {
  const pricing = await services.getPricingForBedroom(bedroomType, 'Apartment');
  
  return `
📍 DAMAC Hills 2 - ${bedroomType} Apartment Pricing

💰 Average Price: AED ${pricing.avgPrice.aed.toLocaleString()}
📐 Average Size: ${pricing.avgSize.sqft} sqft (${pricing.avgSize.sqm} m²)
📊 Available Units: ${pricing.count}
🏠 Rental Yield: ${pricing.rentalRange?.percentage || '4-6'}% annually

  `.trim();
}

// Usage
const response = await handlePriceQuery('3BR');
console.log(response);
```

### Example 2: Cluster Information

```javascript
// User: "Tell me about Cluster 5"

async function handleClusterQuery(clusterNumber) {
  const clusters = await services.getAllClusters();
  const cluster = clusters[clusterNumber - 1];
  
  if (!cluster) return '❌ Cluster not found';
  
  return `
🏘️  ${cluster.name} Details

📊 Total Units: ${cluster.unitCount}
🏠 Unit Types: ${cluster.unitTypes.join(', ')}

✨ Amenities:
${cluster.amenities.map(a => `  • ${a}`).join('\n')}
  `.trim();
}
```

### Example 3: Search Properties

```javascript
// User: "Show me 2BR apartments under 1 million AED"

async function handlePropertySearch(message) {
  const properties = await services.getPropertiesWithFilters(
    {
      bedrooms: 2,
      propertyType: 'Apartment',
      maxPrice: 1000000,
      status: 'Available'
    },
    { limit: 5, sortBy: 'price' }
  );
  
  let response = `Found ${properties.total} properties matching your criteria:\n\n`;
  
  properties.data.forEach((prop, i) => {
    response += `
${i + 1}. Unit ${prop.unitNumber} - ${prop.clusterName}
   Price: AED ${prop.price.aed.toLocaleString()}
   Size: ${prop.size.sqm} m²
    `.trim() + '\n\n';
  });
  
  return response;
}
```

---

## 🔧 Troubleshooting

### Connection Issues

**Error: "MongoDB Connected Failed"**
```javascript
// Check if MongoDB is running
// Windows: Open Task Manager > look for "mongod.exe"
// Linux/Mac: ps aux | grep mongod

// Or check the connection string
// Make sure MONGO_LOCAL_URI is correct:
// mongodb://localhost:27017/damac-hills-2
```

**Error: "MongoServerError: command failed"**
```
• Ensure MongoDB is running
• Check database name is correct
• Verify user has permissions (for Atlas)
```

### Sync Issues

**Error: "JSON file not found"**
```bash
# Ensure DAMAC_HILLS_2_ACCURATE.json exists in project root
# Path should be: C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda\DAMAC_HILLS_2_ACCURATE.json
```

**No data inserted after sync**
```bash
# Check sync logs
# In MongoDB:
db.sync_logs.findOne()

# Look for errors array
```

### Performance Issues

**Slow queries**
```javascript
// Add indexes for frequently searched fields
db.properties.createIndex({ 'price.aed': 1 })
db.properties.createIndex({ bedrooms: 1, propertyType: 1 })

// Use projection to limit fields
Property.find(query, { name: 1, price: 1, size: 1 })
```

**Connection pool exhausted**
```
// Increase connection pool in .env
MONGO_POOL_SIZE=20
```

---

## 📊 Database Schema Overview

### Collections Created

| Collection | Purpose | Records |
|-----------|---------|---------|
| projects | Project metadata | 1 |
| clusters | 28 clusters | 28 |
| properties | Individual properties | ~1500 |
| pricing | Price data by type | 9 |
| amenities | Amenity list | ~40 |
| locations | Nearby facilities | ~50 |
| sync_logs | Sync history | Log entries |

### Key Indexes

- `projects.name` (unique)
- `clusters.clusterId` (unique)
- `properties.propertyCode` (unique)
- `properties.bedrooms`
- `properties.price.aed`
- `properties.status`
- `pricing.bedroomType + propertyType`

---

## 🚀 Next Steps

1. ✅ Install MongoDB (local or Atlas)
2. ✅ Update `.env` with connection string
3. ✅ Run sync script: `node code/Database/sync-data.js --clean`
4. ✅ Test connection in your bot
5. ✅ Integrate services into message handlers
6. ✅ Deploy and monitor

---

## 📞 Quick Commands

```bash
# Check if MongoDB is running
# Windows: netstat -ano | find "27017"

# View database (MongoDB shell)
mongosh  # or mongo (older versions)

# Check database
use damac-hills-2
db.projects.findOne()
db.clusters.find().count()

# Check sync logs
db.sync_logs.findOne()

# Clear database and resync
db.dropDatabase()
node code/Database/sync-data.js --clean
```

---

## 📈 Monitoring

Add this to your bot to monitor database health:

```javascript
const { getConnectionStatus } = require('./code/Database/config');

setInterval(() => {
  const status = getConnectionStatus();
  console.log(`MongoDB: ${status.state} (${status.database})`);
}, 60000); // Every minute
```

---

**All set! Your DAMAC Hills 2 data is now in MongoDB and ready to query!** 🚀
