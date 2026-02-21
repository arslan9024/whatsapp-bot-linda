# Relational Database Schema Design - DAMAC Hills 2 Property Management

## Overview

This document describes the complete redesign of the MongoDB schema from a hybrid/embedded model to a **true relational database design** with separate collections, foreign keys, and composite keys.

**KEY CONCEPT**: One Person can play multiple roles (tenant, owner, agent, buyer, seller) across different properties. Properties are uniquely identified by composite key (clusterId + unitNumber). Rental contracts (tenancies) include detailed payment schedules with multi-landlord support.

---

## Collections & Relationships

### Entity Relationship Diagram (Text)

```
┌──────────────┐
│   DEVELOPER  │
│              │
│ developerId  │
│ name         │
└──────┬───────┘
       │ 1:N
       │
┌──────▼────────────┐
│    CLUSTER       │
│                  │
│ clusterId (PK)   │ 1:N
│ clusterName      │───────────────┐
│ location         │               │
│ developerId (FK) │               │
└──────────────────┘               │
                                   │
    ┌──────────────────────────────┘
    │
    ▼
┌────────────────────────────┐
│      PROPERTY             │
│                           │
│ propertyId (PK)          │
│ clusterId (FK) ┐          │ 1:N
│ unitNumber     ├─ COMPOSITE KEY
│                │
│ builtUpArea    │
│ plotArea       │
│ hasParking     │
│                │
│ furnishingStatusId (FK)      │
│ occupancyStatusId (FK)       │
│ availabilityStatusIds (FK[]) │
│ currentTenancyId (FK)        │
│ currentTenantPersonId (FK)   │
│ serviceCharges               │
│ imageUrls                    │
│ floorPlanUrl                 │
└────┬───────────────────────────────────┬─────────────────────┐
     │                                   │                     │
     │ 1:N                              │ 1:N                 │ 1:N
     │                                   │                     │
     ▼                                   ▼                     ▼
┌──────────────────┐     ┌─────────────────────────┐    ┌──────────────┐
│ PROPERTY         │     │    PROPERTY           │    │ PROPERTY     │
│ OWNERSHIP        │     │    TENANCY            │    │ BUYING       │
│                  │     │                       │    │              │
│linkId (PK)       │     │tenancyId (PK)        │    │linkId (PK)   │
│personId (FK) ┐   │     │propertyId (FK)        │    │personId (FK) │
│propertyId (FK)┤  │     │tenantPersonId (FK)    │    │propertyId(FK)│
│               ├─ COMPOSITE KEY     landlordPersonIds(FK[])*│
│ownershipPerc%│  │     │contractStartDate      │    │transactionType
│acquisitionDate  │     │contractExpiryDate     │    │transactionPrice
│acquisitionPrice │     │contractAmount         │    │status
│disposalDate (opt)│     │paymentSchedule        │    │offerDate
│currentValue      │     │  totalCheques         │    │completionDate
│                  │     │  cheques[]            │    │
│status            │     │    chequeNumber       │    │MULTI-LANDLORD:
└──────┬───────────┘     │    chequeAmount       │    │Supports joint
       │ N:1             │    chequeDueDate      │    │ownership where
       │                 │    isPaid             │    │multiple people
       │                 │    paidDate           │    │receive rent
       │                 │    remarks            │    └──────┬────────┘
       │                 │                       │          │
       ▼                 │depositAmount          │          │
    ┌──────────────┐     │allowPets              │          │
    │   PERSON     │     │allowSubletting        │    N:1   │
    │              │     │maintenanceResponsibility
    │personId (PK) │◄────│utilitiesResponsibility
    │firstName     │     │status                 │          │
    │lastName      │     └─────────────────────────────────┘
    │fullName      │
    │mobile (UK)   │
    │email (UK)    │
    │status        │
    │source        │
    └──────┬───────┘
           │ 1:N
           │
           ▼
    ┌──────────────────┐
    │ PROPERTY         │
    │ AGENT            │
    │                  │
    │linkId (PK)       │
    │personId (FK)     │
    │propertyId (FK)   │
    │agentRole         │
    │commissionPerc    │
    │status            │
    └──────────────────┘

REFERENCE TABLES (Enums):
┌────────────────────┐
│ FURNISHING STATUS  │  ┌─────────────────┐    ┌──────────────────┐
│ - furnished        │  │ OCCUPANCY STATUS│    │AVAILABILITY      │
│ - unfurnished      │  │ - occupied_owner│    │- available_rent  │
│ - semi-furnished   │  │ - occupied_tenant    │- available_sale  │
└────────────────────┘  │ - vacant         │    │- available_both  │
                        └─────────────────┘    │- not_available   │
                                               │- sold            │
                                               └──────────────────┘
```

---

## Collections Detail

### 1. **Person** (Core Entity)
- **Collection**: `people`
- **Purpose**: Central repository for all persons (data deduplication)
- **Key Concept**: One person can be tenant, owner, agent, buyer, seller across different properties

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| personId | String | ✅ | ✅ | Format: PERSON-YYYYMMDD-XXXXX |
| firstName | String | ✅ | | max 50, indexed |
| lastName | String | ✅ | | max 50, indexed |
| fullName | String | ✅ | | Computed from firstName + lastName |
| mobile | String | ✅ | ✅ | Regex: /^\+?[0-9]{7,15}$/, from online platform |
| email | String | | ✅ | Optional, sparse, lowercase |
| status | String | | | enum: active/inactive/archived, default: active |
| source | String | | | enum: online_leads_platform/direct/import/integration |
| notes | String | | | max 500 |
| createdAt, updatedAt | Date | | | Auto-managed |

**Indexes**: personId, firstName+lastName, mobile, email, status, text search

**Example Usage**:
```javascript
// A person can rent from owners A & B
// A person can also own property X and sell property Y
// All managed through linking tables
```

---

### 2. **Property** (Core Entity)
- **Collection**: `properties`
- **Purpose**: Physical property information
- **Key Concept**: Composite key (clusterId + unitNumber) ensures uniqueness + enables relationship lookups

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| propertyId | String | ✅ | Unique, Format: PROP-YYYYMMDD-XXXXX |
| **clusterId** | String | ✅ | FK to Cluster, part of composite key |
| **unitNumber** | String | ✅ | Part of composite key |
| builtUpArea | Number | ✅ | Square feet |
| plotArea | Number | ✅ | Square feet |
| hasParking | Boolean | ✅ | default: false |
| parkingSpaces | Number | | Optional |
| furnishingStatusId | ObjectId | | FK to FurnishingStatus |
| occupancyStatusId | ObjectId | | FK to OccupancyStatus |
| availabilityStatusIds | [ObjectId] | | FK[] to AvailabilityStatus (ARRAY: supports rent+sale simultaneously) |
| currentTenancyId | ObjectId | | FK to PropertyTenancy (denormalized for quick access) |
| currentTenantPersonId | ObjectId | | FK to Person (denormalized) |
| imageUrls | [String] | | Array of image URLs |
| floorPlanUrl | String | | Single floor plan URL |
| serviceCharges | Number | | Monthly/annual charges |
| serviceChargesCurrency | String | | enum: AED/USD/EUR, default: AED |
| status | String | | enum: active/inactive/sold/archived |
| notes | String | | max 500 |

**Unique Composite Index**: `{ clusterId: 1, unitNumber: 1 }`

**Example**:
```
Cluster: DAMAC HILLS 2
Unit: 305
→ Composite key: (DAMAC HILLS 2, 305) is UNIQUE
→ No other property can have same cluster + unit number
```

---

### 3. **PropertyOwnership** (Linking Table)
- **Collection**: `propertyownerships`
- **Purpose**: Ownership relationships - how many people own what % of a property
- **Key Relationship**: Many-to-many between Person and Property

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| linkId | String | ✅ | Format: OWNERSHIP-YYYYMMDD-XXXXX |
| personId | ObjectId | ✅ | FK to Person (the owner) |
| propertyId | ObjectId | ✅ | FK to Property |
| ownershipPercentage | Number | ✅ | 0-100 (e.g., 50 for co-owner) |
| ownershipType | String | | enum: sole/joint/co-ownership/trust/company |
| acquisitionDate | Date | ✅ | When person acquired property |
| acquisitionPrice | Number | | Optional |
| disposalDate | Date | | Optional, when sold |
| disposalPrice | Number | | Optional |
| currentEstimatedValue | Number | | Optional |
| lastValuationDate | Date | | Optional |
| currency | String | | enum: AED/USD/EUR |
| status | String | | enum: active/inactive/sold/archived |

**Unique Composite Index**: `{ personId: 1, propertyId: 1 }` - Prevent duplicate ownership

**Example**:
```
Property 305 in DAMAC HILLS 2:
- Ahmed Hassan: 50% (acquired 2023-06-15, 850,000 AED, current value 925,000 AED)
- Fatima Ali: 50% (acquired 2023-06-15, 850,000 AED, current value 925,000 AED)
```

---

### 4. **PropertyTenancy** (Rental Contract)
- **Collection**: `propertytenancies`
- **Purpose**: Rental agreements with detailed payment schedules
- **Key Relationship**: Tenant (Person) ← → Property ← → Landlord(s) (Person[])
- **CRITICAL**: Supports multiple landlords (joint ownership receiving rent equally or per allocation agreement)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenancyId | String | ✅ | Format: TENANCY-YYYYMMDD-XXXXX |
| propertyId | ObjectId | ✅ | FK to Property |
| tenantPersonId | ObjectId | ✅ | FK to Person (WHO IS RENTING) |
| **landlordPersonIds** | [ObjectId] | ✅ | FK[] to Person (ALL OWNERS RECEIVING RENT) |
| contractStartDate | Date | ✅ | Lease begins |
| contractExpiryDate | Date | ✅ | Lease ends |
| contractAmount | Number | ✅ | Total rental amount (e.g., 85,000 AED) |
| contractCurrency | String | | enum: AED/USD/EUR |
| **paymentSchedule** | Object | ✅ | |
| paymentSchedule.totalCheques | Number | ✅ | e.g., 4 |
| paymentSchedule.cheques | [Object] | ✅ | Array of cheque details |
| cheques[].chequeNumber | String | ✅ | Unique identifier |
| cheques[].chequeAmount | Number | ✅ | Per-cheque amount |
| cheques[].chequeDueDate | Date | ✅ | When due |
| cheques[].isPaid | Boolean | | default: false |
| cheques[].paidDate | Date | | Optional |
| cheques[].remarks | String | | Optional |
| maintenanceResponsibility | String | | enum: landlord/tenant/shared |
| utilitiesResponsibility | String | | enum: landlord/tenant/shared |
| allowPets | Boolean | | default: false |
| allowSubletting | Boolean | | default: false |
| depositAmount | Number | | Optional |
| status | String | | enum: active/ended/expired/terminated/on_hold |
| reasonForTermination | String | | Optional, if terminated early |
| terminationDate | Date | | Optional |

**Key Validation**: Sum of all cheque amounts MUST equal contractAmount

**Example**:
```
Tenancy: Unit 305, DAMAC HILLS 2
Tenant: John Smith
Landlords: Ahmed Hassan (50%), Fatima Ali (50%)
Contract: 85,000 AED from 2024-02-01 to 2026-01-31 (2 years)
Payment: 4 cheques of 21,250 AED each
  - CH-001: Due 2024-02-15 (PAID 2024-02-10)
  - CH-002: Due 2024-05-15 (PAID 2024-05-12)
  - CH-003: Due 2024-08-15 (UNPAID - OVERDUE)
  - CH-004: Due 2024-11-15 (UNPAID - FUTURE)
```

---

### 5. **PropertyBuying** (Transaction Linking Table)
- **Collection**: `propertybuying`
- **Purpose**: Track buy/sell transactions

| Field | Type | Notes |
|-------|------|-------|
| linkId | String | Format: BUYING-YYYYMMDD-XXXXX |
| personId | ObjectId | FK to Person (buyer or seller) |
| propertyId | ObjectId | FK to Property |
| transactionType | String | enum: buyer/seller |
| offerDate | Date | When offer made |
| completionDate | Date | When completed (optional) |
| transactionPrice | Number | Agreed price |
| currency | String | enum: AED/USD/EUR |
| status | String | enum: offer/negotiating/agreed/completed/cancelled |

---

### 6. **PropertyAgent** (Agent Linking Table)
- **Collection**: `propertyagents`
- **Purpose**: Link agents/brokers to properties

| Field | Type | Notes |
|-------|------|-------|
| linkId | String | Format: AGENT-YYYYMMDD-XXXXX |
| personId | ObjectId | FK to Person (agent/broker) |
| propertyId | ObjectId | FK to Property |
| agentRole | String | enum: selling_agent/buying_agent/rental_agent |
| commissionPercentage | Number | Optional, 0-100 |
| status | String | enum: active/inactive |

---

### 7. **Cluster** (Foundation Collection)
- **Collection**: `clusters`
- **Purpose**: Real estate project/cluster information

| Field | Type | Notes |
|-------|------|-------|
| clusterId | String | Unique identifier |
| clusterName | String | Project name (e.g., "DAMAC HILLS 2") |
| location | String | Area/location |
| developerId | ObjectId | FK to Developer |
| description | String | Project description |
| totalUnits | Number | Total units in cluster |
| status | String | enum: active/inactive/archived |

---

### 8. **Developer** (Reference Collection)
- **Collection**: `developers`
- **Purpose**: Developer/builder information

| Field | Type | Notes |
|-------|------|-------|
| developerId | String | Unique identifier |
| developerName | String | Company name |
| contactEmail | String | Optional |
| contactPhone | String | Optional |
| website | String | Optional |
| status | String | enum: active/inactive/archived |

---

### 9. **Reference/Enum Collections**

#### **FurnishingStatus**
```javascript
{ status: "furnished" | "unfurnished" | "semi-furnished" }
```

#### **OccupancyStatus**
```javascript
{ status: "occupied_by_owner" | "occupied_by_tenant" | "vacant" }
```

#### **AvailabilityStatus** (Supports MULTIPLE per property)
```javascript
{
  status: "available_for_rent" | "available_for_sale" | 
          "available_for_both" | "not_available" | "sold"
}
```

---

## Key Design Decisions

### 1. **Composite Key for Properties**
```javascript
// Instead of single propertyId, use:
{ clusterId, unitNumber } uniquely identifies a property
// Enables: "Find all properties in cluster X"
// Enables: "Check if unit 305 already exists in cluster Z"
```

### 2. **Multiple Availability Statuses**
```javascript
// Same property can be:
availabilityStatusIds: [idForRent, idForSale]
// Represents: Available for RENT and SALE simultaneously
```

### 3. **Separate Person Collection**
```javascript
// BEFORE (problematic):
PropertyOwner { firstName, lastName, mobile, email }
PropertyContact { firstName, lastName, mobile, email }
// Result: Duplicate person data, hard to deduplicate

// AFTER (clean):
Person { firstName, lastName, mobile, email }
PropertyOwnership { personId → Person }
PropertyAgent { personId → Person }
PropertyTenancy { tenantPersonId, landlordPersonIds → Person }
// Result: Single source of truth, deduplication easy
```

### 4. **Multi-Landlord Tenancy**
```javascript
PropertyTenancy {
  tenantPersonId: ObjectId,           // Single tenant
  landlordPersonIds: [ObjectId],      // Multiple landlords
  contractAmount: 85000,              // Total amount
  paymentSchedule: {
    totalCheques: 4,
    cheques: [
      { chequeNumber, amount, dueDate, isPaid, paidDate },
      ...
    ]
  }
}
// Both landlords (Ahmed & Fatima) receive rent from one tenant (John)
// Rent allocation can be determined by PropertyOwnership percentages
```

### 5. **Detailed Payment Schedule**
```javascript
// Every cheque tracked individually:
cheques: [
  {
    chequeNumber: "CH-001",
    chequeAmount: 21250,
    chequeDueDate: "2024-02-15",
    isPaid: true,
    paidDate: "2024-02-10",     // Paid 5 days early
    remarks: "Bank clearance successful"
  },
  {
    chequeNumber: "CH-003",
    chequeAmount: 21250,
    chequeDueDate: "2024-08-15",
    isPaid: false,
    paidDate: null,              // Still unpaid
    remarks: "OVERDUE - Follow up sent"
  }
]
// Can easily find: unpaid cheques, overdue payments, payment history
```

---

## Validation Rules

### PropertyOwnership
- Person must exist in Person collection
- Property must exist in Property collection
- No duplicate ownership links (composite key: personId + propertyId)
- Ownership percentage must be 0-100
- Acquisition date must be valid
- Disposal date (if exists) must be after acquisition date

### PropertyTenancy
- Tenant person must exist
- All landlord persons must exist
- At least one landlord required
- Property must exist
- Contract start date < contract expiry date
- All landlords must own the property (checked via PropertyOwnership)
- Sum of cheque amounts MUST equal contractAmount (validation hook)
- Number of cheques must match totalCheques
- No overlapping tenancies for same property

### Property (Composite Key)
- ClusterId + unitNumber must be unique
- Cluster must exist
- At least one status (furnishing or occupancy) must be set

### AvailabilityStatus
- Cannot combine "sold" with any active status
- Cannot combine "available_for_both" with individual "available_for_rent" or "available_for_sale"

---

## Migration Path

### From Old Schema to New

**Old Structure**:
```
PropertyOwner (contains firstName, lastName, mobile)
PropertyContact (contains firstName, lastName, mobile)
PropertyOwnerProperties (links owner to property)
```

**New Structure**:
```
Person (single source for firstName, lastName, mobile)
PropertyOwnership (links person to property as owner)
PropertyTenancy (links person to property as tenant)
PropertyAgent (links person to property as agent)
```

**Migration Steps**:
1. Extract unique persons from PropertyOwner + PropertyContact
2. Deduplicate by firstName + lastName + mobile
3. Create Person records
4. Create PropertyOwnership from PropertyOwner data
5. Create PropertyTenancy from rental contract data
6. Create PropertyAgent from PropertyContact (agents only)
7. Delete old collections or archive as backup

---

## Query Examples

### Using QueryHelper

```javascript
// Find person with all roles
const personWithRoles = await QueryHelper.findPersonWithAllRoles(Person, personId);
// Returns: person + all properties owned, rented, bought, sold, managed

// Find property with all connected people
const propertyWithPeople = await QueryHelper.findPropertyWithAllPeople(Property, propertyId);
// Returns: property + owners, tenant, agents, buyers, sellers

// Find co-owners of property
const coOwners = await QueryHelper.getPropertyCoOwners(PropertyOwnership, propertyId);
// Example: [{ personId: Ahmed, percentage: 50 }, { personId: Fatima, percentage: 50 }]

// Get payment status
const paymentStatus = await QueryHelper.getTenancyPaymentSummary(PropertyTenancy, tenancyId);
// Returns: { totalAmount, paidAmount, unpaidAmount, completionPercentage }

// Find overdue cheques
const overdueList = await QueryHelper.findOverdueCheques(PropertyTenancy);
// Returns: properties with unpaid cheques past due date

// Get upcoming expirations
const expiring = await QueryHelper.getUpcomingExpirations(PropertyTenancy, 30);
// Returns: tenancies expiring within 30 days
```

### Using ValidationHelper

```javascript
// Validate person not duplicate
const dup = await ValidationHelper.checkPersonDuplicates(Person, 'John', 'Smith', '+971507654321');
// Returns: { hasDuplicates: false, duplicates: [] }

// Validate composite key
const valid = await ValidationHelper.validateCompositeKey(Property, 'CLUSTER-1', '305');
// Returns: { valid: true } or { valid: false, error: "..." }

// Validate landlords own property
const landlordCheck = await ValidationHelper.validateLandlordsOwnProperty(
  [ahmedId, fatimaId],
  propertyId,
  PropertyOwnership
);
// Returns: { valid: true } if both own the property

// Validate tenancy
const tenancyCheck = await ValidationHelper.validatePropertyTenancy(
  PropertyTenancy,
  tenancyData,
  Person,
  Property
);
// Returns: { valid: true, errors: [] } or { valid: false, errors: [...] }

// Validate availability statuses
const statusCheck = await ValidationHelper.validateAvailabilityStatuses(
  [rentStatusId, saleStatusId],
  AvailabilityStatus
);
// Returns: { valid: true } if combination is allowed
```

---

## Benefits of This Design

1. **No Data Duplication**: Person entity is single source of truth
2. **Flexible Roles**: One person can play multiple roles across different properties
3. **Joint Ownership**: PropertyTenancy supports multiple landlords receiving rent
4. **Multi-Status Properties**: Same property available for rent AND sale simultaneously
5. **Detailed Audit Trail**: Every cheque, payment, transaction tracked
6. **Scalable**: Easy to add new roles or transaction types
7. **Referential Integrity**: Foreign keys ensure consistency
8. **Performance**: Indexes on critical fields, composite key prevents duplicates
9. **Validation**: Built-in business logic through hooks and helper methods
10. **Queries**: Pre-built QueryHelper methods for common operations

---

## Next Steps

1. **Deploy Schemas**: Copy all schema files to `code/Database/`
2. **Create Migration**: Run `migrateToRelational.js` to convert old data
3. **Update Services**: Modify service layers to use new schema
4. **Update API**: Update REST endpoints to use new collection names
5. **Test**: Run validation and query tests
6. **Dashboard**: Update terminal dashboard for new schema
7. **Documentation**: Train team on new relationships

---

**Version**: 1.0  
**Date**: February 20, 2026  
**Status**: Production-Ready
