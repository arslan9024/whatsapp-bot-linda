# 🤖 Copilot / AI Context — WhatsApp Bot Linda

> **Read this file first when continuing development with AI assistance.**  
> It describes architecture, conventions, author requirements, and active constraints.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | WhatsApp Bot Linda |
| **Author** | Arslan Malik |
| **Type** | Enterprise WhatsApp Automation Platform |
| **Domain** | Real Estate (DAMAC Hills 2, UAE) |
| **Runtime** | Node.js v25+ (ES Modules) |
| **Status** | Production / 24-7 mode |

---

## Author's Strict Requirements (Always Follow)

These are non-negotiable rules set by the author. Every AI suggestion **must** comply:

1. **Never kill `node.exe`** — crash recovery scripts may only kill `chrome.exe` / `chromium.exe`. The bot process must never be terminated by cleanup scripts.
2. **ES Modules only** — `"type": "module"` in package.json. Use `import`/`export`, never `require()`.
3. **Logger over console** — Use `import { logger } from '../utils/Logger.js'` (adjust path). Never use raw `console.log` / `console.error` / `console.warn` in production code. `console.log` is acceptable only in CLI/Dashboard display files.
4. **ServiceRegistry for globals** — Shared singleton instances go through `services.register()` / `services.get()`. No `global.xxx`.
5. **RateLimiter on all WhatsApp sends** — All outgoing WhatsApp messages must use `rateLimiter.acquire(phone)` before sending. Hard limit: 1 msg/s per contact, 60/min global.
6. **Null-safe everything** — Phone numbers, client instances, and API responses must be null-checked before use. Bot should degrade gracefully, not crash.
7. **Sessions are sacred** — Never delete or modify `sessions/session-{phone}/` during normal operation. Session cleanup only via `tools/cleanSessions.js` or `npm run clean-sessions`.
8. **Manual linking by default** — Accounts do NOT auto-link on startup. User must explicitly run `link master` in terminal or send `!link-master` via WhatsApp.
9. **Crash dump security** — Crash dump files must be created with `chmod 0o600` (owner-read only).
10. **No secrets in git** — Google credentials go in `.env` as base64. Never commit `keys.json` or credential files. `.gitignore` covers: `sessions/`, `logs/`, `.env*`, `session-state.json`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v25.2.1 |
| WhatsApp | whatsapp-web.js ^1.34.6 (Puppeteer/Chrome) |
| Process manager | nodemon 3.1.11 |
| Database | MongoDB (Mongoose 9) |
| API Server | Express 5 |
| Google | googleapis (Sheets, Gmail, Drive) |
| Logging | Custom `code/utils/Logger.js` (daily rotating, 5MB limit) |
| Config | dotenv |
| Testing | Jest |
| Linting | ESLint + Prettier |

---

## Entry Points

| File | Purpose |
|------|---------|
| `index.js` | **Main bot entry point** — loads all phases, starts WhatsApp clients |
| `express-server.js` | REST API server (MongoDB) |
| `express-server-inmemory.js` | REST API server (in-memory, no MongoDB needed) |
| `code/api-server.js` | Legacy DAMAC Hills 2 API |

---

## Start Commands

```bash
npm run dev:24-7      # Production 24/7 (nodemon, max-restarts=999, GC exposed)
npm run dev           # Dev watch mode
npm run doctor        # 12-check health audit
node tools/doctor.js  # Same as above
```

---

## Architecture: Phase-Based Initialization

The bot uses a **phase-based startup** in `index.js`. Each phase adds managers/services:

| Phase | Feature |
|-------|---------|
| 1-2 | Core WhatsApp client creation + session management |
| 3-5 | Multi-account orchestration, device recovery, health monitoring |
| 10-11 | ClientFlowSetup, MessageRouter, ServiceRegistry, ConnectionManager |
| 12 | ProcessErrorHandlers, GracefulShutdown, StartupDiagnostics |
| 13 | FeatureInitializer, TerminalDashboardSetup |
| 16 | Phase16 connection diagnostics |
| 17 | Phase17Orchestrator — Comprehensive conversation handling |
| 19 | CampaignScheduler, CampaignService, ContactFilterService |
| 20 | GoogleServiceAccountManager, Interactive linking UX |
| 21 | ManualLinkingHandler (no auto-link) |
| 26 | GorahaServicesBridge, EnhancedQRCodeDisplayV2 |
| 27 | AutoSessionRestoreManager |
| 29c | AutoAccountRelinkingManager, AccountConnectionMonitor |
| 29d | AutoReconnectManager, CircuitBreakerManager, GracefulDegradationManager |
| 29e | AnalyticsManager, UptimeTracker, ReportGenerator, MetricsDashboard |
| 30 | GoogleSheetsManager |
| 31 | WhatsAppCommandBridge (remote terminal control via chat) |

---

## Key Files Quick Reference

```
index.js                               Main bot (Phase 1–31 init)
code/utils/Logger.js                   Structured logger singleton — ALWAYS import this
code/utils/ServiceRegistry.js          Singleton service locator
code/utils/RateLimiter.js              WhatsApp send rate limiter
code/utils/ProcessErrorHandlers.js     Global uncaughtException/unhandledRejection
code/utils/CircuitBreakerManager.js    Circuit breaker per phone account
code/utils/MessageDeduplicator.js      SHA-256 + LRU dedup for incoming messages
code/utils/ConnectionManager.js        Per-account connection lifecycle
code/utils/SessionManager.js           Session folder management
code/WhatsAppBot/ClientFlowSetup.js    WhatsApp client event wiring (qr/ready/disconnected)
code/WhatsAppBot/MessageRouter.js      Incoming message routing
code/WhatsAppBot/EnhancedMessageHandler.js  Full message processing pipeline
code/WhatsAppBot/WhatsAppCommandBridge.js   Remote control via WhatsApp chat
code/WhatsAppBot/ConversationAnalyzer.js    Message analysis + intent detection
tools/doctor.js                        12-check project health audit
```

---

## Accounts Configuration

Stored in `code/GoogleAPI/accounts.json`:
```json
{
  "accounts": {
    "PowerAgent": { ... },
    "GorahaBot": { ... }
  }
}
```

Phone accounts in `code/WhatsAppBot/bots-config.json`. Sessions in `sessions/session-{phone}/`.

---

## Logger Usage

```js
import { logger } from '../utils/Logger.js';   // adjust path depth

logger.info('message');
logger.warn('warning');
logger.error('error', error);
logger.success('done');

// Child logger with context
const log = logger.child({ phone: '+971505760056' });
log.info('Client ready');

// Timing
const done = logger.time('operationName');
await doWork();
done();
```

---

## ServiceRegistry Usage

```js
import services from '../utils/ServiceRegistry.js';

// Register
services.register('myService', instance);

// Get (returns null if not found)
const svc = services.get('myService');

// Get or throw
const svc = services.getOrThrow('myService');

// Check
if (services.has('myService')) { ... }

// Debug snapshot
console.log(services.snapshot());
```

---

## RateLimiter Usage

```js
import { rateLimiter } from '../utils/RateLimiter.js';

// Before every send
await rateLimiter.acquire(phoneNumber);
await client.sendMessage(chatId, message);

// Or with wrapper
await rateLimiter.send(phoneNumber, () => client.sendMessage(chatId, msg));
```

---

## Doctor Check (npm run doctor)

Runs 12 automated checks:
1. Core files exist (index.js, package.json)
2. Google key files
3. accounts.json registry (2 accounts)
4. browserCleanup.js safe kill (no node.exe kill)
5. CommandBridge session-aware guard
6. logs/ dir writable
7. sessions/ directory
8. Memory within bounds
9. npm scripts present
10. No node.exe kill anywhere
11. ServiceRegistry exports
12. Logger exports

All 12 must pass before deployment.
