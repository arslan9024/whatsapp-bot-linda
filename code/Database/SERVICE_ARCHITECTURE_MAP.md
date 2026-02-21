# Service Architecture & Relationships

## 🏗️ Complete Service Architecture Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS API LAYER (Phase 3)                       │
│                      40+ HTTP Endpoints                                  │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Phase 2 - COMPLETE)                   │
│                        79 Business Logic Methods                         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  CORE ENTITY SERVICES                                            │  │
│  │  ┌──────────────────┬──────────────────┬──────────────────┐    │  │
│  │  │ PersonService    │ PropertyService  │ ClusterService   │    │  │
│  │  │   9 methods      │   11 methods     │   9 methods      │    │  │
│  │  └──────────────────┴──────────────────┴──────────────────┘    │  │
│  │  ┌──────────────────┬──────────────────┐                      │  │
│  │  │ DeveloperService │ PropertyService  │                      │  │
│  │  │   7 methods      │   (see above)    │                      │  │
│  │  └──────────────────┴──────────────────┘                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  RELATIONSHIP/LINKING SERVICES (Many-to-Many, Contracts, etc)  │  │
│  │  ┌──────────────────┬──────────────────┬──────────────────┐    │  │
│  │  │ PropertyTenancy  │ PropertyOwner-   │ PropertyBuying   │    │  │
│  │  │ Service          │ shipService      │ Service          │    │  │
│  │  │  12 methods      │  10 methods      │  10 methods      │    │  │
│  │  │  (Contracts)     │  (Portfolio)     │  (Purchases)     │    │  │
│  │  └──────────────────┴──────────────────┴──────────────────┘    │  │
│  │  ┌──────────────────┐                                           │  │
│  │  │ PropertyAgent    │                                           │  │
│  │  │ Service          │                                           │  │
│  │  │  11 methods      │                                           │  │
│  │  │  (Commissions)   │                                           │  │
│  │  └──────────────────┘                                           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────────────────┐
│            HELPER LAYER (Phase 1 - Existing)                           │
│  ┌──────────────────────────┬──────────────────────────┐             │
│  │   ValidationHelper       │     QueryHelper          │             │
│  │  - Input validation      │  - Aggregation queries   │             │
│  │  - Schema checking       │  - Complex filters       │             │
│  │  - Format validation     │  - Statistics generation │             │
│  └──────────────────────────┴──────────────────────────┘             │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────────────────┐
│              MONGOOSE SCHEMAS (11 Collections)                         │
│                                                                         │
│  REFERENCE SCHEMAS:      CORE SCHEMAS:       LINKING SCHEMAS:         │
│  ├─ FurnishingStatus     ├─ Person           ├─ PropertyOwnership    │
│  ├─ OccupancyStatus      ├─ Property         ├─ PropertyTenancy      │
│  ├─ AvailabilityStatus   ├─ Developer        ├─ PropertyBuying       │
│  │                       └─ Cluster          └─ PropertyAgent        │
│  └─ (Enum collections)                                               │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │
┌─────────────────▼──────────────────────────────────────────────────────┐
│                      MONGODB DATABASE                                   │
│             (Normalized, Relational Model)                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Service Interaction Matrix

### PersonService ↔ Other Services

```
PersonService
    ├─ Used By: PropertyTenancyService (tenant tracking)
    ├─ Used By: PropertyOwnershipService (owner tracking)
    ├─ Used By: PropertyBuyingService (buyer/seller tracking)
    ├─ Used By: PropertyAgentService (agent tracking)
    └─ CRUD Operations: Create, Read, Find, Deduplicate
```

### PropertyService ↔ Other Services

```
PropertyService
    ├─ Used By: PropertyTenancyService (property-tenant linking)
    ├─ Used By: PropertyOwnershipService (property-owner linking)
    ├─ Used By: PropertyBuyingService (property purchase tracking)
    ├─ Used By: PropertyAgentService (property listing)
    ├─ Linked To: ClusterService (inventory management)
    └─ CRUD Operations: Create, Read, Search, Update Status
```

### PropertyTenancyService ↔ Other Services

```
PropertyTenancyService
    ├─ Manages: Rental contracts
    ├─ Tracks: Tenant references to PersonService
    ├─ Tracks: Property references to PropertyService
    ├─ Records: Cheque payments and manual payments
    ├─ Calculates: Revenue from PropertyService
    └─ Lifecycle: Contract creation → Payment tracking → Renewal/Termination
```

### PropertyOwnershipService ↔ Other Services

```
PropertyOwnershipService
    ├─ Manages: Property ownership records
    ├─ Tracks: Owner references to PersonService
    ├─ Tracks: Property references to PropertyService
    ├─ Tracks: Valuation and appreciation
    ├─ Handles: Co-ownership scenarios
    └─ Features: Portfolio analytics, Disposal recording
```

### PropertyBuyingService ↔ Other Services

```
PropertyBuyingService
    ├─ Manages: Property purchase transactions
    ├─ Tracks: Buyer & Seller references to PersonService
    ├─ Tracks: Property references to PropertyService
    ├─ Records: Payment schedules and mortgages
    ├─ Creates: PropertyOwnershipService records on completion
    └─ Analytics: Purchasing power, Mortgage analysis
```

### PropertyAgentService ↔ Other Services

```
PropertyAgentService
    ├─ Manages: Property agent listings
    ├─ Tracks: Agent references to PersonService
    ├─ Tracks: Property references to PropertyService
    ├─ Records: Sales and rental transactions
    ├─ Calculates: Commission amounts and tracking
    └─ Analytics: Agent performance, Commission reports
```

### DeveloperService ↔ ClusterService

```
DeveloperService
    ├─ Manages: Developer information
    ├─ Linked To: ClusterService (projects created by developers)
    └─ Analytics: Portfolio of projects
        └─ ClusterService
            ├─ Manages: Community/Cluster information
            ├─ Tracks: Developer reference
            ├─ Contains: Properties via PropertyService
            └─ Analytics: Inventory, Financial summary
```

---

## 🔄 Data Flow Examples

### Scenario 1: Complete Rental Workflow

```
1. CREATE PERSON (Tenant)
   PersonService.create()
   
2. CREATE PROPERTY
   PropertyService.createProperty()
   
3. CREATE TENANCY CONTRACT
   PropertyTenancyService.createTenancy()
   └─ Links: PersonService + PropertyService
   
4. RECORD CHEQUE PAYMENTS
   PropertyTenancyService.recordChequePayment() x 4
   
5. TRACK REVENUE
   PropertyTenancyService.getRevenueSummary()
   
6. RENEW/TERMINATE CONTRACT
   PropertyTenancyService.renewTenancy()
   PropertyTenancyService.terminateTenancy()
   
7. UPDATE PROPERTY STATUS
   PropertyService.updateStatus(occupancyStatus: 'vacant')
```

### Scenario 2: Complete Purchase Workflow

```
1. CREATE BUYER & SELLER (Persons)
   PersonService.create() x 2
   
2. CREATE PROPERTY
   PropertyService.createProperty()
   
3. CREATE BUYING RECORD
   PropertyBuyingService.createBuyingRecord()
   └─ Links: PersonService (buyer/seller) + PropertyService
   
4. RECORD DOWN PAYMENT
   PropertyBuyingService.recordPayment()
   
5. RECORD CHEQUE INSTALLMENTS
   PropertyBuyingService.recordPayment() x N
   
6. VERIFY PAYMENT STATUS
   PropertyBuyingService.getPaymentStatus()
   
7. COMPLETE TRANSACTION
   PropertyBuyingService.completeTransaction()
   └─ Creates: PropertyOwnershipService record
   
8. UPDATE PROPERTY STATUS
   PropertyService.updateStatus(availabilityStatus: 'sold')
```

### Scenario 3: Agent Commission Tracking

```
1. CREATE AGENT (Person)
   PersonService.create()
   
2. CREATE PROPERTY LISTING
   PropertyAgentService.createListing()
   └─ Links: PersonService (agent) + PropertyService
   
3. RECORD SALE/RENTAL TRANSACTION
   PropertyAgentService.recordSale()
   PropertyAgentService.recordRental()
   
4. CALCULATE COMMISSION
   Automatic in service: commission = price × percentage
   
5. GET COMMISSION STATISTICS
   PropertyAgentService.getCommissionStats()
   PropertyAgentService.getAgentPerformance()
```

### Scenario 4: Portfolio Management

```
1. CREATE OWNER (Person)
   PersonService.create()
   
2. CREATE MULTIPLE PROPERTIES
   PropertyService.createProperty() x N
   
3. CREATE OWNERSHIP RECORDS
   PropertyOwnershipService.createOwnership() x N
   
4. UPDATE VALUATIONS
   PropertyOwnershipService.updateValuation() x N
   
5. GET PORTFOLIO STATISTICS
   PropertyOwnershipService.getPortfolioStats()
   └─ Returns: Total value, Appreciation, Property count
   
6. GET FINANCIAL SUMMARY
   ClusterService.getFinancialSummary()
   └─ Returns: Cluster-level financial data
```

---

## 🔑 Key Entity Relationships

### Person → Multiple Roles

```
┌─────────────────────────────────────────────────────┐
│                    PERSON                            │
│  (firstName, lastName, email, mobile, role, etc)    │
└──────┬──────────────┬──────────────┬────────────────┘
       │ As Owner      │ As Tenant    │ As Agent
       │              │              │
       ▼              ▼              ▼
PropertyOwnership  PropertyTenancy  PropertyAgent
(Ownership%)      (Rent tracking)   (Commissions)
```

### Property → Multiple Relationships

```
┌──────────────────────────────────────────┐
│           PROPERTY                        │
│  (Unit, Type, Area, Value, Status, etc)  │
└──┬────────────┬─────────────┬────────────┘
   │ Owned By   │ Rented To  │ Listed By
   │            │            │
   ▼            ▼            ▼
PropertyOwner  PropertyTenancy  PropertyAgent
ship           (Contract)       (Commission)
(Portfolio)    (Payments)       (Transaction)
```

### Cluster → Community Structure

```
┌──────────────────────────────────────────┐
│         CLUSTER / COMMUNITY               │
│  (Name, Location, Developer, etc)        │
└──────┬──────────────────────┬────────────┘
       │ Contains              │ Built By
       │ Many Properties       │
       ▼                       ▼
    Property            Developer
(Inventory)            (Projects)
```

---

## 📈 Analytics & Reporting Capabilities

### By Service

```
PersonService
└─ Statistics: Count by role, Email duplicates

PropertyService
├─ Occupancy Rate: Occupied / Total
├─ Availability: Available / Total
├─ Portfolio Value: Sum of valuations
├─ By Type: Count by unit type
└─ By Tier: Luxury/Standard breakdown

PropertyTenancyService
├─ Revenue: Monthly/Annual rent income
├─ Payment Status: Collected/Pending
├─ Contract Status: Active/Expired
└─ Tenant Turnover: New/Returned tenants

PropertyOwnershipService
├─ Portfolio Value: Current value
├─ Appreciation: Value increase
├─ Leverage: Financed vs owned
└─ Co-ownership: Multi-owner properties

PropertyBuyingService
├─ Total Invested: Sum purchases
├─ Purchasing Power: Avg purchase price
├─ Financing: Total mortgages
└─ Success Rate: Completed transactions

PropertyAgentService
├─ Commission Earned: Total commissions
├─ Active Listings: Ongoing sales
├─ Transaction Count: Sales + Rentals
└─ Performance: Commission per agent

DeveloperService
├─ Project Count: Total projects
├─ Total Units: Sum of all units
├─ Portfolio Value: Sum valuations
└─ Project Status: By completion stage

ClusterService
├─ Occupancy Stats: Rate, Count
├─ Inventory: Available vs Occupied
├─ Financial Summary: Total value, Income
└─ By Status: Planning/Ongoing/Completed
```

---

## 🔐 Data Integrity & Constraints

### Reference Integrity
```
PropertyTenancy
  ├─ Must have valid personId (Person exists)
  ├─ Must have valid propertyId (Property exists)
  └─ Property must exist before tenancy created

PropertyOwnership
  ├─ Must have valid personId (Person exists)
  ├─ Must have valid propertyId (Property exists)
  └─ Can have multiple owners (co-ownership)

PropertyBuying
  ├─ Must have valid buyerId, sellerId (Person exists)
  ├─ Must have valid propertyId (Property exists)
  └─ Cannot complete without full payment

PropertyAgent
  ├─ Must have valid personId (Agent exists)
  ├─ Must have valid propertyId (Property exists)
  └─ Commission % must be valid (0-100)

Property
  ├─ Must have valid clusterId (Cluster exists)
  ├─ unitNumber must be unique within cluster
  └─ Value must be positive

Cluster
  ├─ Must have valid developerId (Developer exists)
  └─ Status must be valid enumeration
```

### Unique Constraints
```
PersonService
  ├─ email: Unique globally
  ├─ mobile: Unique globally
  └─ personId: Unique globally

PropertyService
  ├─ propertyId: Unique globally
  └─ (unitNumber + clusterId): Unique combination

Other Services
  └─ All linkIds: Unique globally
```

---

## 🎯 Service Method Distribution

### By Operation Type

```
CREATE Operations        UPDATE Operations        READ Operations
├─ PersonService         ├─ PropertyService       ├─ PersonService
├─ PropertyService       ├─ PropertyTenancy       ├─ PropertyService
├─ PropertyTenancy       ├─ PropertyOwnership     ├─ PropertyTenancy
├─ PropertyOwnership     ├─ PropertyBuying        ├─ PropertyOwnership
├─ PropertyBuying        ├─ PropertyAgent         ├─ PropertyBuying
├─ PropertyAgent         └─ DeveloperService      ├─ PropertyAgent
├─ DeveloperService                               ├─ DeveloperService
└─ ClusterService                                 └─ ClusterService

ANALYTICS Operations     SPECIAL Operations
├─ PersonService         ├─ PersonService (deduplication)
├─ PropertyService       ├─ PropertyBuying (complete transaction)
├─ PropertyTenancy       ├─ PropertyOwnership (mark disposed)
├─ PropertyOwnership     ├─ PropertyAgent (record sale/rental)
├─ PropertyBuying        └─ [Domain-specific operations]
├─ PropertyAgent
├─ DeveloperService
└─ ClusterService
```

---

## 📦 Implementation Layers

### Layer 1: API (Express Routes) - Phase 3
```
Routes receive HTTP requests
  ↓
Validate request format
  ↓
Call Service method
  ↓
Return response (200/400/500)
```

### Layer 2: Service Logic (Business Layer) - Phase 2 ✅
```
Validate business logic
  ↓
Check database constraints
  ↓
Execute query/update
  ↓
Return standardized response
```

### Layer 3: Helpers (Utilities) - Phase 1
```
ValidationHelper: Input validation
QueryHelper: Complex queries & aggregation
```

### Layer 4: Mongoose (ORM) - Phase 1
```
Connect to MongoDB
Execute queries
Return data
```

### Layer 5: Database (MongoDB)
```
Store data
Enforce constraints
Return results
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────┐
│    Load Balancer                │
│   (nginx/HAProxy)               │
└──────────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐
│ Node  │  │ Node  │  │ Node  │
│Inst.1 │  │Inst.2 │  │Inst.3 │ (Horizontal Scaling)
│       │  │       │  │       │
│Express│  │Express│  │Express│
│API    │  │API    │  │API    │
└───┬───┘  └───┬───┘  └───┬───┘
    │          │          │
    └──────────┼──────────┘
               │
    ┌──────────▼──────────┐
    │  MongoDB Replica Set│
    │ (3+ nodes for HA/DR)│
    └─────────────────────┘
```

---

## 📋 Service Deployment Checklist

### Before Going Live
- [ ] All services deployed and tested
- [ ] Database replicated across regions
- [ ] Monitoring and alerts configured
- [ ] Logging aggregation setup
- [ ] Caching layer configured (Redis)
- [ ] CDN configured for static assets
- [ ] SSL/TLS certificates installed
- [ ] Authentication middleware active
- [ ] Rate limiting configured
- [ ] Backup and recovery tested

### Post-Deployment
- [ ] Monitor error rates
- [ ] Track response times
- [ ] Verify payment flows
- [ ] Check contract calculations
- [ ] Validate analytics accuracy
- [ ] Test failover scenarios
- [ ] Performance baseline established

---

**This Architecture Document:**
- Maps complete service relationships
- Shows data flow examples
- Illustrates analytics capabilities
- Documents constraints and integrity
- Provides deployment guidance

**Ready to Proceed:** Phase 3 API Integration ✅
