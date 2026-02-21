# 🎯 CREATE AKOYA ORGANIZED SHEET - MANUAL STEP-BY-STEP

Since the service account has **read** permissions but **create** is restricted, follow these simple steps to create the sheet manually:

---

## 📋 STEP 1: Create New Google Sheet

1. Go to: **https://sheets.google.com**
2. Click: **"+ Start a new spreadsheet"**
3. Click: **"Blank spreadsheet"**
4. Wait for it to open

---

## ✏️ STEP 2: Name Your Sheet

1. In the top left, you'll see: **"Untitled spreadsheet"**
2. Click on it to rename
3. Change the name to exactly:
   ```
   Akoya-Oxygen-2023-Organized
   ```
4. Press **Enter**

---

## 📑 STEP 3: Create the 3 Tabs

You should see "Sheet1" at the bottom. We need 3 tabs:

### Tab 1: Data Viewer (Rename Sheet1)
1. Right-click on **"Sheet1"** tab at the bottom
2. Select **"Rename"**
3. Type: `Data Viewer`
4. Press **Enter**

### Tab 2: Organized Data (Create New)
1. Click the **"+"** button next to Sheet1
2. A new sheet appears (Sheet2)
3. Right-click **"Sheet2"** 
4. Select **"Rename"**
5. Type: `Organized Data`
6. Press **Enter**

### Tab 3: Metadata (Create New)
1. Click the **"+"** button again
2. Right-click the new sheet
3. Select **"Rename"**
4. Type: `Metadata`
5. Press **Enter**

---

## 📊 STEP 4: Set Up Data Viewer Tab

Click on the **Data Viewer** tab, then:

1. In cell **A1**, type:
   ```
   DATA VIEWER - Interactive Property Browser
   ```

2. In cell **A2**, type:
   ```
   Select Row Number:
   ```

3. In cell **B3**, type:
   ```
   1
   ```

4. In cell **A4**, type:
   ```
   Column Filters:
   ```

---

## 📝 STEP 5: Add Metadata

Click on the **Metadata** tab, then add this info:

| Column A | Column B |
|----------|----------|
| Original Sheet ID | 1gV4-hSAhDyWsivajBb2E2DSs25CMbqhc-6oufP1ZX04 |
| Original Name | Akoya-Oxygen-2023-Arslan-only |
| Created | TODAY'S DATE |
| Total Records | 10654 |
| Total Columns | 26 |

---

## 🔗 STEP 6: Get Your Sheet ID

1. Look at the URL bar of your sheet:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit...
   ```

2. Copy the long ID between **/d/** and **/edit**

Example:
```
https://docs.google.com/spreadsheets/d/1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz/edit...
                                      ↑ Start copying here
                                      
Your ID: 1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz
```

---

## 📌 STEP 7: Register in Linda's Bot

Once you have the Sheet ID, run:

```bash
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda
node addNewProject.js --id "YOUR_SHEET_ID_HERE" --name "Akoya-Oxygen-2023-Organized"
```

Replace `YOUR_SHEET_ID_HERE` with the ID you copied in Step 6.

---

## ✅ VERIFICATION

After registration, you should see:

```
✅ Project registered successfully
   Name: Akoya-Oxygen-2023-Organized
   Sheet ID: [Your ID]
   Status: Ready for bot integration
```

---

## 🎯 COMPLETE!

Your sheet is now:
- ✅ Created with 3 organized tabs
- ✅ Registered in the WhatsApp bot
- ✅ Ready for data import and integration

---

**Need help?** Let me know which step you're on or if you hit any issues! 🚀
