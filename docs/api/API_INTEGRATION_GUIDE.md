# DAMAC Hills 2 API Integration Guide
## Practical Examples for WhatsApp Bot Integration

**Purpose**: Integration patterns and examples for Linda WhatsApp Bot  
**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Base URL**: `http://localhost:3000/api`  

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Client Setup](#api-client-setup)
3. [User Patterns](#user-patterns)
4. [Bot Integration Patterns](#bot-integration-patterns)
5. [Practical Examples](#practical-examples)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)

---

## Quick Start

### Initialize API Client

```javascript
import fetch from 'node-fetch';

class DamacApiClient {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
    this.timeout = 5000;
  }

  async request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: this.timeout
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error.message);
      throw error;
    }
  }

  // People endpoints
  async getPeople(page = 1, limit = 20) {
    return this.request('GET', `/people?page=${page}&limit=${limit}`);
  }

  async getPerson(id) {
    return this.request('GET', `/people/${id}`);
  }

  async createPerson(personData) {
    return this.request('POST', '/people', personData);
  }

  // Property endpoints
  async getProperties(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/properties?${params}`);
  }

  async getProperty(id) {
    return this.request('GET', `/properties/${id}`);
  }

  async createProperty(propertyData) {
    return this.request('POST', '/properties', propertyData);
  }

  // Tenancy endpoints
  async getTenancies(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/tenancies?${params}`);
  }

  async createTenancy(tenancyData) {
    return this.request('POST', '/tenancies', tenancyData);
  }

  // Ownership endpoints
  async getOwnerships(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/ownerships?${params}`);
  }

  async createOwnership(ownershipData) {
    return this.request('POST', '/ownerships', ownershipData);
  }

  // Buying endpoints
  async getBuying(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/buying?${params}`);
  }

  async createBuyingInquiry(buyingData) {
    return this.request('POST', '/buying', buyingData);
  }

  // Agent endpoints
  async getAgents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request('GET', `/agents?${params}`);
  }

  async createAgent(agentData) {
    return this.request('POST', '/agents', agentData);
  }
}

export default DamacApiClient;
```

---

## API Client Setup

### Using in Your Bot

```javascript
import DamacApiClient from './DamacApiClient.js';

const apiClient = new DamacApiClient();

// Example: Get all properties
async function listProperties() {
  try {
    const result = await apiClient.getProperties({ status: 'available' });
    return result.data;
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return [];
  }
}
```

---

## User Patterns

### Pattern 1: Find Property by Unit Number

**Bot Command**: "Show property 101A"

```javascript
async function findPropertyByUnit(unitNumber) {
  try {
    const result = await apiClient.getProperties();
    const property = result.data.find(p => p.unitNumber === unitNumber);
    
    if (!property) {
      return 'Property not found';
    }

    return formatPropertyResponse(property);
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function formatPropertyResponse(property) {
  return `
🏠 Property Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Unit: ${property.unitNumber}
🏢 Building: ${property.buildingNumber}
📦 Type: ${property.propertyType}

💰 Price: AED ${property.priceAED.toLocaleString()}
📐 Built-up Area: ${property.builtUpArea} sqft
🛏️ Bedrooms: ${property.bedrooms}
🚿 Bathrooms: ${property.bathrooms}

🔑 Status: ${property.availabilityStatus}
🛋️ Furnishing: ${property.furnishing}
EOF
  `;
}
```

### Pattern 2: Add New Tenant

**Bot Command**: "Add tenant for property 101A"

```javascript
async function addTenant(propertyId, tenantData) {
  try {
    // Create person record if not exists
    const personResult = await apiClient.createPerson({
      firstName: tenantData.firstName,
      lastName: tenantData.lastName,
      email: tenantData.email,
      phone: tenantData.phone
    });

    const tenantId = personResult.data._id;

    // Get landlord ID (default or specified)
    const landlord = await apiClient.getPerson(tenantData.landlordId);

    // Create tenancy record
    const tenancyResult = await apiClient.createTenancy({
      propertyId,
      tenantId,
      landlordId: landlord._id,
      rentPerMonth: tenantData.rentPerMonth,
      contractStartDate: tenantData.startDate,
      contractExpiryDate: tenantData.expiryDate,
      status: 'active'
    });

    return `✅ Tenant added successfully!\nTenancy ID: ${tenancyResult.data._id}`;
  } catch (error) {
    return `❌ Error adding tenant: ${error.message}`;
  }
}
```

### Pattern 3: Check Tenancy Status

**Bot Command**: "Show tenancy for property 101A"

```javascript
async function checkTenancyStatus(propertyId) {
  try {
    const result = await apiClient.getTenancies({ propertyId });
    
    if (result.data.length === 0) {
      return '📭 No active tenancy found';
    }

    const tenancy = result.data[0];
    
    return `
📋 Tenancy Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Tenant: ${tenancy.tenantDetails.tenantName}
📞 Contact: ${tenancy.tenantDetails.tenantPhone}
💰 Rent: AED ${tenancy.rentPerMonth}/month
📅 Start: ${new Date(tenancy.contractStartDate).toLocaleDateString()}
📅 Expiry: ${new Date(tenancy.contractExpiryDate).toLocaleDateString()}
🔄 Status: ${tenancy.status}

💳 Cheques: ${tenancy.chequeDetails?.length || 0} issued
💰 Total Rent: AED ${tenancy.rentPerMonth * 12}/year
    `;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
```

### Pattern 4: List Properties by Cluster

**Bot Command**: "Show properties in DAMAC Hills 2"

```javascript
async function listPropertiesByCluster(clusterName) {
  try {
    const result = await apiClient.getProperties({ cluster: clusterName });
    
    if (result.data.length === 0) {
      return `No properties found in ${clusterName}`;
    }

    let message = `🏘️ Properties in ${clusterName}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    result.data.slice(0, 5).forEach((property, index) => {
      message += `${index + 1}. ${property.unitNumber} - AED ${property.priceAED}\n`;
    });

    if (result.pagination.total > 5) {
      message += `\n📄 Showing 5 of ${result.pagination.total} properties`;
    }

    return message;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
```

---

## Bot Integration Patterns

### Pattern A: Command Router

```javascript
class BotCommandRouter {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.commands = {
      'property': this.handlePropertyCommand.bind(this),
      'tenant': this.handleTenantCommand.bind(this),
      'tenancy': this.handleTenancyCommand.bind(this),
      'ownership': this.handleOwnershipCommand.bind(this),
      'buying': this.handleBuyingCommand.bind(this),
      'agent': this.handleAgentCommand.bind(this)
    };
  }

  async route(message) {
    const [command, action, ...args] = message.toLowerCase().split(' ');
    
    if (this.commands[command]) {
      return await this.commands[command](action, ...args);
    }

    return 'Unknown command. Type "help" for available commands.';
  }

  async handlePropertyCommand(action, ...args) {
    switch (action) {
      case 'list':
        return await this.listProperties(...args);
      case 'get':
        return await this.getPropertyDetails(...args);
      case 'add':
        return 'Please provide property details';
      default:
        return 'Property subcommand not recognized';
    }
  }

  async handleTenancyCommand(action, ...args) {
    switch (action) {
      case 'list':
        return await this.listTenancies(...args);
      case 'add':
        return 'Please provide tenancy details';
      case 'status':
        return await this.getTenancyStatus(...args);
      default:
        return 'Tenancy subcommand not recognized';
    }
  }

  async listProperties(cluster = '') {
    const filters = cluster ? { cluster } : {};
    const result = await this.apiClient.getProperties(filters);
    return this.formatPropertyList(result.data);
  }

  async getPropertyDetails(unitNumber) {
    const result = await this.apiClient.getProperties();
    const property = result.data.find(p => p.unitNumber === unitNumber);
    return property ? this.formatPropertyDetails(property) : 'Property not found';
  }

  formatPropertyList(properties) {
    let text = '🏠 Available Properties\n━━━━━━━━━━━━━━━━━━\n';
    properties.slice(0, 10).forEach((p, i) => {
      text += `${i + 1}. ${p.unitNumber} - AED ${p.priceAED} (${p.bedrooms}BR)\n`;
    });
    return text;
  }

  formatPropertyDetails(property) {
    return `
🏡 ${property.unitNumber}
━━━━━━━━━━━━━━━━━━━━━━━━
Type: ${property.propertyType}
Beds: ${property.bedrooms} | Baths: ${property.bathrooms}
Area: ${property.builtUpArea} sqft
Price: AED ${property.priceAED}
Parking: ${property.parking} spaces
Status: ${property.availabilityStatus}
    `;
  }
}
```

### Pattern B: Conversation State Management

```javascript
class BotConversationManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.userSessions = new Map();
  }

  startSession(userId) {
    this.userSessions.set(userId, {
      step: 'initial',
      data: {},
      createdAt: Date.now()
    });
  }

  async processMessage(userId, message) {
    const session = this.userSessions.get(userId);
    
    if (!session) {
      this.startSession(userId);
      return this.getInitialMessage();
    }

    return await this.handleStep(userId, session, message);
  }

  async handleStep(userId, session, message) {
    switch (session.step) {
      case 'initial':
        session.step = 'ask_property';
        session.data.action = message;
        return `Which property are you interested in?`;

      case 'ask_property':
        session.data.propertyId = message;
        return this.processAction(session.data.action, session.data);

      default:
        return 'Unsupported action';
    }
  }

  async processAction(action, data) {
    switch (action.toLowerCase()) {
      case 'tenancy':
        return await this.createTenancy(data.propertyId);
      case 'view':
        return await this.viewProperty(data.propertyId);
      default:
        return 'Unknown action';
    }
  }

  async createTenancy(propertyId) {
    try {
      const property = await this.apiClient.getProperty(propertyId);
      return `Property: ${property.data.unitNumber}\nReady to add tenant details?`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async viewProperty(propertyId) {
    try {
      const property = await this.apiClient.getProperty(propertyId);
      return this.formatPropertyDetails(property.data);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  formatPropertyDetails(property) {
    return `
📍 ${property.unitNumber}
${property.bedrooms}BR - AED ${property.priceAED}
${property.builtUpArea} sqft
${property.availabilityStatus}
    `;
  }
}
```

---

## Practical Examples

### Example 1: Get Available Properties

```javascript
async function getAvailableProperties() {
  const api = new DamacApiClient();
  
  try {
    const result = await api.getProperties({
      status: 'available',
      limit: 10
    });

    console.log(`Found ${result.pagination.total} available properties`);
    
    result.data.forEach(property => {
      console.log(`${property.unitNumber}: AED ${property.priceAED}`);
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
  }
}
```

### Example 2: Complete Tenancy Creation

```javascript
async function createCompleteTenancy(tenancyInput) {
  const api = new DamacApiClient();

  try {
    // Step 1: Create tenant person
    const tenantResponse = await api.createPerson({
      firstName: tenancyInput.tenantFirstName,
      lastName: tenancyInput.tenantLastName,
      email: tenancyInput.tenantEmail,
      phone: tenancyInput.tenantPhone
    });

    const tenantId = tenantResponse.data._id;
    console.log(`✅ Tenant created: ${tenantId}`);

    // Step 2: Create tenancy record
    const tenancyResponse = await api.createTenancy({
      propertyId: tenancyInput.propertyId,
      tenantId,
      landlordId: tenancyInput.landlordId,
      rentPerMonth: tenancyInput.rentPerMonth,
      contractStartDate: tenancyInput.startDate,
      contractExpiryDate: tenancyInput.expiryDate,
      status: 'active',
      chequeDetails: generateCheques(
        tenancyInput.rentPerMonth,
        tenancyInput.numberOfCheques,
        new Date(tenancyInput.startDate)
      )
    });

    console.log(`✅ Tenancy created: ${tenancyResponse.data._id}`);
    return tenancyResponse.data;

  } catch (error) {
    console.error('Error creating tenancy:', error);
    throw error;
  }
}

function generateCheques(amount, count, startDate) {
  const cheques = [];
  for (let i = 0; i < count; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    cheques.push({
      chequeNumber: `${Date.now()}_${i}`,
      amount,
      dueDate: dueDate.toISOString(),
      status: 'pending'
    });
  }
  return cheques;
}
```

### Example 3: Search and Report

```javascript
async function generatePropertyReport(cluster) {
  const api = new DamacApiClient();

  try {
    const result = await api.getProperties({ cluster });
    
    const report = {
      cluster,
      totalProperties: result.pagination.total,
      availableCount: result.data.filter(p => p.availabilityStatus === 'available').length,
      averagePrice: Math.round(
        result.data.reduce((sum, p) => sum + p.priceAED, 0) / result.data.length
      ),
      properties: result.data.map(p => ({
        unit: p.unitNumber,
        type: p.propertyType,
        bedrooms: p.bedrooms,
        price: p.priceAED,
        status: p.availabilityStatus
      }))
    };

    return report;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}
```

---

## Error Handling

### Retry Logic

```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
const properties = await apiCallWithRetry(() => 
  apiClient.getProperties()
);
```

### Error Response Handling

```javascript
class ApiErrorHandler {
  static handleError(error) {
    if (error.message.includes('404')) {
      return 'Resource not found';
    } else if (error.message.includes('400')) {
      return 'Invalid input provided';
    } else if (error.message.includes('500')) {
      return 'Server error. Please try again later';
    }
    return `Unexpected error: ${error.message}`;
  }
}
```

---

## Performance Optimization

### Caching Strategy

```javascript
class CachedApiClient extends DamacApiClient {
  constructor(baseUrl, cacheDuration = 5 * 60 * 1000) {
    super(baseUrl);
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
  }

  async request(method, endpoint, data = null) {
    const cacheKey = `${method}:${endpoint}`;
    
    if (method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }
    }

    const result = await super.request(method, endpoint, data);

    if (method === 'GET') {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Connection Pooling

```javascript
class ApiClientPool {
  constructor(baseUrl, poolSize = 5) {
    this.baseUrl = baseUrl;
    this.poolSize = poolSize;
    this.clients = Array.from({ length: poolSize }, 
      () => new DamacApiClient(baseUrl)
    );
    this.currentIndex = 0;
  }

  getClient() {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return client;
  }

  async request(method, endpoint, data = null) {
    const client = this.getClient();
    return client.request(method, endpoint, data);
  }
}
```

---

## Testing Integration

```javascript
async function testApiIntegration() {
  const api = new DamacApiClient();

  console.log('Testing API Integration...\n');

  try {
    // Test 1: Get Properties
    console.log('✓ Testing GET /api/properties');
    const properties = await api.getProperties({ limit: 5 });
    console.log(`  Found ${properties.pagination.total} properties\n`);

    // Test 2: Get Single Property
    if (properties.data.length > 0) {
      console.log('✓ Testing GET /api/properties/:id');
      const property = await api.getProperty(properties.data[0]._id);
      console.log(`  Property: ${property.data.unitNumber}\n`);
    }

    // Test 3: Create Person
    console.log('✓ Testing POST /api/people');
    const person = await api.createPerson({
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      phone: '+971501234567'
    });
    console.log(`  Created person: ${person.data._id}\n`);

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}
```

---

## Deployment Checklist

- [ ] API server configured and running
- [ ] MongoDB connection verified
- [ ] All route endpoints tested
- [ ] Error handling implemented
- [ ] Rate limiting configured (optional)
- [ ] CORS settings validated
- [ ] Bot integration tested
- [ ] Caching strategy deployed
- [ ] Performance monitoring active
- [ ] Documentation updated

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Status**: Production Ready ✅
