# API Routes Implementation Guide

## Complete API Routes Blueprint

### File: `/routes/persons.js`

```javascript
import express from 'express';
import { PersonService } from '../Database/index.js';

const router = express.Router();

/**
 * POST /api/persons
 * Create a new person
 */
router.post('/', async (req, res) => {
  try {
    const result = await PersonService.create(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Create person error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create person',
      message: error.message
    });
  }
});

/**
 * GET /api/persons/:personId
 * Get person details
 */
router.get('/:personId', async (req, res) => {
  try {
    const result = await PersonService.findById(req.params.personId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Get person error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch person'
    });
  }
});

/**
 * GET /api/persons/email/:email
 * Find person by email
 */
router.get('/email/:email', async (req, res) => {
  try {
    const result = await PersonService.findByEmail(req.params.email);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Find by email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find person'
    });
  }
});

/**
 * GET /api/persons
 * Get all persons with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { role, limit = 100 } = req.query;
    const result = await PersonService.getAll(role, limit);
    
    return res.json(result);
  } catch (error) {
    console.error('Get all persons error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch persons'
    });
  }
});

/**
 * GET /api/persons/role/:role
 * Get persons by role
 */
router.get('/role/:role', async (req, res) => {
  try {
    const result = await PersonService.getByRole(req.params.role);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch persons by role'
    });
  }
});

/**
 * PUT /api/persons/:personId
 * Update person information
 */
router.put('/:personId', async (req, res) => {
  try {
    const result = await PersonService.update(req.params.personId, req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Update person error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update person'
    });
  }
});

export default router;
```

### File: `/routes/properties.js`

```javascript
import express from 'express';
import { PropertyService } from '../Database/index.js';

const router = express.Router();

/**
 * POST /api/properties
 * Create a new property
 */
router.post('/', async (req, res) => {
  try {
    const result = await PropertyService.createProperty(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create property'
    });
  }
});

/**
 * GET /api/properties/:propertyId
 * Get property full details
 */
router.get('/:propertyId', async (req, res) => {
  try {
    const result = await PropertyService.getFullDetails(req.params.propertyId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch property'
    });
  }
});

/**
 * GET /api/properties
 * Get all properties with filters
 */
router.get('/', async (req, res) => {
  try {
    const { clusterId, unitType, minValue, maxValue } = req.query;
    
    // Apply different filters based on query params
    let result;
    
    if (unitType) {
      result = await PropertyService.getByType(unitType);
    } else if (minValue && maxValue) {
      result = await PropertyService.getByValueRange(minValue, maxValue);
    } else if (clusterId) {
      result = await PropertyService.searchInCluster(clusterId);
    } else {
      result = await PropertyService.getPortfolioStats();
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Get properties error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
});

/**
 * GET /api/properties/available
 * Get available properties
 */
router.get('/available', async (req, res) => {
  try {
    const result = await PropertyService.getAvailable(req.query);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch available properties'
    });
  }
});

/**
 * GET /api/properties/occupied
 * Get occupied properties
 */
router.get('/occupied', async (req, res) => {
  try {
    const result = await PropertyService.getOccupied(req.query);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch occupied properties'
    });
  }
});

/**
 * PATCH /api/properties/:propertyId/status
 * Update property status
 */
router.patch('/:propertyId/status', async (req, res) => {
  try {
    const { statusType, statusValue } = req.body;
    const result = await PropertyService.updateStatus(
      req.params.propertyId,
      statusType,
      statusValue
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Update property status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update property status'
    });
  }
});

/**
 * PATCH /api/properties/:propertyId/valuation
 * Update property valuation
 */
router.patch('/:propertyId/valuation', async (req, res) => {
  try {
    const { newValue } = req.body;
    const result = await PropertyService.updateValuation(req.params.propertyId, newValue);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update valuation'
    });
  }
});

export default router;
```

### File: `/routes/tenancies.js`

```javascript
import express from 'express';
import { PropertyTenancyService } from '../Database/index.js';

const router = express.Router();

/**
 * POST /api/tenancies
 * Create new tenancy
 */
router.post('/', async (req, res) => {
  try {
    const result = await PropertyTenancyService.createTenancy(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Create tenancy error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create tenancy'
    });
  }
});

/**
 * GET /api/tenancies/:linkId
 * Get tenancy details
 */
router.get('/:linkId', async (req, res) => {
  try {
    const result = await PropertyTenancyService.findById(req.params.linkId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tenancy'
    });
  }
});

/**
 * POST /api/tenancies/:linkId/payment
 * Record cheque payment
 */
router.post('/:linkId/payment', async (req, res) => {
  try {
    const result = await PropertyTenancyService.recordChequePayment(
      req.params.linkId,
      req.body
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
});

/**
 * GET /api/tenancies/:linkId/payments
 * Get payment tracking
 */
router.get('/:linkId/payments', async (req, res) => {
  try {
    const result = await PropertyTenancyService.getPaymentTracking(req.params.linkId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment tracking'
    });
  }
});

/**
 * GET /api/tenancies/person/:personId
 * Get person's tenancy history
 */
router.get('/person/:personId', async (req, res) => {
  try {
    const result = await PropertyTenancyService.getTenantHistory(req.params.personId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant history'
    });
  }
});

/**
 * GET /api/tenancies/property/:propertyId
 * Get property's tenancy history
 */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const result = await PropertyTenancyService.getPropertyTenancies(req.params.propertyId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch property tenancies'
    });
  }
});

export default router;
```

### File: `/routes/ownerships.js`

```javascript
import express from 'express';
import { PropertyOwnershipService } from '../Database/index.js';

const router = express.Router();

/**
 * POST /api/ownerships
 * Create ownership record
 */
router.post('/', async (req, res) => {
  try {
    const result = await PropertyOwnershipService.createOwnership(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Create ownership error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create ownership'
    });
  }
});

/**
 * GET /api/ownerships/:linkId
 * Get ownership details
 */
router.get('/:linkId', async (req, res) => {
  try {
    const result = await PropertyOwnershipService.findById(req.params.linkId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ownership'
    });
  }
});

/**
 * GET /api/ownerships/property/:propertyId
 * Get property owners
 */
router.get('/property/:propertyId', async (req, res) => {
  try {
    const result = await PropertyOwnershipService.findPropertyOwners(req.params.propertyId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch property owners'
    });
  }
});

/**
 * GET /api/ownerships/person/:personId
 * Get person's properties
 */
router.get('/person/:personId', async (req, res) => {
  try {
    const result = await PropertyOwnershipService.findPersonProperties(req.params.personId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch person properties'
    });
  }
});

/**
 * GET /api/ownerships/person/:personId/portfolio
 * Get portfolio statistics
 */
router.get('/person/:personId/portfolio', async (req, res) => {
  try {
    const result = await PropertyOwnershipService.getPortfolioStats(req.params.personId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio stats'
    });
  }
});

/**
 * PATCH /api/ownerships/:linkId/valuation
 * Update property valuation
 */
router.patch('/:linkId/valuation', async (req, res) => {
  try {
    const { newValue, valuationDate } = req.body;
    const result = await PropertyOwnershipService.updateValuation(
      req.params.linkId,
      newValue,
      valuationDate
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update valuation'
    });
  }
});

export default router;
```

### File: `/routes/buyers.js` (PropertyBuying)

```javascript
import express from 'express';
import { PropertyBuyingService } from '../Database/index.js';

const router = express.Router();

/**
 * POST /api/buyers/purchase
 * Create buying record
 */
router.post('/purchase', async (req, res) => {
  try {
    const result = await PropertyBuyingService.createBuyingRecord(req.body);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Create buying record error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create buying record'
    });
  }
});

/**
 * POST /api/buyers/:linkId/payment
 * Record payment
 */
router.post('/:linkId/payment', async (req, res) => {
  try {
    const result = await PropertyBuyingService.recordPayment(
      req.params.linkId,
      req.body
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
});

/**
 * GET /api/buyers/:linkId/payment-status
 * Get payment status
 */
router.get('/:linkId/payment-status', async (req, res) => {
  try {
    const result = await PropertyBuyingService.getPaymentStatus(req.params.linkId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

/**
 * GET /api/buyers/person/:buyerId
 * Get buyer's purchase history
 */
router.get('/person/:buyerId', async (req, res) => {
  try {
    const result = await PropertyBuyingService.getBuyerPurchases(req.params.buyerId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases'
    });
  }
});

/**
 * POST /api/buyers/:linkId/complete
 * Complete transaction
 */
router.post('/:linkId/complete', async (req, res) => {
  try {
    const result = await PropertyBuyingService.completeTransaction(req.params.linkId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to complete transaction'
    });
  }
});

export default router;
```

### File: `/app.js` (Main Express Setup)

```javascript
import express from 'express';
import mongoose from 'mongoose';

// Import route handlers
import personRoutes from './routes/persons.js';
import propertyRoutes from './routes/properties.js';
import tenancyRoutes from './routes/tenancies.js';
import ownershipRoutes from './routes/ownerships.js';
import buyerRoutes from './routes/buyers.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Routes
app.use('/api/persons', personRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/ownerships', ownershipRoutes);
app.use('/api/buyers', buyerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default app;
```

## API Endpoint Summary

### Persons
- `POST /api/persons` - Create person
- `GET /api/persons` - Get all persons
- `GET /api/persons/:personId` - Get person details
- `GET /api/persons/email/:email` - Find by email
- `GET /api/persons/role/:role` - Get by role
- `PUT /api/persons/:personId` - Update person

### Properties
- `POST /api/properties` - Create property
- `GET /api/properties` - Get all/filtered properties
- `GET /api/properties/:propertyId` - Get property details
- `GET /api/properties/available` - Get available properties
- `GET /api/properties/occupied` - Get occupied properties
- `PATCH /api/properties/:propertyId/status` - Update status
- `PATCH /api/properties/:propertyId/valuation` - Update valuation

### Tenancies
- `POST /api/tenancies` - Create tenancy
- `GET /api/tenancies/:linkId` - Get tenancy details
- `POST /api/tenancies/:linkId/payment` - Record payment
- `GET /api/tenancies/:linkId/payments` - Get payment tracking
- `GET /api/tenancies/person/:personId` - Get tenant history
- `GET /api/tenancies/property/:propertyId` - Get property tenancies

### Ownerships
- `POST /api/ownerships` - Create ownership
- `GET /api/ownerships/:linkId` - Get ownership details
- `GET /api/ownerships/property/:propertyId` - Get property owners
- `GET /api/ownerships/person/:personId` - Get person's properties
- `GET /api/ownerships/person/:personId/portfolio` - Get portfolio stats
- `PATCH /api/ownerships/:linkId/valuation` - Update valuation

### Buyers/Purchasing
- `POST /api/buyers/purchase` - Create buying record
- `POST /api/buyers/:linkId/payment` - Record payment
- `GET /api/buyers/:linkId/payment-status` - Get payment status
- `GET /api/buyers/person/:buyerId` - Get purchase history
- `POST /api/buyers/:linkId/complete` - Complete transaction

## Testing API Endpoints

### cURL Examples

```bash
# Create person
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmed",
    "lastName": "Al-Mansoori",
    "email": "ahmed@example.com",
    "mobile": "+971501234567",
    "role": "Owner"
  }'

# Get available properties
curl http://localhost:3000/api/properties/available

# Create tenancy
curl -X POST http://localhost:3000/api/tenancies \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROP-CLUSTER-101",
    "personId": "PERSON-123",
    "rentAmount": 5000,
    "contractStartDate": "2024-01-01",
    "contractEndDate": "2025-01-01",
    "totalCheques": 4
  }'
```

## Next Steps

1. ✅ Service layer complete
2. ✅ API routes blueprint created
3. 🔄 Implement routes in actual project
4. ⏳ Add authentication/authorization middleware
5. ⏳ Add request validation
6. ⏳ Add rate limiting
7. ⏳ Deploy to production
