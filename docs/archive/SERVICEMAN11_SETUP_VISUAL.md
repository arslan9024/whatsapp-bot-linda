# 🎨 SERVICEMAN11 ACCOUNT SETUP - VISUAL OVERVIEW

**Created:** February 8, 2026  
**Status:** ✅ Ready to Deploy  
**Time to Execute:** 10-15 minutes

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD                           │
│         (heroic-artifact-414519 Project)                    │
└─────────────────────────────────────────────────────────────┘
              │
              ├─── Power Agent (Existing)
              │      └─ Keys: code/Integration/Google/keys.json
              │
              ├─── Goraha Properties (Existing)
              │      └─ Keys: code/Integration/Google/accounts/goraha-properties/keys.json
              │
              └─── serviceman11 (NEW ⭐)
                     └─ Keys: code/Integration/Google/accounts/serviceman11/keys.json
                     └─ Email: serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
                     └─ Role: Editor (read + write + create)

                         ↓

┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE SHEETS                             │
└─────────────────────────────────────────────────────────────┘
              │
              ├─── Original Sheet (Read-only access)
              │      ├─ ID: 1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04
              │      └─ Name: Akoya-Oxygen-2023-Arslan-only
              │
              └─── New Organized Sheet (Editor access) ⭐
                     ├─ ID: YOUR_NEW_SHEET_ID
                     ├─ Name: Akoya-Oxygen-2023-Organized
                     ├─ Tab 1: Data Viewer (filterable)
                     ├─ Tab 2: Organized Data (deduplicated)
                     └─ Tab 3: Metadata (tracking info)
```

---

## 📊 DATA FLOW

```
┌────────────────────────────────────────┐
│   Original Akoya Sheet                 │
│   (10,654 records)                     │
│   Shared with serviceman11             │
└──────────────┬─────────────────────────┘
               │ READ ACCESS
               ↓
┌────────────────────────────────────────┐
│   EnhancedSheetOrganizer               │
│   (using serviceman11 account)         │
│   - Deduplicates data                  │
│   - Assigns codes (P/C/F)              │
│   - Generates analytics                │
└──────────────┬─────────────────────────┘
               │ WRITE ACCESS
               ↓
┌────────────────────────────────────────┐
│   New Organized Sheet                  │
│   (10,131 deduplicated records)        │
│   ✅ Has all permissions                │
│   ✅ Can create new tabs               │
│   ✅ Can update data                   │
└────────────────────────────────────────┘
```

---

## 🔐 PERMISSIONS MODEL

```
┌─────────────────────────────────────────────────────────────┐
│                    serviceman11 Access                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Spreadsheets API                                       │
│     ├─ Read values from any sheet                          │
│     ├─ Write values to any cell                            │
│     ├─ Create new sheets (tabs)                            │
│     ├─ Update range formatting                             │
│     ├─ Clear ranges                                        │
│     └─ Batch update operations                             │
│                                                             │
│  ✅ Drive API                                              │
│     ├─ Read file metadata                                  │
│     ├─ View shared files                                   │
│     ├─ List permissions                                    │
│     └─ Check access rights                                 │
│                                                             │
│  ✅ Multiple Sheet Access                                  │
│     ├─ Original sheet (for reading data)                   │
│     └─ Organized sheet (for writing data)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 SETUP WORKFLOW

```
START
  │
  ├─→ Step 1: Create new sheet in Google Sheets
  │           └─ Get Sheet ID
  │
  ├─→ Step 2: Download serviceman11 keys.json
  │           ├─ From: Google Cloud Console
  │           └─ To: C:\Downloads\keys.json
  │
  ├─→ Step 3: Run setup-serviceman11.js
  │           ├─ Creates: code/Integration/Google/accounts/serviceman11/
  │           ├─ Copies: keys.json to directory
  │           └─ Updates: accounts.config.json
  │
  ├─→ Step 4: Run share-sheet-with-serviceman11.js
  │           └─ Shares new sheet with serviceman11 via Drive API
  │
  ├─→ Step 5: Run test-serviceman11-permissions.js
  │           ├─ Tests: Read access
  │           ├─ Tests: Write access
  │           ├─ Tests: Create tab access
  │           └─ Result: ✅ ALL TESTS PASSED
  │
  └─→ END: serviceman11 ready to use!
```

---

## 📦 DELIVERABLES

### 📖 Documentation (3 files)
- ✅ `SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md` (7-step detailed guide)
- ✅ `SERVICEMAN11_QUICK_START.md` (5-step quick version)
- ✅ `SERVICEMAN11_SETUP_VISUAL.md` (this file - architecture & flow)

### 🛠️ Setup Scripts (3 files)
- ✅ `setup-serviceman11.js` (automated directory & config setup)
- ✅ `share-sheet-with-serviceman11.js` (auto-share via Drive API)
- ✅ `test-serviceman11-permissions.js` (verify all permissions work)

### 🔧 Configuration (1 file)
- ✅ Updated: `code/Integration/Google/accounts/accounts.config.json`
  - Now includes serviceman11 account configuration
  - References both original and organized sheet IDs

---

## ⏱️ QUICK TIMELINE

```
Total Time: ~15 minutes

Activity                          Time    What Happens
─────────────────────────────────────────────────────────
1. Create sheet in Google Drive    2 min  New sheet created & named
2. Copy sheet ID                   1 min  Extract ID from URL
3. Get keys from Cloud Console     4 min  Download keys.json
4. Run setup script                2 min  Directories created, config updated
5. Auto-share sheet                2 min  Sheet shared with serviceman11
6. Test permissions                2 min  Verify all access works
─────────────────────────────────────────────────────────
TOTAL                             13 min  ✅ Ready to deploy!
```

---

## 🎯 SUCCESS CRITERIA

After executing all steps, you should have:

```
✅ New Sheet Created
   └─ Name: Akoya-Oxygen-2023-Organized
   └─ ID: [YOUR_ID]
   └─ Status: Shared with serviceman11

✅ serviceman11 Account Configured
   └─ Directory: code/Integration/Google/accounts/serviceman11/
   └─ Keys: code/Integration/Google/accounts/serviceman11/keys.json
   └─ Config: accounts.config.json updated

✅ Permissions Verified
   └─ Can read from original sheet
   └─ Can write to organized sheet
   └─ Can create new tabs
   └─ Can batch update operations

✅ Ready for Deployment
   └─ All tests passing
   └─ All scripts executable
   └─ Bot can use serviceman11 account
```

---

## 🔄 INTEGRATION WITH BOT

Once setup is complete, use in your bot:

```javascript
// Pseudo-code showing integration flow

class AkoyaSheetOrganizer {
  constructor() {
    this.googleManager = new GoogleServiceManager();
  }
  
  async organizeSheet() {
    // Initialize manager
    await this.googleManager.initialize();
    
    // Switch to serviceman11 (has editor permission)
    await this.googleManager.switchAccount('serviceman11');
    
    // Read from original sheet
    const data = await this.sheets.getValues(
      ORIGINAL_SHEET_ID,
      'Sheet1!A:Z'
    );
    
    // Process & deduplicate (handled by services)
    const organized = await EnhancedSheetOrganizer.organize(data);
    
    // Write to new organized sheet (Editor access)
    await this.sheets.appendRows(
      NEW_ORGANIZED_SHEET_ID,
      'Organized Data!A2',
      organized.records
    );
    
    // Create analytics tab
    await this.sheets.addSheet(
      NEW_ORGANIZED_SHEET_ID,
      'Analytics'
    );
    
    // Populate analytics
    await this.sheets.appendRows(
      NEW_ORGANIZED_SHEET_ID,
      'Analytics!A1',
      organized.analytics
    );
  }
}

// Usage
const organizer = new AkoyaSheetOrganizer();
await organizer.organizeSheet();
```

---

## 📊 ACCOUNT COMPARISON

| Feature | Power Agent | Goraha | serviceman11 |
|---------|------------|--------|------------|
| Type | Service Account | Service Account | Service Account ✡️ |
| Role | Admin | Editor | Editor |
| Sheets Access | Read/Write | Read/Write | Read/Write |
| Create Tabs | Yes | No | Yes ✡️ |
| Delete Sheets | Yes | No | No |
| Manage Permissions | Yes | No | No |
| Project Access | All | Limited | Limited ✡️ |
| Purpose | Main operations | Goraha project | Akoya organization |
| Status | Active | Configured | Active ✡️ |

✡️ = New capabilities added in this session

---

## 🚨 IMPORTANT NOTES

⚠️ **Before Starting:**
- Have your new sheet created (step 1 is critical)
- Keep your sheet ID handy (used in multiple steps)
- Have the keys.json file downloaded and accessible

⚠️ **During Setup:**
- Use exact paths when running scripts
- Don't edit keys.json - use it as-is
- Wait 2-3 minutes for Google to propagate sharing changes

⚠️ **After Setup:**
- Store keys.json securely (it contains sensitive credentials)
- Don't commit keys.json to public repos
- Regenerate keys if compromised

---

## 📚 DOCUMENTATION MAP

```
SERVICEMAN11_QUICK_START.md
├─ 5-step quick process
├─ Copy-paste commands
└─ Best for: Getting started fast

SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md
├─ 7-step detailed guide
├─ Each step explained
├─ Troubleshooting included
└─ Best for: Understanding everything

SERVICEMAN11_SETUP_VISUAL.md (this file)
├─ Architecture diagrams
├─ Data flow visualization
├─ Timeline & checklist
└─ Best for: Big picture understanding

ADVANCED_SHEET_ORGANIZATION_GUIDE.md
├─ How to use serviceman11 in code
├─ Integration examples
├─ API reference
└─ Best for: Implementation details
```

---

## ✅ DEPLOY CHECKLIST

Before running the bot with organized sheet:

- [ ] serviceman11 directory created
- [ ] keys.json in serviceman11 directory
- [ ] accounts.config.json updated
- [ ] New sheet created and named
- [ ] Sheet ID obtained
- [ ] share-sheet script executed
- [ ] test-serviceman11-permissions.js passed
- [ ] GoogleServiceManager can switch to serviceman11
- [ ] EnhancedSheetOrganizer configured with serviceman11
- [ ] Bot code ready to use organized sheet

---

## 🎉 YOU'RE DONE WHEN...

```
✅ serviceman11 is configured
✅ New sheet is created
✅ Permissions are verified
✅ Test script shows "ALL TESTS PASSED"
✅ You can see serviceman11 in Google Sheet's Share settings
```

---

**Status:** ✅ Ready  
**Next Action:** Follow SERVICEMAN11_QUICK_START.md  
**Questions?** See SERVICEMAN11_ACCOUNT_SETUP_GUIDE.md troubleshooting section

