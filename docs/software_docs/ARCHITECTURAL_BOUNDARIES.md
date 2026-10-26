# Architectural Boundaries — Linda

| Item | Value |
|---|---|
| Document ID | LINDA-SD-001 |
| Status | Current state (as built), with planned items marked **Planned** |
| Date | 2026-10-26 |
| Method | RUP; numbered algorithms (ALG-xxx), flowcharts (FC-xxx) and feature counters, see [docs/plans](../plans/README.md) |
| Related | [API_REFERENCE.md](./API_REFERENCE.md), [TERMINAL_DASHBOARD_GUIDE.md](./TERMINAL_DASHBOARD_GUIDE.md), [MONGOOSE_SCHEMAS.md](./MONGOOSE_SCHEMAS.md), [SRS](../plans/05-srs/SRS.md), [Software design](../plans/06-design/SOFTWARE_DESIGN.md) |

## 1. Purpose

This document defines what Linda is responsible for and what it is not. It also defines how the company
real-estate web app and other clients talk to Linda. It records the current state of the code and marks planned
work explicitly, so that the document never claims more than the code does.

## 2. Product definition

Linda is the WhatsApp communication engine for real-estate operations. It has two faces:

1. **Terminal operating system for the operator.** It runs in a terminal with pinned panels and no web UI. The
   operator links the master WhatsApp account, watches session health, runs campaigns and analyzes conversations.
2. **API service for the company web app.** A token-protected REST tier lets the web app and internal CRMs manage
   real-estate records and request WhatsApp messages without running browsers or WhatsApp sessions themselves.

Linda is also the real-estate operations agent: people, properties, tenancies, ownerships, buying inquiries, agents,
commissions, invoices and notifications are part of Linda's domain and data tier (see section 4).

### 2.1 Account scope

| Phase | Accounts |
|---|---|
| Current | **One master WhatsApp account.** All sending, campaigns, conversation analysis and (planned) API delivery go through it. |
| Later | Multiple accounts (servants and additional masters). Menus already list servants, but multi-account operation is not a supported workflow yet. |

## 3. System context

```
┌────────────────────────────────────┐        ┌────────────────────────────────────┐
│  COMPANY REAL-ESTATE WEB APP / CRM │        │  OPERATOR (terminal)               │
│  • Customer and agent UIs          │        │  • HEADER / FEATURES / INPUT /     │
│  • Listings, deals, pipelines      │        │    OUTPUT / PROCESS VIEWBOARD      │
└─────────────────┬──────────────────┘        └─────────────────┬──────────────────┘
                  │ HTTPS + Bearer token                         │ keyboard (stdin)
                  │ (admin / read / messaging)                   │
┌─────────────────▼──────────────────┐        ┌─────────────────▼──────────────────┐
│ PROCESS 2: API SERVER              │        │ PROCESS 1: BOT  (npm start)        │
│ src/api/api-server.js  (:3000)     │        │ index.js → src/whatsapp, sessions, │
│ or express-server.js   (:5000)     │        │ linking, terminal, campaigns       │
│ • 198 routes, tokens, idempotency  │        │ • whatsapp-web.js + Puppeteer      │
│ • writes CommunicationLog=queued   │        │ • headless Chromium ('new')        │
└─────────────────┬──────────────────┘        │ • LocalAuth sessions on local disk │
                  │                            └───────┬──────────────────┬─────────┘
                  │                                    │                  │
                  │        ┌───────────────────────────▼──┐      ┌────────▼─────────┐
                  └───────►│ MongoDB (Mongoose, 49 models)│      │ WhatsApp Web     │
                           │ CommunicationLog queue,      │      │ (master account) │
                           │ campaigns, limits, real-estate│      └──────────────────┘
                           └──────────────────────────────┘
        ─ ─ ► Bot-side API queue worker (opt-in, API_QUEUE_WORKER=1) reads due CommunicationLog (queued) and sends via the master
```

### 3.1 Processes

| Process | Start | Responsibility | Talks to |
|---|---|---|---|
| Bot | `npm start` (`index.js`) | WhatsApp sessions, linking, recovery, terminal UI, campaigns, conversation analysis, API queue delivery (opt-in) | WhatsApp Web (headless Chromium), MongoDB, Google Sheets (optional) |
| API server | `npm run api-server` (or `express-server`) | REST tier for the web app | MongoDB only |

The two processes share **only MongoDB**. There is no network channel between them: the API server queues
messages, and the bot's API queue worker (`src/campaigns/ApiQueueWorker.js`) delivers them. The loopback port that the bot
opens (derived from the project path) is a **single-instance lock**, not a command or API port
([ALG-001](../plans/03-algorithms/ALG-001-single-instance-lease.md)).

## 4. Responsibilities

### 4.1 In scope (Linda)

| Area | What Linda does | Where |
|---|---|---|
| Session persistence and recovery | LocalAuth profiles per account; automatic restore on start; non-destructive reactivation of a linked but offline device; relink only when WhatsApp logged the device out | `src/sessions`, `src/connection`, `src/linking`; [ALG-003](../plans/03-algorithms/ALG-003-master-restore.md), [ALG-005](../plans/03-algorithms/ALG-005-durable-session-store.md), [ALG-007](../plans/03-algorithms/ALG-007-logout-detection.md) |
| Device linking | Pairing code (`link-code`) or QR (`link-qr`) for the master | `src/linking` |
| Headless browser lifecycle | Puppeteer + Chromium with `headless: 'new'`, no GUI; cleanup on shutdown and recovery | `src/whatsapp/CreatingNewWhatsAppClient.js` |
| Terminal control centre | Pinned panels, numbered menu codes, feature IDs, playbooks | `src/terminal`; [TERMINAL_DASHBOARD_GUIDE.md](./TERMINAL_DASHBOARD_GUIDE.md) |
| Campaigns | Contact import, personalization, attachments, randomized intervals, pause/resume, results and CSV export | `src/campaigns`, `src/terminal/TerminalCampaignMenu.js` |
| Messaging safety | Daily caps, reservations, circuit breaker, consent and opt-out checks | section 6 |
| Conversation analysis | Read-only chat lists, per-chat statistics and reports from the active master session | `src/terminal/TerminalConversationAnalysis.js` |
| Local intelligence | Rule-based sentiment, intent, similarity and contact deduplication | `src/intelligence`, `src/services/DeduplicationService.js` |
| Real-estate data and API | People, properties, tenancies, ownerships, buying, agents, commissions, invoices, notifications, analytics | `src/api`, `src/database`; [API_REFERENCE.md](./API_REFERENCE.md) |

### 4.2 Out of scope (company web app)

| Area | Owner |
|---|---|
| Customer- and agent-facing user interfaces (listings, search, leaderboards, deal pipelines) | Web app |
| Public hosting of documents and media for third parties | Web app |
| End-user authentication and user management | Web app (Linda authenticates the web app itself with service tokens) |

The web app **reads and writes** real-estate records through Linda's API; Linda is the system of record for the
data in [MONGOOSE_SCHEMAS.md](./MONGOOSE_SCHEMAS.md).

## 5. Interface contract with the web app

| Aspect | Contract |
|---|---|
| Transport | HTTP(S) JSON; base path `/api` (server A) or `/api/v1/damac` (server B) |
| Authentication | `Authorization: Bearer <token>`; roles admin / read / messaging ([API_REFERENCE.md §3](./API_REFERENCE.md#3-authentication-and-authorization)) |
| Least privilege | Give the web app the **read** token for dashboards and the **messaging** token for sending; keep **admin** for operations |
| Idempotency | `Idempotency-Key` required on send / send-direct / send-bulk / schedule; repeats return the original record |
| Consent | Recipients need recorded consent before API messages are accepted |
| CORS | Only origins listed in `API_CORS_ORIGINS` |
| Delivery | **Opt-in.** API messages are stored as `queued`. With `API_QUEUE_WORKER=1` the bot sends due messages through the master, one at a time, within working hours and the other section 6 limits. With the worker off (default) they stay queued. Messages overdue by more than `API_QUEUE_MAX_AGE_HOURS` (24) are cancelled with `errorCode: EXPIRED`. Final status is visible in `CommunicationLog` (`sent`, `failed`, `cancelled`). |
| Session state | Not exposed by the API yet (API-G2) |
| Activation | Which API server runs, and when it starts relative to the bot, is still to be checked and decided (API-G4) |

## 6. Messaging safety limits

Current limits are **maximums**. Planned adaptive budgets may lower them, never raise them.

| Control | Current value | Where |
|---|---|---|
| Account daily cap | 45 messages per account per day, shared by campaigns and API queue sends | `src/campaigns/CampaignRateLimiter.js` |
| Campaign daily cap | 10 messages per campaign per day (default) | `CampaignWorkspaceSetup.js`, `CampaignService.js` |
| Interval between messages | Randomized between the campaign's minimum and maximum (3 s – 3600 s); API queue: `API_QUEUE_MIN/MAX_INTERVAL_SEC` (30–90 s, minimum 3 s) | `src/campaigns/CampaignWorkspace.js`, `ApiQueueWorker.js` |
| Circuit breaker | 5 failed sends within 10 min → account paused for 5 min (campaigns and API queue) | `CampaignRateLimiter.js` |
| Reservations | Every message is reserved in MongoDB before sending; a duplicate reservation is skipped, not re-sent. API messages are claimed atomically (`queued` → `sending`) | `CampaignService.reserveCampaignMessage`, `CommunicationService.processQueue` |
| Preconditions | MongoDB connected and sending account `CONNECTED`; otherwise the campaign or API queue worker waits | `CampaignWorkspaceSetup.js`, `ApiQueueWorker.js` |
| Opt-out / consent | Campaigns skip opted-out or revoked contacts; the API requires recorded consent, re-checked at send time | `ContactConsentService` |
| Uncertain delivery | If a send may have happened but was not confirmed, the result is marked "delivery unknown" (`DELIVERY_UNKNOWN`) and never auto-retried | `CampaignWorkspaceSetup.js`, `ApiQueueWorker.js` |
| Working hours | Messages are sent only inside the operator's window: `WORK_HOURS_START`–`WORK_HOURS_END` in `WORK_HOURS_TIMEZONE` (default 09:00–20:00 Asia/Dubai). Applies to terminal campaigns, the API queue worker and the legacy scheduler. Outside the window, sending waits (campaigns stay pausable); invalid settings fall back to the default with a warning | `src/campaigns/WorkingHours.js` |

Planned: **adaptive budgets** that lower the daily allowance and widen intervals based on account age, recent
failures and reply rates, within the caps above.

## 7. Data boundaries

| Data | Stored in | Leaves the machine? |
|---|---|---|
| WhatsApp sessions (LocalAuth browser profiles) | `sessions/` on local disk | No. Never sent to MongoDB, the API or Git. |
| Device / account metadata | `session-state.json`, `config/` (atomic writes) | No (not tracked in Git) |
| Conversation analysis results | Bot memory / terminal output | No |
| Campaign workspace drafts and attachment copies | `data/campaign-workspace/` | No |
| Messaging logs, campaigns, limits, consent, real-estate records | MongoDB (`MONGODB_URI`) | Only to the configured MongoDB server |

## 8. Intelligence boundary

| Phase | Behaviour |
|---|---|
| Current | **Local, rule-based only** (sentiment, intent, similarity, deduplication). No message content is sent to any external AI provider; no provider SDK is in the code. |
| Later (optional) | External AI model as an opt-in feature. It must be explicitly enabled by configuration, be off by default, and document what data is sent. |

## 9. Technical baseline

| Item | Value |
|---|---|
| Runtime | Node.js ≥ 22.13 (`package.json` engines); Node 24 LTS recommended |
| WhatsApp | `whatsapp-web.js` with `LocalAuth` |
| Browser | Puppeteer, Chromium in `headless: 'new'` mode |
| Data | MongoDB with Mongoose |
| Configuration | `.env` plus `config/` |
| Single instance | One bot per project folder, enforced by a loopback-port lock |

## 10. Known gaps and planned work

| ID | Item | Status |
|---|---|---|
| API-G1 | Bot-side queue worker: drain `CommunicationLog` (`queued`) through the master client within section 6 limits, honouring idempotency and consent | Implemented, opt-in (`API_QUEUE_WORKER=1`); unit-tested, not yet live-verified. Text only; sends only within working hours |
| API-G2 | Publish master session state and worker heartbeat to MongoDB so the API can report them | Planned |
| API-G3 | Choose one public API base path for the web app | To decide |
| API-G4 | API activation and timing relative to the bot | To check and add later |
| AR-1 | Multi-account operation | Later phase |
| AR-2 | Adaptive sending budgets within current caps | Planned |
| AR-3 | Optional external AI provider (explicit opt-in) | Later, optional |
| AR-4 | PROCESS VIEWBOARD as a full job panel | Planned ([TERMINAL_DASHBOARD_GUIDE.md §9](./TERMINAL_DASHBOARD_GUIDE.md#9-planned-changes)) |
