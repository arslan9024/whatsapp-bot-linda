# Service Layer Implementation Guide

## Overview

The service layer provides a comprehensive business logic abstraction between API routes and database schemas. This ensures code reusability, consistent error handling, and standardized response formats.

## Quick Start Templates

### Person Service

```javascript
import { PersonService } from './Database/index.js';

// Create person
const result = await PersonService.create({
  firstName: 'Ahmed',
  lastName: 'Al-Mansoori',
  arabicName: 'أحمد المنصوري',
  email: 'ahmed@example.com',
  mobile: '+971501234567',
  role: 'Owner',
  emirate: 'Dubai',
  nationality: 'AE',
  idNumber: '784123456789',
  notes: 'Premium client'
});

// Search by email
const result = await PersonService.findByEmail('ahmed@example.com');

// Deduplication
const result = await PersonService.deduplicateByEmail('ahmed@example.com');

// Get statistics
const stats = await PersonService.getStatistics();
```

### Property Service

```javascript
import { PropertyService } from './Database/index.js';

// Create property
const result = await PropertyService.createProperty({
  clusterId: 'CLUSTER-DAM-00001',
  unitNumber: '101',
  unitType: '2BR',
  builtUpArea: 1500,
  plotArea: 2000,
  parkingSpaces: 2,
  furnishingStatus: 'Furnished',
  occupancyStatus: 'vacant',
  availabilityStatus: 'available',
  tier: 'Premium',
  facing: 'North',
  floor: 1,
  estimatedValue: 800000,
  pricePerSqft: 533,
  images: ['https://example.com/img1.jpg']
});

// Get available properties
const available = await PropertyService.getAvailable();

// Get financial summary
const stats = await PropertyService.getPortfolioStats();

// Update status
const result = await PropertyService.updateStatus(
  'PROP-CLUSTER-101',
  'occupancyStatus',
  'occupied'
);
```

### Property Tenancy Service

```javascript
import { PropertyTenancyService } from './Database/index.js';

// Create tenancy contract
const result = await PropertyTenancyService.createTenancy({
  propertyId: 'PROP-CLUSTER-101',
  personId: 'PERSON-123',
  rentAmount: 5000,
  contractStartDate: new Date('2024-01-01'),
  contractEndDate: new Date('2025-01-01'),
  totalCheques: 4,
  paymentSchedule: 'Monthly',
  securityDeposit: 15000,
  agentCommission: 2500
});

// Record cheque payment
const payment = await PropertyTenancyService.recordChequePayment(
  'TENANT-LINK-ID',
  {
    chequeNumber: 'CHQ-12345',
    amount: 5000,
    dueDate: new Date('2024-02-01'),
    bankName: 'Emirates NBD'
  }
);

// Get active tenancies
const active = await PropertyTenancyService.getActive();

// Get payment tracking
const tracking = await PropertyTenancyService.getPaymentTracking('TENANT-LINK-ID');
```

### Property Ownership Service

```javascript
import { PropertyOwnershipService } from './Database/index.js';

// Create ownership
const result = await PropertyOwnershipService.createOwnership({
  personId: 'PERSON-123',
  propertyId: 'PROP-CLUSTER-101',
  ownershipPercentage: 100,
  ownershipType: 'Full Owner',
  acquisitionDate: new Date('2023-01-01'),
  acquisitionPrice: 800000,
  currency: 'AED'
});

// Get property owners
const owners = await PropertyOwnershipService.findPropertyOwners('PROP-CLUSTER-101');

// Get portfolio statistics
const stats = await PropertyOwnershipService.getPortfolioStats('PERSON-123');

// Update valuation
const updated = await PropertyOwnershipService.updateValuation(
  'OWNERSHIP-LINK-ID',
  850000  // new value
);
```

### Property Agent Service

```javascript
import { PropertyAgentService } from './Database/index.js';

// Create listing
const result = await PropertyAgentService.createListing({
  personId: 'AGENT-PERSON-ID',
  propertyId: 'PROP-CLUSTER-101',
  listingPrice: 800000,
  listingType: 'Sale',
  listingStartDate: new Date(),
  listingEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  commissionPercentage: 2.5,
  commissionStructure: 'On Sale'
});

// Record sale
const sale = await PropertyAgentService.recordSale('AGENT-LINK-ID', {
  salePrice: 800000,
  saleDate: new Date(),
  buyerName: 'Mohammed Al-Maktoum'
});

// Get agent performance
const performance = await PropertyAgentService.getAgentPerformance('AGENT-PERSON-ID');
```

### Property Buying Service

```javascript
import { PropertyBuyingService } from './Database/index.js';

// Create buying record
const result = await PropertyBuyingService.createBuyingRecord({
  buyerId: 'BUYER-PERSON-ID',
  sellerId: 'SELLER-PERSON-ID',
  propertyId: 'PROP-CLUSTER-101',
  purchasePrice: 800000,
  currency: 'AED',
  purchaseDate: new Date(),
  downPayment: 250000,
  mortgageAmount: 550000,
  mortgageProvider: 'Emirates NBD',
  mortgageTerm: 20,
  mortgageRate: 3.5
});

// Record payment
const payment = await PropertyBuyingService.recordPayment('BUY-LINK-ID', {
  paymentDate: new Date(),
  amount: 250000,
  paymentType: 'Down payment',
  notes: 'Initial deposit'
});

// Get payment status
const status = await PropertyBuyingService.getPaymentStatus('BUY-LINK-ID');

// Complete transaction
const completed = await PropertyBuyingService.completeTransaction('BUY-LINK-ID');
```

### Developer Service

```javascript
import { DeveloperService } from './Database/index.js';

// Create developer
const result = await DeveloperService.create({
  name: 'DAMAC Properties',
  arabicName: 'داماك البرامج',
  type: 'Public',
  foundedYear: 2002,
  headquarters: 'Dubai',
  email: 'info@damac.ae',
  phone: '+971 4 308 1111',
  website: 'www.damac.ae',
  specialization: 'Luxury Real Estate'
});

// Get developer projects
const projects = await DeveloperService.getDeveloperProjects('DEV-DAMAC-ID');

// Get portfolio statistics
const stats = await DeveloperService.getPortfolioStats('DEV-DAMAC-ID');
```

### Cluster Service

```javascript
import { ClusterService } from './Database/index.js';

// Create cluster
const result = await ClusterService.create({
  developerId: 'DEV-DAMAC-ID',
  name: 'DAMAC Hills 2',
  arabicName: 'تلال داماك 2',
  location: 'Dubailand',
  emirate: 'Dubai',
  area: 'Damac Hills 2',
  launchDate: new Date('2020-01-01'),
  completionStatus: 'completed',
  totalUnits: 2500,
  totalPlotArea: 100000,
  estimatedTotalValue: 2000000000
});

// Get cluster inventory
const inventory = await ClusterService.getInventory('CLUSTER-DAM-ID');

// Get financial summary
const summary = await ClusterService.getFinancialSummary('CLUSTER-DAM-ID');
```

## Response Format

All services return a consistent response format:

```javascript
{
  success: boolean,           // Operation success status
  message?: string,          // Human-readable message
  [dataKey]: object|array,  // Actual data (varies by operation)
  error?: string,           // Error message if success === false
  errors?: object           // Validation errors if applicable
}
```

### Examples

**Success Response:**
```javascript
{
  success: true,
  person: { _id: '...', firstName: 'Ahmed', ... },
  message: 'Person created successfully'
}
```

**Error Response:**
```javascript
{
  success: false,
  error: 'Person with this email already exists'
}
```

**Validation Error Response:**
```javascript
{
  success: false,
  error: 'Validation failed',
  errors: {
    email: 'Invalid email format',
    mobile: 'Mobile must start with +971'
  }
}
```

## API Route Integration Examples

### Creating REST Endpoints

```javascript
import express from 'express';
import { PersonService, PropertyService } from './Database/index.js';

const router = express.Router();

// Create person
router.post('/persons', async (req, res) => {
  const result = await PersonService.create(req.body);
  
  if (result.success) {
    return res.status(201).json(result);
  }
  return res.status(400).json(result);
});

// Get person details
router.get('/persons/:personId', async (req, res) => {
  const result = await PersonService.findById(req.params.personId);
  
  if (result.success) {
    return res.json(result);
  }
  return res.status(404).json(result);
});

// Create property
router.post('/properties', async (req, res) => {
  const result = await PropertyService.createProperty(req.body);
  
  if (result.success) {
    return res.status(201).json(result);
  }
  return res.status(400).json(result);
});

// Get available properties
router.get('/properties/available', async (req, res) => {
  const result = await PropertyService.getAvailable(req.query);
  return res.json(result);
});

export default router;
```

## Error Handling Best Practices

### In Controllers

```javascript
async function createPersonController(req, res) {
  try {
    const result = await PersonService.create(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        errors: result.errors
      });
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
```

### Chaining Operations

```javascript
async function buyPropertyWorkflow(buyerId, sellerId, propertyId, price) {
  try {
    // 1. Create buying record
    const buyingResult = await PropertyBuyingService.createBuyingRecord({
      buyerId,
      sellerId,
      propertyId,
      purchasePrice: price,
      downPayment: price * 0.3,
      mortgageAmount: price * 0.7
    });

    if (!buyingResult.success) {
      return { success: false, error: buyingResult.error };
    }

    const linkId = buyingResult.buying.linkId;

    // 2. Record down payment
    const paymentResult = await PropertyBuyingService.recordPayment(linkId, {
      amount: price * 0.3,
      paymentType: 'Down payment'
    });

    if (!paymentResult.success) {
      return { success: false, error: paymentResult.error };
    }

    // 3. Update property status
    const statusResult = await PropertyService.updateStatus(
      propertyId,
      'availabilityStatus',
      'sold'
    );

    if (!statusResult.success) {
      return { success: false, error: statusResult.error };
    }

    return {
      success: true,
      buyingRecord: buyingResult.buying,
      message: 'Property purchase initiated successfully'
    };
  } catch (error) {
    console.error('Workflow error:', error);
    return { success: false, error: error.message };
  }
}
```

## Performance Considerations

### Caching Results

```javascript
const cache = new Map();

async function getPropertyWithCache(propertyId) {
  const cacheKey = `property-${propertyId}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await PropertyService.findById(propertyId);
  
  if (result.success) {
    cache.set(cacheKey, result);
    // Clear cache after 5 minutes
    setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  }

  return result;
}
```

### Batch Operations

```javascript
async function createMultiplePersons(personsList) {
  const results = [];
  
  for (const personData of personsList) {
    const result = await PersonService.create(personData);
    results.push(result);
  }

  return {
    success: results.every(r => r.success),
    created: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}
```

## Testing Service Layers

### Unit Test Example

```javascript
import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { PersonService } from './Database/index.js';
import { connectDB, disconnectDB } from './test-utils.js';

describe('PersonService', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test('should create a new person', async () => {
    const result = await PersonService.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      mobile: '+971501234567',
      role: 'Owner'
    });

    expect(result.success).toBe(true);
    expect(result.person).toBeDefined();
    expect(result.person.email).toBe('test@example.com');
  });

  test('should reject duplicate email', async () => {
    const email = 'duplicate@example.com';
    
    const first = await PersonService.create({
      firstName: 'First',
      lastName: 'User',
      email,
      mobile: '+971501234567',
      role: 'Owner'
    });

    const second = await PersonService.create({
      firstName: 'Second',
      lastName: 'User',
      email,
      mobile: '+971509876543',
      role: 'Owner'
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.error).toContain('already exists');
  });
});
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  API Routes / Controllers                  │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                          │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │   Person     │  Property    │ PropertyTenant│         │
│  │  Service     │  Service     │    Service    │         │
│  └──────────────┴──────────────┴──────────────┘          │
├─────────────────────────────────────────────────────────┤
│              Helpers & Validators                         │
│  ┌──────────────────────┬──────────────────────┐         │
│  │   ValidationHelper   │    QueryHelper       │         │
│  └──────────────────────┴──────────────────────┘         │
├─────────────────────────────────────────────────────────┤
│                    Mongoose Schemas                       │
│  ┌──────────────┬──────────────┬──────────────┐          │
│  │   Person     │  Property    │ PropertyTenant│         │
│  │   Schema     │  Schema      │    Schema     │         │
│  └──────────────┴──────────────┴──────────────┘          │
├─────────────────────────────────────────────────────────┤
│                   MongoDB Database                       │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Service layer implementation complete
2. 🔄 API route integration (in progress)
3. ⏳ Migration script execution
4. ⏳ Integration testing
5. ⏳ Dashboard update
6. ⏳ Production deployment

## File References

- Service Layer: `/Database/`
  - `PersonService.js`
  - `PropertyService.js`
  - `PropertyTenancyService.js`
  - `PropertyOwnershipService.js`
  - `PropertyBuyingService.js`
  - `PropertyAgentService.js`
  - `DeveloperService.js`
  - `ClusterService.js`

- Schemas: `/Database/`
  - `PersonSchema.js`
  - `PropertySchema.js`
  - All other schema files

- Helpers: `/Database/`
  - `ValidationHelper.js`
  - `QueryHelper.js`

- Central Export: `/Database/index.js`
