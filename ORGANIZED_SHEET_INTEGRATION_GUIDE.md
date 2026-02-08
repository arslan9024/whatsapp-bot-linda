# ORGANIZED SHEET INTEGRATION GUIDE 📚
## How to Use PropertyLayout & PropertyStatus Columns

**Date:** 2024  
**Status:** ✅ Production Ready  
**Sheet:** [Organized Sheet](https://docs.google.com/spreadsheets/d/1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk)

---

## 📊 CURRENT DATA STATUS

### Verification Results
```
PropertyLayout Column (O)
  ✓ Populated:    573 rows (with detected layouts)
  ⚠ Empty:       9,810 rows (need manual assignment)
  Completion:      5.5%

PropertyStatus Column (P)
  ✓ Populated:   10,384 rows (all set to "SALE")
  ⚠ Empty:            0 rows
  Completion:       100%
```

### Column Headers
- **Column O:** PropertyLayout (Damac Hills 2 apartment types)
- **Column P:** PropertyStatus (Current property status in sales lifecycle)

---

## 🎯 PROPERTY LAYOUT CODES (Column O)

### Available Options (11 codes)
```
STD      = Studio Unit
1B       = 1 Bedroom
2B       = 2 Bedroom
2B+M     = 2 Bedroom + Maid Room
3B       = 3 Bedroom
3B+M     = 3 Bedroom + Maid Room
V2B      = Villa 2 Bedroom
V3B      = Villa 3 Bedroom
V4B      = Villa 4 Bedroom
PH2B     = Penthouse 2 Bedroom
PH3B     = Penthouse 3 Bedroom
```

### How to Use in Filtering

#### Excel/Google Sheets Formula
```excel
=FILTER(OrganizedSheet!A:P, OrganizedSheet!O:O = "2B")
```

#### Using Exclamation Filter
1. Click on Column O header
2. Select Data → Filter
3. Choose desired layout codes
4. Results show only matching properties

#### For Bot Operations
```javascript
// JavaScript: Get all 2-bedroom properties
const twoBedrooms = properties.filter(p => p.PropertyLayout === '2B' || p.PropertyLayout === '2B+M');

// Get all villas
const villas = properties.filter(p => p.PropertyLayout.startsWith('V'));

// Get all penthouses
const penthouses = properties.filter(p => p.PropertyLayout.startsWith('PH'));

// Get all studios
const studios = properties.filter(p => p.PropertyLayout === 'STD');
```

---

## 💼 PROPERTY STATUS CODES (Column P)

### Available Options (6 codes)
```
SALE      = Property listed for sale (active)
RENT      = Property available for rent
SOLD      = Property transaction completed
RENTED    = Rental agreement completed
PENDING   = Transaction in progress / awaiting confirmation
VACANT    = Unit is empty / not yet rented or sold
```

### Status Lifecycle
```
SALE → PENDING → SOLD (completed sales)
  OR
RENT → PENDING → RENTED (completed rentals)
  OR
VACANT → SALE/RENT (whenever listed again)
```

### How to Use in Campaign Filtering

#### Excel/Google Sheets Formula
```excel
=COUNTIF(OrganizedSheet!P:P, "SALE")
```

#### For Bot Operations - Sales Campaign
```javascript
// Get all properties actively for sale
const activeSaleProperties = properties.filter(p => 
  p.PropertyStatus === 'SALE' || p.PropertyStatus === 'PENDING'
);

// Send sales-focused messages
sendBroadcast(
  activeSaleProperties,
  salesTemplate
);
```

#### For Bot Operations - Rental Campaign
```javascript
// Get all properties available for rent
const rentalProperties = properties.filter(p => 
  p.PropertyStatus === 'RENT' || p.PropertyStatus === 'PENDING'
);

// Send rental-focused messages
sendBroadcast(
  rentalProperties,
  rentalTemplate
);
```

#### For Bot Operations - Reporting
```javascript
// Get statistics by status
const statusDistribution = {
  forSale: properties.filter(p => p.PropertyStatus === 'SALE').length,
  forRent: properties.filter(p => p.PropertyStatus === 'RENT').length,
  sold: properties.filter(p => p.PropertyStatus === 'SOLD').length,
  rented: properties.filter(p => p.PropertyStatus === 'RENTED').length,
  pending: properties.filter(p => p.PropertyStatus === 'PENDING').length,
  vacant: properties.filter(p => p.PropertyStatus === 'VACANT').length
};

console.log('Active Sales:', statusDistribution.forSale);
console.log('Active Rentals:', statusDistribution.forRent);
```

---

## 🔧 INTEGRATION EXAMPLES

### Example 1: Campaign by Property Type

**Scenario:** Send specialized message to 2-bedroom property owners

```javascript
// Filter properties
const targetProperties = properties.filter(p => 
  p.PropertyLayout === '2B' || p.PropertyLayout === '2B+M'
);

// Define specialized message template
const message2BTemplate = `
Hi {name},

We have identified {count} 2-bedroom properties in your portfolio.
These units consistently attract families and working professionals.

Would you like to list these properties with us?

Best regards,
Real Estate Team
`;

// Send campaign
const response = await sendBroadCast({
  recipients: targetProperties,
  template: message2BTemplate,
  campaignName: '2BR-Specialist-Campaign'
});

console.log(`Sent to ${response.successCount} properties`);
```

### Example 2: Dynamic Follow-up for PENDING Properties

**Scenario:** Automatically follow up on properties awaiting transaction completion

```javascript
// Find properties in PENDING status
const pendingProperties = properties.filter(p => 
  p.PropertyStatus === 'PENDING'
);

// Create reminder message
const followUpMessage = `
Hi {name},

We're following up on your property listed last month.

Status: Currently Under Contract
Next Steps: [Provide specific updates]

How can we assist?
`;

// Schedule follow-up campaign
await scheduleFollowUp({
  recipients: pendingProperties,
  message: followUpMessage,
  schedule: 'weekly',
  duration: '30 days'
});
```

### Example 3: Market Analysis by Property Type

**Scenario:** Generate report of property distribution by layout

```javascript
// Aggregate data by layout type
const layoutAnalysis = {};

properties.forEach(p => {
  const layout = p.PropertyLayout || 'UNKNOWN';
  layoutAnalysis[layout] = (layoutAnalysis[layout] || 0) + 1;
});

// Generate market share
console.log('PROPERTY DISTRIBUTION:');
console.log('=====================');
Object.entries(layoutAnalysis)
  .sort((a, b) => b[1] - a[1])
  .forEach(([layout, count]) => {
    const percentage = ((count / properties.length) * 100).toFixed(1);
    console.log(`${layout}: ${count} (${percentage}%)`);
  });
```

### Example 4: Combined Filtering

**Scenario:** Find 3-bedroom properties currently for sale

```javascript
// Multi-condition filter
const targetMarket = properties.filter(p =>
  (p.PropertyLayout === '3B' || p.PropertyLayout === '3B+M') &&
  (p.PropertyStatus === 'SALE' || p.PropertyStatus === 'PENDING')
);

console.log(`Found ${targetMarket.length} 3-bedroom properties available`);

// Group by project to see concentration
const byProject = targetMarket.reduce((acc, p) => {
  const project = p.Project;
  acc[project] = (acc[project] || 0) + 1;
  return acc;
}, {});

console.log('Distribution by project:', byProject);
```

---

## 📝 MANUAL UPDATE WORKFLOW

### For PropertyLayout (Column O)
Since only 5.5% is populated, manual review is needed:

**Process:**
1. Open Organized Sheet
2. Filter Column O for empty cells
3. Review property details in columns A-F
4. Consult original source documents (email records, inquiries)
5. Select appropriate layout from dropdown
6. Save change (automatically updates)

**Expected Time:** ~1-2 hours for full population

### For PropertyStatus (Column P)
All set to "SALE" - review periodically:

**Process:**
1. Monthly review recommended
2. Change status when property status changes
3. Use dropdown to ensure data consistency
4. Track SALE → SOLD conversions
5. Track RENT → RENTED conversions

---

## 🔐 DATA VALIDATION

Both columns have dropdown validation enabled:

### PropertyLayout (Column O)
- **Type:** List validation
- **Options:** 11 layout codes (listed above)
- **Behavior:** Only allows predefined values
- **User Experience:** Click cell → dropdown appears → select option

### PropertyStatus (Column P)
- **Type:** List validation  
- **Options:** 6 status codes (listed above)
- **Behavior:** Only allows predefined values
- **User Experience:** Click cell → dropdown appears → select option

### Testing Validation
```
Try this in the sheet:
1. Click any cell in Column O
2. You should see a small dropdown arrow
3. Click it to see 11 layout options
4. Same for Column P with 6 status options
```

---

## ⚙️ SCRIPTING REFERENCE

### Quick Integration Template

```javascript
import { getOrganizedSheet } from './code/GoogleSheet/getGoogleSheet.js';

async function analyzeByLayout() {
  try {
    // Get sheet data
    const rows = await getOrganizedSheet();
    
    // Parse into properties
    const properties = rows.slice(1).map(row => ({
      code: row[0],
      pNumber: row[1],
      area: row[2],
      project: row[3],
      name: row[5],
      phone: row[6],
      email: row[7],
      mobile: row[8],
      propertyLayout: row[14],  // Column O (index 14, 0-based)
      propertyStatus: row[15]   // Column P (index 15, 0-based)
    }));
    
    // Example: Count by layout
    const counts = {};
    properties.forEach(p => {
      const layout = p.propertyLayout || 'UNKNOWN';
      counts[layout] = (counts[layout] || 0) + 1;
    });
    
    console.log('Property counts by layout:', counts);
    
    // Example: Filter for campaigns
    const salesActive = properties.filter(p => 
      p.propertyStatus === 'SALE' || p.propertyStatus === 'PENDING'
    );
    
    console.log(`Found ${salesActive.length} properties available for sale`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeByLayout();
```

### Column Index Reference
```
Column O (PropertyLayout) = Index 14 (0-based) or 15 (1-based)
Column P (PropertyStatus) = Index 15 (0-based) or 16 (1-based)

When reading from sheet arrays:
row[14] = PropertyLayout (if 0-based indexing)
row[15] = PropertyStatus (if 0-based indexing)
```

---

## 🚀 RECOMMENDED NEXT STEPS

### Phase 1: Immediate (This Week)
- [ ] Review sample of 50 properties and verify layout assignments
- [ ] Walk through filtering examples with team
- [ ] Test bot campaign with status-based filtering

### Phase 2: Short-term (Next 2 Weeks)
- [ ] Complete PropertyLayout population (9,810 remaining)
- [ ] Validate PropertyStatus values against actual sale records
- [ ] Update bot broadcasts to use layout-based targeting

### Phase 3: Medium-term (Next Month)
- [ ] Implement master view dashboard with dropdowns
- [ ] Create analytics reports by layout and status
- [ ] Set up automated status tracking

### Phase 4: Long-term (Ongoing)
- [ ] Monitor data quality and consistency
- [ ] Use layout/status data for trend analysis
- [ ] Optimize bot messaging based on property types

---

## 📞 TROUBLESHOOTING

### Issue: Dropdown not appearing in Column O/P
**Solution:** Data validation may have failed. Run `addDataValidation.js` again:
```bash
node addDataValidation.js
```

### Issue: Need to update PropertyStatus for 100 properties
**Solution:** Use Google Sheets batch update feature:
```javascript
// Contact systems admin for bulk update script
```

### Issue: Unknown layouts (EMPTY cells in Column O)
**Solution:** 
1. Check original correspondence for property details
2. Manual assignment required
3. Use `rectifyOnePhoneNumber.js` pattern as reference

### Issue: Dropdown showing wrong values
**Solution:** Check PropertyLayoutConfig.js and PropertyStatusConfig.js for accuracy

---

## 📊 ANALYTICS DASHBOARD IDEAS

### Potential Reports
1. **Property Mix by Layout**
   - % of 1BR vs 2BR vs 3BR units
   - Revenue potential by layout type

2. **Sales Funnel by Status**
   - SALE → PENDING rate
   - PENDING → SOLD conversion rate
   - Time average in each status

3. **Portfolio Health**
   - % SALE vs RENT vs VACANT
   - Average days in PENDING status

4. **Campaign Performance by Layout**
   - Response rate by property type
   - Conversion rate by property type
   - Best-performing layouts

---

## 🎓 TEAM TRAINING CHECKLIST

- [ ] Team understands 11 layout codes
- [ ] Team understands 6 status codes
- [ ] Team can use dropdown to update layout
- [ ] Team can use dropdown to update status
- [ ] Team knows filtering by these columns
- [ ] Team has tested sample campaign with filtering
- [ ] Team understands data quality implications
- [ ] Team knows escalation path for issues

---

## 📞 SUPPORT & QUESTIONS

**For issues with:**
- **Sheet structure:** Check ORGANIZED_SHEET_ENRICHMENT_COMPLETE.md
- **Integration examples:** See scripts above
- **Data quality:** Contact systems team for bulk updates
- **Bot integration:** Update relevant broadcast/message scripts

---

**Ready to integrate!** These new columns enable targeted marketing, accurate analytics, and property lifecycle tracking. 🚀
