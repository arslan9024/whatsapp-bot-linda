/**
 * Akoya-Oxygen-2023 Data Viewer Setup Guide
 * 
 * Displays instructions for completing the sheet organization
 * Usage: node setupGuideAkoya.js
 */

function displaySetupGuide() {
  console.clear();
  
  console.log(`
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║   AKOYA-OXYGEN-2023-ARSLAN DATA VIEWER - SETUP GUIDE               ║
║   Interactive Sheet Organization with Column Filtering             ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝

📋 WHAT WILL BE CREATED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New Google Sheet: "Akoya-Oxygen-2023-Arslan-Organized"

✓ Tab 1: Data Viewer (Interactive Interface)
   └─ Single-row viewer with column filters
   └─ Enter row number in cell B3 to view that row
   └─ Check/uncheck column visibility toggles
   └─ Filtered columns display below selected row

✓ Tab 2: Organized Data (Normalized & Clean)
   └─ All data from original sheet, reformatted
   └─ Standardized column headers
   └─ Data quality metadata added
   └─ Ready for analysis and reporting

✓ Tab 3: Metadata (Transformation Info)
   └─ Original sheet ID and mapping
   └─ Column header transformations
   └─ Data import timestamp
   └─ Audit trail


🚀 SETUP PROCESS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION A: Automated Setup (Fast - Requires Valid Google Credentials)
─────────────────────────────────────────────────────────────────

  1️⃣  Verify Google Credentials
      File: ./code/GoogleAPI/keys.json
      Status: Should contain valid service account key
      
      ✓ Check: file exists and is not empty
      ✓ Check: contains "private_key" field
      ✓ Check: contains "service_account" type

  2️⃣  Set Environment Variable
      Add to .env file:
      GOOGLE_CREDENTIALS_PATH=./code/GoogleAPI/keys.json
      
      ✓ Verify: grep "GOOGLE_CREDENTIALS_PATH" .env

  3️⃣  Run Sheet Organizer
      Command: node organizeAkoyaSheet.js
      
      This will:
      • Read original sheet (1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04)
      • Create new Google Sheet
      • Set up 3 tabs
      • Populate with organized data
      • Return new Sheet ID

  4️⃣  Update MyProjects.js
      Command: node addNewProject.js --id "SHEET_ID" --name "Akoya-Oxygen-2023-Arslan-Organized"
      
      This will:
      • Add entry to MyProjects.js
      • Assign next available ProjectID
      • Register new sheet for future use

  5️⃣  Done!
      New sheet is ready to use


OPTION B: Manual Setup (If credentials not available)
─────────────────────────────────────────────────────

  1️⃣  Create Sheet Template
      Command: node generateSheetTemplate.js
      
      Output: ./logs/sheet-organization/akoya-template.json
      This file contains complete structure blueprint

  2️⃣  Create Google Sheet Manually
      Go to: https://docs.google.com/spreadsheets/
      ✓ Click "Create" → "Blank Spreadsheet"
      ✓ Name it: "Akoya-Oxygen-2023-Arslan-Organized"
      ✓ Copy Sheet ID from URL

  3️⃣  Create Tabs
      ✓ Rename default tab to: "Data Viewer"
      ✓ Right-click → "Insert 1 below": "Organized Data"
      ✓ Right-click → "Insert 1 below": "Metadata"

  4️⃣  Set Up Data Viewer Tab
      Copy from template: logs/sheet-organization/akoya-template.json
      
      Key Cells:
      • A1: "ROW SELECTOR & FILTERS"
      • B3: User enters row number here
      • Rows 9-10: Column visibility filters
      • Below: Selected row data display

  5️⃣  Set Up Organized Data Tab
      • Create headers from template
      • Copy data from original sheet
      • Ensure clean formatting

  6️⃣  Set Up Metadata Tab
      • Add transformation info
      • List column mappings
      • Add import timestamp

  7️⃣  Register Sheet
      Command: node addNewProject.js --id "YOUR_SHEET_ID" --name "Akoya-Oxygen-2023-Arslan-Organized"

  8️⃣  Test Data Viewer
      ✓ Enter row number in B3
      ✓ Check/uncheck column filters
      ✓ Verify data displays correctly


📚 FILE LOCATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created Files:
  • code/Services/SheetOrganizer.js          Main orchestration service
  • code/Services/DataViewerTabGenerator.js  Data Viewer UI generator
  • code/Integration/Google/services/SheetDataAnalyzer.js

Scripts:
  • organizeAkoyaSheet.js                    Main automation script
  • generateSheetTemplate.js                 Template generator
  • addNewProject.js                         Project registration
  • setupGuideAkoya.js                       This file

Output Files (Generated):
  • logs/sheet-organization/akoya-template.json     Sheet blueprint
  • logs/sheet-organization/myprojects-entry.js     Project entry template
  • logs/sheet-organization/akoya-oxygen-2023-org.json  Execution log


💾 DATA VIEWER TAB REFERENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cell A1:    "ROW SELECTOR & FILTERS"
Cell A3:    "Enter Row Number:"
Cell B3:    [USER INPUTS ROW NUMBER HERE - e.g., 5]
Cell A4:    "Current Row:"
Cell B4:    =A3 (displays current row number)

Row 9:      "COLUMN VISIBILITY FILTERS"
Row 10:     Headers with visibility controls
Row 11:     Checkboxes (✓ = visible, ☐ = hidden)

Row 14:     "SELECTED ROW DATA"
Row 15:     Column headers
Row 16:     (empty)
Row 17:     Display row data using INDEX() formulas

How It Works:
  1. User enters row number in B3
  2. Formulas in row 17 fetch data from "Organized Data" sheet
  3. IF visibility checkboxes checked, display column, else blank
  4. Selected row with filtered columns appears in row 17


✅ QUICKSTART COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate Template (Preview):
  $ node generateSheetTemplate.js

Run Full Automation:
  $ node organizeAkoyaSheet.js

Register New Project:
  $ node addNewProject.js --id "YOUR_SHEET_ID" --name "Project Name"

View This Guide:
  $ node setupGuideAkoya.js


⚠️  TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: "invalid_grant: Invalid JWT Signature"
Solution:
  • Credentials file is corrupted
  • Go to Google Cloud Console
  • Create new service account credentials
  • Replace ./code/GoogleAPI/keys.json
  • Or use Manual Setup (Option B)

Problem: "Sheet not found"
Solution:
  • Verify sheet ID: 1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04
  • Service account must have access
  • Check Google Cloud project permissions

Problem: "Cannot read property 'length'"
Solution:
  • Original sheet might be empty
  • Try reading the sheet manually to verify data
  • Check if original project exists


📊 DATA FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original Sheet (Read Only)
        ↓
    Analyze Structure
        ↓
    Normalize Data
        ↓
    Create New Sheet
        ↓
    Populate 3 Tabs ─→ Data Viewer (Interactive UI)
                  ├→ Organized Data (Clean Data)
                  └→ Metadata (Transformation Info)
        ↓
    Register in MyProjects.js
        ↓
    Ready to Use!


🎯 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Choose Option A or Option B based on credential availability

2. Follow steps in chosen option

3. Once sheet is created, get the Sheet ID from URL:
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit

4. Register project:
   node addNewProject.js --id "[SHEET_ID]" --name "Akoya-Oxygen-2023-Arslan-Organized"

5. Test the Data Viewer:
   • Open the new sheet
   • Go to "Data Viewer" tab
   • Enter row number in B3
   • Check column filters
   • Verify data displays

6. You're done! Sheet is now part of the project


═════════════════════════════════════════════════════════════════════

Questions? Check:
  • logs/sheet-organization/akoya-template.json (structure reference)
  • organizeAkoyaSheet.js (automation details)
  • This guide (setupGuideAkoya.js)

═════════════════════════════════════════════════════════════════════
`);
}

displaySetupGuide();
