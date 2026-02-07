# 🔐 PHASE 2 GOOGLE API CREDENTIALS SETUP GUIDE

**Date:** February 7, 2026 (Session 10 Credentials Integration)  
**Version:** 1.0.0  
**Status:** ✅ READY TO USE  

---

## 📋 QUICK START

### Option 1: Automatic Setup (Recommended)
```bash
# Initialize and test Phase 2 services
node scripts/initializeGoogleServices.js
```

✅ This command will:
- Load credentials from `config/google-credentials.json`
- Initialize GoogleServiceManager
- Authenticate with Google APIs (JWT)
- Run health checks
- Display status and readiness metrics

### Option 2: Programmatic Setup
```javascript
const { GoogleServiceManager } = require('./code/Integration/Google/GoogleServiceManager');
const { GOOGLE_SCOPES } = require('./code/Integration/Google/config/constants');

const manager = new GoogleServiceManager();

await manager.initialize({
  credentialsPath: './config/google-credentials.json',
  scopes: [
    GOOGLE_SCOPES.SHEETS_READWRITE,
    GOOGLE_SCOPES.GMAIL_SEND,
    GOOGLE_SCOPES.DRIVE_READWRITE,
  ],
  services: ['auth', 'sheets', 'gmail', 'drive'],
});

// Use services
const authService = manager.getAuthService();
const status = authService.getStatus();
console.log('Authenticated:', status.isAuthenticated);
```

---

## 🔧 CREDENTIALS INFORMATION

### Service Account Details
```
Project ID:      heroic-artifact-414519
Service Account: serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
Account Type:    Service Account (JWT-based authentication)
Auth Method:     JWT (JSON Web Token) with RS256 signature
```

### File Locations
```
Credentials File:    config/google-credentials.json
Environment Config:  .env (GOOGLE_CREDENTIALS_PATH)
Logs:               logs/google-api.log (set in .env)
```

### Scopes Enabled
This service account should have permissions for:
- ✅ Google Sheets (Read/Write)
- ✅ Gmail (Send/Read)
- ✅ Google Drive (Read/Write)
- ✅ Google Calendar (Read/Write)

---

## 📝 CONFIGURATION FILES

### 1. `.env` Configuration
```env
# Phase 2: Unified Google API Integration
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
LOG_FILE=./logs/google-api.log
LOG_LEVEL=debug
```

The `.env` file has been automatically updated with:
- `GOOGLE_CREDENTIALS_PATH` → Points to credential file
- `LOG_FILE` → Path for API logging
- `LOG_LEVEL` → Set to DEBUG for full logging

### 2. `config/google-credentials.json`
Contains the service account credentials JSON:
- ✅ Private key (RS256)
- ✅ Client email
- ✅ Client ID
- ✅ Project ID
- ✅ Token endpoints
- ✅ Authorization URIs

**Security Notes:**
- ⚠️ Contains sensitive private key
- ⚠️ Added to `.gitignore` (never commit)
- ⚠️ Keep secure and never share
- ✅ Only readable by authorized users

---

## 🚀 HOW IT WORKS

### Authentication Flow

#### 1. Load Credentials
```javascript
const credentials = require('./config/google-credentials.json');
// {
//   type: 'service_account',
//   private_key_id: '...',
//   private_key: '-----BEGIN PRIVATE KEY-----...',
//   client_email: 'serviceman11@heroic-artifact-414519.iam.gserviceaccount.com',
//   ...
// }
```

#### 2. Create JWT (JSON Web Token)
```javascript
const claim = {
  iss: credentials.client_email,        // Issued by service account
  scope: 'scope1 scope2 scope3',        // Requested permissions
  aud: 'https://oauth.googleapis.com/token',  // Audience
  exp: now + 3600,                      // Expires in 1 hour
  iat: now,                             // Issued at
};

const token = jwt.sign(claim, credentials.private_key, {
  algorithm: 'RS256',
  keyid: credentials.private_key_id,
});
```

#### 3. Exchange JWT for Access Token
```javascript
// POST https://oauth.googleapis.com/token
// grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
// assertion=<JWT_TOKEN>

// Response:
// {
//   access_token: '...',
//   expires_in: 3599,
//   token_type: 'Bearer'
// }
```

#### 4. Use Access Token for API Calls
```javascript
// Authorization: Bearer <ACCESS_TOKEN>
// GET https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID
```

### Automatic Token Refresh
The `AuthenticationService` automatically:
- ✅ Detects token expiration
- ✅ Refreshes before expiry (5-minute buffer)
- ✅ Retries with exponential backoff
- ✅ Handles errors gracefully

---

## 📊 USAGE EXAMPLES

### Example 1: Get Authenticated Access Token
```javascript
const { GoogleServiceManager } = require('./code/Integration/Google/GoogleServiceManager');

async function getAccessToken() {
  const manager = new GoogleServiceManager();
  
  await manager.initialize({
    credentialsPath: './config/google-credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const authService = manager.getAuthService();
  const token = await authService.getAccessToken();
  
  console.log('Access Token:', token);
  return token;
}

getAccessToken();
```

### Example 2: Check Authentication Status
```javascript
const { getServiceManager } = require('./code/Integration/Google/GoogleServiceManager');

async function checkStatus() {
  const manager = getServiceManager();
  
  await manager.initialize({
    credentialsPath: './config/google-credentials.json',
  });

  const status = manager.getStatus();
  console.log('Status:', JSON.stringify(status, null, 2));
  
  // Output:
  // {
  //   "initialized": true,
  //   "activeAccount": "serviceman11@heroic-artifact-414519.iam.gserviceaccount.com",
  //   "services": {
  //     "auth": "authenticated",
  //     "sheets": "pending-implementation",
  //     "gmail": "pending-implementation",
  //     "drive": "pending-implementation",
  //     "calendar": "pending-implementation"
  //   },
  //   "accounts": {...}
  // }
}

checkStatus();
```

### Example 3: Add Multiple Accounts (When Ready)
```javascript
const { getServiceManager } = require('./code/Integration/Google/GoogleServiceManager');

async function multiAccount() {
  const manager = getServiceManager();
  
  await manager.initialize({
    credentialsPath: './config/google-credentials.json',
  });

  // Add second account
  const creds2 = require('./config/other-credentials.json');
  manager.addAccount(creds2, 'other-account@example.com');

  // Switch to second account
  await manager.setActiveAccount('other-account@example.com');
  
  // Use services with second account
  const authService = manager.getAuthService();
  const token = await authService.getAccessToken();
  
  console.log('Using account:', manager.getActiveAccount());
}

multiAccount();
```

---

## 🔒 SECURITY BEST PRACTICES

### DO ✅
- ✅ Keep credentials file in `config/` directory
- ✅ Add credentials to `.gitignore` (already done)
- ✅ Use environment variables for paths
- ✅ Rotate credentials periodically
- ✅ Use HTTPS for all API calls
- ✅ Limit service account permissions to needed scopes
- ✅ Monitor service account activity
- ✅ Log all authentication events

### DON'T ❌
- ❌ Never commit credentials to Git
- ❌ Never share credentials files
- ❌ Never hardcode credentials in code
- ❌ Never expose credentials in logs
- ❌ Never use overly broad scopes
- ❌ Never disable SSL verification
- ❌ Never use old credentials after rotation

### Current Security Status
```
✅ Credentials in separate config/ folder
✅ .gitignore configured (no commit)
✅ Environment variables used for paths
✅ Error messages sanitized (no key exposure)
✅ Logging doesn't include credentials
✅ Token expiration handled automatically
✅ HTTPS used for all Google APIs
```

---

## 🧪 TESTING & VERIFICATION

### Test 1: Run Initialization Script
```bash
node scripts/initializeGoogleServices.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║  Phase 2 Google API Services - Initialization Script   ║
╚════════════════════════════════════════════════════════╝

📍 Step 1: Loading Credentials

   Credentials Path: ./config/google-credentials.json

📍 Step 2: Creating Service Manager

   ✅ GoogleServiceManager created

📍 Step 3: Initializing Services

   ✅ Services initialized successfully

📍 Step 4: Checking Service Status

   Initialized:     YES
   Active Account:  serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
   Services:
      ✅ auth       → authenticated
      ⏳ sheets     → pending-implementation
      ⏳ gmail      → pending-implementation
      ⏳ drive      → pending-implementation
      ⏳ calendar   → pending-implementation

📍 Step 5: Authentication Status

   Authenticated:   YES
   Auth Method:     jwt
   Active Account:  serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
   Token Expired:   NO
   Accounts:        1 configured

📍 Step 6: Initialization Metrics

   Auth Attempts:   1
   Auth Failures:   0
   Token Refreshes: 0

📍 Step 7: Health Check

   Overall Status:  healthy
   Timestamp:       2026-02-07T14:30:45.123Z

╔════════════════════════════════════════════════════════╗
║          ✅ INITIALIZATION SUCCESSFUL                   ║
╚════════════════════════════════════════════════════════╝
```

### Test 2: Check Logs
```bash
tail -f logs/google-api.log
```

Look for:
- ✅ Credentials loaded successfully
- ✅ JWT authentication successful
- ✅ Health check passed
- ❌ No error messages

### Test 3: Programmatic Verification
```javascript
const { GoogleServiceManager } = require('./code/Integration/Google/GoogleServiceManager');

async function test() {
  try {
    const manager = new GoogleServiceManager();
    await manager.initialize({
      credentialsPath: './config/google-credentials.json',
    });
    
    const status = manager.getStatus();
    console.log('✅ Initialization successful:', status.initialized);
    console.log('✅ Authenticated:', 
      manager.getAuthService().getStatus().isAuthenticated);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Credentials file not found"
**Solution:**
1. Verify file exists: `ls config/google-credentials.json`
2. Check path in `.env`: `GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json`
3. Ensure you're running from project root: `pwd`

### Issue: "Authentication failed"
**Solution:**
1. Verify credentials are valid JSON: `node -e "require('./config/google-credentials.json')"`
2. Check internet connection for Google APIs
3. Verify service account has required permissions
4. Check logs: `cat logs/google-api.log`

### Issue: "Token refresh failed"
**Solution:**
1. Check if service account is active
2. Verify token_uri is correct in credentials
3. Check Google Cloud Console for quota issues
4. Look for rate limiting in error messages

### Issue: "CORS or SSL errors"
**Solution:**
1. This should not happen (server-to-server JWT)
2. Check if using HTTPS (automatic in Phase 2)
3. Verify no proxy issues
4. Contact Google Cloud support if persistent

### Common Error Codes
```
AUTH_FAILED              → Credentials invalid
TOKEN_EXPIRED           → Token expired, will auto-refresh
TOKEN_REFRESH_FAILED    → Unable to get new token
API_RATE_LIMIT         → Too many requests
API_QUOTA_EXCEEDED     → Service quota exceeded
SERVICE_UNAVAILABLE    → Google service down
```

---

## 📚 RELATED RESOURCES

### Phase 2 Documentation
- `code/Integration/Google/README.md` (to be created)
- `plans/PHASES/PHASE_2_GOOGLE_API_PLAN.md` (726 lines)
- `plans/PHASES/PHASE_2_EXECUTION_SUMMARY.md`
- `plans/PHASES/PHASE_2_WEEK1_DELIVERY.md`

### Code Files
- `code/Integration/Google/GoogleServiceManager.js` (orchestrator)
- `code/Integration/Google/services/AuthenticationService.js` (auth)
- `code/Integration/Google/config/constants.js` (config)
- `code/Integration/Google/config/credentials.js` (credential manager)

### Scripts
- `scripts/initializeGoogleServices.js` (initialization & test)

### Google Documentation
- [Google Service Account Auth](https://cloud.google.com/docs/authentication/application-default-credentials)
- [JWT Bearer Flow](https://tools.ietf.org/html/rfc7519)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [OAuth 2.0 for Server-to-Server](https://developers.google.com/identity/protocols/oauth2/service-account)

---

## ✅ CHECKLIST FOR DEPLOYMENT

### Pre-Deployment
- [ ] Credentials file created at `config/google-credentials.json`
- [ ] `.env` has `GOOGLE_CREDENTIALS_PATH` set
- [ ] `.gitignore` includes credentials file
- [ ] Initialization script runs successfully
- [ ] Health check passes
- [ ] No errors in logs

### Post-Deployment
- [ ] Monitor `logs/google-api.log` for errors
- [ ] Run periodic health checks
- [ ] Monitor service account quota usage
- [ ] Plan for credential rotation

### Before Phase 2 Week 2 (Feb 17)
- [ ] Test authentication works
- [ ] Verify scopes are correct
- [ ] Ensure no quota issues
- [ ] Create backup of credentials
- [ ] Document any custom configurations

---

## 📞 SUPPORT

### If You Need Help:
1. **Check logs:** `tail logs/google-api.log`
2. **Run test:** `node scripts/initializeGoogleServices.js`
3. **Read code:** `code/Integration/Google/GoogleServiceManager.js`
4. **Check plan:** `plans/PHASES/PHASE_2_GOOGLE_API_PLAN.md`

### Questions About:
- **Authentication:** See `services/AuthenticationService.js`
- **Error Handling:** See `utils/errorHandler.js`
- **Configuration:** See `config/constants.js`
- **Logging:** See `utils/logger.js`

---

## 🎉 NEXT STEPS

### Immediate (Today - Feb 7)
- ✅ Credentials set up
- ✅ Environment configured
- ✅ Initialization script ready
- ✅ Setup guide created

### This Week (Before Feb 14)
- [ ] Run initialization script
- [ ] Verify all services initialize
- [ ] Check health status
- [ ] Review logs

### Week 2 (Feb 17-21)
- [ ] Migrate SheetsService
- [ ] Migrate GmailService
- [ ] Write unit tests
- [ ] Create integration tests

### Week 3 (Feb 24-28)
- [ ] Add DriveService
- [ ] Add CalendarService
- [ ] Implement caching
- [ ] Performance tests

### Week 4 (Mar 3-7)
- [ ] Security audit
- [ ] Final testing
- [ ] Production sign-off
- [ ] Phase 2 completion

---

## 📋 CREDENTIALS SUMMARY

```
Service Account:     serviceman11@heroic-artifact-414519.iam.gserviceaccount.com
Project:             heroic-artifact-414519
Credentials File:    config/google-credentials.json
Environment Var:     GOOGLE_CREDENTIALS_PATH
Auth Method:         JWT (RS256)
Scopes:              5 (Sheets, Gmail, Drive, Calendar, UserInfo)
Status:              ✅ READY TO USE
Last Updated:        February 7, 2026
Version:             1.0.0
```

---

**Status:** ✅ CREDENTIALS CONFIGURED & READY FOR USE  
**Next Action:** Run `node scripts/initializeGoogleServices.js` to test  
**Timeline:** Ready for Phase 2 Week 1 execution (starting Feb 10)

---

*Phase 2 Google API Credentials Setup - Complete integration guide for Linda Bot's enterprise-grade Google API framework.*
