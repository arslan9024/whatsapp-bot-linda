# Akoya Sheet - Architecture & Data Flow

## 📊 Master View Tab Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ MASTER VIEW - Complete Real Estate Database                    │
│ (10,654 Properties × 26 Columns)                               │
└─────────────────────────────────────────────────────────────────┘

📍 ROWS 1-3: FILTER & INSTRUCTION PANEL
┌─────────────────────────────────────────────────────────────────┐
│ Row 1: "AKOYA SHEET - MASTER VIEW | All Data Visible"          │
├─────────────────────────────────────────────────────────────────┤
│ Row 2: [Search Filters]                                         │
│        Mobile:        [________] Unit:    [________]            │
│        Registration:  [________] Project: [________] (Optional) │
├─────────────────────────────────────────────────────────────────┤
│ Row 3: "Tip: Leave filters empty to see all 10,654 records"    │
└─────────────────────────────────────────────────────────────────┘

📝 ROW 4: SEPARATOR
┌─────────────────────────────────────────────────────────────────┐
│ (Empty row for visual separation)                               │
└─────────────────────────────────────────────────────────────────┘

🏷️  ROW 5: COLUMN HEADERS (Formatted: Bold, Dark Background)
┌─────────────────────────────────────────────────────────────────┐
│ A: P-NUMBER  │ B: AREA  │ C: PROJECT  │ D: PLOT  │ E: NAME    │
│ F: PHONE     │ G: EMAIL │ H: MOBILE   │ I: SEC_MOBILE │...    │
└─────────────────────────────────────────────────────────────────┘

📊 ROWS 6-10,659: DATA (10,654 Property Records)
┌─────────────────────────────────────────────────────────────────┐
│ Row 6:    [Property 1 Data     - All 26 columns]              │
│ Row 7:    [Property 2 Data     - All 26 columns]              │
│ Row 8:    [Property 3 Data     - All 26 columns]              │
│ ...       [More Properties      - All 26 columns]              │
│ Row 10659:[Property 10,654 Data - All 26 columns]              │
└─────────────────────────────────────────────────────────────────┘

📈 ROWS 10,660+: BUFFER SPACE (Future Growth)
┌─────────────────────────────────────────────────────────────────┐
│ (Empty rows available for new records)                          │
│ Grid expanded to Row 12,000 for future additions                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Column Reference Guide

### Group 1: Property Identification (Columns A-E)
```
A │ P-NUMBER      │ Unique property code (e.g., P-001234)
B │ AREA          │ Geographic area or cluster
C │ PROJECT       │ Project name/code
D │ PLOT NUMBER   │ Plot identifier
E │ NAME          │ Property name or primary contact name
```

### Group 2: Contact Information (Columns F-I)
```
F │ PHONE         │ Primary phone number
G │ EMAIL         │ Primary email address
H │ MOBILE        │ Primary mobile number (FILTERABLE)
I │ SEC_MOBILE    │ Secondary mobile number
```

### Group 3: Property Details (Columns J-Q)
```
J │ CATEGORY      │ Property category/type
K │ TYPE          │ Detailed property type
L │ UNIT          │ Unit number (FILTERABLE)
M │ STATUS        │ Current status
N │ PRICE         │ Listed price
O │ BEDROOMS      │ Number of bedrooms
P │ BATHROOMS     │ Number of bathrooms
Q │ AREA_SQ_FT    │ Area in square feet
```

### Group 4: Administrative (Columns R-Z)
```
R │ REGISTRATION  │ Registration number (FILTERABLE)
S │ DEVELOPER     │ Developer/builder name
T │ LOCATION      │ Specific location details
U │ PAYMENT_PLAN  │ Payment plan details
V │ FEATURES      │ Property features/amenities
W │ NOTES         │ Additional notes
X │ DATE_ADDED    │ When record was created
Y │ LAST_UPDATED  │ Last modification date
Z │ AGENT         │ Assigned agent name
```

### Group 5: External Reference (Column AA)
```
AA│ REFERENCE     │ External reference or ID
```

---

## 🔍 Filter System Guide

### Available Filters

```
┌─────────────────────────────────────────┐
│ FILTER LOCATION | INPUT CELL | COLUMN   │
├─────────────────────────────────────────┤
│ Mobile Number  │ D2          │ H        │
│ Unit Number    │ F2          │ L        │
│ Registration   │ H2          │ R        │
└─────────────────────────────────────────┘
```

### Filter Examples

**Example 1: Find properties with specific mobile number**
```
Cell D2 Input: 971501234567
Result: Shows all rows where MOBILE column contains this number
```

**Example 2: Find all units in specific unit number**
```
Cell F2 Input: A101
Result: Shows all properties in unit A101
```

**Example 3: Find by registration number**
```
Cell H2 Input: REG-2024-00123
Result: Shows property with that registration
```

**Example 4: View All Data (Default)**
```
All Filter Cells: [Empty]
Result: All 10,654 rows visible
```

---

## 📚 Reference Sheets

### Sheet 1: Clusters
```
Contains unique cluster identifiers extracted from data
Used for advanced lookups and cluster-based analysis
```

### Sheet 2: Raw Data Backup
```
Complete backup of all original data from Oxygen2023 sheet
Use if Master View needs to be restored
```

---

## 🔄 Data Flow Diagram

```
┌──────────────────────────┐
│  Oxygen2023 Sheet        │
│  (Original Backup)       │
│  43 Sheets / 10,654 rows │
└────────────┬─────────────┘
             │
             ├─ Analysis & Validation
             │
             ▼
┌──────────────────────────┐
│  Master View Sheet       │
│  - All 10,654 rows       │
│  - All 26 columns        │
│  - All data visible      │
│  - Filters ready         │
└──────────┬───────────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
┌──────────┐ ┌──────────┐
│ Clusters │ │Raw Data  │
│Reference │ │ Backup   │
└──────────┘ └──────────┘
```

---

## 🎯 User Workflow

### Step 1: Access Master View
```
[Open Google Sheet] → Click "Master View" Tab → See all 10,654 rows
```

### Step 2: Browse Data
```
Scroll left/right: See all 26 columns
Scroll up/down: Browse 10,654 property records
Use Ctrl+F: Quick search for specific values
```

### Step 3: Apply Filters (Optional)
```
Enter Mobile/Unit/Registration in Row 2 → Matches highlighted/filtered
```

### Step 4: Export or Analyze
```
Select rows → Copy to clipboard → Paste into Excel/Word
Or use Google Sheets built-in functions for analysis
```

### Step 5: Clear Filters
```
Delete content in filter cells → All data visible again
```

---

## 📊 Data Integrity Summary

| Aspect | Details | Status |
|--------|---------|--------|
| **Source Sheet** | Oxygen2023 | ✅ Read-Only |
| **Master View** | All 10,654 rows | ✅ Live |
| **Column Count** | 26 columns | ✅ Complete |
| **Data Preservation** | 100% intact | ✅ Verified |
| **Grid Size** | 12,000 rows × 30 cols | ✅ Adequate |
| **Filters Active** | 3 main + extensible | ✅ Ready |
| **Reference Sheets** | 2 created | ✅ Available |
| **Formatting** | Headers + filters | ✅ Applied |

---

## 🚀 Operational Features

### Built-In
- ✅ 10,654 complete property records
- ✅ All historical data preserved
- ✅ 26 searchable/sortable columns
- ✅ Filter by Mobile, Unit, Registration
- ✅ Data backup sheets included
- ✅ Expandable grid (room for growth)

### Available Today
- ✅ Full text search (Ctrl+F)
- ✅ Column sorting (A→Z, Z→A)
- ✅ Data export to Excel/CSV
- ✅ Manual filtering via rows
- ✅ Print-friendly view

### Recommended Add-Ons
- 📊 Dashboard with key metrics
- 📈 Pivot tables for analysis
- 🔐 Data validation rules
- 🔄 Automated backup system
- 👥 User access controls
- 📱 Mobile view optimization

---

## ✅ Launch Checklist

- [x] All data imported (10,654 records)
- [x] All columns preserved (26 columns)
- [x] Filters configured and tested
- [x] Reference sheets created
- [x] Formatting applied
- [x] Grid properly sized
- [x] Documentation completed
- [x] Backup verified
- [x] Quality assurance passed
- [x] Ready for production use

---

**Sheet Status:** 🟢 OPERATIONAL  
**Last Updated:** January 26, 2026  
**Ready for Use:** ✅ YES  

