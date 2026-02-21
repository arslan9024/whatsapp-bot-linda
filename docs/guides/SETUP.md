# WhatsApp Bot Linda - Setup Guide

Complete step-by-step setup instructions for the WhatsApp Bot.

## 📖 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Google API Setup](#google-api-setup)
4. [Environment Configuration](#environment-configuration)
5. [First Run](#first-run)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### System Requirements

- **Node.js**: 16.x or higher
- **npm**: 7.x or higher (comes with Node.js)
- **RAM**: Minimum 2GB
- **Disk Space**: 500MB free space

### Software

- **WhatsApp**: Must have WhatsApp installed to link devices
- **Google Account**: Required for Google Sheets integration
- **Text Editor**: VS Code recommended

### Accounts

- Active WhatsApp account
- Google Cloud project with Sheets API enabled

---

## 🔧 Installation

### Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/Documents/Projects

# Clone or extract the project
# (Already done if you're reading this!)
cd WhatsApp-Bot-Linda
```

### Step 2: Install Node Modules

```bash
npm install
```

This installs:
- `whatsapp-web.js` - WhatsApp automation
- `googleapis` - Google Sheets API
- `xlsx` - Excel file handling
- `dotenv` - Environment configuration
- `nodemon` - Development auto-reload
- `eslint` - Code linting
- `prettier` - Code formatting

**Expected time**: 2-5 minutes  
**Disk space**: ~500MB

### Step 3: Verify Installation

```bash
# Check Node version (should be 16+)
node --version

# Check npm version (should be 7+)
npm --version

# Verify packages installed
npm list --depth=0
```

---

## 🔑 Google API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Name: "WhatsApp Bot Linda"
4. Click "Create"

### Step 2: Enable Google Sheets API

1. Search for "Google Sheets API"
2. Click the result
3. Click "Enable"
4. Wait 1-2 minutes for activation

### Step 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - Service account name: `whatsapp-bot-linda`
   - Click "Create and Continue"
4. Skip optional steps, click "Done"

### Step 4: Generate Private Key

1. Click on the service account you created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create" - file will download

### Step 5: Add Keys File

```bash
# Save the downloaded JSON file as:
code/GoogleAPI/keys.json
```

**File structure should look like:**
```
code/
├── GoogleAPI/
│   ├── keys.json          # ← Your downloaded file
│   └── main.js
```

### Step 6: Enable Google Sheets API (Production)

For production use, also:

1. Go to "APIs & Services" → "Library"
2. Search "Google Sheets API"
3. Click on "Google Sheets API"
4. Click "Enable"

---

## ⚙️ Environment Configuration

### Step 1: Create .env File

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

### Step 2: Configure Bot Numbers

Edit `.env`:

```env
# Your WhatsApp bot numbers (comma-separated)
BOT_NUMBERS=971501234567,971509876543
```

**Format**: Country code + 10-digit number (for UAE)

### Step 3: Configure Google Sheets

```env
# Path to your keys.json
GOOGLE_SHEETS_KEY_PATH=./code/GoogleAPI/keys.json

# Your Google Sheet ID
GOOGLE_SHEET_ID=1KLw...xxxxx
```

**Finding your Sheet ID:**
- Open Google Sheet in browser
- URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- Copy the `SHEET_ID` part

### Step 4: Configure Server Port

```env
PORT=3000
HOST=localhost
```

### Step 5: Configure Logging

```env
LOG_LEVEL=debug        # For development
LOG_LEVEL=info         # For production

LOG_FILE_PATH=./logs/bot.log
```

### Step 6: Complete .env Example

```env
# Environment
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true

# Bot Configuration
BOT_NUMBERS=971501234567
BOT_ENABLE_PAIRING_CODE=true
BOT_SESSION_STORE_PATH=./sessions

# Google Sheets
GOOGLE_SHEETS_KEY_PATH=./code/GoogleAPI/keys.json
GOOGLE_SHEET_ID=your_sheet_id_here

# Server
PORT=3000
HOST=localhost

# Logging
LOG_FILE_PATH=./logs/bot.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=14

# Message Delays
MESSAGE_DELAY_MS=1000
BATCH_DELAY_MS=5000

# Validation
COUNTRY_CODE_VALIDATION=true
PRIMARY_COUNTRY_CODE=971

# Campaign
CAMPAIGN_MODE=batch
CAMPAIGN_BATCH_SIZE=50
```

---

## 🚀 First Run

### Step 1: Start the Bot

```bash
npm run dev
```

### Step 2: Wait for QR Code

You'll see output like:
```
[2026-02-06T10:30:45.123Z] [INFO] WhatsAppBot: Initializing...
█████████████████████████████████████████████████████
████ WhatsApp QR Code displayed above ████
█████████████████████████████████████████████████████
```

### Step 3: Link Your Device

1. Open WhatsApp on your phone
2. Settings → Connected Devices → Link a Device
3. Point your phone at the QR code to scan it
4. Done! Bot will authenticate in 10-30 seconds

### Step 4: Verify Connection

You'll see:
```
[2026-02-06T10:30:47.789Z] [INFO] WhatsAppBot: Client is ready!
[2026-02-06T10:30:48.123Z] [INFO] WhatsAppBot: Listening for messages...
```

You're now ready to use the bot!

---

## 🛠️ Troubleshooting

### Issue: npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules

# Reinstall
npm install
```

### Issue: QR Code won't scan

**Solutions:**
1. Make sure you selected "Link a Device" in WhatsApp
2. Try again - QR code expires after ~20 seconds
3. Check console message contains "QR RECEIVED"

### Issue: Module not found error

**Example:**
```
Error: Cannot find module './code/WhatsAppBot/WhatsAppClientFunctions.js'
```

**Solution:**
```bash
# Verify file exists in project
ls code/WhatsAppBot/

# Check working directory
pwd
# Should be: /path/to/WhatsApp-Bot-Linda
```

### Issue: EACCES permission denied

**Solution on Unix/Linux/macOS:**
```bash
# Option 1: Use sudo
sudo npm install

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Issue: Google Sheets API errors

**Error:** `401 Unauthorized`
- ✅ Verify keys.json is valid JSON
- ✅ Check GOOGLE_SHEETS_KEY_PATH in .env
- ✅ Try downloading keys.json again

**Error:** `403 Forbidden`
- ✅ Share Google Sheet with service account email
- ✅ Verify sheet ID is correct
- ✅ Check API is enabled in Google Cloud

### Issue: Port 3000 already in use

**Solution:**
```bash
# Option 1: Change port in .env
PORT=3001

# Option 2: Kill process using port 3000
# Unix/Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm install` completed without errors
- [ ] `.env` file created with your values
- [ ] `keys.json` file exists in `code/GoogleAPI/`
- [ ] `npm run dev` starts without errors
- [ ] QR code displays in terminal
- [ ] WhatsApp device pairing succeeds
- [ ] "Client is ready" message appears
- [ ] No errors in `./logs/bot.log`

---

## 📞 Getting Help

If you encounter issues:

1. **Check logs first:**
   ```bash
   tail -f logs/bot.log  # Unix/Linux/macOS
   Get-Content logs/bot.log -Wait  # Windows
   ```

2. **Verify configuration:**
   ```bash
   # Print your config (hide secrets)
   cat .env | grep -v "^#"
   ```

3. **Check file permissions:**
   ```bash
   ls -la code/GoogleAPI/keys.json
   ```

4. **Review error messages** - they usually tell you exactly what's wrong

---

## 🎉 Next Steps

Now that you're set up:

1. Read [README.md](./README.md) for feature overview
2. Check [PROJECT_IMPROVEMENTS.md](./PROJECT_IMPROVEMENTS.md) for ongoing development
3. Review code in `code/WhatsAppBot/` to understand bot operation
4. Start customizing for your needs!

