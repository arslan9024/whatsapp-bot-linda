# 👨‍💻 Developer Guide — WhatsApp Bot Linda

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v25+ | ES Modules required |
| npm | v11+ | |
| MongoDB | 6+ | Optional (in-memory mode available) |
| Chrome/Chromium | Any | Required for whatsapp-web.js Puppeteer |
| Git | Any | |

---

## First-Time Setup

```bash
# 1. Clone
git clone <repo-url>
cd WhatsApp-Bot-Linda

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your values (MongoDB URI, Google creds, etc.)

# 4. Run health check
npm run doctor

# 5. Start bot
npm run dev:24-7
```

---

## Linking a WhatsApp Account

The bot uses **manual linking only** (no auto-link on startup):

```bash
# In the running bot terminal, type:
link master

# Or, if another bot is already linked, send via WhatsApp:
!link-master
```

A QR code will appear in terminal. Scan with WhatsApp → Linked Devices → Link a Device.

---

## Available npm Scripts

### Bot
```bash
npm run dev:24-7          # 24/7 production mode (nodemon, max-restarts=999)
npm run dev               # Dev watch mode
npm start                 # Plain node start (no restart)
npm run doctor            # 12-check health audit
```

### API Server
```bash
npm run express-server    # REST API with MongoDB
npm run express-dev       # API with nodemon watch
npm run express-inmemory  # REST API in-memory (no DB needed)
```

### Session Management
```bash
npm run clean-sessions    # Remove old WhatsApp sessions
npm run fresh-start       # Full clean start (sessions + state)
npm run list-sessions     # Show current sessions
npm run status            # Show account status
```

### Testing
```bash
npm test                  # Run all Jest tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:commission   # Commission feature tests
npm run test:communication# Communication tests
npm run test:bridge       # Command bridge tests
```

### Code Quality
```bash
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Prettier format
```

---

## Adding a New Feature

### 1. Create Service File
```js
// code/Services/MyNewService.js
import { logger } from '../utils/Logger.js';

export class MyNewService {
  constructor() {
    this.log = logger.child({ service: 'MyNewService' });
  }

  async doSomething(phone) {
    if (!phone || typeof phone !== 'string') {
      this.log.warn('doSomething called with invalid phone');
      return null;
    }
    try {
      // ... logic
      this.log.info(`Done for ${phone}`);
    } catch (err) {
      this.log.error('doSomething failed', err);
      throw err;
    }
  }
}
```

### 2. Register with ServiceRegistry
```js
// In index.js (or FeatureInitializer.js)
import { MyNewService } from './code/Services/MyNewService.js';
import services from './code/utils/ServiceRegistry.js';

const myService = new MyNewService();
services.register('myNewService', myService);
```

### 3. Use in Message Handler
```js
const myService = services.getOrThrow('myNewService');
await myService.doSomething(senderPhone);
```

---

## Adding a New Bot Command

```js
// code/Commands/LindaCommandRegistry.js — add to registry:
{
  name: 'my-command',
  aliases: ['mc'],
  description: 'Does something useful',
  handler: async (msg, args, context) => {
    // ... handle command
    await msg.reply('Done!');
  }
}
```

---

## Adding a New API Endpoint

```js
// code/Routes/myFeature.routes.js
import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // ...
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
```

```js
// express-server.js — register the route:
import myFeatureRoutes from './code/Routes/myFeature.routes.js';
app.use('/api/v1/my-feature', myFeatureRoutes);
```

---

## Sending a WhatsApp Message (Correct Pattern)

```js
import { rateLimiter } from '../utils/RateLimiter.js';
import { logger } from '../utils/Logger.js';

async function sendSafeMessage(client, phone, message) {
  if (!client) {
    logger.warn(`sendSafeMessage: client is null for ${phone}`);
    return false;
  }
  if (!phone || typeof phone !== 'string') {
    logger.warn('sendSafeMessage: invalid phone');
    return false;
  }
  try {
    await rateLimiter.acquire(phone);  // ← ALWAYS rate-limit
    const chatId = phone.replace('+', '') + '@c.us';
    await client.sendMessage(chatId, message);
    return true;
  } catch (err) {
    logger.error(`sendSafeMessage failed for ${phone}`, err);
    return false;
  }
}
```

---

## Import Path Rules

| File location | Logger import |
|---------------|--------------|
| `code/utils/*.js` | `import { logger } from './Logger.js'` |
| `code/Services/*.js` | `import { logger } from '../utils/Logger.js'` |
| `code/WhatsAppBot/*.js` | `import { logger } from '../utils/Logger.js'` |
| `code/Database/*.js` | `import { logger } from '../utils/Logger.js'` |
| `code/Routes/*.js` | `import { logger } from '../utils/Logger.js'` |
| `code/WhatsAppBot/Handlers/*.js` | `import { logger } from '../../utils/Logger.js'` |
| `code/Integration/Google/utils/*.js` | Use local `./logger.js` (separate instance) |

**Rule**: Count how many `../` hops to reach `code/utils/`. Always use relative paths, never absolute.

---

## Debugging

### Check bot health
```bash
npm run doctor
```

### View live logs
```bash
# Windows
Get-Content logs\bot-$(Get-Date -Format 'yyyy-MM-dd').log -Wait -Tail 50

# Or in the terminal where bot is running — all output is live
```

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `ERR_MODULE_NOT_FOUND: Logger.js` | Wrong import path depth | Check path hops to `code/utils/` |
| `QRCodeDisplay.display is not a function` | Class used instead of instance | Use `new EnhancedQRCodeDisplayV2()` |
| `client is null` in sendBroadCast | WhatsApp not yet linked | Scan QR first with `link master` |
| `Circuit breaker OPEN` | Too many errors for one phone | Wait for cooldown, check account health |
| `Session locked` | Chrome crash left lock files | `npm run clean-sessions` then restart |
| `phone undefined` in CircuitBreaker | Missing null check upstream | Ensure phone is validated before passing |

---

## Testing Strategy

```bash
# Health audit (always run before commit)
npm run doctor

# Unit tests
npm test

# Feature integration tests
npm run test:commission
npm run test:communication
npm run test:bridge

# Full suite
npm run test:all-features
```

Tests live in `tests/` (Jest). Phase-specific scripts are in `scripts/`.

---

## Code Quality Standards

- **No `console.log`** in production code — use `logger`
- **No `global.xxx`** — use `ServiceRegistry`
- **Null-check phone** before all WhatsApp operations
- **Error boundaries** — catch errors per operation, log with context, never crash the process
- **Rate-limit** every outgoing message
- **Meaningful variable names** — `phoneNumber` not `p`, `connectionManager` not `cm`

---

## Deployment (Production)

```bash
# Pre-deploy checklist
npm run doctor            # Must be 12/12
npm test                  # Must pass
npm run lint              # No errors

# Start
npm run dev:24-7

# Link accounts
link master               # Type in bot terminal when QR appears
```

The bot auto-restarts on crash (max 999 restarts, 60s exit delay). Sessions persist across restarts — no re-scanning needed after normal restart.
