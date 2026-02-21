# Hybrid Bot Framework - Quick Reference Card

## 🚀 Quick Start (2 minutes)

```bash
# Start bot with defaults
node bot-main.js

# Start in specific mode
node bot-main.js --mode browser
node bot-main.js --mode websocket

# Debug mode
node bot-main.js --debug

# Custom config
node bot-main.js --config ./bot-config.json
```

## 📦 Core Components

| Component | Purpose | Location |
|-----------|---------|----------|
| CustomBotEngine | Queue & event management | `CustomBotEngine.js` |
| BotConnection | WhatsApp connection (3 modes) | `BotConnection.js` |
| MessageHandler | Parse & process messages | `MessageHandler.js` |
| SessionManager | User sessions & context | `SessionManager.js` |
| CommandRouter | Command routing & execution | `CommandRouter.js` |
| DamacApiClient | API calls with retry | `DamacApiClient.js` |
| WebhookServer | External webhook handling | `WebhookServer.js` |
| BotConfig | Config management | `BotConfig.js` |

## 🔧 Common Tasks

### Initialize Bot
```javascript
import BotIntegration from './BotIntegration.js';

const bot = new BotIntegration('./bot-config.json');
await bot.start();

// Get health
const health = bot.getHealth();

// Stop gracefully
await bot.stop();
```

### Send Message
```javascript
await connection.sendMessage(chatId, 'Hello!', {
  mentions: ['+971501234567']
});
```

### Get/Create Session
```javascript
const session = sessionManager.getSession(userId, { isGroup: false });
sessionManager.setState(userId, 'step', 'awaiting_input');
sessionManager.addMessage(userId, message);
```

### Make API Call
```javascript
const properties = await apiClient.searchProperties({
  location: 'Dubai Marina',
  bedrooms: 2,
  limit: 10
});
```

### Register Custom Command
```javascript
router.registerCommand('custom', async (message, session) => {
  return 'Custom response';
});
```

### Handle Webhook
```javascript
webhook.on('payment', async (data) => {
  console.log('Payment:', data.amount, data.currency);
});
```

## 📝 Configuration

### Minimal (`.env`)
```env
GOOGLE_SHEET_ID=your_id
BOT_MODE=hybrid
DATABASE_URL=mongodb+srv://...
API_URL=http://localhost:5000
```

### Essential Keys
```env
BOT_MODE=hybrid              # browser|websocket|hybrid
WEBHOOK_PORT=3001            # Port for webhooks
ADMIN_SECRET=your_secret     # For admin endpoints
LOG_LEVEL=info               # debug|info|warn|error
MAX_SESSIONS=10000           # Max concurrent sessions
SESSION_TIMEOUT=1200000      # 20 minutes
ADMIN_NUMBERS=+971501234567  # Comma-separated
```

## 🎯 Commands

### Built-in Commands
```
/search <location>          Find properties
/details <propertyId>       Get property info
/book <propertyId>          Start booking
/list [filters]             List properties
/help                       Show help
```

### Admin Commands via Webhook
```bash
# Get stats
curl -X POST http://localhost:3001/webhook/admin \
  -d '{"command":"stats","secret":"xxx"}'

# Clear sessions
curl -X POST http://localhost:3001/webhook/admin \
  -d '{"command":"clear-sessions","secret":"xxx"}'

# Reload config
curl -X POST http://localhost:3001/webhook/admin \
  -d '{"command":"reload-config","secret":"xxx"}'
```

## 🔌 Connection Modes

### Browser Mode (whatsapp-web.js)
```javascript
BOT_MODE=browser
// Requires: npm install whatsapp-web.js
// QR Code scan with phone
// Better stability
```

### WebSocket Mode (Baileys)
```javascript
BOT_MODE=websocket
// Requires: npm install @whiskeysockets/baileys
// Lower resource usage
// Device pairing method
```

### Hybrid Mode (Recommended)
```javascript
BOT_MODE=hybrid
// Tries browser first
// Falls back to websocket
// Auto-recovers from failure
```

## 📊 Health Check

```bash
# Check bot health
curl http://localhost:3001/health

# Response:
{
  "status": "ok",
  "timestamp": 1234567890
}
```

```javascript
const health = bot.getHealth();
// {
//   running: true,
//   connection: { mode: 'browser', connected: true, uptime: 3600000 },
//   sessions: { totalSessions: 123, activeSessions: 45, ... },
//   webhook: { port: 3001, running: true }
// }
```

## 🛡️ Error Handling

### Connection Error
```javascript
conn.on('error', (error) => {
  console.log('Connection error:', error.message);
  // Auto-reconnect happens automatically
});
```

### Message Processing Error
```javascript
handler.on('error', (error) => {
  console.log('Handler error:', error.message);
  // Error logged, processing continues
});
```

### API Error (Auto-Retry)
```javascript
try {
  const result = await apiClient.searchProperties(query);
} catch (error) {
  // After 3 retries with backoff
  console.log('API failed:', error.message);
}
```

## 📈 Monitoring

### Engine Stats
```javascript
const stats = engine.getStats();
// {
//   status: 'running',
//   messagesProcessed: 1234,
//   commandsExecuted: 567,
//   errorsEncountered: 12,
//   uptime: 3600000,
//   queueSize: 2
// }
```

### Session Stats
```javascript
const stats = sessionManager.getStats();
// {
//   totalSessions: 123,
//   activeSessions: 45,
//   totalMessages: 5678,
//   averageMessagesPerSession: 46,
//   avgSessionAge: 1234567
// }
```

### Connection Info
```javascript
const mode = connection.mode;           // 'browser' | 'websocket'
const connected = connection.isConnected; // true | false
const uptime = connection.getUptime();   // milliseconds
```

## 🎨 Message Parsing

### Parse Message
```javascript
const msg = await handler.parseMessage(rawMessage);
// {
//   id: 'msg_...',
//   timestamp: 1234567890,
//   from: '+971501234567',
//   text: '/search dubai',
//   isCommand: true,
//   command: 'search',
//   args: ['dubai'],
//   entities: { mentions: [], urls: [], ... },
//   type: 'text'
// }
```

### Extract Intent
```javascript
const intent = handler.extractIntent(message);
// {
//   type: 'property_search',
//   confidence: 0.85,
//   data: { text: '...' }
// }
```

## 🔐 Security

### Admin Numbers
```env
ADMIN_NUMBERS=+971501234567,+971509876543
SUPER_ADMIN_NUMBERS=+971501234567
```

### Webhook Secret
```env
ADMIN_SECRET=your_very_strong_secret_key_here
```

### Rate Limiting
```env
RATE_LIMIT_ENABLED=true
MESSAGES_PER_MINUTE=60
COMMANDS_PER_MINUTE=20
```

## 🌍 Webhooks

### Payment Webhook
```javascript
webhook.on('payment', async (webhook) => {
  // {
  //   service: 'payment',
  //   transactionId: 'TXN123',
  //   amount: 5000,
  //   currency: 'AED',
  //   status: 'completed'
  // }
});
```

### Event Webhook
```javascript
webhook.on('event', async (webhook) => {
  // {
  //   service: 'event',
  //   eventType: 'property_created',
  //   entityType: 'property',
  //   entityId: 'PROP123',
  //   data: {...}
  // }
});
```

### Twilio Webhook
```javascript
webhook.on('twilio', async (webhook) => {
  // {
  //   service: 'twilio',
  //   from: '+1234567890',
  //   body: 'Message text',
  //   media: [{ url, type }]
  // }
});
```

## 📚 Documentation

| Document | Use Case | Time |
|----------|----------|------|
| Implementation Guide | How to use, setup, examples | 20 min |
| Architecture Doc | Design, scaling, data flow | 30 min |
| Component Reference | API docs, all methods | 40 min |
| This Card | Quick lookup | 2 min |

## ⚡ Performance Tips

```javascript
// Reduce memory: smaller MAX_SESSIONS
process.env.MAX_SESSIONS = 1000;

// Faster processing: reduce MAX_HISTORY
process.env.MAX_HISTORY = 50;

// Better reliability: increase timeouts
process.env.API_TIMEOUT = 60000;

// Debug issues: enable logging
process.env.DEBUG = 'true';
process.env.LOG_LEVEL = 'debug';
```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Won't connect | Try `--mode websocket` or check internet |
| Slow responses | Check API latency, database performance |
| High memory | Reduce MAX_SESSIONS, enable cleanup |
| API errors | Verify API_URL, check API server status |
| Messages lost | Check queue size, restart bot |
| No webhooks | Verify WEBHOOK_PORT, check firewall |

## 🔗 Useful Commands

```bash
# View logs in real-time
tail -f logs/bot.log

# Kill bot gracefully
ps aux | grep bot-main.js
kill -SIGTERM <pid>

# Check port usage
lsof -i :3001

# Test API endpoint
curl http://localhost:5000/api/health

# Check bot health
curl http://localhost:3001/health
```

## 📦 Dependencies

```json
{
  "whatsapp-web.js": "^1.x",
  "@whiskeysockets/baileys": "^6.x",
  "express": "^5.x",
  "dotenv": "^16.x"
}
```

Optional:
```json
{
  "twilio": "^3.x",
  "firebase-admin": "^11.x"
}
```

## 🎓 Learning Resources

1. **Getting Started**
   - Read Implementation Guide (20 min)
   - Run: `node bot-main.js`
   - Try: `/help` command

2. **Understanding Components**
   - Read Component Reference (40 min)
   - Study one component at a time
   - Try modifying a command

3. **Deep Learning**
   - Read Architecture Document (30 min)
   - Understand data flows
   - Plan custom features

---

**Quick Reference v1.0** | Updated Jan 2026 | Print-friendly format available
