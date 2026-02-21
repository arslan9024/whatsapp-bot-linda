# 📱 WhatsApp Command Bridge — Usage Guide
## Phase 31: Remote Terminal Control via Chat

> **Last Updated:** February 21, 2026  
> **Tests:** 153/153 ✅ (100%)  
> **Status:** Production-ready

---

## 🎯 What Is the Command Bridge?

The WhatsApp Command Bridge lets you control Linda from WhatsApp by sending `linda <command>` messages. Instead of needing the terminal, you can check health, manage accounts, run analytics, and interact with Google Sheets — all from your phone.

### Key Rules
| Rule | Detail |
|------|--------|
| **Who is Linda?** | The primary master account (+971505760056, Arslan Malik) |
| **Who can send commands?** | Only other registered master accounts (e.g., Big Broker +971553633595) |
| **Where to send?** | Send to the primary master's WhatsApp chat |
| **Prefix** | Every command starts with `linda` (case-insensitive) |
| **Groups** | Commands are NOT accepted in group chats |
| **Self-messages** | The primary master cannot command itself |

---

## 🚀 Quick Start

1. **Start the bot:** `node index.js`
2. **Link accounts:** Type `link master` in terminal and scan QR codes
3. **From your secondary phone**, open WhatsApp and message the primary master:

```
linda help
```

You'll receive a formatted response with all available commands.

---

## 📋 Complete Command Reference

### 🏥 Monitoring & Health

| Command | Description |
|---------|-------------|
| `linda health` | Full system health dashboard |
| `linda health +971553633595` | Health score for a specific device |
| `linda accounts` | List all accounts with online status |
| `linda stats +971553633595` | Detailed metrics for a device |
| `linda list` | List all devices |
| `linda device +971553633595` | Detailed device information |

### 🔗 Account Management

| Command | Description |
|---------|-------------|
| `linda link master` | Link the primary master account |
| `linda link master +971555 Name` | Add a new master account |
| `linda relink master` | Re-link primary master |
| `linda relink master +971555` | Re-link specific master |
| `linda relink servant +971555` | Re-link a servant account |
| `linda recover +971555` | Attempt session recovery |
| `linda restore` | Restore all saved sessions |

### 📊 Analytics & Reporting

| Command | Description |
|---------|-------------|
| `linda analytics` | Real-time analytics overview |
| `linda analytics report` | Full analytics report |
| `linda analytics uptime` | Uptime statistics |
| `linda analytics account +971555` | Per-account analytics |

### 🏘️ Goraha Integration

| Command | Description |
|---------|-------------|
| `linda goraha` | Goraha system status |
| `linda goraha verify` | Verify with deep checks |
| `linda goraha contacts` | Contact statistics |
| `linda goraha filter Security D2` | Filter contacts by text |

### 📝 Google Sheets

| Command | Description |
|---------|-------------|
| `linda sheets read <sheetId>` | Read sheet data |
| `linda sheets add <sheetId> <sheetName> <values>` | Add a row |
| `linda sheets update <sheetId> <range> <newValue>` | Update a cell |
| `linda sheets delete <sheetId> <sheetName> <row>` | Delete a row |
| `linda sheets search <sheetId> <sheetName> <term>` | Search for data |
| `linda sheets info <sheetId>` | Sheet metadata |

### 🔧 Bridge Utilities

| Command | Description |
|---------|-------------|
| `linda help` | Show all available commands |
| `linda bridge-stats` | Bridge usage statistics |

---

## 🔧 Architecture

```
Secondary Master (Big Broker's phone)
  │
  │  WhatsApp message: "linda health +971505760056"
  │
  ▼
Primary Master's WhatsApp (Linda's identity)
  │
  ▼
MessageRouter.js
  ├─ Is this a private message to primary master?
  ├─ Is sender an authorized master account?
  ├─ Does message start with "linda"?
  │
  ▼
WhatsAppCommandBridge.shouldHandle() → true
  │
  ▼
WhatsAppCommandBridge.handleMessage()
  ├─ Parses command + arguments
  ├─ Routes to handler method
  ├─ Captures console output (if terminal callback)
  ├─ Strips ANSI codes, collapses blank lines
  ├─ Chunks output into WhatsApp-sized messages
  │
  ▼
msg.reply("📱 Health for +971505760056: ...")
```

### Console Output Capture

When a terminal command is invoked (e.g., health dashboard), the bridge:
1. Temporarily replaces `console.log` and `console.clear`
2. Captures all output to a buffer
3. Strips ANSI escape codes (terminal colors)
4. Collapses excessive blank lines
5. Splits into 4000-character chunks for WhatsApp
6. Restores original console functions

---

## 🧪 Testing

```bash
# Run bridge tests only (153 tests)
npm run test:bridge

# Run all feature tests + bridge (969 total)
npm run test:all-features

# Run Phase 5 feature tests (816 tests)
npm run test:phase5
```

### Test Coverage

| Suite | Tests | Coverage Area |
|-------|-------|---------------|
| 1–2 | 11 | Constructor & dependency injection |
| 3 | 9 | Phone number normalization |
| 4 | 4 | Authorization validation |
| 5 | 10 | Message routing (shouldHandle) |
| 6–8 | 17 | Help, unknown commands, stats tracking |
| 9 | 7 | Console output capture |
| 10 | 6 | Message chunking |
| 11 | 7 | Health score calculation |
| 12–14 | 22 | Health, accounts, stats commands |
| 15 | 8 | Relink command variants |
| 16 | 6 | Goraha integration |
| 17 | 6 | Analytics commands |
| 18 | 10 | Google Sheets commands |
| 19 | 9 | Link, list, device, bridge-stats |
| 20 | 5 | Error handling |
| 21 | 5 | Full integration dispatch |
| 22 | 3 | Recover command |
| 23 | 8 | Help text completeness |
| **Total** | **153** | **100% pass rate** |

---

## 📁 Files

| File | Location | Lines |
|------|----------|-------|
| Bridge implementation | `code/WhatsAppBot/WhatsAppCommandBridge.js` | 908 |
| Test suite | `scripts/test-command-bridge.js` | 1,143 |
| MessageRouter integration | `code/WhatsAppBot/MessageRouter.js` | L168-176 |
| Startup initialization | `index.js` | L920-932 |

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Bridge not responding | Check bot is running and accounts are linked |
| "Unknown command" | Check spelling or type `linda help` |
| No reply received | Ensure you're messaging primary master's chat, not a group |
| "Not available" | The required manager (DLM, ACM, THD) isn't initialized |
| Long output truncated | Bridge auto-chunks to 4000 chars. Multiple messages = long output |
| Commands from primary master ignored | By design — primary is Linda, it can't command itself |
