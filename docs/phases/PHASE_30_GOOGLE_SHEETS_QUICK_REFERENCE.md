# Phase 30: Google Sheets CRUD - Quick Reference

## ⚡ Quick Start

### 1. Start Linda Bot
```bash
npm start
```

Wait for initialization message:
```
✅ Phase 30: GoogleSheetsManager initialized (Google Sheets CRUD operations)
```

### 2. Access Terminal Commands
Once initialized, type any of these commands:

---

## 📖 Command Reference

### 1️⃣ READ - Get Sheet Data

**Command:**
```
sheets read <spreadsheet-id> [range]
```

**Examples:**
```shell
# Read entire sheet (default Sheet1)
sheets read 1A2B3C4D

# Read specific range
sheets read 1A2B3C4D Sheet1!A1:Z100

# Read different sheet
sheets read 1A2B3C4D Contacts!A1:D20
```

**Output:**
```
📊 Reading sheet...
✅ Successfully read 10 rows

Range: Sheet1!A1:Z100
Columns: 5

📋 Data:

  1. John Doe | john@example.com | 123-456-7890
  2. Jane Smith | jane@example.com | 098-765-4321
  ...
```

---

### 2️⃣ CREATE - Add Row

**Command:**
```
sheets add <spreadsheet-id> <sheet-name> <value1> [value2] ...
```

**Examples:**
```shell
# Add single value
sheets add 1A2B3C4D Sheet1 John

# Add multiple values (row)
sheets add 1A2B3C4D Sheet1 John Doe john@example.com 123-456-7890

# Add to different sheet
sheets add 1A2B3C4D Contacts Alice Brown alice@example.com
```

**Output:**
```
📝 Adding row to sheet...
✅ Successfully added row
Sheet: Sheet1
Cells Updated: 4
```

---

### 3️⃣ UPDATE - Modify Cell

**Command:**
```
sheets update <spreadsheet-id> <cell> <value>
```

**Examples:**
```shell
# Update single cell
sheets update 1A2B3C4D Sheet1!A1 John Doe

# Update with email
sheets update 1A2B3C4D Sheet1!B5 newname@example.com

# Update in different sheet
sheets update 1A2B3C4D Contacts!C10 New Phone Number
```

**Output:**
```
✏️  Updating cell...
✅ Successfully updated
Cell: Sheet1!A1
New Value: John Doe
```

---

### 4️⃣ DELETE - Remove Row

**Command:**
```
sheets delete <spreadsheet-id> <sheet-name> [row-index]
```

**Examples:**
```shell
# Delete row 1 (first data row)
sheets delete 1A2B3C4D Sheet1 1

# Delete row 5
sheets delete 1A2B3C4D Sheet1 5

# Delete from different sheet
sheets delete 1A2B3C4D Contacts 3
```

**Output:**
```
🗑️  Deleting row...
✅ Successfully deleted row 1 from Sheet1
```

---

### 5️⃣ SEARCH - Find Value

**Command:**
```
sheets search <spreadsheet-id> [range] <text>
```

**Examples:**
```shell
# Search in entire sheet
sheets search 1A2B3C4D Sheet1 John

# Search in range
sheets search 1A2B3C4D Sheet1!A1:C100 example.com

# Search in different sheet
sheets search 1A2B3C4D Contacts Alice
```

**Output:**
```
🔍 Searching sheet for: "John"...
✅ Found 2 match(es)

  1. Cell: A1
     Value: John Doe

  2. Cell: A5
     Value: Johnny Smith
```

---

### 6️⃣ INFO - Get Spreadsheet Metadata

**Command:**
```
sheets info <spreadsheet-id>
```

**Examples:**
```shell
# Get spreadsheet info
sheets info 1A2B3C4D

# Another ID
sheets info 5F6G7H8I9J0K
```

**Output:**
```
📊 Fetching spreadsheet metadata...
✅ Spreadsheet: My Database
Total Sheets: 3

📋 Sheets:

  1. Contacts
     ID: 0
     Size: 150 rows × 5 columns

  2. Sales
     ID: 123456
     Size: 200 rows × 8 columns

  3. Archive
     ID: 789012
     Size: 50 rows × 3 columns
```

---

## 🔑 Getting Your Spreadsheet ID

### From Google Sheets URL
```
https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit#gid=0
                                        ↑ This is your spreadsheet ID
```

### Copy the long ID between `/d/` and `/edit`

**Your ID:** `1A2B3C4D5E6F7G8H9I0J`

---

## 💡 Pro Tips

### 1. Use Meaningful Ranges
```shell
# Better: Specific range with headers
sheets read 1A2B3C4D Contacts!A1:E100

# Avoid: Reading unlimited columns
sheets read 1A2B3C4D Sheet1!A:Z
```

### 2. Include Headers in Row Data
```shell
# Good: Complete row with all data
sheets add 1A2B3C4D Sheet1 John Doe john@example.com 123-456-7890

# Avoid: Partial data (may misalign)
sheets add 1A2B3C4D Sheet1 John
```

### 3. Verify Before Deleting
```shell
# 1. Search first
sheets search 1A2B3C4D Sheet1 John

# 2. Confirm row number
# 3. Then delete
sheets delete 1A2B3C4D Sheet1 5
```

### 4. Use Clear Names
```shell
# Good: Sheet names without spaces or special chars
sheets read 1A2B3C4D Contacts

# Avoid: Spaces and special characters
sheets read 1A2B3C4D "Contact List 2024"
```

---

## ❌ Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| `sheets read ID` | Assumes Sheet1 | Specify range: `sheets read ID Sheet1!A1:Z` |
| Spaces in values | Values may split | Quote long values: `sheets add ID Sheet1 "John Smith"` |
| Wrong sheet name | Sheet not found | Use `sheets info ID` to see sheet names |
| Row index off by one | Deletes wrong row | Verify with `sheets search` first |

---

## 🚀 Workflow Examples

### Workflow 1: Add New Contact

```shell
# Step 1: Get current count
sheets info 1A2B3C4D
# → Total rows: 150

# Step 2: Add new contact
sheets add 1A2B3C4D Contacts John Doe john@example.com 123-456-7890

# Step 3: Verify it was added
sheets search 1A2B3C4D Contacts John Doe
# → Found 1 match in A151
```

### Workflow 2: Update Contact Info

```shell
# Step 1: Find contact
sheets search 1A2B3C4D Contacts john@example.com
# → Found in cell B45

# Step 2: Update phone (column D)
sheets update 1A2B3C4D Contacts!D45 987-654-3210

# Step 3: Verify update
sheets read 1A2B3C4D Contacts!D45
# → 987-654-3210
```

### Workflow 3: Clean Up Old Records

```shell
# Step 1: List all sheets
sheets info 1A2B3C4D

# Step 2: Search in archive
sheets search 1A2B3C4D Archive 2023

# Step 3: Check row numbers
sheets read 1A2B3C4D Archive!A190:A200

# Step 4: Delete old rows
sheets delete 1A2B3C4D Archive 190
sheets delete 1A2B3C4D Archive 191
```

---

## 🔗 Integration with WhatsApp

### Future: Send Sheet Data via WhatsApp

```
User: !export contacts
Bot: ✅ Exporting contacts...
     sheets read <ID> Contacts
     Sends first 10 contacts via WhatsApp message
```

### Future: Receive Data to Sheet

```
User: !add-contact John Doe john@example.com
Bot: ✅ Adding contact...
     sheets add <ID> Contacts John Doe john@example.com
     File saved to spreadsheet
```

---

## 📞 Troubleshooting

### Error: "Cannot find module"
**Solution:** GoogleSheetsManager not initialized. Check server startup logs.

### Error: "Sheet not found"
**Solution:** Verify sheet name matches exactly (case-sensitive)

### Error: "Invalid spreadsheet ID"
**Solution:** Copy entire ID from Google Sheets URL: `/d/<ID>/edit`

### Error: "Authentication failed"
**Solution:** Verify PowerAgent credentials in .env file

### Command doesn't work
**Solution:** Type `help` and see Google Sheets section for correct syntax

---

## 📊 Permission Reference

All operations use **PowerAgent** service account with:
- ✅ Read/Write access to spreadsheets
- ✅ Create/Delete sheets
- ✅ Edit cell values
- ❌ Share spreadsheets
- ❌ Change ownership

---

## 🎯 Best Practices

1. **Always backup important data** before bulk deletes
2. **Use meaningful sheet names** (Contacts, Sales, Archive)
3. **Include headers** in your spreadsheets
4. **Keep row count reasonable** (search slower on 10k+ rows)
5. **Test with sample data** before production use
6. **Log important changes** for audit trail

---

## 📚 See Also

- Full documentation: `PHASE_30_GOOGLE_SHEETS_CRUD_DELIVERY.md`
- Google Sheets API: https://developers.google.com/sheets/api
- Sample spreadsheet setup guide: Coming soon in Phase 31

---

**Last Updated:** February 19, 2026  
**Status:** Production Ready  
**Support:** Type `help` in terminal or see full delivery doc
