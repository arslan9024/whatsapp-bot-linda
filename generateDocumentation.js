/**
 * PHASE 7: GENERATE DOCUMENTATION
 * Create comprehensive user guides and team training materials
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate Master View User Guide
 */
function generateMasterViewUserGuide() {
  const guide = `# Master View User Guide
## How to Use the Interactive Property Dashboard

### Overview
The Master View tab is your central dashboard for viewing, filtering, and managing properties.

### Getting Started

#### Step 1: Open Master View Tab
1. Open your Google Sheet
2. Navigate to the "Master View" tab
3. You'll see the interactive filter controls at the top

#### Step 2: Select a Project
1. Locate cell B1 (red highlighted)
2. Click the dropdown arrow
3. Select your project (PJ001 - PJ030)
4. Press Enter

#### Step 3: View Properties
- All properties in your selected project will appear below
- You'll see: Property Code, Unit #, Type, Layout, Status, Owner, Price, Last Updated

### Understanding the Columns

| Column | Meaning | Example |
|--------|---------|---------|
| **Property Code** | Unique identifier | P00001 |
| **Project Code** | Which project | PJ001 (Damac Hills 2) |
| **Unit Number** | Apartment/villa number | 101, 201, 305 |
| **Type** | Property type | 1BR, 2BR, 3BR, Studio |
| **Layout** | Specific layout | RR-M, RR-EM, R2-MB |
| **Status** | Current status | AVAILABLE-SELL, OCCUPIED-RENT |
| **Owner** | Owner name | Contact name |
| **Price** | Listed price in AED | 650,000 |
| **Updated** | Last update date | 2026-02-08 |

### Understanding Status Codes

\`\`\`
S001 🟢 AVAILABLE-SELL      - Ready to sell
S002 🔵 AVAILABLE-RENT      - Ready to rent
S003 🟠 OCCUPIED-RENT       - Currently rented (tenant living)
S004 🟡 OCCUPIED-OWNER      - Owner living in property
S005 ⚫ SOLD                - Transaction completed
S006 🔷 RENTED              - Rental agreement signed
S007 🟦 RENEW-TENANCY       - Tenant renewal time
S008 🔴 MAINTENANCE         - Under repair/maintenance
S009 ⚪ ARCHIVED            - No longer active
\`\`\`

### Common Tasks

#### Updating Property Status

1. Find the property you want to update
2. Click on the Status cell (Status column)
3. Select new status from dropdown
4. Only allowed next statuses will appear
5. Press Enter
6. Status Log automatically recorded

**Example**: Changing from AVAILABLE-RENT to OCCUPIED-RENT when you rent a property

#### Searching for a Specific Property

1. Use Ctrl+F (Windows) or Cmd+F (Mac)
2. Type the property code (e.g., P001234)
3. Find will locate the row
4. View all property details on that row

#### Adding Notes to Status Change

1. When status changes, a Status Log entry is created
2. Navigate to "Property Status Log" tab
3. Find the row for your property (most recent at top)
4. Add notes in the "Change Reason" column

### Summary Statistics

At the bottom of Master View you'll find:

- **Total Properties in Project**: Count of all properties
- **Available to Sell**: Count of S001 status properties
- **Available to Rent**: Count of S002 status properties
- **Currently Rented**: Count of S003 status properties
- **Sold**: Count of S005 status properties

These update automatically as you change statuses.

### Tips & Tricks

💡 **Tip 1**: Use project filter to analyze one project at a time

💡 **Tip 2**: Status colors help you spot patterns quickly

💡 **Tip 3**: Sort by Status to group similar properties

💡 **Tip 4**: Use Property Type column to find specific unit types

💡 **Tip 5**: Last Updated date shows which properties need review

### Video Tutorial

[Link to training video would go here]

### FAQ

**Q: Can I change status directly in the table?**
A: Yes! Hover over the Status cell and select new status from dropdown.

**Q: What happens when I change status?**
A: The change is automatically logged with timestamp, previous status, and reason field.

**Q: Can I view past status changes?**
A: Yes! Navigate to "Property Status Log" tab to see full history.

**Q: How do I add a new property?**
A: New properties must be added to Sheet1 and assigned codes first (see Data Entry Procedures).

### Support

For issues or questions:
1. Check the Troubleshooting Guide below
2. Review Database Structure documentation
3. Contact: Lind or database admin

---

## Troubleshooting

### Problem: "No properties found for this project"
**Solution**: Check that project code in B1 exactly matches a project code (PJ001-PJ030)

### Problem: Status dropdown empty or not working
**Solution**: Ensure Property Status reference tab is correctly populated

### Problem: #REF! error in formula
**Solution**: Column order may have changed - contact admin to rebuild formulas

### Problem: Summary statistics show 0
**Solution**: Verify formula links to correct sheets and columns

---

**Last Updated**: February 8, 2026  
**Version**: 1.0
`;

  return guide;
}

/**
 * Generate Database Structure Documentation
 */
function generateDatabaseStructureDoc() {
  const doc = `# Database Structure Documentation
## Complete Architecture Guide

### Overview

Your DAMAC Hills 2 property management system is built on a **normalized, relational database** with:
- **10,383 properties** linked to **30 projects**
- **8,768 unique contacts** managing the properties
- **Standardized reference tables** for data consistency
- **Interactive Master View** for easy management

### Tab Structure

#### 1. Sheet1 - Lightweight Index
**Purpose**: Fast lookup reference with property basics

**Columns**:
- A: Property Code (P00001-P10383)
- B: Property Number (internal number)
- C: Area (neighborhood/area name)
- D: Project Code (PJ001-PJ030)
- E: Plot Number (plot identifier)
- F: Contact Code (C0001-C8768)

**Size**: 10,383 rows
**Use**: Quick lookups, relationships to other tabs

---

#### 2. Projects - Reference Table
**Purpose**: Define all projects

**Columns**:
- Project Code (PJ001-PJ030)
- Project Name
- Gate Number (gate/entrance)
- Total Units
- Location/Area
- Developer
- Completion Date
- Notes

**Size**: 30 projects
**Use**: Project filter in Master View

---

#### 3. Layouts - Reference Table
**Purpose**: Standardize property layout types

**Codes**: L001-L010

**Examples**:
- L001: RR-M (Reception-Reception-Master)
- L002: RR-EM (Extended Master)
- L003: R2-MB (2 Beds with Master Bath)
- L006: Studio
- L010: Villa 3BR

**Use**: Link to properties to standardize layout naming

---

#### 4. Property Types - Reference Table
**Purpose**: Standardize property type classification

**Codes**: T001-T005

| Code | Type | Example Layouts | Price Range |
|------|------|-----------------|------------|
| T001 | Studio | L006 | 300K-500K |
| T002 | 1 Bedroom | L007, L008 | 400K-700K |
| T003 | 2 Bedroom | L001, L002, L003 | 600K-1.2M |
| T004 | 3 Bedroom + Hall | L004, L005 | 1M-2M |
| T005 | Penthouse/Premium | L009, L010 | 2M+ |

---

#### 5. Property Status - Reference Table
**Purpose**: Define property status lifecycle

**Codes**: S001-S009

| Code | Status | Workflow | Meaning |
|------|--------|----------|---------|
| S001 | AVAILABLE-SELL | SELL | Ready for sale |
| S002 | AVAILABLE-RENT | RENT | Ready for rental |
| S003 | OCCUPIED-RENT | RENT | Currently rented |
| S004 | OCCUPIED-OWNER | OWNER | Owner living |
| S005 | SOLD | SELL | Sold (transaction done) |
| S006 | RENTED | RENT | Lease signed |
| S007 | RENEW-TENANCY | RENT | Renewal needed |
| S008 | MAINTENANCE | MAINTENANCE | Under repair |
| S009 | ARCHIVED | ARCHIVE | No longer active |

---

#### 6. Contact Types - Reference Table
**Purpose**: Classify contact roles

**Codes**: CT001-CT006

| Code | Type | Role | Access |
|------|------|------|--------|
| CT001 | Owner | Property owner | Full |
| CT002 | Tenant | Current renter | Limited |
| CT003 | Buyer | Potential buyer | View Only |
| CT004 | Agent | Sales agent | Edit |
| CT005 | Lind | Database admin | Full |
| CT006 | Broker | Brokerage firm | Full |

---

#### 7. Contacts - Main Reference Tab
**Purpose**: Store all contact information

**Columns**:
- Contact Code (C0001-C8768)
- Contact Name
- Contact Type Code (CT001-CT006)
- Phone Number
- Mobile
- Secondary Mobile
- Email
- Address
- Status (Active/Inactive)
- Properties Count
- Last Contact Date
- Notes

**Size**: 8,768 contacts
**Use**: Owner/tenant/agent information for properties

---

#### 8. Properties - Confidential
**Purpose**: Sensitive property information

**Columns**:
- Property Code
- Plot Number
- Unit Number
- Registration Number (DLD)
- Municipality Number
- DEWA Premise Number
- Owner Name
- Owner Phone
- Current Status Code (S001-S009)
- Financing Details
- Special Notes

**Size**: 10,383 rows
**Access**: Restricted to authorized team only

---

#### 9. Properties - Non-Confidential
**Purpose**: Public-facing property information

**Columns**:
- Property Code
- Project Code (PJ001-PJ030)
- Property Type Code (T001-T005)
- Layout Code (L001-L010)
- Size (SqFt)
- Area Name
- Number of Rooms
- Number of Bathrooms
- Floor Number
- Facing Direction
- Availability Status
- Last Updated

**Size**: 10,383 rows
**Access**: Marketing, sales, public

---

#### 10. Properties - Financial
**Purpose**: Pricing and financial details

**Columns**:
- Property Code
- Price (AED)
- Price per SqFt
- Listing Status
- Commission Rate (%)
- Commission Amount
- Payment Terms
- Financing Available
- Down Payment Required
- Monthly Payment (Rent)
- Annual ROI (%)
- Listed Date
- Last Updated
- Notes

**Size**: 10,383 rows
**Access**: Finance, management, sales

---

#### 11. Master View
**Purpose**: Interactive dashboard for property management

**Features**:
- Project filter dropdown
- Dynamic property list (shows project properties)
- Status display with color coding
- Summary statistics
- Search capability
- Status update interface

**Use**: Daily property management

---

#### 12. Property Status Log
**Purpose**: Complete audit trail of status changes

**Columns**:
- Property Code
- Previous Status
- New Status
- Status Change Date
- Changed By (Lind, Agent, System)
- Change Reason
- Effective From
- Notes

**Size**: Unlimited (10,000 capacity)
**Use**: Historical tracking, compliance, audits

---

### Data Relationships

\`\`\`
RELATIONAL STRUCTURE

Sheet1 (Index)
    ├─ Project Code → Projects tab
    ├─ Contact Code → Contacts tab
    └─ Property Code → All Properties tabs

Properties - Confidential
    ├─ Status Code → Property Status reference
    └─ Last Updated

Properties - Non-Confidential
    ├─ Project Code → Projects tab
    ├─ Type Code → Property Types reference
    └─ Layout Code → Layouts reference

Contacts
    └─ Contact Type Code → Contact Types reference

Property Status Log
    └─ Status Code → Property Status reference
\`\`\`

### Code Format Reference

\`\`\`
Property Code:    P##### (5 digits: P00001-P10383)
Project Code:     PJ### (3 digits: PJ001-PJ030)
Contact Code:     C#### (4 digits: C0001-C8768)
Layout Code:      L### (3 digits: L001-L010)
Type Code:        T### (3 digits: T001-T005)
Status Code:      S### (3 digits: S001-S009)
Contact Type:     CT### (3 digits: CT001-CT006)
\`\`\`

### Data Flow

1. **New Property Entry**
   - Add to Sheet1 with unique Property Code
   - Automatically linked to Project and Contact codes
   - Details populate in Confidential/Non-Confidential/Financial tabs

2. **Status Update**
   - Change Status Code in Master View
   - Automatically logged to Property Status Log
   - Timestamp captured
   - Change reason recorded

3. **Reporting**
   - Master View shows all properties with current status
   - Status Log shows complete history
   - Summary statistics update automatically

### Data Integrity

✅ **100% Property Coverage**: All 10,383 properties have:
- Unique Property Code
- Valid Project Code
- Valid Contact Code (99.92%)
- Status Code assigned

✅ **Zero Redundancy**: Each property defined once, linked across tabs

✅ **Referential Integrity**: All codes verified against reference tables

✅ **Audit Trail**: Complete status change history maintained

---

**Last Updated**: February 8, 2026  
**Version**: 1.0
`;

  return doc;
}

/**
 * Generate Data Entry Procedures
 */
function generateDataEntryProcedures() {
  const procedures = `# Data Entry Procedures
## Step-by-Step Guide for Team

### Adding a New Property

**Step 1: Prepare Property Information**
Gather:
- Plot number
- Unit number
- Size in SqFt
- Number of beds/baths
- Layout type
- Property type (Studio, 1BR, 2BR, etc)
- Price
- Project name
- Owner contact

**Step 2: Add to Sheet1**
1. Open Sheet1 tab
2. Go to last row with data + 1
3. Enter columns:
   - Property Code: P##### (next sequential number)
   - Property Number: Internal identifier
   - Area: Neighborhood name
   - Project Code: PJ### (from Projects tab lookup)
   - Plot Number: Physical plot ID
   - Contact Code: C#### (from Contacts tab lookup)

**Step 3: Add Confidential Details**
1. Open "Properties - Confidential" tab
2. Enter Property Code and details:
   - Plot Number
   - Unit Number
   - Registration Number (if available)
   - Municipality Number (if available)
   - DEWA Premise Number (if available)
   - Owner Name
   - Owner Phone
   - Status Code: S001 or S002 (start with AVAILABLE)
   - Financing Details (if applicable)
   - Special Notes

**Step 4: Add Non-Confidential Details**
1. Open "Properties - Non-Confidential" tab
2. Enter Property Code and details:
   - Project Code
   - Property Type Code: T001-T005
   - Layout Code: L001-L010
   - Size (SqFt)
   - Area Name
   - Number of Rooms
   - Number of Bathrooms
   - Floor Number
   - Facing Direction
   - Availability Status
   - Last Updated: =TODAY()

**Step 5: Add Financial Details**
1. Open "Properties - Financial" tab
2. Enter Property Code and details:
   - Price (AED)
   - Price per SqFt: =Price/(Size)
   - Listing Status
   - Commission Rate
   - Commission Amount
   - Payment Terms
   - Financing Available (Yes/No)
   - Down Payment Required
   - Monthly Payment (for rental)
   - Annual ROI

### Updating Contact Information

**Adding New Contact**
1. Open Contacts tab
2. Assign next Contact Code: C####
3. Enter:
   - Contact Name
   - Contact Type Code: CT001-CT006
   - Phone Number
   - Mobile
   - Secondary Mobile
   - Email
   - Address
   - Status: Active or Inactive

**Linking Contact to Property**
- Update Contact Code in Sheet1 column F for that property
- Updates automatically reflect in all detail tabs

### Changing Property Status

**Important**: Status changes must follow transition rules!

**Valid Transitions**:
- S001 (AVAILABLE-SELL) → S005 (SOLD), S009 (ARCHIVED)
- S002 (AVAILABLE-RENT) → S006 (RENTED), S003 (OCCUPIED), S009
- S003 (OCCUPIED-RENT) → S007 (RENEW), S008 (MAINT), S009
- S004 (OCCUPIED-OWNER) → S001 (SELL), S002 (RENT), S009
- etc.

**Steps to Change Status**:
1. Open Master View tab
2. Find property in the list (or filter by project)
3. Click Status cell
4. Select new status from dropdown (only allowed statuses shown)
5. Status Log entry automatically created with timestamp

**How to Add Change Reason**:
1. Navigate to "Property Status Log" tab
2. Find the row you just created (most recent)
3. In "Change Reason" column, enter reason
4. Example reasons:
   - "Tenant agreement signed - 2 year lease"
   - "Property sold to Buyer ABC for AED 850,000"
   - "Under maintenance, HVAC replacement"
   - "Tenant renewal negotiation in progress"

### Best Practices

✅ **DO**:
- Enter all required fields (marked with *)
- Use codes consistently (P####, C####, etc)
- Update Last Updated date when making changes
- Add notes for any special situations
- Change status as soon as property status changes
- Document reasons for status changes

❌ **DON'T**:
- Manually change codes (use auto-increment)
- Delete columns or properties
- Edit formulas in Master View or Status Log
- Change status without reason
- Mix different code formats
- Share confidential information in public views

### Quality Checks

Before submitting:
- [ ] All 6-digit codes correctly formatted
- [ ] Project Code exists in Projects tab
- [ ] Contact Code exists in Contacts tab
- [ ] Status Code valid (S001-S009)
- [ ] Required fields populated
- [ ] No duplicate Property Codes
- [ ] Last Updated date is recent

### Report Issues

If you encounter issues:
1. Check Code Reference guide
2. Verify formats match documentation
3. Contact: Lind or database admin
4. Include: Property Code, Tab Name, What Went Wrong

---

**Last Updated**: February 8, 2026  
**Version**: 1.0
`;

  return procedures;
}

/**
 * Generate Code Reference Guide
 */
function generateCodeReferenceGuide() {
  const guide = `# Code Reference Guide
## All Codes in the Database

### Property Code (P#####)
**Format**: P followed by 5 digits
**Range**: P00001 - P10383
**Total**: 10,383 properties
**Example**: P00001, P05432, P10383

### Project Code (PJ###)
**Format**: PJ followed by 3 digits
**Range**: PJ001 - PJ030
**Total**: 30 projects
**Example**: PJ001 (Damac Hills 2), PJ015, PJ030

**Project List**:
\`\`\`
PJ001: Damac Hills 1
PJ002: Damac Hills 2
PJ003: Akoya (Oxygen)
... (30 total)
\`\`\`

### Contact Code (C####)
**Format**: C followed by 4 digits
**Range**: C0001 - C8768
**Total**: 8,768 unique contacts
**Example**: C0001, C1234, C8768

### Layout Code (L###)
**Format**: L followed by 3 digits
**Range**: L001 - L010
**Total**: 10 layout types

| Code | Layout Name | Description |
|------|-------------|-------------|
| L001 | RR-M | Reception-Reception-Master |
| L002 | RR-EM | Extended Reception-Reception-Master |
| L003 | R2-MB | Reception-2Bed-Master Bath |
| L004 | R3-MB | Reception-3Bed-Master Bath |
| L005 | R3-EM | Reception-3Bed-Extended Master |
| L006 | Studio | Studio Bedroom |
| L007 | 1BR-STD | 1 Bedroom Standard |
| L008 | 1BR-EXT | 1 Bedroom Extended |
| L009 | PENT-CUSTOM | Penthouse Custom |
| L010 | VILLA-3BR | Villa 3 Bedroom |

### Property Type Code (T###)
**Format**: T followed by 3 digits
**Range**: T001 - T005
**Total**: 5 property types

| Code | Type | Beds | Price Range |
|------|------|------|------------|
| T001 | Studio | 0 | 300K-500K |
| T002 | 1 Bedroom | 1 | 400K-700K |
| T003 | 2 Bedroom | 2 | 600K-1.2M |
| T004 | 3 Bedroom + Hall | 3+ | 1M-2M |
| T005 | Penthouse/Premium | Varies | 2M+ |

### Status Code (S###)
**Format**: S followed by 3 digits
**Range**: S001 - S009
**Total**: 9 status types

| Code | Status | Color | Workflow | Meaning |
|------|--------|-------|----------|---------|
| S001 | AVAILABLE-SELL | 🟢 Green | SELL | Ready for sale |
| S002 | AVAILABLE-RENT | 🔵 Blue | RENT | Ready for rent |
| S003 | OCCUPIED-RENT | 🟠 Orange | RENT | Currently rented |
| S004 | OCCUPIED-OWNER | 🟡 Yellow | OWNER | Owner occupied |
| S005 | SOLD | ⚫ Gray | SELL | Sold |
| S006 | RENTED | 🔷 Blue | RENT | Lease signed |
| S007 | RENEW-TENANCY | 🟦 Light Blue | RENT | Renewal due |
| S008 | MAINTENANCE | 🔴 Red | MAINT | Under repair |
| S009 | ARCHIVED | ⚪ White | ARCHIVE | Inactive |

**Status Transitions**:
\`\`\`
SELL WORKFLOW:
S001 (AVAILABLE-SELL) → S005 (SOLD) → S009 (ARCHIVED)

RENT WORKFLOW:
S002 (AVAILABLE-RENT) → S006 (RENTED) → S003 (OCCUPIED-RENT)
                    ↓
                S007 (RENEW-TENANCY) → S003 (OCCUPIED-RENT)

OWNER WORKFLOW:
S004 (OCCUPIED-OWNER) → S001 (AVAILABLE-SELL) or S002 (AVAILABLE-RENT)

MAINTENANCE:
Any status → S008 (MAINTENANCE) → Back to original status
\`\`\`

### Contact Type Code (CT###)
**Format**: CT followed by 3 digits
**Range**: CT001 - CT006
**Total**: 6 contact types

| Code | Type | Role | Access Level |
|------|------|------|--------------|
| CT001 | Owner | Property owner | Full Access |
| CT002 | Tenant | Current renter | Limited Access |
| CT003 | Buyer | Potential buyer | View Only |
| CT004 | Agent | Sales/rental agent | Edit |
| CT005 | Lind | Database admin | Full |
| CT006 | Broker | Brokerage company | Full |

---

### Code Format Examples

**Complete Property Record**:
\`\`\`
Property: P00001
Project: PJ002 (Damac Hills 2)
Contact: C1234 (Owner Name)
Type: T003 (2 Bedroom)
Layout: L001 (RR-M)
Status: S001 (AVAILABLE-SELL)
\`\`\`

**Sample Status Change Log Entry**:
\`\`\`
Property Code: P05432
Previous Status: S002 (AVAILABLE-RENT)
New Status: S003 (OCCUPIED-RENT)
Status Change Date: 2026-02-08
Changed By: Lind
Change Reason: Tenant agreement signed - Mr. John Smith, 2-year lease
Effective From: 2026-02-10
Notes: 3BR villa, Monthly rent AED 8,500
\`\`\`

---

**Last Updated**: February 8, 2026  
**Version**: 1.0
`;

  return guide;
}

/**
 * Save all documentation to files
 */
function saveDocumentation() {
  console.log('\n📄 Generating Documentation Files...');
  
  const docsDir = path.join(__dirname, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Save all guides
  const files = {
    'MASTER_VIEW_USER_GUIDE.md': generateMasterViewUserGuide(),
    'DATABASE_STRUCTURE.md': generateDatabaseStructureDoc(),
    'DATA_ENTRY_PROCEDURES.md': generateDataEntryProcedures(),
    'CODE_REFERENCE_GUIDE.md': generateCodeReferenceGuide()
  };

  Object.entries(files).forEach(([filename, content]) => {
    const filepath = path.join(docsDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  ✅ Created: ${filename}`);
  });

  return Object.keys(files);
}

/**
 * RUN PHASE 7
 */
async function runPhase7() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PHASE 7: GENERATE DOCUMENTATION & TRAINING MATERIALS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    const files = saveDocumentation();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PHASE 7 COMPLETE: Documentation Generated');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nDocumentation Created (${files.length} files):`);
    
    files.forEach(file => {
      console.log(`  📖 ${file}`);
    });

    console.log('\nDocumentation includes:');
    console.log('  ✓ Master View User Guide');
    console.log('  ✓ Database Structure Documentation');
    console.log('  ✓ Data Entry Procedures');
    console.log('  ✓ Code Reference Guide');
    console.log('  ✓ Troubleshooting Guide');
    console.log('\n📁 Location: /docs/ folder');
    console.log('\n💡 Share these with your team for training and reference!');

  } catch (err) {
    console.error('❌ Error in Phase 7:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPhase7();
}

module.exports = {
  generateMasterViewUserGuide,
  generateDatabaseStructureDoc,
  generateDataEntryProcedures,
  generateCodeReferenceGuide,
  saveDocumentation,
  runPhase7
};
