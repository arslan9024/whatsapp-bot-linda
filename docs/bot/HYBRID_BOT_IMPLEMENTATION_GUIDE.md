# WhatsApp Bot Framework - Implementation Guide

## Overview

This is a complete hybrid bot framework combining the best features from:
- **whatsapp-web.js** - Browser automation for native WhatsApp
- **Baileys** - WebSocket/Puppeteer-based WhatsApp client
- **Twilio** - Cloud-based messaging as fallback
- **DAMAC API** - Property management integration

## Quick Start

### 1. Installation

```bash
# Clone or navigate to bot directory
cd bot

# Install dependencies
npm install whatsapp-web.js      # For browser mode
npm install @whiskeysockets/baileys  # For websocket mode
npm install twilio               # For Twilio integration
npm install express             # For webhook server
npm install dotenv              # For env management
```

### 2. Configuration

Create `.env` file or `bot-config.json`:

```env
# Bot Configuration
BOT_MODE=hybrid                    # browser, websocket, or hybrid
BOT_SESSION_NAME=linda-bot
COMMAND_PREFIX=/

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CREDENTIALS_PATH=./credentials.json

# Database
MONGODB_URL=mongodb+srv://...
USE_IN_MEMORY_DB=false            # true for testing

# API
API_URL=http://localhost:5000
API_TIMEOUT=30000

# Webhook Server
WEBHOOK_PORT=3001
WEBHOOK_HOST=localhost
ADMIN_SECRET=your_secret_here

# Twilio (optional)
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Admin
ADMIN_NUMBERS=+971501234567,+971509876543
SUPER_ADMIN_NUMBERS=+971501234567

# Features
FEATURE_PROPERTY_SEARCH=true
FEATURE_PROPERTY_DETAILS=true
FEATURE_BOOKING=true
FEATURE_PAYMENT=true

# Logging
LOG_LEVEL=info                    # debug, info, warn, error
DEBUG=false
```

### 3. Start the Bot

```bash
# Default hybrid mode with env config
node bot-main.js

# Specific mode
node bot-main.js --mode browser
node bot-main.js --mode websocket

# Custom config file
node bot-main.js --config ./bot-config.json

# Debug mode
node bot-main.js --debug
```

## Architecture

### Component Hierarchy

```
BotIntegration (Main Orchestrator)
├── CustomBotEngine (Core Processing)
├── BotConnection (Connection Handler)
│   ├── Browser Mode (whatsapp-web.js)
│   ├── WebSocket Mode (Baileys)
│   └── Hybrid Mode (Try both)
├── MessageHandler (Message Processing)
├── SessionManager (User Sessions)
├── CommandRouter (Command Execution)
├── DamacApiClient (API Integration)
├── WebhookServer (External Triggers)
└── BotConfig (Configuration)
```

### Data Flow

```
Incoming Message
      ↓
BotConnection receives message
      ↓
MessageHandler extracts intent/command
      ↓
SessionManager maintains user context
      ↓
CommandRouter routes to appropriate handler
      ↓
DamacApiClient executes operation
      ↓
Response sent back via BotConnection
```

## Components

### 1. CustomBotEngine
**File**: `CustomBotEngine.js`
**Purpose**: Core processing engine with queue management
**Key Methods**:
- `start()` - Start engine
- `stop()` - Stop engine
- `send()` - Queue message for processing
- `getStats()` - Get engine statistics

**Usage**:
```javascript
import { CustomBotEngine } from './index.js';

const engine = new CustomBotEngine({
  name: 'My Bot',
  version: '1.0.0',
  maxMessageQueueSize: 1000
});

await engine.start();
engine.send({ type: 'message', data: {...} });
```

### 2. BotConnection
**File**: `BotConnection.js`
**Purpose**: Handle different connection modes
**Modes**:
- `browser` - Uses whatsapp-web.js (QR scan)
- `websocket` - Uses Baileys (No Puppeteer)
- `hybrid` - Tries browser first, falls back to websocket

**Usage**:
```javascript
import BotConnection from './BotConnection.js';

const conn = new BotConnection({
  mode: 'browser',
  sessionName: 'linda-bot'
});

await conn.connect();
conn.on('message', (msg) => {
  console.log(msg.from, msg.body);
});
await conn.sendMessage(chatId, 'Hello!');
```

### 3. MessageHandler
**File**: `MessageHandler.js`
**Purpose**: Parse and process messages
**Features**:
- Entity extraction (mentions, hashtags, URLs, emails, phone numbers)
- Intent classification
- Message validation
- Spam detection
- Command parsing

**Usage**:
```javascript
import MessageHandler from './MessageHandler.js';

const handler = new MessageHandler({
  commandPrefix: '/'
});

const processed = await handler.process(rawMessage);
// Emits 'processed' event with structured message
```

### 4. SessionManager
**File**: `SessionManager.js`
**Purpose**: Manage user sessions and context
**Features**:
- Session CRUD operations
- Conversation history
- User tags
- Message counters
- Automatic cleanup

**Usage**:
```javascript
import { SessionManager } from './SessionManager.js';

const sessionMgr = new SessionManager({
  maxSessions: 10000,
  sessionTimeout: 1200000
});

const session = sessionMgr.getSession(userId);
sessionMgr.setState(userId, 'step', 'awaiting_property_id');
sessionMgr.addMessage(userId, message);
```

### 5. CommandRouter
**File**: `CommandRouter.js`
**Purpose**: Route and execute commands
**Built-in Commands**:
- `/search <query>` - Search properties
- `/details <propertyId>` - Get property details
- `/book <propertyId>` - Initiate booking
- `/list [filters]` - List available properties
- `/help` - Show help

**Usage**:
```javascript
import CommandRouter from './CommandRouter.js';

const router = new CommandRouter({
  apiClient: apiClient,
  sessionManager: sessionManager
});

await router.execute(message, session);
```

### 6. DamacApiClient
**File**: `DamacApiClient.js`
**Purpose**: Interface with DAMAC API
**Endpoints**:
- GET `/api/properties` - List properties
- GET `/api/properties/:id` - Get property details
- POST `/api/bookings` - Create booking
- GET `/api/tenancies/:id` - Get tenancy details
- GET `/api/owners/:id` - Get owner information

**Usage**:
```javascript
import DamacApiClient from './DamacApiClient.js';

const api = new DamacApiClient({
  baseUrl: 'http://localhost:5000',
  timeout: 30000
});

const properties = await api.searchProperties({ location: 'Dubai' });
const property = await api.getProperty(propertyId);
```

### 7. WebhookServer
**File**: `WebhookServer.js`
**Purpose**: Handle incoming webhooks
**Endpoints**:
- `POST /webhook/twilio` - Twilio callbacks
- `POST /webhook/payment` - Payment notifications
- `POST /webhook/event` - API events
- `POST /webhook/admin` - Admin commands
- `GET /health` - Health check

**Usage**:
```javascript
import WebhookServer from './WebhookServer.js';

const webhook = new WebhookServer({
  port: 3001,
  host: 'localhost'
});

webhook.on('payment', async (webhook) => {
  console.log('Payment received:', webhook);
});

await webhook.start();
```

### 8. BotConfig
**File**: `BotConfig.js`
**Purpose**: Centralized configuration management
**Features**:
- Environment variable support
- Configuration file loading
- Validation
- Sensitive data masking

**Usage**:
```javascript
import { getBotConfig } from './BotConfig.js';

const config = getBotConfig('./bot-config.json');
const apiUrl = config.config.api.baseUrl;
```

## Integration Point: BotIntegration

**File**: `BotIntegration.js`
**Purpose**: Orchestrate all components
**Responsibilities**:
- Initialize all components in order
- Setup event handlers
- Handle message flow
- Manage error recovery
- Provide health monitoring

**Usage**:
```javascript
import BotIntegration from './BotIntegration.js';

const bot = new BotIntegration('./bot-config.json');
await bot.start();

// Bot is now running
const health = bot.getHealth();

// Graceful shutdown
await bot.stop();
```

## Message Flow in Detail

### 1. Incoming Message
```
User sends WhatsApp message
     ↓
BotConnection receives via event
     ↓
Emits to BotIntegration
```

### 2. Processing
```
MessageHandler.parse()
     ↓
Extract command/intent
     ↓
Extract entities
     ↓
Classify message type
     ↓
Check for spam/validation
```

### 3. Routing
```
SessionManager.getSession()
     ↓
Add message to history
     ↓
Check rate limit
     ↓
Is command? YES → CommandRouter
           NO  → Intent-based handler
```

### 4. Execution
```
CommandRouter.execute(command, args)
     ↓
DamacApiClient.call()
     ↓
Format response
     ↓
BotConnection.sendMessage()
```

## Command Examples

### Property Search
```
User: /search dubai marina 2 bed
↓
Parser: command=search, args=['dubai', 'marina', '2', 'bed']
↓
Router: calls router.executeSearch()
↓
API: calls api.searchProperties({
  location: 'dubai marina',
  bedrooms: 2
})
↓
Response: "Found 5 properties in Dubai Marina with 2 bedrooms..."
```

### Property Details
```
User: /details PROP123
↓
Parser: command=details, args=['PROP123']
↓
Router: calls router.executeDetails('PROP123')
↓
API: calls api.getProperty('PROP123')
↓
Response: Formatted property card with images, price, details
```

### Booking Flow
```
User: /book PROP456
↓
Session: Set state { step: 'booking_initiated', propertyId: 'PROP456' }
↓
Response: "What is your name?"
↓
User: "John Smith"
↓
Session: Update { userName: 'John Smith', step: 'await_email' }
↓
Response: "What is your email?"
... continues until complete
```

## Error Handling

### Connection Errors
```javascript
// Automatic reconnect with exponential backoff
// Attempt 1: wait 5s
// Attempt 2: wait 10s (5 * 2)
// Attempt 3: wait 20s (5 * 2^2)
// Max attempts: configurable
```

### Message Errors
```javascript
// Caught and logged
// Error message sent to user
// Session state preserved for recovery
```

### API Errors
```javascript
// Automatic retry with backoff
// Max retries: configurable
// Fallback error message if all retries fail
```

## Admin Features

### Admin Commands (via webhook)
```bash
# Get bot statistics
curl -X POST http://localhost:3001/webhook/admin \
  -H "Content-Type: application/json" \
  -d '{"command":"stats","secret":"your_secret"}'

# Clear all sessions
curl -X POST http://localhost:3001/webhook/admin \
  -H "Content-Type: application/json" \
  -d '{"command":"clear-sessions","secret":"your_secret"}'

# Reload configuration
curl -X POST http://localhost:3001/webhook/admin \
  -H "Content-Type: application/json" \
  -d '{"command":"reload-config","secret":"your_secret"}'
```

### Session Management
```javascript
// Get session stats
const stats = sessionManager.getStats();
console.log(stats);
// {
//   totalSessions: 123,
//   activeSessions: 45,
//   totalMessages: 5678,
//   averageMessagesPerSession: 46.2,
//   avgSessionAge: 2345000
// }

// Get specific session
const session = sessionManager.getSession(userId);
console.log(session.getHistory(10)); // Last 10 messages

// Export sessions (backup)
const data = sessionManager.export();
```

## Monitoring & Logging

### Health Check
```javascript
const health = bot.getHealth();
// {
//   running: true,
//   engine: { ...stats },
//   connection: { mode: 'browser', connected: true, uptime: 3600000 },
//   sessions: { totalSessions: 123, ... },
//   webhook: { port: 3001, running: true }
// }
```

### Logging Levels
- `debug` - Detailed diagnostic information
- `info` - General informational messages
- `warn` - Warning messages for potentially harmful situations
- `error` - Error messages for serious issues

```env
LOG_LEVEL=debug
LOG_FILE=./logs/bot.log
LOG_FORMAT=json
```

## Testing the Bot

### Manual Testing
```bash
# Start bot
node bot-main.js

# Send test message via curl (to webhook)
curl -X POST http://localhost:3001/webhook/event \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test","data":{}}'
```

### Automated Testing
```javascript
// Use DamacApiClient directly
const api = new DamacApiClient({ baseUrl: 'http://localhost:5000' });
const properties = await api.searchProperties({ location: 'Dubai' });
console.log(properties);
```

## Deployment

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong ADMIN_SECRET
- [ ] Configure real MongoDB URL
- [ ] Set up SSL for webhook server
- [ ] Configure admin numbers
- [ ] Set LOG_LEVEL=info
- [ ] Enable all required features
- [ ] Test all commands
- [ ] Set up error alerting
- [ ] Configure webhooks for payment/events
- [ ] Set up log rotation
- [ ] Plan for session backup/restore

### Environment Setup
```bash
NODE_ENV=production
DEBUG=false
BOT_MODE=browser  # or websocket, or hybrid
WEBHOOK_PORT=443  # Use standard port, configure reverse proxy
LOG_LEVEL=info
MAX_SESSIONS=100000
SESSION_TIMEOUT=3600000  # 1 hour
```

### Running as Service (systemd)
```ini
[Unit]
Description=WhatsApp Linda Bot
After=network.target

[Service]
Type=simple
User=botuser
WorkingDirectory=/opt/linda-bot
ExecStart=/usr/bin/node bot-main.js --mode browser
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Bot Won't Connect
1. Check internet connection
2. Verify BOT_MODE is supported
3. Check credentials/session file
4. Try hybrid mode for fallback
5. Enable DEBUG for detailed logs

### Messages Not Processing
1. Check MessageHandler queue size
2. Verify database connection
3. Check API connectivity
4. Review rate limiting settings
5. Look for spam filters

### High Memory Usage
1. Reduce MAX_SESSIONS
2. Reduce MAX_HISTORY per session
3. Enable session cleanup
4. Check for message queue backlog
5. Monitor webhook server

### Slow Response Times
1. Check API latency
2. Check database performance
3. Review rate limiting
4. Check network bandwidth
5. Consider horizontal scaling

## Next Steps

1. **Customize Commands** - Add domain-specific commands in `CommandRouter.js`
2. **Add Webhooks** - Integrate with payment/notification systems
3. **Enhance Intent** - Improve NLP for better intent detection
4. **Add Persistence** - Save sessions/context to database
5. **Scale Horizontally** - Add Redis for session sharing across instances
6. **Add Monitoring** - Integrate with Prometheus/Grafana
7. **Create Admin Panel** - Web dashboard for bot management

## Support

For issues, questions, or contributions, refer to:
- Architecture documents: `HYBRID_BOT_ARCHITECTURE.md`
- Component reference: `BOT_COMPONENTS_REFERENCE.md`
- API documentation: `API_DOCUMENTATION.md`
- Troubleshooting guide: (see section above)

---

**Version**: 1.0.0  
**Last Updated**: 2026-01  
**Maintainer**: DAMAC Technologies
