# Service Layer Quick Reference Guide

## Service Methods Cheat Sheet

### PersonService Methods

```javascript
// Create & Read
PersonService.create(data)                          // Create new person
PersonService.findById(personId)                    // Get person by ID
PersonService.findByEmail(email)                    // Find by email
PersonService.findByMobile(mobile)                  // Find by mobile
PersonService.findByRole(role)                      // Get by role
PersonService.getAll(role?, limit)                  // Get all persons

// Deduplication & Validation
PersonService.deduplicateByEmail(email)             // Get/dedupe by email
PersonService.deduplicateByMobile(mobile)           // Get/dedupe by mobile

// Analytics
PersonService.getStatistics()                       // Get statistics

// Returns: { success, person?, error?, errors? }
```

### PropertyService Methods

```javascript
// Create & Read
PropertyService.createProperty(data)                // Create property
PropertyService.findById(propertyId)                // Get by ID
PropertyService.getFullDetails(propertyId)          // Get with tenant & owners

// Status Management
PropertyService.updateStatus(id, type, value)       // Update status
PropertyService.updateValuation(id, value)          // Update valuation
PropertyService.addImage(id, url, caption)          // Add image

// Filtering & Search
PropertyService.getAvailable(filter)                // Get available
PropertyService.getOccupied(filter)                 // Get occupied
PropertyService.getVacant(filter)                   // Get vacant
PropertyService.getByType(unitType, filter)         // Get by type
PropertyService.getByAreaRange(min, max, filter)    // Get by area
PropertyService.getByValueRange(min, max, filter)   // Get by value
PropertyService.searchInCluster(clusterId, filter)  // Search in cluster

// Analytics
PropertyService.getClusterStats(clusterId)          // Cluster stats
PropertyService.getPortfolioStats()                 // Portfolio stats
PropertyService.delete(propertyId)                  // Delete property

// Returns: { success, property?, properties?, count?, error? }
```

### PropertyTenancyService Methods

```javascript
// Contract Management
PropertyTenancyService.createTenancy(data)          // Create tenancy
PropertyTenancyService.findById(linkId)             // Get tenancy
PropertyTenancyService.updateStatus(linkId, status) // Update status

// Payment Tracking
PropertyTenancyService.recordChequePayment(linkId, data)  // Record payment
PropertyTenancyService.getPaymentTracking(linkId)   // Get payment history
PropertyTenancyService.recordManualPayment(linkId, data)  // Manual payment

// Contract Lifecycle
PropertyTenancyService.renewTenancy(linkId, data)   // Renew contract
PropertyTenancyService.terminateTenancy(linkId, reason) // End contract

// History & Analytics
PropertyTenancyService.getTenantHistory(personId)   // Tenant's contracts
PropertyTenancyService.getPropertyTenancies(propId) // Property's tenancies
PropertyTenancyService.getActive(limit)             // Active tenancies
PropertyTenancyService.getRevenueSummary(propId)    // Revenue tracking
PropertyTenancyService.getStatistics()              // Global statistics

// Returns: { success, tenancy?, count?, payments?, revenue?, error? }
```

### PropertyOwnershipService Methods

```javascript
// Ownership Management
PropertyOwnershipService.createOwnership(data)      // Create ownership
PropertyOwnershipService.findById(linkId)           // Get ownership
PropertyOwnershipService.markAsDisposed(linkId, ...) // Mark sold

// Property Tracking
PropertyOwnershipService.findPropertyOwners(propId) // Get property owners
PropertyOwnershipService.findPersonProperties(personId) // Get person's properties
PropertyOwnershipService.getCoOwners(propertyId)    // Get co-owners

// Valuation & Appreciation
PropertyOwnershipService.updateValuation(linkId, value) // Update valuation

// Analytics
PropertyOwnershipService.getPortfolioStats(personId) // Portfolio stats
PropertyOwnershipService.getActive(limit)           // Active ownerships
PropertyOwnershipService.findFinancedProperties(personId) // Financed props
PropertyOwnershipService.getStatistics()            // Global statistics

// Returns: { success, ownership?, owners?, stats?, count?, error? }
```

### PropertyBuyingService Methods

```javascript
// Purchase Records
PropertyBuyingService.createBuyingRecord(data)      // Create purchase
PropertyBuyingService.findById(linkId)              // Get purchase record
PropertyBuyingService.getAll(filter?, limit)        // Get all purchases

// Payment Management
PropertyBuyingService.recordPayment(linkId, data)   // Record payment
PropertyBuyingService.getPaymentStatus(linkId)      // Payment tracking
PropertyBuyingService.completeTransaction(linkId)   // Complete & create ownership

// History Tracking
PropertyBuyingService.getBuyerPurchases(buyerId)    // Buyer's history
PropertyBuyingService.getSellerSales(sellerId)      // Seller's history
PropertyBuyingService.getPropertySalesHistory(propId) // Property's sales

// Analytics
PropertyBuyingService.getPurchasingPower(buyerId)   // Purchase stats
PropertyBuyingService.getMortgageAnalysis(buyerId)  // Mortgage stats
PropertyBuyingService.getMarketStats()              // Market statistics

// Returns: { success, buying?, purchase?, stats?, total?, error? }
```

### PropertyAgentService Methods

```javascript
// Listing Management
PropertyAgentService.createListing(data)            // Create listing
PropertyAgentService.closeListing(linkId, reason)   // Close listing
PropertyAgentService.findById(linkId)               // Get listing
PropertyAgentService.getActive(limit)               // Active listings

// Transaction Recording
PropertyAgentService.recordSale(linkId, data)       // Record sale
PropertyAgentService.recordRental(linkId, data)     // Record rental

// Commission Management
PropertyAgentService.updateCommission(linkId, rate, notes) // Update commission

// Agent Information
PropertyAgentService.getAgentListings(personId)     // Agent's listings
PropertyAgentService.getPropertyAgents(propertyId)  // Property's agents

// Analytics
PropertyAgentService.getAgentPerformance(personId)  // Performance stats
PropertyAgentService.getCommissionStats()           // Commission statistics

// Returns: { success, listing?, listing[], stats?, count?, error? }
```

### DeveloperService Methods

```javascript
// Developer Management
DeveloperService.create(data)                       // Create developer
DeveloperService.findById(developerId)              // Get developer
DeveloperService.update(id, data)                   // Update developer
DeveloperService.getAll(limit)                      // Get all developers

// Project Management
DeveloperService.getDeveloperProjects(developerId)  // Developer's projects
DeveloperService.getPortfolioStats(developerId)     // Portfolio stats

// Search & Filter
DeveloperService.search(query, limit)               // Search developers
DeveloperService.getByType(type)                    // Get by type
DeveloperService.getStatistics()                    // Statistics

// Returns: { success, developer?, projects?, stats?, count?, error? }
```

### ClusterService Methods

```javascript
// Cluster Management
ClusterService.create(data)                         // Create cluster
ClusterService.findById(clusterId)                  // Get cluster
ClusterService.update(id, data)                     // Update cluster
ClusterService.getAll(limit)                        // Get all clusters

// Inventory & Statistics
ClusterService.getInventory(clusterId)              // Inventory stats
ClusterService.getFinancialSummary(clusterId)       // Financial summary

// Filter & Search
ClusterService.getByEmirate(emirate)                // Get by emirate
ClusterService.getByDeveloper(developerId)          // Get by developer
ClusterService.getByStatus(status)                  // Get by status
ClusterService.getStatistics()                      // Global statistics

// Returns: { success, cluster?, inventory?, summary?, stats?, error? }
```

---

## Response Pattern Reference

```javascript
// Success Response
{
  success: true,
  [entityKey]: { /* entity data */ },
  message?: "Success message"
}

// Error Response
{
  success: false,
  error: "Error message",
  errors?: { /* validation errors */ }
}

// List Response
{
  success: true,
  count: 10,
  [entitiesKey]: [ /* array of entities */ ]
}

// Stats Response
{
  success: true,
  stats: {
    /* statistical data */
  }
}
```

---

## Common Patterns

### Handling Results
```javascript
const result = await PersonService.create(data);

if (result.success) {
  console.log('Created:', result.person);
  // Use the data
} else {
  console.error('Error:', result.error);
  // Handle error
}
```

### Working with Errors
```javascript
const result = await PersonService.create(data);

if (!result.success) {
  if (result.errors) {
    // Validation errors
    console.log('Validation failed:', result.errors);
  } else {
    // Other errors
    console.log('Error:', result.error);
  }
}
```

### Chaining Operations
```javascript
// Create person, then property, then tenancy
const person = await PersonService.create({...});
if (!person.success) throw new Error(person.error);

const property = await PropertyService.createProperty({...});
if (!property.success) throw new Error(property.error);

const tenancy = await PropertyTenancyService.createTenancy({
  personId: person.person._id,
  propertyId: property.property._id,
  ...
});
```

---

## Import Patterns

```javascript
// Import individual services
import { 
  PersonService, 
  PropertyService,
  PropertyTenancyService 
} from './Database/index.js';

// Import everything
import * as DB from './Database/index.js';
const { PersonService } = DB;

// Using default export
import Database from './Database/index.js';
const personService = Database.Services.PersonService;
```

---

## API Endpoint Mapping

| Service | POST | GET | GET /:id | PATCH/PUT |
|---------|------|-----|----------|-----------|
| Person | ✅ /persons | ✅ /persons | ✅ /persons/:id | ✅ /persons/:id |
| Property | ✅ /properties | ✅ /properties | ✅ /properties/:id | ✅ /properties/:id/* |
| Tenancy | ✅ /tenancies | ✅ /tenancies | ✅ /tenancies/:id | ✅ /tenancies/:id/* |
| Ownership | ✅ /ownerships | ✅ /ownerships | ✅ /ownerships/:id | ✅ /ownerships/:id/* |
| Buying | ✅ /buyers/purchase | ✅ /buyers | ✅ /buyers/:id | ✅ /buyers/:id/* |
| Agent | ✅ /agents | ✅ /agents | ✅ /agents/:id | ✅ /agents/:id/* |
| Developer | ✅ /developers | ✅ /developers | ✅ /developers/:id | ✅ /developers/:id |
| Cluster | ✅ /clusters | ✅ /clusters | ✅ /clusters/:id | ✅ /clusters/:id |

---

## Quick Debug Checklist

```javascript
// Is the service imported?
import { PersonService } from './Database/index.js'; ✓

// Is the data valid?
const result = await PersonService.create(data);
console.log(result); // Check success and errors ✓

// Is the ID correct?
const person = await PersonService.findById(personId);
console.log(person); // Check success ✓

// Are relationships set up?
const tenancy = await PropertyTenancyService.createTenancy({
  personId: person._id,      // Check this exists
  propertyId: property._id    // Check this exists
});
```

---

## Performance Tips

```javascript
// Cache frequently accessed data
const cache = new Map();

async function getPersonCached(personId) {
  if (cache.has(personId)) return cache.get(personId);
  const result = await PersonService.findById(personId);
  if (result.success) cache.set(personId, result.person);
  return result;
}

// Batch operations
const promises = personsList.map(p => PersonService.create(p));
const results = await Promise.all(promises);

// Limit results
await PropertyService.getAvailable({ limit: 50 });
```

---

## Validation Errors

Common validation error messages:
- `Invalid email format` → Check email pattern
- `Mobile must start with +971` → Check mobile format
- `Person with this email already exists` → Email is duplicate
- `Property not found` → Check propertyId
- `Cluster not found` → Check clusterId
- `Cannot delete property with active tenancies` → Resolve relationships first

---

## Connection Patterns

```javascript
// Single operation
const result = await PersonService.create(data);

// Multiple operations with error handling
try {
  const results = await Promise.all([
    PersonService.create(data1),
    PropertyService.createProperty(data2),
    DeveloperService.create(data3)
  ]);
  
  if (results.some(r => !r.success)) {
    console.error('Some operations failed');
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

---

**Last Updated:** January 26, 2026
**Version:** 1.0
**Status:** Production Ready ✅
