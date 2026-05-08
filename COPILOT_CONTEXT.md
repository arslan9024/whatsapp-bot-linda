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
11. **⚠️ CRITICAL — WhatsApp/Meta Policy Compliance (ZERO TOLERANCE)** — Every feature that sends WhatsApp messages **must** be designed and reviewed against current Meta/WhatsApp Business policies. Any bulk campaign, broadcast, automation, or bot-initiated message that violates Meta policy is a hard block — do not implement it. Before adding any new messaging feature, research and confirm compliance. Violations risk permanent account ban. See the full "WhatsApp/Meta Policy Compliance" section below.

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

---

## Codebase Structure — Five-Layer Architecture

Think of the codebase as five vertical layers:

```
1. Transport / Input
   WhatsApp clients, Express routes, webhooks
   └─ code/WhatsAppBot/   code/Routes/   bot/WebhookServer.js

2. Routing / Commands
   Message routing, Linda AI command system (56 commands)
   └─ code/WhatsAppBot/MessageRouter.js
      code/WhatsAppBot/EnhancedMessageHandler.js
      code/Commands/

3. Domain Services
   Business logic for property, tenancy, commission, invoices, analytics, campaigns
   └─ code/Services/

4. Persistence / Integrations
   MongoDB schemas + data access, Google Sheets/API
   └─ code/Database/   code/GoogleAPI/   code/GoogleSheet/

5. Operational Reliability
   Health monitoring, session management, auto-reconnect,
   circuit breakers, rate limiting, logging, dashboards
   └─ code/utils/
```

### Main Source Tree (`code/`)

```
code/
├── WhatsAppBot/      # Client lifecycle, message router/handlers, session restore, command bridge
├── Commands/         # LindaCommandHandler, LindaCommandRegistry + 9 domain command files
├── Routes/           # Express route modules (13 route files, 94+ endpoints)
├── Services/         # Business logic layer (60+ service files)
├── Database/         # Mongoose schemas, DB config, data migration scripts (16 models)
├── utils/            # Shared infra — Logger, RateLimiter, ServiceRegistry, CircuitBreaker,
│                     # ConnectionManager, SessionManager, HealthMonitor, Dashboards, …
├── GoogleAPI/        # Google OAuth + service account credential management
├── GoogleSheet/      # Google Sheets read/write helpers
├── Campaigns/        # Bulk messaging campaign builders
├── Analytics/        # Real-time analytics helpers
├── Contacts/         # Contact validation and linking
├── Message/          # Message sending utilities
├── AI/               # AI context integration and response generation
└── middleware/       # Express middleware (rate limiting, auth, …)
```

### Data Flow — Incoming Message

```
WhatsApp Client  →  MessageRouter  →  EnhancedMessageHandler
    ↓ MessageDeduplicator (skip duplicate)
    ↓ MessageAnalyzerWithContext (entity extraction)
    ↓ ConversationAnalyzer (intent / sentiment)
    ↓ Phase17Orchestrator (persist + normalise)
    ↓ LindaCommandHandler (if ! command)
    ↓ WhatsAppCommandBridge (if !terminal command)
    ↓ Auto-reply or manual routing
```

### Data Flow — Outgoing Campaign Message

```
CampaignScheduler → ContactFilterService → RateLimiter.acquire(phone)
    → sendBroadCast.js / SendMessage.js
    → WhatsApp Client .sendMessage()
    → MessagePersistenceService (log)
    → CampaignService (update status)
```

### Secondary Bot Framework (`bot/`)

An additional modular abstraction layer providing:
- `CustomBotEngine` — engine lifecycle management
- `BotConnection` — hybrid connection modes (browser / websocket / Twilio)
- `MessageHandler` — message processing pipeline
- `SessionManager` — session CRUD with expiry
- `WebhookServer` — Twilio/payment/admin webhook receiver
- `CommandRouter` — command routing to API client
- `DamacApiClient` — HTTP client for the property management API
- `BotIntegration` — orchestrates all of the above; primary entry via `bot-main.js`

---

## ⚠️ WhatsApp/Meta Policy Compliance — STRICTLY ENFORCED

> **This section is a non-negotiable constraint on every messaging feature.**  
> Violating Meta/WhatsApp Business policies risks **permanent account ban**.  
> Every developer and AI agent working on this project must read, understand, and follow these rules before implementing any messaging feature.

### Why This Matters

`whatsapp-web.js` uses the WhatsApp Web browser automation approach (unofficial API).  
Meta actively detects and bans accounts that misuse the platform — including bulk senders, spammers, and accounts that violate consent rules.  
Account bans are often **irreversible** and affect all session-linked phone numbers.

### 🔴 Hard Rules (Never Violate)

| # | Rule | Consequence of Violation |
|---|------|--------------------------|
| 1 | **Explicit opt-in required** — Never send any bot-initiated message to a contact who has not explicitly consented to receive messages from this business. Consent must be documented. | Immediate account flag / ban |
| 2 | **No purchased/scraped contact lists** — All contacts must come from legitimate sources (own CRM, Google Sheets synced from verified sources, user-initiated chat). | Account ban |
| 3 | **No spam or unsolicited promotions** — Do not send bulk promotional content to contacts without prior opt-in and clear business context. | Quality degradation → ban |
| 4 | **Provide easy opt-out** — Every campaign or bulk message must include a clear opt-out instruction (e.g., "Reply STOP to unsubscribe"). Opt-out requests must be processed **immediately** and automatically. | Policy violation |
| 5 | **Rate limiting is mandatory** — Never exceed 1 msg/s per contact or 60 msg/min globally. Exceeding limits triggers spam detection. | Temporary/permanent ban |
| 6 | **No prohibited content** — Never send: illegal content, misinformation, content involving prohibited goods/services, adult content, or anything violating Meta Community Standards. | Immediate ban |
| 7 | **Never impersonate another business or person** — All messages must clearly identify the sending business (DAMAC Hills 2 / Goraha). | Policy violation + legal risk |
| 8 | **No message flooding to the same contact** — Do not send the same contact multiple messages in a short window unless they have explicitly requested follow-up. | Block/report spike → ban |
| 9 | **Honour user blocks and reports** — If a contact blocks the bot or reports spam, remove them from all campaign lists immediately. Do not attempt to re-add them. | Account quality degradation |
| 10 | **Never use multiple accounts to circumvent limits** — Do not distribute spam across PowerAgent and GorahaBot to bypass rate limits. | Both accounts banned |

### 🟡 Quality & Compliance Best Practices

- **Monitor quality score** — WhatsApp assigns a quality rating based on block/report rates. If quality drops to "Low", immediately pause all campaigns and review contact lists.
- **Use message templates for campaigns** — For the official WhatsApp Business API, all business-initiated messages require pre-approved templates. Even for the web-based approach, design messages as if they are template messages (consistent, relevant, non-spammy).
- **Personalize messages** — Generic broadcast blasts trigger higher block rates. Use contact names and relevant property data to make messages relevant.
- **Timing matters** — Do not send messages at night or unusual hours (respect UAE timezone, +4 UTC). Prefer business hours: 9 AM–7 PM GST.
- **Campaign frequency limits** — Do not send more than 1–2 campaign messages per contact per week.
- **Record-keeping** — Maintain opt-in logs in the database (`CampaignSchema`, `CommunicationLogSchema`) for audit purposes.

### 🟢 Policy Research Feature (Planned)

> **This is a planned feature for Linda — high priority.**

Linda must be able to **research and validate** that any new messaging workflow is compliant before execution. This means:

1. **Pre-send compliance check** — Before any campaign is scheduled or sent, a `PolicyComplianceService` validates:
   - All contacts are opted-in (`optInStatus: true` in DB)
   - No contacts on opt-out/blocklist
   - Message content does not violate keyword filters (spam keywords, prohibited content)
   - Rate limits are within bounds
   - Sending time is within business hours

2. **AI-assisted policy research** — Linda should be able to, on demand (`!policy check` command), query the latest Meta/WhatsApp Business policies via:
   - Fetching the official Meta policy pages (`https://www.whatsapp.com/legal/business-policy/`)
   - Summarising recent policy changes using AI
   - Alerting the operator if new restrictions affect current campaign configurations

3. **Opt-in/Opt-out management** — All contacts must have an `optInStatus` and `optOutDate` field in their schema. The `!optout` bot command and STOP keyword handler must update this immediately.

4. **Compliance audit command** — `!compliance audit` should produce a report of:
   - Total opted-in vs opted-out contacts
   - Contacts who blocked or reported in the past 30 days
   - Campaign quality scores
   - Any pending policy violations

### Official Policy References

| Document | URL |
|----------|-----|
| WhatsApp Business Policy | https://www.whatsapp.com/legal/business-policy/ |
| Meta Platform Terms | https://developers.facebook.com/terms/ |
| WhatsApp Commerce Policy | https://www.whatsapp.com/legal/commerce-policy/ |
| WhatsApp Messaging Guidelines | https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in |

> **Action for developers:** Before shipping any new campaign feature or messaging automation, open the official policy links above and confirm compliance. Document your review in the PR description.

---

## Last Updated

**May 2026** — Arslan Malik  
Sections added: Codebase five-layer architecture, data flows, WhatsApp/Meta Policy Compliance (Strict Rule #11).
