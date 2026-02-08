# 🚀 QUICK REFERENCE: Multi-Account Management

**Print this out or bookmark it!**

---

## 🎯 Core Commands

### Start Multi-Account System
```javascript
import { getMultiAccountManager } from './code/GoogleAPI/MultiAccountManager.js';

const manager = await getMultiAccountManager();
const auth = manager.getActive();
```

### List All Accounts
```javascript
const accounts = manager.listAccounts();
// Output: ['PowerAgent', 'GorahaBot']
```

### Switch Account
```javascript
await manager.switchTo('GorahaBot');
const newAuth = manager.getActive();
```

### Check Account Status
```javascript
const isActive = manager.isAccountActive('GorahaBot');
console.log(isActive ? 'Active' : 'Needs setup');
```

### Get Auth Without Switching
```javascript
const auth = await manager.getAuthForAccount('GorahaBot');
// Use auth but don't change active account
```

### Display Status
```javascript
manager.status();
// Shows all accounts, status, cached auths
```

---

## 📋 Account Configuration

**Location:** `code/GoogleAPI/accounts.json`

**Add New Account:**
```json
{
  "accounts": {
    "NewAccount": {
      "id": "newaccount",
      "name": "newaccount@gmail.com",
      "type": "service_account|oauth2_user",
      "keyPath": "keys-new.json",
      "scopes": ["https://www.googleapis.com/auth/..."],
      "status": "active|pending",
      "createdAt": "2026-02-08"
    }
  }
}
```

**Current Accounts:**
- **PowerAgent** (service_account) - Active ✅
- **GorahaBot** (oauth2_user) - Pending ⏳

---

## 🔑 OAuth2 Setup

### Run Setup for New Account
```bash
node code/GoogleAPI/setup-oauth.js
```

**Process:**
1. Displays authorization URL
2. Copy URL to browser
3. Approve permissions
4. Get authorization code
5. Paste code back
6. Credentials saved to `.tokens/`
7. Account becomes active

**For GorahaBot:** Run immediately after cloning/fresh install

---

## ✅ Testing

### Run Full Test Suite
```bash
node code/GoogleAPI/test-accounts.js
```

**Expected output:** ✅ Multi-Account Manager Test PASSED

**What it tests:**
- Registry loading
- Manager initialization
- Active account info
- Account switching
- Auth retrieval
- Status display

---

## 🔍 Troubleshooting Checklist

| Problem | Check | Fix |
|---------|-------|-----|
| Account not found | accounts.json | Add account to registry |
| Can't switch account | Account status | Account must be "active" |
| Auth loading fails | Key file path | keys.json or credentials.json exists? |
| OAuth2 fails | Has setup run? | Run setup-oauth.js first |
| Wrong account active | Default setting | Check accounts.json "default" |
| Credentials not loading | .tokens/ folder | Check .tokens/goraha-token.json exists |

---

## 📁 File Locations

```
Project Root/
├── code/GoogleAPI/
│   ├── MultiAccountManager.js      (Core manager)
│   ├── OAuth2Handler.js            (OAuth2 flows)
│   ├── main.js                     (Entry point)
│   ├── accounts.json               (Account registry)
│   ├── setup-oauth.js              (OAuth2 setup)
│   ├── test-accounts.js            (Testing)
│   ├── keys.json                   (PowerAgent keys)
│   ├── keys-goraha.json            (GorahaBot keys)
│   └── .tokens/
│       └── goraha-token.json       (OAuth2 tokens)
└── .env                            (Environment variables)
```

---

## 🌍 Environment Variables

```bash
# In .env file:

# Multi-Account Settings
GOOGLE_DEFAULT_ACCOUNT=PowerAgent

# OAuth2 Settings
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback

# Feature Flags
GOOGLE_CONTACTS_ENABLED=true
GOOGLE_SHEETS_ENABLED=true
GOOGLE_DRIVE_ENABLED=true
```

---

## 💡 Common Patterns

### Pattern 1: Use Default Account
```javascript
const manager = await getMultiAccountManager();
const sheets = google.sheets({ version: 'v4', auth: manager.getActive() });
```

### Pattern 2: Switch for Specific Operation
```javascript
const manager = await getMultiAccountManager();
await manager.switchTo('GorahaBot');
const contacts = google.contacts({ version: 'v3', auth: manager.getActive() });
// ... use contacts ...
await manager.switchTo('PowerAgent'); // Switch back
```

### Pattern 3: Use Account Without Switching
```javascript
const manager = await getMultiAccountManager();
const auth = await manager.getAuthForAccount('GorahaBot');
// Use auth, but don't change active account
const sheets = google.sheets({ version: 'v4', auth });
```

### Pattern 4: Perform Operation with Account
```javascript
const result = await manager.withAccount('GorahaBot', async (auth) => {
  const sheets = google.sheets({ version: 'v4', auth });
  return await sheets.spreadsheets.values.get({
    spreadsheetId: 'xxx',
    range: 'Sheet1'
  });
});
```

### Pattern 5: List Available Accounts
```javascript
const manager = await getMultiAccountManager();
const activeAccounts = manager.getActiveAccounts();
for (const name of activeAccounts) {
  const info = manager.getAccountByName(name);
  console.log(`${name}: ${info.name}`);
}
```

---

## 🔐 Security Reminders

- ✅ Never commit `.tokens/` folder
- ✅ Never commit keys-*.json files
- ✅ Keep OAuth2 credentials in .env
- ✅ Don't log auth tokens
- ✅ Add to .gitignore:
  ```
  .tokens/
  keys-*.json
  *-token.json
  .env.local
  ```

---

## 📊 Status Indicators

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Active & Ready | Can use immediately |
| ⏳ | Pending Setup | Run setup-oauth.js |
| ⚠️  | Needs Attention | Check configuration |
| ❌ | Error | Check error log |

---

## 🎯 When to Use Each Account

**PowerAgent (Service Account):**
- Daily scheduled tasks
- Server-to-server communication
- No user interaction needed
- Google Sheets data syncing
- Automated broadcasts

**GorahaBot (OAuth2 User):**
- Google Contacts management
- User-initiated actions
- Personal account access
- Contact synchronization
- Property data management

---

## 📞 Key Contacts & Resources

**Documentation Files:**
- `WORKSTREAM_A_COMPLETE_FINAL.md` - Full technical docs
- `WORKSTREAM_B_PLAN.md` - Next steps & roadmap
- `SESSION_8_COMPLETION_SUMMARY.md` - Today's work summary

**Helper Functions:**
```javascript
// Check if account exists
manager.isAccountActive('AccountName')

// Get all info about account
manager.getAccountByName('AccountName')

// List only active accounts
manager.getActiveAccounts()

// See everything
manager.status()
```

---

## 🚀 Quick Start (15 minutes)

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Setup OAuth2 for GorahaBot
node code/GoogleAPI/setup-oauth.js

# 3. Test all accounts are working
node code/GoogleAPI/test-accounts.js

# 4. See status
npm run status  # (if available)
# OR
node -e "const {getMultiAccountManager} = require('./code/GoogleAPI/MultiAccountManager'); \
  (async () => { \
    const m = await getMultiAccountManager(); \
    m.status(); \
  })();"
```

---

## 📈 What's Next?

1. **Today/Tomorrow:** Run OAuth2 setup (get GorahaBot active)
2. **This Week:** Verify both accounts working
3. **Next Week:** Start Google Contacts integration (Workstream B)
4. **Following Week:** Complete MongoDB sync + WhatsApp integration

---

## ⭐ Pro Tips

1. **Always call getMultiAccountManager() once at startup** - Returns singleton, reuses instance
2. **Check account status before using** - Prevents "not active" errors
3. **Use withAccount() for isolated operations** - Doesn't affect active account
4. **Cache the manager instance** - Don't create new instance each time
5. **Review manager.status() when debugging** - Shows exactly what's loaded
6. **Update accounts.json to add new accounts** - No code changes needed
7. **Monitor auth cache size** - Each loaded account = one cached auth object

---

**Last Updated:** February 8, 2026  
**Status:** ✅ Ready for Production  
**Questions?** Check the longer documentation files!
