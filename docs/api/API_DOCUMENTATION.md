# DAMAC Hills 2 API Documentation
## Complete Reference for All Endpoints

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: 2024  
**Base URL**: `http://localhost:3000`  

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [People Endpoints](#people-endpoints)
5. [Property Endpoints](#property-endpoints)
6. [Tenancy Endpoints](#tenancy-endpoints)
7. [Ownership Endpoints](#ownership-endpoints)
8. [Buying Endpoints](#buying-endpoints)
9. [Agent Endpoints](#agent-endpoints)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)

---

## Getting Started

### Server Health Check

Verify the API server is running:

```bash
curl http://localhost:3000/health
```

Expected Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "uptime": 3600,
  "mongodb": "connected",
  "environment": "production"
}
```

### API Version

Get API version information:

```bash
curl http://localhost:3000/api/version
```

Response:
```json
{
  "version": "1.0.0",
  "name": "DAMAC Hills 2 Property Management API",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Authentication

Currently, the API does not require authentication. Future versions may implement:
- JWT token-based authentication
- API key authentication
- Role-based access control (RBAC)

---

## Response Format

All API responses follow a standard format:

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### List Response with Pagination
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## People Endpoints

### List All People

**Endpoint**: `GET /api/people`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `firstName` (string): Filter by first name
- `lastName` (string): Filter by last name
- `email` (string): Filter by email

**Example**:
```bash
curl "http://localhost:3000/api/people?page=1&limit=20"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "Ahmed",
      "lastName": "Al-Mansouri",
      "email": "ahmed.mansouri@example.com",
      "phone": "+971501234567",
      "emiratesId": "123456789012345",
      "nationality": "AE",
      "createdAt": "2024-01-15T10:30:45.123Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Get Single Person

**Endpoint**: `GET /api/people/:id`

**Parameters**:
- `id` (string): Person MongoDB ObjectId

**Example**:
```bash
curl http://localhost:3000/api/people/507f1f77bcf86cd799439011
```

### Create Person

**Endpoint**: `POST /api/people`

**Request Body**:
```json
{
  "firstName": "Ahmed",
  "lastName": "Al-Mansouri",
  "email": "ahmed.mansouri@example.com",
  "phone": "+971501234567",
  "emiratesId": "123456789012345",
  "nationality": "AE",
  "address": "Dubai, UAE",
  "role": "buyer"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmed",
    "lastName": "Al-Mansouri",
    "email": "ahmed.mansouri@example.com",
    "phone": "+971501234567",
    "emiratesId": "123456789012345",
    "nationality": "AE"
  }'
```

### Update Person

**Endpoint**: `PUT /api/people/:id`

**Example**:
```bash
curl -X PUT http://localhost:3000/api/people/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "phone": "+971509876543"
  }'
```

### Delete Person

**Endpoint**: `DELETE /api/people/:id`

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/people/507f1f77bcf86cd799439011
```

---

## Property Endpoints

### List All Properties

**Endpoint**: `GET /api/properties`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `cluster` (string): Filter by cluster name
- `status` (string): Filter by status (available, rented, sold)
- `type` (string): Filter by type (apartment, villa, townhouse)
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price

**Example**:
```bash
curl "http://localhost:3000/api/properties?cluster=DAMAC%20Hills&status=available"
```

### Get Single Property

**Endpoint**: `GET /api/properties/:id`

### Create Property

**Endpoint**: `POST /api/properties`

**Request Body**:
```json
{
  "unitNumber": "101A",
  "buildingNumber": "B5",
  "cluster": "DAMAC Hills 2",
  "propertyType": "apartment",
  "bedrooms": 2,
  "bathrooms": 2,
  "builtUpArea": 1500,
  "carpetArea": 1200,
  "priceAED": 750000,
  "pricePerSqft": 500,
  "furnishing": "semi-furnished",
  "occupancyStatus": "vacant",
  "availabilityStatus": "available",
  "parking": 2,
  "amenities": ["gym", "pool", "parking"],
  "imageUrls": ["https://example.com/image1.jpg"],
  "developer": "DAMAC Properties",
  "serviceCharge": 1200
}
```

### Update Property

**Endpoint**: `PUT /api/properties/:id`

### Delete Property

**Endpoint**: `DELETE /api/properties/:id`

### Get Properties by Cluster

**Endpoint**: `GET /api/properties/cluster/:clusterName`

---

## Tenancy Endpoints

### List All Tenancies

**Endpoint**: `GET /api/tenancies`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `propertyId` (string): Filter by property
- `tenantId` (string): Filter by tenant
- `status` (string): Filter by status (active, expired, terminated)

**Example**:
```bash
curl "http://localhost:3000/api/tenancies?status=active"
```

### Get Single Tenancy

**Endpoint**: `GET /api/tenancies/:id`

### Create Tenancy

**Endpoint**: `POST /api/tenancies`

**Request Body**:
```json
{
  "propertyId": "507f1f77bcf86cd799439011",
  "tenantId": "507f1f77bcf86cd799439012",
  "landlordId": "507f1f77bcf86cd799439013",
  "rentPerMonth": 5000,
  "securityDeposit": 15000,
  "contractStartDate": "2024-01-15",
  "contractExpiryDate": "2025-01-15",
  "agreementUrl": "https://example.com/agreement.pdf",
  "status": "active",
  "chequeDetails": [
    {
      "chequeNumber": "123456",
      "amount": 5000,
      "dueDate": "2024-02-15",
      "status": "pending"
    }
  ],
  "rentalPaymentSchedule": {
    "frequency": "monthly",
    "dueDate": 1,
    "totalPayments": 12,
    "paidPayments": 0
  },
  "tenantDetails": {
    "tenantName": "Ahmed Al-Mansouri",
    "tenantEmail": "tenant@example.com",
    "tenantPhone": "+971501234567"
  },
  "landlordDetails": {
    "landlordName": "Mohammed Al-Khalifa",
    "landlordEmail": "landlord@example.com",
    "landlordPhone": "+971509876543"
  }
}
```

### Update Tenancy

**Endpoint**: `PUT /api/tenancies/:id`

### Delete Tenancy

**Endpoint**: `DELETE /api/tenancies/:id`

### Get Properties by Tenant

**Endpoint**: `GET /api/tenancies/tenant/:tenantId`

### Get Properties by Landlord

**Endpoint**: `GET /api/tenancies/landlord/:landlordId`

---

## Ownership Endpoints

### List All Ownerships

**Endpoint**: `GET /api/ownerships`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `propertyId` (string): Filter by property
- `ownerId` (string): Filter by owner

**Example**:
```bash
curl "http://localhost:3000/api/ownerships?page=1&limit=20"
```

### Get Single Ownership

**Endpoint**: `GET /api/ownerships/:id`

### Create Ownership

**Endpoint**: `POST /api/ownerships`

**Request Body**:
```json
{
  "propertyId": "507f1f77bcf86cd799439011",
  "ownerId": "507f1f77bcf86cd799439012",
  "ownershipPercentage": 100,
  "acquisitionDate": "2023-01-15",
  "acquisitionPrice": 750000,
  "currentValue": 800000,
  "titleDeedNumber": "TD123456",
  "registrationDate": "2023-01-20"
}
```

### Update Ownership

**Endpoint**: `PUT /api/ownerships/:id`

### Delete Ownership

**Endpoint**: `DELETE /api/ownerships/:id`

### Get Properties by Owner

**Endpoint**: `GET /api/ownerships/owner/:ownerId`

---

## Buying Endpoints

### List All Buying Inquiries

**Endpoint**: `GET /api/buying`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `propertyId` (string): Filter by property
- `buyerId` (string): Filter by buyer
- `status` (string): Filter by status (inquiry, interested, under-offer, sold)

**Example**:
```bash
curl "http://localhost:3000/api/buying?status=interested"
```

### Get Single Buying Inquiry

**Endpoint**: `GET /api/buying/:id`

### Create Buying Inquiry

**Endpoint**: `POST /api/buying`

**Request Body**:
```json
{
  "propertyId": "507f1f77bcf86cd799439011",
  "buyerId": "507f1f77bcf86cd799439012",
  "inquiryDate": "2024-01-15",
  "offeredPrice": 700000,
  "status": "inquiry",
  "condition": "immediate",
  "inspectionScheduled": false,
  "financingRequired": true,
  "buyerNotes": "Interested in viewing"
}
```

### Update Buying Inquiry

**Endpoint**: `PUT /api/buying/:id`

### Delete Buying Inquiry

**Endpoint**: `DELETE /api/buying/:id`

### Get Inquiries for Property

**Endpoint**: `GET /api/buying/property/:propertyId`

---

## Agent Endpoints

### List All Agent Assignments

**Endpoint**: `GET /api/agents`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `propertyId` (string): Filter by property
- `agentId` (string): Filter by agent

**Example**:
```bash
curl "http://localhost:3000/api/agents?page=1&limit=20"
```

### Get Single Agent Assignment

**Endpoint**: `GET /api/agents/:id`

### Create Agent Assignment

**Endpoint**: `POST /api/agents`

**Request Body**:
```json
{
  "propertyId": "507f1f77bcf86cd799439011",
  "agentId": "507f1f77bcf86cd799439012",
  "commissionPercentage": 2.5,
  "assignmentDate": "2024-01-15",
  "endDate": null,
  "notes": "Primary listing agent"
}
```

### Update Agent Assignment

**Endpoint**: `PUT /api/agents/:id`

### Delete Agent Assignment

**Endpoint**: `DELETE /api/agents/:id`

### Get Agents for Property

**Endpoint**: `GET /api/agents/property/:propertyId`

### Get Properties for Agent

**Endpoint**: `GET /api/agents/agent/:agentId`

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Example |
|-------------|---------|---------|
| 200 | OK | Successful GET, PUT request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 500 | Server Error | Database error |

### Error Response Examples

**Missing Required Field**:
```json
{
  "success": false,
  "error": "Missing required fields: firstName, lastName",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Resource Not Found**:
```json
{
  "success": false,
  "error": "Person not found",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Validation Error**:
```json
{
  "success": false,
  "error": "Validation error",
  "details": ["Email format is invalid"],
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Rate Limiting

Currently, the API has no rate limiting implemented. Future versions may implement:
- Request per minute limits
- API key-based throttling
- User-based rate limits

---

## Integration with WhatsApp Bot

To integrate these endpoints with the WhatsApp bot:

```javascript
// Example: Get property by ID
async function getProperty(propertyId) {
  const response = await fetch(
    `http://localhost:3000/api/properties/${propertyId}`
  );
  const data = await response.json();
  return data.data;
}

// Example: Create tenancy
async function createTenancy(tenancyData) {
  const response = await fetch(
    'http://localhost:3000/api/tenancies',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenancyData)
    }
  );
  return response.json();
}
```

---

## Testing with cURL

### Create Test Data

```bash
# Create a person
curl -X POST http://localhost:3000/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Ahmed",
    "lastName":"Al-Mansouri",
    "email":"test@example.com",
    "phone":"+971501234567",
    "emiratesId":"123456789012345"
  }'

# Create a property
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "unitNumber":"101A",
    "cluster":"DAMAC Hills 2",
    "propertyType":"apartment",
    "bedrooms":2,
    "priceAED":750000,
    "availabilityStatus":"available"
  }'
```

---

## Support & Troubleshooting

For issues or questions:
1. Check server health: `curl http://localhost:3000/health`
2. Verify MongoDB connection: Check server logs
3. Review error messages in response
4. Check API_ROUTES_GUIDE.md for implementation details

---

**Last Updated**: 2024-01-15  
**Maintained By**: Development Team  
**Status**: Production Ready ✅
