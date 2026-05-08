# 🏗️ Project Architecture — WhatsApp Bot Linda

## Overview

Linda is an enterprise-grade WhatsApp automation platform purpose-built for UAE real estate (DAMAC Hills 2). It runs 24/7 via nodemon, supports multiple WhatsApp accounts simultaneously, handles bulk campaigns, integrates with Google Sheets/MongoDB, and provides a full REST API.

---

## Top-Level Directory Layout

```
/
├── index.js                  # Main bot entry — ALL phases initialized here
├── express-server.js         # REST API (MongoDB backend)
├── express-server-inmemory.js# REST API (in-memory, no DB needed)
├── package.json              # ES Module, node v25+
├── nodemon.json              # Nodemon watcher config
├── .env                      # Secrets (never in git)
├── .env.example              # Template for new devs
├── COPILOT_CONTEXT.md        # AI dev context (read first)
├── ARCHITECTURE.md           # This file
├── DEVELOPER_GUIDE.md        # Setup + workflow guide
│
├── code/                     # All source code
│   ├── WhatsAppBot/          # Core WhatsApp logic
│   ├── utils/                # Shared utilities & managers
│   ├── Services/             # Business logic services
│   ├── Database/             # Mongoose schemas & DB layer
│   ├── Routes/               # Express route handlers
│   ├── Commands/             # Linda AI command system
│   ├── GoogleSheet/          # Google Sheets integration
│   ├── GoogleAPI/            # Google OAuth & API auth
│   ├── Message/              # Message sending helpers
│   ├── Campaigns/            # Campaign builders
│   ├── Integration/          # External service bridges
│   ├── Analytics/            # Analytics helpers
│   ├── middleware/           # Express middleware
│   ├── Config/               # Config files & guides
│   └── ...                   # Other feature folders
│
├── tools/                    # CLI tools (doctor, cleanSessions, etc.)
├── scripts/                  # Phase test & validation scripts
├── tests/                    # Jest test suites
├── sessions/                 # WhatsApp session data (gitignored)
├── logs/                     # Daily rotating log files (gitignored)
├── Inputs/                   # Phone number input files
├── Outputs/                  # Campaign result outputs
├── docs/                     # Additional documentation
└── plans/                    # Planning documents
```

---

## Core Subsystems

### 1. WhatsApp Client Layer (`code/WhatsAppBot/`)

| File | Role |
|------|------|
| `CreatingNewWhatsAppClient.js` | Creates a new Puppeteer-backed Client with retry logic |
| `CreatingNewWhatsAppClientWithSession.js` | Creates client using existing session (no QR needed) |
| `ClientFlowSetup.js` | Unified event wiring: qr / authenticated / ready / disconnected / error |
| `MessageRouter.js` | Routes incoming messages to appropriate handlers |
| `EnhancedMessageHandler.js` | Full pipeline: type detection → enrichment → analysis → reply |
| `ConversationAnalyzer.js` | Intent/sentiment/entity extraction |
| `WhatsAppCommandBridge.js` | Remote terminal control via WhatsApp chat messages |
| `AccountBootstrapManager.js` | Multi-account initialization orchestrator |
| `SessionRestoreHandler.js` | Re-authenticate existing sessions on restart |
| `DeviceLinker.js` | QR-based new device linking flow |
| `QRCodeScanner.js` | QR display and scan monitoring |

### 2. Utility Managers (`code/utils/`)

| File | Role |
|------|------|
| `Logger.js` | Structured logger, daily file rotation, 5MB limit, child loggers |
| `ServiceRegistry.js` | Singleton locator — replaces global.XXX pattern |
| `RateLimiter.js` | Sliding window: 1msg/s per contact, 60/min global, 200/hr global |
| `ProcessErrorHandlers.js` | unhandledRejection + uncaughtException with crash dumps |
| `CircuitBreakerManager.js` | Circuit breaker per phone account (CLOSED/OPEN/HALF_OPEN) |
| `MessageDeduplicator.js` | SHA-256 hash + LRU cache, prevents duplicate processing |
| `ConnectionManager.js` | Per-account lifecycle: state machine, health checks, reconnect |
| `SessionManager.js` | Session folder CRUD, persistent recovery, nodemon-safe |
| `SessionStateManager.js` | JSON-persisted state of all device links |
| `AccountHealthMonitor.js` | Per-account health scoring and alerting |
| `SessionKeepAliveManager.js` | Heartbeat pings to keep sessions alive |
| `AutoSessionRestoreManager.js` | Auto-restores sessions on server restart |
| `AutoReconnectManager.js` | Reconnect strategies on unexpected disconnect |
| `GracefulDegradationManager.js` | Partial service when accounts are offline |
| `CampaignScheduler.js` | Campaign queue with scheduling and rate-aware sending |
| `TerminalHealthDashboard.js` | Live terminal dashboard with account status |
| `DeviceLinkedManager.js` | Tracks which phones are linked/unlinked |
| `ManualLinkingHandler.js` | Enforces manual-only linking (no auto on startup) |
| `GorahaServicesBridge.js` | Goraha Bot Google account validation bridge |
| `GoogleServiceAccountManager.js` | Base64-encoded service account credential manager |
| `AnalyticsManager.js` | Metrics collection per account |
| `UptimeTracker.js` | SLA uptime tracking |
| `browserCleanup.js` | Safe Chrome/Chromium cleanup (NEVER kills node.exe) |

### 3. Services Layer (`code/Services/`)

Business logic, separated from transport:

| Service | Purpose |
|---------|---------|
| `CommissionService.js` | Commission CRUD, calculations, payments, agent metrics |
| `CampaignService.js` | Campaign lifecycle management |
| `ContactFilterService.js` | Contact list filtering for campaigns |
| `MessagePersistenceService.js` | Message storage and retrieval |
| `WriteBackDeduplicator.js` | Prevents duplicate Google Sheet write-backs |
| `CommissionCalculationEngine.js` | Formula-based commission calculations |
| `ConversationThreadService.js` | Thread grouping and context management |
| `PropertyOwnerService.js` | Property owner data management (DAMAC Hills 2) |
| `PDFContractParser.js` | Extract dates and data from PDF contracts |
| `DeduplicationService.js` | Contact/message deduplication |

### 4. Database Layer (`code/Database/`)

Mongoose schemas + DB utilities:

| File | Purpose |
|------|---------|
| `CommissionSchema.js` | Commission, Payment, AgentMetrics, Deal, CommissionReport models |
| `index.js` | Database connection initializer |
| `PropertyOwnerService.js` | DB operations for property owners |
| `InMemoryMongoDBSetup.js` | In-memory MongoDB for testing |

### 5. REST API (`Routes/` + `express-server.js`)

All routes prefixed `/api/v1/`:

| Route File | Endpoints |
|-----------|-----------|
| `CommissionRoutes.js` | `/commissions` CRUD |
| `commission-rules.routes.js` | Commission rule management |
| `communication.routes.js` | Message send/receive API |
| `analytics.routes.js` | Metrics and reports |
| `invoice.routes.js` | Invoice generation |
| `notification.routes.js` | Push notifications |
| `people.routes.js` | Contact/people management |
| `property.routes.js` | Property listings |
| `tenancy.routes.js` | Tenancy management |
| `ownership.routes.js` | Ownership records |
| `buying.routes.js` | Buying/selling records |
| `agent.routes.js` | Agent management |

### 6. Linda AI Command System (`code/Commands/`)

| File | Purpose |
|------|---------|
| `LindaCommandHandler.js` | Parses and executes bot commands |
| `LindaCommandRegistry.js` | Registry of all available commands |
| `CampaignCommands.js` | Campaign-specific commands |

---

## Data Flow: Incoming Message

```
WhatsApp Client
    ↓ 'message' event
MessageRouter.js
    ↓ routes by type/content
EnhancedMessageHandler.js
    ↓ MessageDeduplicator (skip if duplicate)
    ↓ logMessageTypeCompact()
    ↓ MessageAnalyzerWithContext (entity extraction)
    ↓ ConversationAnalyzer (intent / sentiment)
    ↓ Phase17Orchestrator (persistence + normalization)
    ↓ LindaCommandHandler (if command prefix)
    ↓ WhatsAppCommandBridge (if !terminal command)
    ↓ Auto-reply or manual routing
```

## Data Flow: Outgoing Message (Campaign)

```
CampaignScheduler (schedule trigger)
    ↓ ContactFilterService (filter contacts)
    ↓ RateLimiter.acquire(phone)   ← MANDATORY
    ↓ sendBroadCast.js / SendMessage.js
    ↓ WhatsApp Client .sendMessage()
    ↓ MessagePersistenceService (log delivery)
    ↓ CampaignService (update status)
```

---

## Connection State Machine (per account)

```
INITIALIZING → CONNECTING → CONNECTED
                                ↓ (disconnect event)
                           DISCONNECTED → scheduleReconnect()
                                ↓
                           RECONNECTING → CONNECTING
                                ↓ (LOGOUT)
                           DISCONNECTED (manual re-auth needed)
```

Circuit breaker trips at `circuitBreakerThreshold` errors → `CIRCUIT_OPEN` → auto-retry after cooldown.

---

## Session Storage

```
sessions/
  session-{phone}/
    Default/
      Session          ← WhatsApp session SQLite
      ...
```

Sessions are **never deleted** during bot operation. Use `npm run clean-sessions` for manual cleanup.

---

## Environment Variables

See `.env.example` for full list. Key variables:

```bash
MASTER_PHONE_NUMBER=+971505760056
MONGODB_URI=mongodb://localhost:27017/linda-bot
GORAHA_SERVICE_ACCOUNT_BASE64=<base64 encoded JSON>
POWERAGENT_SERVICE_ACCOUNT_BASE64=<base64 encoded JSON>
LOG_LEVEL=info
NODE_ENV=production
DEBUG_CHROME=false
```
