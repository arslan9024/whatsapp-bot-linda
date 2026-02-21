# Phase 30: Google Sheets CRUD - Technical Implementation Guide

## 📋 Table of Contents
1. Architecture Overview
2. File Structure
3. Code Integration Points
4. API Reference
5. Error Handling
6. Testing Guidelines
7. Maintenance Notes

---

## 🏗️ Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                    User Terminal                         │
│              Type: sheets read <id> <range>             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│         TerminalHealthDashboard.js                      │
│         (Command Line Interface)                         │
│                                                          │
│  • Parse user input                                     │
│  • Extract spreadsheetId, sheetName, values             │
│  • Validate parameters                                  │
│  • Call appropriate callback                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│      TerminalDashboardSetup.js                          │
│      (Command Callbacks)                                 │
│                                                          │
│  • onGoogleSheetsRead                                   │
│  • onGoogleSheetsCreate                                 │
│  • onGoogleSheetsUpdate                                 │
│  • onGoogleSheetsDelete                                 │
│  • onGoogleSheetsSearch                                 │
│  • onGoogleSheetsMetadata                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│       GoogleSheetsManager.js                            │
│       (Core Business Logic)                              │
│                                                          │
│  Method: readSheet(spreadsheetId, range)               │
│  Method: appendRow(spreadsheetId, sheetName, values)   │
│  Method: updateCell(spreadsheetId, cellReference, ...)  │
│  Method: deleteRow(spreadsheetId, sheetName, rowIndex) │
│  Method: searchSheet(spreadsheetId, range, value)      │
│  Method: getMetadata(spreadsheetId)                     │
│  ...                                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│     GoogleServiceAccountManager.js                      │
│     (Authentication)                                     │
│                                                          │
│  • Load credentials from .env (base64)                  │
│  • Decode JSON credentials                              │
│  • Provide to GoogleSheetsManager                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Google Auth (googleapis lib)                   │
│                                                          │
│  • Create authenticated client                          │
│  • OAuth2 with service account                          │
│  • Sheets API v4 endpoint                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│         Google Sheets API                               │
│         (Cloud Service)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

### New Files
```
code/utils/
└── GoogleSheetsManager.js (450+ lines)
    ├── Constructor
    ├── initialize()
    ├── READ Operations
    │   ├── readSheet()
    │   ├── getCell()
    │   ├── searchSheet()
    │   ├── getMetadata()
    │   └── getSheetNames()
    ├── CREATE Operations
    │   ├── appendRow()
    │   ├── appendRows()
    │   └── createSheet()
    ├── UPDATE Operations
    │   ├── updateCell()
    │   ├── updateRange()
    │   └── clearRange()
    ├── DELETE Operations
    │   ├── deleteRow()
    │   └── deleteSheet()
    └── Utilities
        └── _createLogger()
```

### Modified Files
```
index.js
├── Line 119 - Import GoogleSheetsManager
├── Line 179 - Global declaration
├── Line 737-753 - Initialization code
└── Line 891 - setupTerminalInputListener params

TerminalDashboardSetup.js
├── Line 15 - Updated JSDoc params
├── Line 27 - Updated destructuring
├── Line 621-751 - Callback implementations:
│   ├── onGoogleSheetsRead
│   ├── onGoogleSheetsCreate
│   ├── onGoogleSheetsUpdate
│   ├── onGoogleSheetsDelete
│   ├── onGoogleSheetsSearch
│   └── onGoogleSheetsMetadata
└── Line 752 - setupTerminalInputListener call

TerminalHealthDashboard.js
├── Line 383-389 - Updated destructuring with 6 new callbacks
├── Line 992-1067 - sheets command handler
└── Line 1094-1099 - Updated help text
```

---

## 🔌 Code Integration Points

### 1. GoogleSheetsManager Initialization

**Location:** `index.js` lines 737-753

```javascript
if (!googleSheetsManager) {
  googleSheetsManager = new GoogleSheetsManager(googleServiceAccountManager);
  await googleSheetsManager.initialize('poweragent');
  logBot("✅ Phase 30: GoogleSheetsManager initialized...", "success");
  services.register('googleSheetsManager', googleSheetsManager);
  logBot("   - Use command: 'sheets read <id>', ...", "info");
}
```

**When it runs:** During bot initialization (Phase 4E in initialization sequence)

**Dependencies:**
- `GoogleServiceAccountManager` (must be initialized first)
- `googleapis` npm package
- PowerAgent credentials in .env or keys.json

### 2. Terminal Command Dispatcher

**Location:** `TerminalDashboardSetup.js` lines 621-751

```javascript
const callbacks = {
  onGoogleSheetsRead: async (spreadsheetId, range) => { ... },
  onGoogleSheetsCreate: async (spreadsheetId, sheetName, values) => { ... },
  // ... etc
};

terminalHealthDashboard.startInteractiveMonitoring(callbacks);
```

**When it runs:** Users type commands in terminal

**Call flow:**
```
User input → TerminalHealthDashboard parses command
  → Extracts spreadsheetId, sheetName, range, values
  → Calls appropriate callback from callbacks object
  → Callback calls GoogleSheetsManager method
  → Method makes Google API call
  → Response formatted and displayed to user
```

### 3. Command Parsing

**Location:** `TerminalHealthDashboard.js` lines 992-1067

```javascript
case 'sheets':
case 'google':
  if (parts[1] === 'read') {
    // Parse: sheets read <id> [range]
    const sheetId = parts[2];
    const range = parts[3] || 'Sheet1';
    if (onGoogleSheetsRead) {
      await onGoogleSheetsRead(sheetId, range);
    }
  }
  // ... handle other subcommands
  break;
```

**Parser logic:**
- Split input by whitespace: `parts = input.split(/\s+/)`
- `parts[0]` = command ('sheets')
- `parts[1]` = subcommand ('read', 'add', 'update', etc.)
- `parts[2+]` = arguments

---

## 📚 API Reference

### GoogleSheetsManager Class

#### Constructor
```javascript
constructor(googleServiceAccountManager)
```

**Parameters:**
- `googleServiceAccountManager` - Instance of GoogleServiceAccountManager for credential loading

**Usage:**
```javascript
const gsm = new GoogleSheetsManager(googleServiceAccountManager);
```

#### initialize(accountName = 'poweragent')
```javascript
async initialize(accountName = 'poweragent') → Promise<boolean>
```

**Parameters:**
- `accountName` (string) - Account name in .env (GOOGLE_ACCOUNT_<NAME>_KEYS_BASE64)
- Default: 'poweragent'

**Returns:**
- `true` if initialization successful
- `false` if failed

**Throws:** No exceptions (catches internally and logs)

**Usage:**
```javascript
const success = await gsm.initialize('poweragent');
if (!success) {
  console.error('Failed to initialize');
}
```

---

### READ Operations

#### readSheet(spreadsheetId, range = 'Sheet1')
```javascript
async readSheet(spreadsheetId, range = 'Sheet1') → Promise<Object>
```

**Parameters:**
- `spreadsheetId` (string) - Google Sheets ID from URL
- `range` (string) - Range in A1 notation, default: 'Sheet1'

**Returns:**
```javascript
{
  success: true,
  data: Array<Array>,        // 2D array of cell values
  range: string,             // Actual range read
  rowCount: number,          // Number of rows
  columnCount: number        // Number of columns
}
// OR
{
  success: false,
  error: string              // Error message
}
```

**Examples:**
```javascript
// Read entire sheet
const result = await gsm.readSheet('1A2B3C', 'Sheet1');

// Read range
const result = await gsm.readSheet('1A2B3C', 'Sheet1!A1:C10');
```

#### searchSheet(spreadsheetId, range, searchValue)
```javascript
async searchSheet(spreadsheetId, range, searchValue) → Promise<Object>
```

**Parameters:**
- `spreadsheetId` (string)
- `range` (string) - Range to search in
- `searchValue` (string) - Text to find (case-insensitive)

**Returns:**
```javascript
{
  success: true,
  found: number,
  results: Array<{
    value: string,         // Cell value
    cell: string,          // Cell reference (A1, B2, etc)
    row: number,           // Row index
    column: number         // Column index
  }>
}
```

**Examples:**
```javascript
const results = await gsm.searchSheet('1A2B3C', 'Sheet1', 'John');
```

#### getMetadata(spreadsheetId)
```javascript
async getMetadata(spreadsheetId) → Promise<Object>
```

**Returns:**
```javascript
{
  success: true,
  spreadsheet: string,       // Spreadsheet title
  sheetCount: number,        // Number of sheets
  sheets: Array<{
    name: string,            // Sheet name
    id: number,              // Sheet ID
    rowCount: number,        // Total rows
    columnCount: number      // Total columns
  }>
}
```

---

### CREATE Operations

#### appendRow(spreadsheetId, sheetName, values)
```javascript
async appendRow(spreadsheetId, sheetName, values) → Promise<Object>
```

**Parameters:**
- `spreadsheetId` (string)
- `sheetName` (string) - Target sheet name
- `values` (Array) - Row values as array

**Returns:**
```javascript
{
  success: true,
  updatedCells: number  // Number of cells written
}
```

**Examples:**
```javascript
await gsm.appendRow('1A2B3C', 'Sheet1', 
  ['John', 'Doe', 'john@example.com']);
```

#### appendRows(spreadsheetId, sheetName, rows)
```javascript
async appendRows(spreadsheetId, sheetName, rows) → Promise<Object>
```

**Parameters:**
- `rows` (Array<Array>) - Multiple rows

**Examples:**
```javascript
await gsm.appendRows('1A2B3C', 'Sheet1', [
  ['John', 'Doe', 'john@example.com'],
  ['Jane', 'Smith', 'jane@example.com']
]);
```

#### createSheet(spreadsheetId, sheetTitle)
```javascript
async createSheet(spreadsheetId, sheetTitle) → Promise<Object>
```

**Parameters:**
- `sheetTitle` (string) - Name for new sheet

**Returns:**
```javascript
{
  success: true,
  sheetId: number  // ID of created sheet
}
```

---

### UPDATE Operations

#### updateCell(spreadsheetId, cellReference, value)
```javascript
async updateCell(spreadsheetId, cellReference, value) → Promise<Object>
```

**Parameters:**
- `spreadsheetId` (string)
- `cellReference` (string) - Cell in A1 notation (e.g., 'Sheet1!A1')
- `value` (any) - New value (converted to string)

**Examples:**
```javascript
await gsm.updateCell('1A2B3C', 'Sheet1!A1', 'New Name');
await gsm.updateCell('1A2B3C', 'Sheet1!B2', 'john@example.com');
```

#### updateRange(spreadsheetId, range, values)
```javascript
async updateRange(spreadsheetId, range, values) → Promise<Object>
```

**Parameters:**
- `values` (Array<Array>) - 2D array matching range size

**Examples:**
```javascript
await gsm.updateRange('1A2B3C', 'Sheet1!A1:B2', [
  ['Name', 'Email'],
  ['John', 'john@example.com']
]);
```

#### clearRange(spreadsheetId, range)
```javascript
async clearRange(spreadsheetId, range) → Promise<Object>
```

---

### DELETE Operations

#### deleteRow(spreadsheetId, sheetName, rowIndex)
```javascript
async deleteRow(spreadsheetId, sheetName, rowIndex) → Promise<Object>
```

**Parameters:**
- `rowIndex` (number) - 0-based row index

**Examples:**
```javascript
// Delete first data row
await gsm.deleteRow('1A2B3C', 'Sheet1', 0);

// Delete 5th row
await gsm.deleteRow('1A2B3C', 'Sheet1', 4);
```

#### deleteSheet(spreadsheetId, sheetName)
```javascript
async deleteSheet(spreadsheetId, sheetName) → Promise<Object>
```

---

## 🔍 Error Handling

### Error Types

1. **Authentication Errors**
   - Invalid/missing credentials
   - Service account not authorized
   - Scope insufficient

2. **API Errors**
   - Spreadsheet not found
   - Sheet not found
   - Cell reference invalid
   - Rate limiting

3. **Data Errors**
   - Invalid range format
   - Row index out of bounds
   - Mismatched value types

### Error Handling Pattern

```javascript
try {
  const response = await this.sheetsAPI.spreadsheets.values.get({...});
  // Process response
  return { success: true, data: ... };
} catch (error) {
  this.logger.error(`Read failed: ${error.message}`);
  return { success: false, error: error.message };
}
```

### Logging

Both success and error paths are logged:
```javascript
this.logger.info('Reading sheet', { spreadsheetId, range });
this.logger.success('Read 10 rows from Sheet1');
this.logger.error('Read failed: Sheet not found');
```

---

## 🧪 Testing Guidelines

### Unit Testing Template

```javascript
import GoogleSheetsManager from './GoogleSheetsManager.js';

describe('GoogleSheetsManager', () => {
  let gsm;
  
  beforeEach(async () => {
    gsm = new GoogleSheetsManager(mockGSAM);
    await gsm.initialize('poweragent');
  });
  
  describe('readSheet', () => {
    it('should read sheet data', async () => {
      const result = await gsm.readSheet('TEST_ID', 'Sheet1!A1:C3');
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
    });
    
    it('should handle sheet not found', async () => {
      const result = await gsm.readSheet('INVALID_ID', 'Sheet1');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  // ... more tests
});
```

### Integration Testing

```javascript
// Test with real PowerAgent spreadsheet
const spreadsheetId = 'YOUR_TEST_SPREADSHEET_ID';

describe('GoogleSheetsManager Integration', () => {
  it('should perform full CRUD cycle', async () => {
    // CREATE
    const addResult = await gsm.appendRow(spreadsheetId, 'Sheet1', 
      ['Test', 'User', 'test@example.com']);
    expect(addResult.success).toBe(true);
    
    // READ
    const readResult = await gsm.readSheet(spreadsheetId, 'Sheet1');
    expect(readResult.success).toBe(true);
    
    // SEARCH
    const searchResult = await gsm.searchSheet(spreadsheetId, 'Sheet1', 'Test');
    expect(searchResult.found).toBeGreaterThan(0);
    
    // UPDATE
    const lastRow = readResult.rowCount - 1;
    const updateResult = await gsm.updateCell(spreadsheetId, 
      `Sheet1!A${lastRow}`, 'Updated');
    expect(updateResult.success).toBe(true);
    
    // DELETE
    const deleteResult = await gsm.deleteRow(spreadsheetId, 'Sheet1', lastRow - 1);
    expect(deleteResult.success).toBe(true);
  });
});
```

---

## 🔧 Maintenance Notes

### Common Issues & Solutions

#### Issue: "Sheet not found"
```
Cause: Sheet name doesn't exist or typo
Solution: Use getMetadata() to verify sheet names
```

#### Issue: "Invalid range"
```
Cause: A1 notation error
Patterns: Sheet1!A1 (cell), Sheet1!A1:C10 (range), just Sheet1 (whole)
```

#### Issue: "Rate limit exceeded"
```
Cause: Too many API calls in short time
Solution: Implement exponential backoff retry logic
```

#### Issue: "Authentication failed"
```
Cause: Credentials invalid/expired
Solution: Verify .env base64 encoding and service account permissions
```

### Performance Optimization

1. **Batch Operations**
   ```javascript
   // Instead of:
   for (let i = 0; i < 100; i++) {
     await gsm.appendRow(...);  // 100 API calls
   }
   
   // Do this:
   await gsm.appendRows(...);  // 1 API call
   ```

2. **Streaming Large Data**
   ```javascript
   // Instead of:
   const data = await gsm.readSheet(id, 'Sheet1!A1:Z1000');
   
   // Do this:
   const data1 = await gsm.readSheet(id, 'Sheet1!A1:Z100');
   const data2 = await gsm.readSheet(id, 'Sheet1!A101:Z200');
   ```

3. **Caching Metadata**
   ```javascript
   // Cache getMetadata results (changes rarely)
   const sheets = await gsm.getMetadata(id);
   // Reuse sheets info for multiple operations
   ```

### Monitoring & Logging

Enable debug logging:
```javascript
// In GoogleSheetsManager constructor
this.debug = true;

// Log all operations
this.logger.info(`Operation: ${operation}`)
this.logger.success(`Completed: ${operation}`)
this.logger.error(`Failed: ${operation} - ${error}`)
```

---

## 🚀 Future Enhancements

### Planned Features (Phase 31+)

1. **Batch Operations**
   - Multiple reads in single request
   - Bulk updates with formulas

2. **Advanced Filtering**
   - WHERE clause support
   - SQL-like query language

3. **Scheduling**
   - Scheduled backup/sync
   - Periodic refreshes

4. **Formatting**
   - Cell colors and styles
   - Font formatting
   - Number formatting

5. **WhatsApp Integration**
   - Send sheet data via WhatsApp
   - Receive data from messages to update sheets

---

## 📞 Support & Documentation

- **Full Delivery:** `PHASE_30_GOOGLE_SHEETS_CRUD_DELIVERY.md`
- **Quick Reference:** `PHASE_30_GOOGLE_SHEETS_QUICK_REFERENCE.md`
- **Google API Docs:** https://developers.google.com/sheets/api
- **googleapis Package:** https://www.npmjs.com/package/googleapis

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** February 19, 2026  
**Maintained By:** Agent
