# 🔐 REGENERATE GOOGLE SERVICE ACCOUNT KEY

Since you mentioned Power Agent is connected to Google, follow these steps to get a fresh service account key:

## OPTION 1: Get New Key from Google Cloud Console (RECOMMENDED)

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com
2. Select your project: **heroic-artifact-414519**
3. Go to: **APIs & Services** → **Service Accounts**

### Step 2: Find Service Account
1. Click on: **serviceman11@heroic-artifact-414519.iam.gserviceaccount.com**
2. Go to **KEYS** tab
3. Look for existing keys - you'll see "fc8e551af8380a2f189197f1db08aa954b25698d" (the expired one)

### Step 3: Delete Expired Key & Create New One
1. Click the **DELETE** button (trash icon) next to the old key
2. Confirm deletion
3. Click **CREATE NEW KEY**
4. Choose **JSON** format
5. Click **CREATE**
6. The JSON file will download automatically

### Step 4: Replace Your keys.json
1. Open the downloaded JSON file
2. Copy ALL the content
3. Replace the content in: `./code/Integration/Google/keys.json`
4. Save the file

### Step 5: Start the Script
```bash
cd C:\Users\HP\Documents\Projects\WhatsApp-Bot-Linda
node organizeAkoyaSheet.js
```

---

## OPTION 2: Copy Key from Power Agent Integration

If Power Agent already has the Google integration working:

1. In Power Agent, go to **Settings** → **Google Services** or **Integrations**
2. Look for the service account JSON or download the credentials
3. Copy the full JSON content
4. Replace the content in: `./code/Integration/Google/keys.json`
5. Save and run:

```bash
node organizeAkoyaSheet.js
```

---

## OPTION 3: Verify Key is Active

If you're not sure if the key is deleted or just expired:

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select: **heroic-artifact-414519**
3. Click on: **serviceman11@heroic-artifact-414519.iam.gserviceaccount.com**
4. Check the **Enabled** toggle - it should be ON (if OFF, enable it)
5. Check **KEYS** tab - create a new JSON key if needed

---

## 🚀 QUICK COMMANDS

After updating keys.json:

```powershell
# Test the credentials
node diagnose-google-auth.js

# Create the organized sheet
node organizeAkoyaSheet.js

# Quick analysis of the original sheet
node quickAnalyzeAkoya.js
```

---

## 📍 File Locations

- **Old expired key:** `./code/Integration/Google/keys.json`
- **New key to paste into:** same location above
- **Env file:** `./.env` (already set to correct path)

---

## ✅ Success Indicators

When working correctly, you'll see:

```
✅ Authentication successful! Client type: JWT
✅ Access token obtained! Token length: XXX chars
✨ ALL SYSTEMS GO - Ready to create sheets!
```

Followed by:

```
✅ Sheet organization started...
✅ Original sheet data read successfully
✅ Data analysis complete...
✅ New organized sheet created
✅ Project registered
✨ COMPLETE! Sheet ready at: [Google Drive Link]
```

---

**Need help?** Share the error message and I'll diagnose further!
