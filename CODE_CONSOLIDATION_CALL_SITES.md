# 📋 Call Sites to Update - Code Consolidation

**Total Files to Update**: 13 (not counting the legacy GoogleSheet/*.js files which will be archived)  
**Total Locations**: 19 import statements + function calls  
**Priority**: High (blocking production consolidation)

---

## 🎯 Files by Priority

### CRITICAL (Must fix - Used by core operations)
1. ✅ **code/main.js** - DONE
   - Imports: `initializeGoogleAuth`, `PowerAgent`
   - Status: Updated to use GoogleServicesConsolidated

2. **code/GoogleSheet/WriteToSheet.js**
   - Imports: `getPowerAgent`, `initializeGoogleAuth` from GoogleAPI/main.js
   - Status: PENDING (Legacy function - will be archived after consolidation)

3. **code/GoogleSheet/getSheetWMN.js**
   - Imports: `getPowerAgent`, `initializeGoogleAuth` from GoogleAPI/main.js
   - Status: PENDING (Legacy function - will be archived after consolidation)

4. **code/GoogleSheet/getSheet.js**
   - Imports: `getPowerAgent`, `initializeGoogleAuth` from GoogleAPI/main.js
   - Status: PENDING (Legacy function - will be archived after consolidation)

5. **code/GoogleSheet/getOneRowFromSheet.js**
   - Imports: `getPowerAgent`, `initializeGoogleAuth` from GoogleAPI/main.js
   - Status: PENDING (Legacy function - will be archived after consolidation)

---

### HIGH (Actively used features)
6. **code/Message/MessageAnalyzer.js**
   - Line 4: `import { getSheet }`
   - Line 5: `import { getNumbersArrayFromRows }`
   - Line 11: `import { WriteToSheet }`
   - Usage: Message analysis and phone extraction
   - Status: PENDING - Replace with GoogleServicesConsolidated

7. **code/Message/MessageAnalyzerTwo.js**
   - Line 4: `import { getSheet }`
   - Line 5: `import { getNumbersArrayFromRows }`
   - Usage: Alternative message analysis
   - Status: PENDING - Replace with GoogleServicesConsolidated

8. **code/MyProjects/ProjectCampaign.js**
   - Line 1: `import { getGoogleSheet }`
   - Line 3: `import { FindPropertiesInGoogleSheet }`
   - Line 4: `import { getNumbersArrayFromRows }`
   - Usage: Campaign operations
   - Status: PENDING - Replace with GoogleServicesConsolidated

9. **code/MyProjects/ProjectCampaignMissionOne.js**
   - Line 1: `import { getGoogleSheet }`
   - Line 3: `import { FindPropertiesInGoogleSheet }`
   - Line 4: `import { getNumbersArrayFromRows }`
   - Usage: Mission-based campaigns
   - Status: PENDING - Replace with GoogleServicesConsolidated

---

### MEDIUM (Supporting functions)
10. **code/WhatsAppBot/MessageAnalyzer.js**
    - Line 11: `import { WriteToSheet }`
    - Usage: Write bot responses/logs
    - Status: PENDING - Replace with GoogleServicesConsolidated

11. **code/Search/ReplyTheContacts.js**
    - Line 3: `import { getSheetWMN }`
    - Usage: Contact search/reply
    - Status: PENDING - Replace with GoogleServicesConsolidated

12. **code/Search/ReplyTheContactsFromProject.js**
    - Line 4: `import { getOneRowFromSheet }`
    - Usage: Project-specific contact reply
    - Status: PENDING - Replace with GoogleServicesConsolidated

13. **code/Replies/SharingMobileNumber.js**
    - Line 1: `import { getSheetWMN }`
    - Usage: Share mobile numbers from sheet
    - Status: PENDING - Replace with GoogleServicesConsolidated

---

### LOW (Debug/Optional)
14. **code/Message/MessageInspector.js**
    - Line 16: `// import { WriteToSheet }` (COMMENTED OUT)
    - Status: NO ACTION NEEDED - Already disabled

---

## 🔄 Update Strategy

### Files that are LEGACY FUNCTIONS (Will be archived)
These don't need individual updates - they get archived as a whole:
- code/GoogleSheet/WriteToSheet.js
- code/GoogleSheet/getSheetWMN.js
- code/GoogleSheet/getSheet.js
- code/GoogleSheet/getOneRowFromSheet.js
- code/GoogleSheet/getGoogleSheet.js
- code/GoogleSheet/getNumberFromSheet.js
- code/GoogleSheet/getPhoneNumbersArrayFromRows.js

**Action**: Archive entire `code/GoogleSheet/` folder

---

### Files that USE Google functions (Need updates)
These files import and use the legacy functions, so they need their imports replaced:

1. **code/Message/MessageAnalyzer.js**
2. **code/Message/MessageAnalyzerTwo.js**
3. **code/MyProjects/ProjectCampaign.js**
4. **code/MyProjects/ProjectCampaignMissionOne.js**
5. **code/WhatsAppBot/MessageAnalyzer.js**
6. **code/Search/ReplyTheContacts.js**
7. **code/Search/ReplyTheContactsFromProject.js**
8. **code/Replies/SharingMobileNumber.js**

**Action**: Update to use GoogleServicesConsolidated

---

## 📝 Template for Updates

For each file using legacy Google functions:

```javascript
// BEFORE:
import { getSheet } from '../GoogleSheet/getSheet.js';
import { getNumbersArrayFromRows } from '../GoogleSheet/getNumberFromSheet.js';
import { WriteToSheet } from '../GoogleSheet/WriteToSheet.js';

// AFTER:
import { GoogleServicesConsolidated } from '../Integration/Google/GoogleServicesConsolidated.js';

// ... in the function that uses them:

// BEFORE:
const sheetData = await getSheet(project);
const { CorrectNumbers } = await getNumbersArrayFromRows(rows);
await WriteToSheet(sheetId, newValues);

// AFTER:
const sheetData = await GoogleServicesConsolidated.getSheetValues(project);
const { CorrectNumbers } = await GoogleServicesConsolidated.extractPhoneNumbers(rows);
await GoogleServicesConsolidated.writeToSheet(sheetId, newValues);
```

---

## ✅ Completion Checklist

- [x] code/main.js - Updated
- [ ] code/Message/MessageAnalyzer.js
- [ ] code/Message/MessageAnalyzerTwo.js
- [ ] code/MyProjects/ProjectCampaign.js
- [ ] code/MyProjects/ProjectCampaignMissionOne.js
- [ ] code/WhatsAppBot/MessageAnalyzer.js
- [ ] code/Search/ReplyTheContacts.js
- [ ] code/Search/ReplyTheContactsFromProject.js
- [ ] code/Replies/SharingMobileNumber.js
- [ ] Archive code/GoogleAPI/ folder
- [ ] Archive code/GoogleSheet/ folder
- [ ] Run tests
- [ ] Verify consolidation

---

**Last Updated**: February 7, 2026  
**Progress**: Step 5/6 started - 1/9 files updated
