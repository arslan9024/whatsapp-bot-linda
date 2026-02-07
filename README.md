# WhatsApp Bot Linda - README

A sophisticated WhatsApp automation bot built with Node.js, designed for managing messaging campaigns, contact validation, and automated responses.

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

- **Multi-Bot Support** - Run multiple WhatsApp bots simultaneously
- **Campaign Management** - Send bulk messages with scheduling and rate limiting
- **Contact Validation** - Validate phone numbers with country code checking
- **Message Analyzer** - Analyze incoming messages for intelligent responses
- **Google Sheets Integration** - Read/write data to Google Sheets
- **Session Management** - Persistent session storage with automatic QR code handling
- **Structured Logging** - Comprehensive logging with file output and log levels
- **Error Handling** - Centralized error handling with recovery strategies

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- WhatsApp account
- Google API credentials (for sheets integration)

### Installation

1. **Clone and Install**
```bash
cd WhatsApp-Bot-Linda
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Add Google API Credentials**
```bash
# Place your keys.json in code/GoogleAPI/
# Obtained from Google Cloud Console
```

4. **Run the Bot**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### First Run

1. The bot will display a QR code in the terminal
2. Open WhatsApp on your phone
3. Settings → Linked Devices → Link a Device
4. Scan the QR code with your phone camera
5. Bot will authenticate and start listening

---

## 📁 Project Structure

```
WhatsApp-Bot-Linda/
├── index.js                    # Main entry point
├── config.js                   # Configuration management
├── logger.js                   # Logging system
├── errorHandler.js             # Error handling utilities
├── validation.js               # Input validation utilities
├── package.json                # Dependencies
├── .env.example                # Example environment config
├── .gitignore                  # Git ignore rules
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
│
├── code/                       # Core functionality
│   ├── WhatsAppBot/           # WhatsApp integration
│   │   ├── WhatsAppClientFunctions.js
│   │   ├── CreatingNewWhatsAppClient.js
│   │   ├── MessageAnalyzer.js
│   │   └── ...
│   ├── Message/               # Message management
│   │   ├── SendMessage.js
│   │   ├── sendBroadToList.js
│   │   └── ...
│   ├── Contacts/              # Contact utilities
│   │   ├── validateContactNumber.js
│   │   ├── rectifyOnePhoneNumber.js
│   │   └── ...
│   ├── Campaigns/             # Campaign management
│   │   ├── MakeCampaign.js
│   │   └── MissionOneE.js
│   ├── GoogleSheet/           # Google Sheets API
│   │   ├── getGoogleSheet.js
│   │   ├── WriteToSheet.js
│   │   └── ...
│   └── Time/                  # Timing utilities
│       ├── sleepTime.js
│       ├── RandomDelay.js
│       └── ...
│
├── Inputs/                     # Contact lists and configurations
│   ├── ArslanNumbers.js
│   ├── NawalNumbers.js
│   └── ...
│
├── Outputs/                    # Campaign results and reports
│
├── sessions/                   # WhatsApp session storage (git-ignored)
│
└── Backup/                     # Archived files
```

---

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Bot Settings
NODE_ENV=development
LOG_LEVEL=debug
DEBUG_MODE=true

# WhatsApp Bots
BOT_NUMBERS=971501234567,971509876543
BOT_ENABLE_PAIRING_CODE=true
BOT_SESSION_STORE_PATH=./sessions

# Google Sheets
GOOGLE_SHEETS_KEY_PATH=./code/GoogleAPI/keys.json
GOOGLE_SHEET_ID=your_spreadsheet_id

# Server
PORT=3000
HOST=localhost

# Delays (milliseconds)
MESSAGE_DELAY_MS=1000
BATCH_DELAY_MS=5000

# Validation
COUNTRY_CODE_VALIDATION=true
PRIMARY_COUNTRY_CODE=971
```

### Log Levels

- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors
- `debug` - All messages (development)

---

## 💻 Usage

### Starting a Single Bot

```javascript
import { CreatingNewWhatsAppClient } from "./code/WhatsAppBot/CreatingNewWhatsAppClient.js";
import { WhatsAppClientFunctions } from "./code/WhatsAppBot/WhatsAppClientFunctions.js";

const botNumber = "971501234567";
const client = await CreatingNewWhatsAppClient(botNumber);
WhatsAppClientFunctions(client, botNumber, true); // true = enable pairing code
```

### Sending a Message

```javascript
import { SendMessage } from "./code/Message/SendMessage.js";

const result = await SendMessage(client, "971501234567", "Hello!");
```

### Running a Campaign

```javascript
import { MakeCampaign } from "./code/Campaigns/MakeCampaign.js";

const result = await MakeCampaign(contactList, messageTemplate);
```

### Validating Phone Numbers

```javascript
import { validatePhoneNumber } from "./validation.js";

if (validatePhoneNumber("971501234567")) {
  console.log("Valid phone number");
}
```

---

## 🛠️ Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
# Auto-reloads on file changes
```

### Code Quality

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Logging

Logs are written to `./logs/bot.log` and console:

```javascript
import logger from "./logger.js";

logger.info("Bot started");
logger.warn("Unusual activity", { userId: 123 });
logger.error("Failed to send message", { number: "971501234567" });
logger.debug("Detailed debugging info");
```

### Error Handling

```javascript
import { handleError, withErrorHandling, ValidationError } from "./errorHandler.js";

try {
  // ... code
} catch (error) {
  handleError(error, { context: "sending message" });
}

// Or wrap async functions
const safeSendMessage = withErrorHandling(SendMessage, { operation: "send" });
```

---

## 🐛 Troubleshooting

### Bot Not Connecting

1. **Check credentials**: Verify phone number format
2. **QR Code not scanning**: Try linking device again
3. **Session expired**: Delete session folder and restart

### Messages Not Sending

1. **Check delays**: Increase `MESSAGE_DELAY_MS` in .env
2. **Rate limiting**: Verify contact list count
3. **Number validation**: Use `validatePhoneNumber()` to check format

### Google Sheets API Errors

1. **Authentication**: Verify `keys.json` is valid
2. **Permissions**: Check sheet is shared with service account
3. **Sheet ID**: Confirm correct ID in .env

### High Memory Usage

1. **Reduce batch size**: Lower `CAMPAIGN_BATCH_SIZE`
2. **Increase delays**: Higher message delays
3. **Monitor processes**: Use `ps aux | grep node`

---

## 📊 Logging and Monitoring

All bot activity is logged to `./logs/bot.log`:

```
[2026-02-06T10:30:45.123Z] [INFO] WhatsAppBot: Bot started
[2026-02-06T10:30:46.456Z] [DEBUG] WhatsAppBot: Authenticating...
[2026-02-06T10:30:47.789Z] [INFO] WhatsAppBot: Client is ready
```

Monitor logs in real-time:

```bash
# Unix/Linux/macOS
tail -f logs/bot.log

# Windows
powershell "Get-Content logs/bot.log -Wait"
```

---

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review log files in `./logs/`
3. Check `.env` configuration
4. Verify WhatsApp session is active

---

## 📄 License

ISC License - See LICENSE file for details

---

## 👤 Author

**Arslan Malik**

Created: 2026-02-06  
Last Updated: 2026-02-06

