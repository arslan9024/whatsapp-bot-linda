# 🔄 Phase History & Changelog — WhatsApp Bot Linda

> All major development phases from inception to current state.  
> Use this to understand what exists, avoid duplicating work, and plan next phases.

---

## Current Version

- **Version**: 1.0.0
- **Last Major Commit**: March 4, 2026 — Codebase Cleanup, Unified Master Plan, Bug Fixes
- **Last Session Fixes**: May 8, 2026 — Wave 1–4 audit implementation, syntax fixes, Logger migration

---

## Full terminal UI and conversation report

- The terminal UI now runs top to bottom: HEADER (magenta), FEATURES (green), INPUT (yellow), OUTPUT (cyan), then a blue PROCESS VIEWBOARD bar with the scrolling logs below it.
- On short windows the header and features compact to one line each, and long OUTPUT is truncated instead of unpinning.
- After login, Linda analyzes every conversation read-only: total chats, the last conversation, and message counts per chat.
- When the master is online, the report appears in OUTPUT.
- New `convos [phone]` command, menu code `8.11` and feature `F34`.
- Environment variables: `LINDA_AUTO_CHAT_REPORT`, `LINDA_CHAT_REPORT_DELAY_MS`, `LINDA_CHAT_REPORT_LIMIT`, `LINDA_CHAT_REPORT_MAX_CHATS`.

## Full numbered feature list

- Every terminal feature is listed with a dotted code (`1.1`–`8.10`, plus per-account `1.8.N.x`) and a per-action usage counter. Type the code to run it. The list prints at startup, for `features` / `list-all` / `6.5`, and after each command when the panels are not pinned. Set `LINDA_FEATURE_LIST=0` to turn the automatic printing off.
- New actions: `1.17` disconnect by phone, `1.18` health of all accounts, `8.8` health score by phone, `8.9` list chats by phone, `8.10` analyze chat by phone. Existing codes did not change.
- The green FEATURES panel now shows `code command ×uses`. Per-action counters are saved in `data/feature-usage.json`. `features f` still lists the legacy F-ids.

## Restored archive features and feature counters

- Every terminal feature now has an ID (`F1`–`F33`) and a persisted usage counter (`data/feature-usage.json`). They are shown in a new green **FEATURES** panel pinned between OUTPUT and INPUT. Run any feature with `f<id> [args]` or `#<id>`; type `features` for the full list.
- Restored from `archive/legacy-code` without DB or legacy dependencies: `SentimentAnalyzer`, `IntentClassifier` (`src/intelligence/`), `DeduplicationService` (`src/services/`) and `HealthScorer` (`src/accounts/`, now with in-memory history).
- New terminal commands: `score`, `sentiment`, `intent`, `similar`, `dedupe`, `validate`, `send` (with confirmation). They are also in numbered menu section 8.
- New tools: `npm run security:scan` (Node port of `scan-secrets.ps1`) and `npm run doctor:google` (Google service-account token check).
- Security: redacted a MongoDB Atlas password committed in two docs files. It is still in git history, so rotate it.
- Not restored, because current code covers them or they depend on the old DB: RateLimiter (covered by CampaignRateLimiter), DeadLetterQueueService, validateDatabaseIntegrity, verifySystem (covered by `npm run doctor`).

## Pinned terminal panels

- Terminal dashboard now renders a cyan **OUTPUT** panel and a yellow **INPUT** panel pinned above scrolling logs (VT scroll region; `src/terminal/TerminalLayout.js`). Questions and pairing codes appear in the INPUT panel; QR codes unpin temporarily. `NO_COLOR` / `LINDA_PLAIN_TERMINAL=1` supported.

## Project Restructure — `src/` layout

- Replaced the flat `code/` tree with a domain-organised `src/` (core, sessions, accounts, connection, linking, terminal, whatsapp, commands, campaigns, api, database, integrations, analytics, intelligence, services, shared). All imports and `jest.mock` paths were rewritten.
- Moved the API servers to `src/api/`. Moved `bots-config.json`, `alertRules.json` and Google account/key files to `config/`. Moved runtime JSON to `data/app/`, which nodemon no longer watches.
- Archived ~246 unreferenced legacy files (~55k lines) and unused scripts under `archive/` (excluded from Jest, ESLint and nodemon).
- Consolidated root documentation and plans under `docs/`. Historical phase reports and notes are in `docs/archive/`.
- Mongoose models now reuse an already-compiled model instead of throwing `OverwriteModelError` when both schema entry points load.
- Updated npm scripts, `nodemon.json`, Jest/ESLint config, the CI workflow, `.gitignore` and `tools/doctor.js` for the new paths.

---

## Phase History

### Phase 1 — Core WhatsApp Client
- Single-account WhatsApp bot with QR linking
- Basic message receive and echo
- LocalAuth session persistence

### Phase 2 — Multi-Account Support
- Multiple WhatsApp accounts simultaneously
- Account config via `bots-config.json`
- Session isolation per phone number

### Phase 3–5 — Production Hardening
- `AccountBootstrapManager` for multi-account orchestration
- `DeviceRecoveryManager` for auto-reconnect
- `AccountHealthMonitor` per-account health scoring
- `SessionKeepAliveManager` heartbeat pings
- `DeviceLinkedManager` link status tracking
- `AccountConfigManager` dynamic account management

### Phase 10 — Connection Architecture Refactor
- `ConnectionManager` extracted (state machine per account)
- `ClientFlowSetup` unified QR + session restore flow
- `MessageRouter` extracted from index.js

### Phase 11 — Service Registry
- `ServiceRegistry` singleton replaces all `global.xxx`
- All managers registered via `services.register()`
- Eliminates global namespace pollution

### Phase 12 — Error Handling & Shutdown
- `ProcessErrorHandlers` — global unhandledRejection + uncaughtException
- `GracefulShutdown` — clean exit with resource cleanup
- `StartupDiagnostics` — pre-flight checks on boot

### Phase 13 — Terminal & Feature Infrastructure
- `FeatureInitializer` — phased feature startup
- `TerminalDashboardSetup` — terminal input listener for commands

### Phase 16 — Connection Diagnostics
- QR scan speed analyzer
- Health scorer per connection
- Connection diagnostics toolkit

### Phase 17 — Comprehensive Conversation Handling
- `Phase17Orchestrator` — message persistence, deduplication, normalization
- Advanced entity extraction with confidence scoring
- Emoji/Unicode handling and action tracking
- Context-aware response generation

### Phase 19 — Campaign Manager
- `CampaignScheduler` — queue with schedule triggers
- `CampaignService` — campaign CRUD and lifecycle
- `ContactFilterService` — filter contacts for campaigns
- `CampaignCommands` — bot commands for campaigns

### Phase 20 — Google & Secure Credentials
- `GoogleServiceAccountManager` — base64 credentials in `.env`
- `InteractiveMasterAccountSelector` — user-friendly account selection
- `EnhancedQRCodeDisplayV2` — professional QR rendering + timeouts
- `ProtocolErrorRecoveryManager` — Puppeteer/WWeb.js error recovery
- `EnhancedWhatsAppDeviceLinkingSystem` — 400% better linking UX
- `DeviceLinkingQueue` — parallel multi-device linking
- `DeviceLinkingDiagnostics` — smart error categorization + auto-healing

### Phase 21 — Manual Linking Enforcement
- `ManualLinkingHandler` — disables auto-link on startup
- Accounts must be linked via `link master` terminal command or `!link-master` WhatsApp message
- Pre-linking health check

### Phase 26 — Goraha Bot Integration
- `GorahaServicesBridge` — Goraha contact stats + account validation
- `EnhancedQRCodeDisplayV2` — real-time QR progress with visual indicators

### Phase 27 — Auto Session Restore
- `AutoSessionRestoreManager` — restores existing sessions on restart
- Prevents need for re-scanning after nodemon restarts

### Phase 29c — Auto Relinking & Connection Monitor
- `AutoAccountRelinkingManager` — re-links all accounts on restart
- `AccountConnectionMonitor` — real-time online/offline status tracking

### Phase 29d — Advanced Recovery
- `AutoReconnectManager` — reconnect on unexpected drops
- `CircuitBreakerManager` — per-phone circuit breaker (CLOSED/OPEN/HALF_OPEN)
- `GracefulDegradationManager` — partial service when accounts offline

### Phase 29e — Analytics & Reporting
- `AnalyticsManager` — real-time metrics per account
- `UptimeTracker` — SLA uptime tracking
- `ReportGenerator` — comprehensive reporting
- `MetricsDashboard` — terminal metrics display

### Phase 30 — Google Sheets CRUD
- `GoogleSheetsManager` — full CRUD for Google Sheets
- Campaign data read/write to sheets

### Phase 31 — WhatsApp Command Bridge
- `WhatsAppCommandBridge` — remote terminal control via WhatsApp chat
- 153/153 tests passing
- Commands: `!status`, `!link-master`, `!restart`, `!logs`, etc.
- Session-aware guard (won't link if session already exists)

---

## Session-Based Improvements (May 2026)

### Wave 1 — Critical Bug Fixes
1. **`getGoogleSheet.js`** — Silent catch now throws on API error (was returning `undefined` → downstream crash)
2. **`sendBroadCast.js`** — Null guard for `WhatsAppBotClient` (was crashing if not yet linked)
3. **`CircuitBreakerManager.js`** — Phone validation on all methods (was crashing with `phone=undefined`)
4. **`WhatsAppCommandBridge.js`** — Recovery polling wrapped in try/catch (was unhandled rejection)
5. **`MessageDeduplicator.js`** — `cleanup()` now also prunes `hashQueue` (stale refs caused window eviction inaccuracy)

### Wave 2 — Memory & Security Fixes
1. **`ProcessErrorHandlers.js`** — `_lastLoggedAt` Map capped at 500 entries (was growing unbounded)
2. **`ProcessErrorHandlers.js`** — Crash dumps created with `chmod 0o600` (was world-readable)
3. **`ClientFlowSetup.js`** — `client.removeAllListeners()` before recursive `setupClientFlow` call (was leaking 2-5MB per auth_failure retry)

### Wave 3 — Logger Migration
1. **`EnhancedMessageHandler.js`** — Added `logger` import, migrated 22 `console.error/warn` calls
2. Key service files already using logger: `SessionManager`, `MessageQueueManager`, `PropertyOwnerService`, `CommissionService`, `MessagePersistenceService`

### Wave 4 — Security Confirmed
1. API rate limiting: `apiLimiter` middleware applied globally in `code/api-server.js`
2. `.gitignore`: covers `sessions/`, `logs/`, `.env*`, `session-*/`
3. Crash dump permissions: fixed in Wave 2

### Infrastructure — New Files
- **`code/utils/Logger.js`** — Production logger, daily rotating files, 5MB limit, LOG_LEVEL env var
- **`code/utils/RateLimiter.js`** — Sliding window rate limiter (1msg/s, 60/min, 200/hr)
- **`code/utils/ServiceRegistry.js`** — Upgraded: `getOrThrow`, `snapshot`, `registeredAt` tracking
- **`tools/doctor.js`** — 12-check project health audit

### Syntax Fixes (May 8, 2026)
1. **`CommissionService.js`** — Broken import injection fixed (logger import was inserted inside another import statement)
2. **`PDFContractParser.js`** — Invalid regex `[\/-\.]` fixed (range out of order in character class)
3. **`ConversationAnalyzerGuide.js`** — Broken string literal `'🎤 Voice'.Message'` fixed to `'🎤 Voice Message'`

---

## Known Technical Debt

| Area | Issue | Priority |
|------|-------|---------|
| Wave 3 partial | ~30 more `console.log` calls in Dashboard/CLI files (intentional for terminal output) | Low |
| Guide files | `PHASE_16_INTEGRATION_GUIDE.js` has `./code/...` paths (guide file, not runtime) | Low |
| `code/main.js` | Old root import path issue (legacy file, not in main startup chain) | Low |
| Database migration | `migrateToRelational.js` references old schema files | Low |
| Test coverage | ConversationAnalyzer at ~65% test pass rate | Medium |

---

## Next Recommended Phases

### Phase 32 — Message Queue Persistence
- Persist outgoing queue to MongoDB on network failure
- FIFO delivery on reconnect
- Already scaffolded: `code/utils/MessageQueueManager.js`

### Phase 33 — Enhanced Campaign Analytics
- Per-campaign delivery rate tracking
- Bounce/failure analysis
- Google Sheets write-back of campaign results

### Phase 34 — Admin Web UI
- React dashboard for campaign management
- Account status monitoring
- Commission tracking UI

### Phase 35 — AI Response Generation
- LLM integration for auto-reply generation
- Context-aware responses using conversation history
- `code/AI/` directory is scaffolded
