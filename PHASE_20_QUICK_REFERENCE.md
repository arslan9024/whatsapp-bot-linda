# Phase 20 Quick Reference Guide
## For Developers & Operations Team

**Last Updated:** February 18, 2026

---

## Quick Start

### 1. Using GoogleServiceAccountManager
```javascript
import GoogleServiceAccountManager from "./code/utils/GoogleServiceAccountManager.js";

// Initialize
const gsam = new GoogleServiceAccountManager();

// Print available accounts
gsam.printSecuritySummary();

// Get credentials for specific account
const powerAgentCreds = gsam.getCredentials('poweragent');
const gorahaCreds = gsam.getCredentials('goraha');

// Use with Google APIs
const {google} = require('googleapis');
const sheets = google.sheets({
  version: 'v4',
  auth: powerAgentCreds
});
```

### 2. Using InteractiveMasterAccountSelector
```javascript
import InteractiveMasterAccountSelector from "./code/utils/InteractiveMasterAccountSelector.js";

const selector = new InteractiveMasterAccountSelector();

// Get user's choice
const phoneNumber = await selector.selectMasterAccount();
// Returns format: "971505760056" (without + or spaces)

// Use for master account initialization
const whatsappClient = await createWhatsAppClient(phoneNumber);
```

### 3. Using EnhancedQRCodeDisplayV2
```javascript
import EnhancedQRCodeDisplayV2 from "./code/utils/EnhancedQRCodeDisplayV2.js";

const qrDisplay = new EnhancedQRCodeDisplayV2();

// Display QR code with instructions
qrDisplay.display(qrCodeDataString);

// Built-in features:
// - Terminal detection
// - Step-by-step instructions
// - Timeout management
// - Error recovery
```

### 4. Using ProtocolErrorRecoveryManager
```javascript
import ProtocolErrorRecoveryManager from "./code/utils/ProtocolErrorRecoveryManager.js";

const recoveryManager = new ProtocolErrorRecoveryManager(logBot);

// Handle protocol errors
try {
  // WhatsApp or Puppeteer operation
} catch (error) {
  const recovered = await recoveryManager.recover(error);
  if (recovered) {
    // Try operation again
  } else {
    // Escalate to manual intervention
  }
}
```

---

## Configuration

### Setting Up Google Credentials

#### For File-Based Credentials (Current)
1. Create `code/GoogleAPI/keys.json` (PowerAgent)
2. Create `code/GoogleAPI/keys-goraha.json` (GorahaBot)
3. Update `.env`:
```env
GOOGLE_ACCOUNT_POWERAGENT_KEYS=./code/GoogleAPI/keys.json
GOOGLE_ACCOUNT_GORAHA_KEYS=./code/GoogleAPI/keys-goraha.json
```

#### For Base64-Encoded Credentials (Future)
1. Encode JSON to base64:
```powershell
# Windows PowerShell:
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("keys.json")) | Set-Clipboard
```

2. Add to `.env`:
```env
GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64=<paste_here>
GOOGLE_ACCOUNT_GORAHA_KEYS_BASE64=<paste_here>
```

### Adding a New Google Service Account

**No code changes needed!** Just add to `.env`:
```env
GOOGLE_ACCOUNT_MYSERVICE_KEYS_BASE64=<base64_encoded_json>
```

Then use:
```javascript
const creds = gsam.getCredentials('myservice');
```

---

## Common Tasks

### Check Available Google Accounts
```bash
node -e "
import GSA from './code/utils/GoogleServiceAccountManager.js';
const gsa = new GSA();
gsa.printSecuritySummary();
"
```

### Test Manager Instantiation
```bash
node code/test_phase20_init.mjs
```

### View Phase 20 Initialization Logs
```bash
npm run dev 2>&1 | grep "Phase 20\|✅\|❌"
```

### Verify No Secrets in Git
```bash
git status --short | grep -E "(env|keys|secret)" -i
git ls-files | grep -E "(env|keys|secret)" -i
```

---

## Troubleshooting

### Master Account Selection Not Working
**Symptom:** User not prompted for account selection
**Solution:** 
1. Ensure InteractiveMasterAccountSelector is initialized in STEP 1F
2. Check if stdin is available (may be blocked in some terminals)
3. Provide fallback master number in `.env`

### QR Code Doesn't Display
**Symptom:** Blank or corrupted QR code in terminal
**Solution:**
1. Check terminal supports ASCII output
2. Verify EnhancedQRCodeDisplayV2 detected terminal correctly
3. Check for terminal width >= 80 characters
4. Try different terminal emulator

### Google Credential Loading Fails
**Symptom:** "Cannot read Google credentials" error
**Solution:**
1. Verify file path in `.env` (for file-based) or `.env.example` (for base64)
2. Test credential file validity: `cat keys.json | jq .`
3. Check file permissions: `ls -la code/GoogleAPI/`
4. For base64: ensure proper encoding without newlines

### Protocol Error Recovery Loop
**Symptom:** Continuous "Recovery X/6" messages
**Solution:**
1. Increase wait times in ProtocolErrorRecoveryManager
2. Check Chrome/Puppeteer installation
3. Kill orphaned browser processes: `taskkill /F /IM chrome.exe`
4. Clear session directory: `rm -rf sessions/`

---

## Architecture Overview

```
Phase 20 Managers (Initialization Order in STEP 1F)
│
├─ GoogleServiceAccountManager
│  └─ Purpose: Load & decode Google credentials
│  └─ Supports: PowerAgent, GorahaBot, unlimited future accounts
│
├─ ProtocolErrorRecoveryManager
│  └─ Purpose: Handle Puppeteer/WhatsApp protocol errors
│  └─ Strategy: Multi-stage recovery (cleanup → restart → fallback)
│
├─ EnhancedQRCodeDisplayV2
│  └─ Purpose: Display QR codes with guidance
│  └─ Features: Terminal detection, step-by-step instructions
│
└─ InteractiveMasterAccountSelector
   └─ Purpose: User selection of master account
   └─ Features: Available account detection, safe prompting
```

---

## Files to Know

| File | Purpose | Modify When |
|------|---------|-------------|
| `index.js` | Main entry point, Phase 20 init | Changing initialization order |
| `.env.example` | Configuration template | Adding new variables |
| `.env` | Runtime configuration | Updating credentials/paths |
| `.gitignore` | Git exclusion rules | Adding new secret types |
| `code/utils/GoogleServiceAccountManager.js` | Credential management | Adding new account types |
| `code/utils/ProtocolErrorRecoveryManager.js` | Error recovery | Changing recovery strategies |
| `code/utils/EnhancedQRCodeDisplayV2.js` | QR display | Updating UI/formatting |
| `code/utils/InteractiveMasterAccountSelector.js` | Account selection | Changing selection logic |

---

## Security Checklist

Before deploying to production:

- [ ] All credentials in `.env` (not committed)
- [ ] `.env` file in `.gitignore`
- [ ] No `keys.json` files visible in git
- [ ] `.env.example` shows structure but no actual values
- [ ] Run `git status` and verify no .env files appear
- [ ] Test: `git ls-files | grep -i "keys\|secret"` returns nothing
- [ ] All Phase 20 managers instantiate without errors
- [ ] Error recovery properly handles protocol failures
- [ ] QR codes display in target terminal
- [ ] Master account selection works for all users

---

## Performance Notes

- GoogleServiceAccountManager: ~10ms initialization
- InteractiveMasterAccountSelector: depends on user input/terminal
- EnhancedQRCodeDisplayV2: ~50ms for rendering
- ProtocolErrorRecoveryManager: varies based on error type (100ms-5s)

**Total Phase 20 initialization:** < 200ms (non-blocking)

---

## Debugging Tips

### Enable Verbose Logging
```bash
LOG_LEVEL=debug npm run dev
```

### Monitor Initialization
```bash
npm run dev 2>&1 | grep -i "phase 20\|initialize"
```

### Test Individual Managers
```bash
node test_phase20_init.mjs
```

### Check Service Registry
```javascript
// In any module:
import services from "./code/utils/ServiceRegistry.js";
console.log(services.get('googleServiceAccountManager'));
```

---

## Migration Guide (File-Based → Base64)

**Current State:** Using `keys.json` files
**Target State:** Base64 in `.env` (no secrets in git)

**Steps:**
1. Encode existing `keys.json`:
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("code/GoogleAPI/keys.json")) | Set-Clipboard
```

2. Add to `.env`:
```env
GOOGLE_ACCOUNT_POWERAGENT_KEYS_BASE64=<paste>
```

3. Remove file-based reference from `.env`:
```env
# Remove or comment out:
# GOOGLE_ACCOUNT_POWERAGENT_KEYS=./code/GoogleAPI/keys.json
```

4. Update `.env.example` to reflect new variables

5. Test:
```bash
node test_phase20_init.mjs
npm run dev
```

6. Delete `keys.json` once verified:
```bash
git rm --cached code/GoogleAPI/keys.json
rm code/GoogleAPI/keys.json
```

---

## FAQ

**Q: Can I add my own Google service account?**
A: Yes! Just add to `.env`: `GOOGLE_ACCOUNT_MYSERVICE_KEYS_BASE64=<base64>`

**Q: What if the master account selection fails?**
A: System falls back to BOT_MASTER_NUMBER from `.env`

**Q: How do I disable interactive selection?**
A: Ensure BOT_MASTER_NUMBER is set in `.env`; selector will skip prompting

**Q: Can I use multiple WhatsApp accounts?**
A: Yes, via DynamicAccountManager. Phase 20 handles master account selection.

**Q: Is base64 encoding secure?**
A: Base64 is encoding, not encryption. For full security, ensure `.env` is not committed and access is restricted.

---

## Support & Issues

**Documentation:** See `PHASE_20_INTEGRATION_REPORT.md`  
**Implementation Details:** Check `PHASE_20_IMPLEMENTATION_SUMMARY.md`  
**Code Comments:** Inline docs in each Phase 20 file  
**Issues:** Check initialization logs for "Phase 20" and error messages  

---

**Version:** 1.0  
**Last Updated:** February 18, 2026  
**Maintainer:** WhatsApp Bot Linda Team  
**Status:** ✅ Production Ready
