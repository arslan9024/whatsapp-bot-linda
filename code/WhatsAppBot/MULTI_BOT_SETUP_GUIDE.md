# WhatsApp Bot Multi-Account Setup

**WhatsApp Bot Linda Extended to 3 Accounts**  
**Created:** February 9, 2026

---

## 📱 Registered WhatsApp Accounts

### 1. **Arslan Malik** (Primary)
- **Phone:** +971505760056
- **Role:** Master/Primary Account
- **Status:** Active
- **Features:** Full (messaging, contacts, campaigns, analytics, scheduling)
- **Google Account:** GorahaBot
- **Session:** `sessions/session-971505760056`

### 2. **Big Broker** (Secondary)
- **Phone:** +971553633595
- **Role:** Sales/Brokerage Operations
- **Status:** Pending (requires QR code login)
- **Features:** Full (messaging, contacts, campaigns, analytics, scheduling)
- **Google Account:** GorahaBot
- **Session:** `sessions/session-971553633595`

### 3. **Manager White Caves** (Tertiary)
- **Phone:** +971505110636
- **Role:** Management/Operations
- **Status:** Pending (requires QR code login)
- **Features:** Full (messaging, contacts, campaigns, analytics, scheduling)
- **Google Account:** GorahaBot
- **Session:** `sessions/session-971505110636`

---

## 🔧 Architecture

### Configuration Files
- **`code/WhatsAppBot/bots-config.json`** - All bot account configurations
- **`code/GoogleAPI/accounts.json`** - Google service account (GorahaBot)

### Bot Manager
- **`code/WhatsAppBot/MultiAccountWhatsAppBotManager.js`** - Unified bot orchestration
  - Initialize all bots
  - Route messages between accounts
  - Broadcast across all bots
  - Get statistics and status

---

## 🚀 Quick Start

### Initialize All Bots
```javascript
import BotManager from './code/WhatsAppBot/MultiAccountWhatsAppBotManager.js';

// Get all active bots
const activeBots = BotManager.getActiveBots();
console.log('📱 Active bots:', activeBots);

// Get statistics
const stats = BotManager.getStatistics();
console.log('📊 Bot Statistics:', stats);
```

### Send Message from Specific Bot
```javascript
// Send from Arslan Malik (primary)
await BotManager.sendMessageFromBot('ArslaMalik', chatId, 'Hello from Arslan!');

// Send from Big Broker
await BotManager.sendMessageFromBot('BigBroker', chatId, 'Hello from Big Broker!');

// Send from Manager White Caves
await BotManager.sendMessageFromBot('ManagerWhiteCaves', chatId, 'Hello from Manager!');
```

### Broadcast to All Bots
```javascript
// Send same message from all active bots
const results = await BotManager.broadcastFromAllBots(chatId, 'Broadcast message');
console.log('📢 Broadcast results:', results);
```

### Get Bot by Phone
```javascript
const bot = BotManager.getBotByPhone('+971553633595');
console.log('🤖 Found bot:', bot.displayName);
```

---

## 📊 Bot Manager Methods

### Query Methods
| Method | Purpose | Returns |
|--------|---------|---------|
| `getPrimaryBot()` | Get primary bot | Bot config |
| `getSecondaryBots()` | Get all secondary bots | Map of bots |
| `getBotByPhone(phone)` | Find bot by phone | Bot config |
| `getBotById(id)` | Find bot by ID | Bot config |
| `getActiveBots()` | Get all enabled bots | Array of bots |
| `getStatistics()` | Get system stats | Statistics object |
| `getSummary()` | Get full summary | Summary object |

### Control Methods
| Method | Purpose |
|--------|---------|
| `initializeAllBots(client)` | Initialize all configured bots |
| `sendMessageFromBot(botId, chatId, message)` | Send from specific bot |
| `broadcastFromAllBots(chatId, message)` | Send from all active bots |
| `toggleBot(botId, enable)` | Enable/disable a bot |

---

## 🔐 Security & Features

### All Bots Use
- **Google Contacts:** GorahaBot service account
- **Contact Sync:** Automatic via background scheduler
- **Data Storage:** MongoDB (lightweightcontact references)
- **Encryption:** WhatsApp end-to-end encryption (native)

### Features Available
- ✅ Messaging (WhatsApp native)
- ✅ Contact Management (via Google Contacts)
- ✅ Campaign Broadcasting
- ✅ Analytics & Reporting
- ✅ Message Scheduling
- ✅ Conversation Analysis

---

## 🗂️ File Structure

```
code/
├── WhatsAppBot/
│   ├── bots-config.json                      ← Bot configurations
│   ├── MultiAccountWhatsAppBotManager.js     ← Bot orchestration
│   ├── ContactLookupHandler.js               ← Shared contact handler
│   └── [other bot files]
│
└── GoogleAPI/
    ├── accounts.json                          ← Google accounts
    ├── GoogleContactsBridge.js                ← Google Contacts API
    └── ContactSyncScheduler.js                ← Background sync
```

---

## ⚙️ Configuration

### Edit Bot Configuration
```bash
# Edit bots-config.json to change settings
code/WhatsAppBot/bots-config.json
```

### Enable/Disable Bots
```javascript
// Disable Big Broker temporarily
BotManager.toggleBot('BigBroker', false);

// Re-enable later
BotManager.toggleBot('BigBroker', true);
```

### Change Default Bot
```javascript
// Edit bots-config.json
{
  "default": "ArslaMalik"  // Change this
}
```

---

## 📈 Status & Monitoring

### Check Bot Status
```javascript
const stats = BotManager.getStatistics();
console.log(`Active bots: ${stats.activeBots}`);
console.log(`Total bots: ${stats.totalBots}`);

// See individual bot details
stats.bots.forEach(bot => {
  console.log(`${bot.name}: ${bot.status}`);
});
```

### View Configuration
```javascript
const summary = BotManager.getSummary();
console.log(JSON.stringify(summary, null, 2));
```

---

## 🔄 Integration with Existing Systems

### Message Analyzer Integration
```javascript
// Detect which bot received message
const botAccount = extractBotFromMessage(message);
const bot = BotManager.getBotByPhone(botAccount);

// Route to appropriate handler
await handleMessage(message, bot);
```

### Campaign Broadcasting
```javascript
// Send campaign from all bots
for (const bot of BotManager.getActiveBots()) {
  await BotManager.sendMessageFromBot(bot.id, campaignData.chatList, campaignData.message);
}
```

### Contact Management
```javascript
// All bots share Google Contacts via GorahaBot
const ContactHandler = await import('./ContactLookupHandler.js');
const contact = await ContactHandler.lookupContact('+971501234567');

// Contact can be referenced across all bots
```

---

## 🧪 Testing

### Test Bot Manager
```bash
# Create a test script
cat > test-bots.js << 'EOF'
import BotManager from './code/WhatsAppBot/MultiAccountWhatsAppBotManager.js';

console.log('📊 Bot Manager Statistics:');
console.log(JSON.stringify(BotManager.getStatistics(), null, 2));

console.log('\n📝 Active Bots:');
BotManager.getActiveBots().forEach(bot => {
  console.log(`  - ${bot.displayName} (${bot.phoneNumber})`);
});
EOF

node test-bots.js
```

---

## 📋 Setup Checklist

### For New Bots (Big Broker & Manager White Caves)
- [ ] QR code login required on first initialization
- [ ] Verify WhatsApp session is authenticated
- [ ] Enable GorahaBot contact sync
- [ ] Test message sending
- [ ] Configure contact sync schedule
- [ ] Set up campaign templates
- [ ] Enable analytics tracking

### For All Bots
- [ ] Review `bots-config.json`
- [ ] Verify Google Contact sync working
- [ ] Test message routing
- [ ] Check session persistence
- [ ] Monitor error logs
- [ ] Set up monitoring alerts

---

## 🚨 Troubleshooting

### Bot Not Responding
```javascript
// Check bot status
const bot = BotManager.getBotById('BigBroker');
console.log('Status:', bot.status);
console.log('Enabled:', bot.enabled);

// Re-initialize if needed
// await BotManager.initializeAllBots(whatsappClient);
```

### Contact Sync Issues
```javascript
// All bots use GorahaBot for contacts
// Check GorahaBot authentication status
import GoogleContactsBridge from './code/GoogleAPI/GoogleContactsBridge.js';
const bridge = new GoogleContactsBridge();
const account = await bridge.getAccountInfo();
console.log('Connected as:', account.email);
```

### Message Not Sending
```javascript
// Check if bot is active
const activeBots = BotManager.getActiveBots();
const isBotActive = activeBots.some(b => b.id === 'BigBroker');
console.log('Big Broker active:', isBotActive);

// Check client connection
// Verify WhatsApp session is authenticated
```

---

## 📞 Quick Reference

### API Examples
```javascript
// Get Arslan Malik (primary)
const primaryBot = BotManager.getPrimaryBot();

// Get Big Broker
const bigBroker = BotManager.getBotById('BigBroker');

// Get Manager White Caves
const manager = BotManager.getBotByPhone('+971505110636');

// Send message
await BotManager.sendMessageFromBot('ArslaMalik', chatId, 'Hi!');

// Broadcast
await BotManager.broadcastFromAllBots(chatId, 'Hi everyone!');

// Get stats
const stats = BotManager.getStatistics();
```

---

## 🎯 Next Steps

1. **Initialize Bots:** Run `initializeAllBots()` with WhatsApp client
2. **Do QR Login:** Scan QR for Big Broker and Manager White Caves
3. **Verify Sessions:** Check session files in `sessions/` directory
4. **Test Messaging:** Send test messages from each bot
5. **Configure Sync:** Set up Google Contact sync schedule
6. **Monitor:** Watch for errors and sync status
7. **Deploy:** Roll out to production when ready

---

## 📚 Related Documentation

- **Bot Configuration:** `code/WhatsAppBot/bots-config.json`
- **Bot Manager:** `code/WhatsAppBot/MultiAccountWhatsAppBotManager.js`
- **Contact Sync:** `code/Services/ContactSyncScheduler.js`
- **Google Integration:** `code/GoogleAPI/accounts.json`
- **API Reference:** `code/GoogleAPI/CONTACT_API_REFERENCE.md`

---

**Multi-Account WhatsApp Bot System Ready! 🚀**

All three accounts configured and ready for initialization.

---

*Setup Guide Created: February 9, 2026*  
*Multi-Account System: Arslan Malik, Big Broker, Manager White Caves*  
*Google Contact Integration: GorahaBot (Shared)*
