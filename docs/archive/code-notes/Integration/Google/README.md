# 🔐 Google API Credentials Setup

## Quick Start

1. **Get your credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable Google Sheets API
   - Create a Service Account
   - Download the JSON key file

2. **Set up locally:**
   ```bash
   # Copy your downloaded keys.json to this folder
   cp ~/Downloads/keys.json ./keys.json
   ```

3. **Verify setup:**
   ```bash
   node validateCredentials.js
   ```

## File Structure

```
code/Integration/Google/
├── keys.json              ← Your credentials (local only, NOT in git)
├── keys.json.template     ← Template to show expected format
├── GoogleCredentialsManager.js
├── validateCredentials.js
└── services/
    ├── SheetsService.js
    └── DataProcessingServiceImpl.js
```

## Important Notes

- ⚠️ **`keys.json` is in .gitignore** - Never commit credentials
- ✅ **Template provided** - Use `keys.json.template` as reference
- ✅ **Credentials validated** - Run validator to check setup
- ✅ **Fallback support** - Works from `code/GoogleAPI/keys.json` too

## Credentials Manager

Use the manager to load credentials in your code:

```javascript
import GoogleCredentialsManager from './GoogleCredentialsManager.js';

// Automatically loads from:
// 1. code/Integration/Google/keys.json (primary)
// 2. code/GoogleAPI/keys.json (fallback)
// 3. GOOGLE_APPLICATION_CREDENTIALS env variable
const credentials = GoogleCredentialsManager.getCredentials();

// Check if available
if (GoogleCredentialsManager.isAvailable()) {
  console.log('✓ Ready to use Google Sheets API');
}
```

## Troubleshooting

**"Credentials not found"**
- Copy your keys.json to this folder
- Check file permissions: `ls -la keys.json`

**"Missing required fields"**
- Verify JSON structure matches template
- Re-download from Google Cloud Console

**"Invalid private key"**
- Check private_key starts with `-----BEGIN PRIVATE KEY-----`
- Ensure newlines are properly escaped: `\n`

## See Also

- [GOOGLE_API_SETUP_GUIDE.md](../../GOOGLE_API_SETUP_GUIDE.md) - Complete setup guide
- [GoogleCredentialsManager.js](./GoogleCredentialsManager.js) - Credential loader
- [validateCredentials.js](./validateCredentials.js) - Verification script
