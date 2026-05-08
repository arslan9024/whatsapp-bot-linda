# 📖 Project Context — WhatsApp Bot Linda

> This file provides a concise architectural overview of the repository.  
> Read it alongside `COPILOT_CONTEXT.md` (AI/dev conventions) and `ARCHITECTURE.md` (deep-dive diagrams).

---

## What This Repository Is

**WhatsApp Bot Linda** is an enterprise-grade WhatsApp automation platform purpose-built for UAE real-estate workflows (DAMAC Hills 2). It:

- Runs multiple WhatsApp accounts simultaneously (multi-bot, multi-session)
- Handles bulk messaging campaigns with scheduling and rate limiting
- Exposes a full REST API for property management (owners, tenants, contracts, payments, commissions, invoices, notifications)
- Integrates with Google Sheets/Google API for contact and data synchronisation
- Persists data in MongoDB (Mongoose) with 16+ normalized schemas
- Operates 24/7 via nodemon with auto-recovery, circuit breakers, and health monitoring

---

## Key Technologies

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v25+ (ES Modules — `"type": "module"`) |
| WhatsApp | `whatsapp-web.js` (Puppeteer/Chromium) |
| API server | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Google APIs | `googleapis` (Sheets, Contacts, Drive) |
| Scheduling | `node-cron` |
| Validation | `libphonenumber-js`, custom `validation.js` |
| Logging | Custom `code/utils/Logger.js` (daily rotating, 5 MB limit) |
| Config | `dotenv` |
| Testing | Jest + `mongodb-memory-server` |
| Linting | ESLint + Prettier |
| Process mgmt | nodemon |

---

## Code Organisation — Five Layers

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

---

## Entry Points

| File | Purpose |
|------|---------|
| `index.js` | **Bot entry point** — initialises all phases (1–31), starts WhatsApp clients |
| `express-server.js` | REST API server backed by MongoDB |
| `express-server-inmemory.js` | REST API server with in-memory MongoDB (dev/test, no DB needed) |
| `code/api-server.js` | Legacy DAMAC Hills 2 property API |
| `bot/bot-main.js` | Hybrid bot framework entry (alternative architecture track) |

---

## Main Source Tree (`code/`)

```
code/
├── WhatsAppBot/      # Client lifecycle, message router/handlers, session restore, command bridge
├── Commands/         # LindaCommandHandler, LindaCommandRegistry + 9 domain command files
├── Routes/           # Express route modules (13 route files, 94+ endpoints)
├── Services/         # Business logic layer (60+ service files)
├── Database/         # Mongoose schemas, DB config, data migration scripts
├── utils/            # Shared infra — Logger, RateLimiter, ServiceRegistry, CircuitBreaker,
│                     # ConnectionManager, SessionManager, HealthMonitor, Dashboards, …
├── GoogleAPI/        # Google OAuth + service account credential management
├── GoogleSheet/      # Google Sheets read/write helpers
├── Campaigns/        # Bulk messaging campaign builders
├── Analytics/        # Real-time analytics helpers
├── Contacts/         # Contact validation and linking
├── Message/          # Message sending utilities
└── middleware/       # Express middleware (rate limiting, auth, …)
```

---

## Secondary Bot Framework (`bot/`)

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

## Testing & Documentation

| Location | Contents |
|----------|----------|
| `tests/` | Jest unit, integration, E2E, performance, security, phase-specific suites |
| `bot/tests/` | Bot framework integration + performance tests |
| `docs/` | 600+ markdown files — phase docs, session notes, guides, API references, security audits |
| `plans/` | Master plan, feature roadmaps, upgrade plans, archive, references |
| `scripts/` | Phase validation, API test, and demo scripts |
| `tools/` | CLI tools: `doctor.js`, `cleanSessions.js`, `showStatus.js`, `sendHelloMessage.js`, … |

---

## Operational Commands

```bash
# Bot
npm run dev:24-7        # 24/7 production mode (nodemon, max-restarts=999)
npm run dev             # Development watch mode
npm run doctor          # 12-check health audit

# API server
npm run express-server  # REST API with live MongoDB
npm run express-inmemory# REST API with in-memory MongoDB

# Session management
npm run clean-sessions  # Remove old sessions
npm run fresh-start     # Full clean start
npm run status          # Show account status

# Testing & linting
npm test                # Run all Jest tests
npm run lint            # ESLint check
npm run format          # Prettier format
```

---

## Data Flow — Incoming Message

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

## Data Flow — Outgoing Campaign Message

```
CampaignScheduler → ContactFilterService → RateLimiter.acquire(phone)
    → sendBroadCast.js / SendMessage.js
    → WhatsApp Client .sendMessage()
    → MessagePersistenceService (log)
    → CampaignService (update status)
```

---

## Key Conventions (Summary)

| Rule | What to do |
|------|-----------|
| Modules | ES Modules only (`import`/`export`). Always include `.js` in import paths. |
| Logging | Use `logger` from `code/utils/Logger.js`, not `console.*` |
| Globals | Use `ServiceRegistry` (`services.register` / `services.getOrThrow`), never `global.xxx` |
| WhatsApp sends | Always call `rateLimiter.acquire(phone)` before `client.sendMessage()` |
| Null safety | Null-check phone numbers, client instances, and API responses before use |
| Sessions | Never delete `sessions/session-{phone}/` in code — use `npm run clean-sessions` |
| Secrets | All credentials in `.env` as base64. Never commit `keys.json` or `.env`. |
| Node process | Cleanup scripts may only kill `chrome.exe`/`chromium.exe` — never `node.exe` |

> Full coding standards: see `CODING_STANDARDS.md`  
> AI/dev context: see `COPILOT_CONTEXT.md`  
> Deep architecture: see `ARCHITECTURE.md`

---

**Last Updated:** May 2026  
**Maintained by:** Arslan Malik
