# ⚡ QUICK REFERENCE CARD - ORGANIZED SHEET COLUMNS

## 📌 PIN THIS TO YOUR DESK

---

## 🎯 TWO NEW COLUMNS IN ORGANIZED SHEET

### Column O: PropertyLayout
**What it is:** Type of property (bedrooms, studios, villas, etc.)

| Code | Meaning |
|------|---------|
| STD | Studio Unit |
| 1B | 1 Bedroom |
| 2B | 2 Bedroom |
| 2B+M | 2 Bedroom + Maid Room |
| 3B | 3 Bedroom |
| 3B+M | 3 Bedroom + Maid Room |
| V2B | Villa 2 Bedroom |
| V3B | Villa 3 Bedroom |
| V4B | Villa 4 Bedroom |
| PH2B | Penthouse 2 Bedroom |
| PH3B | Penthouse 3 Bedroom |

**How to use:** Click cell → Dropdown appears → Select option

---

### Column P: PropertyStatus
**What it is:** Current status of the property in its lifecycle

| Code | Meaning | Example |
|------|---------|---------|
| SALE | Listed for sale (active) | "Property available for sale" |
| RENT | Available for rent | "Property for rent - accept tenants" |
| SOLD | Sale completed | "Property sold to buyer" |
| RENTED | Rental completed | "Tenant in place" |
| PENDING | Transaction in progress | "Buyer/Tenant approved, awaiting closing" |
| VACANT | Unit is empty | "Waiting to be sold or rented" |

**How to use:** Click cell → Dropdown appears → Select option

---

## 💡 COMMON USE CASES

### Filter for 2-Bedroom Sales

**In Google Sheets:**
```
Click Data → Filter
Column O: Select "2B" and "2B+M"
Column P: Select "SALE" and "PENDING"
Result: All 2-bedrooms available for purchase
```

**In Bot Campaign:**
```
Target: 2-bedroom properties
Message: "Interested buyers for your 2BR?"
Filter: Layout = 2B/2B+M AND Status = SALE/PENDING
```

### Track Closed Sales

**In Google Sheets:**
```
Click Data → Filter
Column P: Select only "SOLD"
Result: All properties that were successfully sold
```

**In Analytics:**
```javascript
const closedSales = properties.filter(p => p.PropertyStatus === 'SOLD');
console.log(`Closed sales this month: ${closedSales.length}`);
```

### Find Properties by Type

```
Studios (STD): Click Column O → Select "STD"
Villas: Click Column O → Select "V2B", "V3B", or "V4B"
With Maid: Click Column O → Select "2B+M" or "3B+M"
Penthouses: Click Column O → Select "PH2B" or "PH3B"
```

---

## ✅ IMPORTANT RULES

✅ **DO:**
- Use dropdown menus (click cell, select from list)
- Keep data standardized and consistent
- Update status when property status changes
- Verify layout matches actual property type

❌ **DON'T:**
- Type freeform text in these columns
- Use different spellings (always use codes like "2B", not "2-Bedroom")
- Leave blank if possible (use dropdown selection)
- Copy-paste old data that might be incorrect

---

## 📊 COLUMN STATUS TODAY

| Column | Name | Filled | Empty | Complete |
|--------|------|--------|-------|----------|
| O | PropertyLayout | 573 | 9,810 | 5.5% |
| P | PropertyStatus | 10,384 | 0 | 100% ✅ |

**What this means:**
- PropertyStatus: Ready to use now ✅
- PropertyLayout: Needs manual assignment for 9,810 properties ⏳

---

## 🔄 DAILY WORKFLOW

### Real Estate Agent
1. Add new property to sheet
2. Fill in basic info (Column A-N)
3. **Select PropertyLayout** from dropdown (Column O)
4. **Select PropertyStatus** from dropdown (Column P)
5. Save and list for marketing

### Bot Admin
1. Run bot campaigns
2. Filter by PropertyLayout (target specific buyer types)
3. Filter by PropertyStatus (don't contact SOLD properties)
4. Send targeted messages

### Analyst
1. Use Column O & P for segmentation
2. Calculate % by layout type
3. Track SALE → SOLD conversion
4. Report market performance

---

## 🆘 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| No dropdown appearing | Refresh page or contact admin |
| Can't type custom value | That's correct! Use dropdown only |
| Wrong code in cell | Click cell → Clear → Select from dropdown |
| Forgot the status codes | Check this card or scroll to see all options |

---

## 📞 QUESTIONS?

**About Column O (PropertyLayout)?**
→ Check the 11 layout codes in the table above

**About Column P (PropertyStatus)?**
→ Check the 6 status codes and what they mean

**Can't find the columns?**
→ Look at the rightmost columns (O and P in the sheet)

**Need historical data or bulk update?**
→ Contact systems admin

---

## 🎓 3-MINUTE TRAINING

**Column O:**
- Click any cell
- See a dropdown arrow appear
- Click the arrow
- Select from 11 property type options
- Done! ✅

**Column P:**
- Same as above
- But only 6 status options
- Update when property status changes
- Done! ✅

---

## 📋 CHECKLISTS

### New Property Checklist
- [ ] Enter basic property info (A-N)
- [ ] Select PropertyLayout from dropdown (O)
- [ ] Select PropertyStatus from dropdown (P)
- [ ] Verify all required fields filled
- [ ] Save and publish

### Monthly Review Checklist
- [ ] Review all PENDING properties (should they move to SOLD/RENTED?)
- [ ] Verify any new VACANT listings
- [ ] Check for any unknown layouts in Column O
- [ ] Update analytics dashboard

---

## 📈 WHAT THESE COLUMNS ENABLE

Before:
- ❌ Can't segment properties by type
- ❌ No status tracking
- ❌ Manual file management

After:
- ✅ One-click filtering by property type
- ✅ Automated lifecycle tracking
- ✅ Data-driven campaigns and analytics
- ✅ Professional property management

---

## 🚀 EXAMPLES

**Find luxury 3BR properties for sale:**
```
Filter: O = "3B" OR "3B+M", P = "SALE"
Result: All 3-bedroom properties actively listed
Use: Send to luxury property buyers
```

**Track pending transactions:**
```
Filter: P = "PENDING"
Result: All properties awaiting completion
Use: Follow up on status changes
```

**Market analysis by property type:**
```
Count: How many of each layout type
Calculate: % 1BR vs 2BR vs 3BR vs Studios
Use: Report on product mix to stakeholders
```

---

## 📍 LOCATION IN SHEET

```
Column A          Column O              Column P
↓                 ↓                     ↓
Code  ...  Info   PropertyLayout        PropertyStatus
P001  ...  data   [2B]                  [SALE]
P002  ...  data   [EMPTY] ← needs fill  [SALE]
P003  ...  data   [V3B]                 [PENDING]
```

---

## ⏭️ NEXT STEPS FOR YOUR TEAM

1. **Learn:** Read this card and understand the 17 codes
2. **Test:** Open sheet, click 5 cells in Column O and P
3. **Practice:** Update 10 properties with correct codes
4. **Use:** Incorporate into daily workflow
5. **Report:** Use for marketing insights and analytics

---

**Keep this handy! Bookmark or print this card for daily reference.** 📌

*Last Updated: 2024*  
*Version: 1.0 - Production Ready*
