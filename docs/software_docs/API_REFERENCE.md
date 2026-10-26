# API Reference — Linda REST Tier

| Item | Value |
|---|---|
| Document ID | LINDA-SD-002 |
| Status | Current state (as built) |
| Date | 2026-10-26 |
| Source of truth | `src/api/**` (route tables below are generated from the route files) |
| Related | [ARCHITECTURAL_BOUNDARIES.md](./ARCHITECTURAL_BOUNDARIES.md), [MONGOOSE_SCHEMAS.md](./MONGOOSE_SCHEMAS.md) |

## 1. Purpose and scope

This document lists every HTTP endpoint that Linda exposes to the company real-estate web app and other internal
clients, with the bearer token each one accepts. It describes the code as it is today. Items that do not exist yet
are listed only in [section 8](#8-known-gaps-and-planned-work).

> **Delivery status (important).** The API stores outgoing WhatsApp messages as `queued` records. The API process
> has no WhatsApp client, and no bot-side worker drains that queue yet, so **messages accepted by the API are not
> delivered to WhatsApp today**. See [section 8](#8-known-gaps-and-planned-work).

## 2. Servers

Three Express entry points exist. They share the same security middleware.

| ID | Entry point | npm script | Port (env, default) | Mounted route files |
|---|---|---|---|---|
| A | `src/api/api-server.js` | `npm run api-server` | `API_PORT` or `PORT`, 3000 | 12 files under `/api/*` |
| B | `src/api/express-server.js` | `npm run express-server` | `EXPRESS_SERVER_PORT`, 5000 | `damacApiRoutes.js` at `/api/v1/damac`; `communication.routes.js` at `/api/v1/damac/communication` |
| B′ | `src/api/express-server-inmemory.js` | `npm run express-inmemory` | `EXPRESS_SERVER_PORT`, 5000 | Same as B, backed by an in-memory MongoDB (development only) |

All servers refuse to start unless `API_ACCESS_TOKEN` is configured (see section 3). The WhatsApp bot
(`npm start`, `index.js`) is a separate process and does **not** start any of these servers.

### 2.1 Operational endpoints

| Method | Path | Servers | Auth | Notes |
|---|---|---|---|---|
| GET | `/health` | A, B, B′ | none | Liveness and uptime |
| GET | `/ready` | A, B, B′ | none | 200 when MongoDB is connected, otherwise 503 |
| GET | `/metrics` | A, B, B′ | admin | Request metrics, queued message count, average delivery latency |
| GET | `/info` | B, B′ | none | Server information |
| GET | `/api/version` | A | read, admin | API version |

## 3. Authentication and authorization

Implemented in `src/api/middleware/apiSecurity.js`. Every `/api/*` request passes, in order:
`apiLimiter` → `requireApiToken` → `requireApiPermission` → `validateApiRequest` → route handler.

Send `Authorization: Bearer <token>`. The token is compared in constant time (`timingSafeEqual`).

| Role | Environment variable | Required | Allowed requests |
|---|---|---|---|
| admin | `API_ACCESS_TOKEN` | Yes (min. 32 chars) | Everything |
| read | `API_READ_TOKEN` | Optional (min. 32 chars) | `GET`, `HEAD`, `OPTIONS` |
| messaging | `API_MESSAGING_TOKEN` | Optional (min. 32 chars) | `POST` to communications `/send`, `/send-direct`, `/send-bulk`, `/schedule` only |

Rules:

- The three tokens must be distinct; otherwise the server will not start.
- Missing or invalid token → `401 Unauthorized`. Valid token without permission → `403 Forbidden`.
- Missing configuration at request time → `503 API authentication is not configured`.
- Some routes add an explicit `requireApiRole('admin')` (for example consent records); the tables show this.

### 3.1 CORS

Allowed origins come from `API_CORS_ORIGINS` (comma-separated). Requests without an `Origin` header (server to
server) are allowed. Allowed headers: `Content-Type`, `Authorization`, `Idempotency-Key`.

### 3.2 Rate limiting

`apiLimiter` (`src/api/middleware/rateLimit.js`): 100 requests per 15 minutes per client IP, with standard
`RateLimit-*` headers. This HTTP limit is separate from the WhatsApp sending limits (see
[ARCHITECTURAL_BOUNDARIES.md §6](./ARCHITECTURAL_BOUNDARIES.md#6-messaging-safety-limits)).

### 3.3 Request validation

`validateApiRequest` (`src/api/middleware/apiRequestValidation.js`) rejects with `400`:

- `page`, `limit`, `skip` that are not whole numbers; `page < 1`; `limit` outside 1–100; `skip` above 100,000;
  or a page beyond offset 100,000.
- `search`, `query`, `namePattern` longer than 200 characters.
- Request bodies or queries containing MongoDB operator keys (`$…`), dotted keys, or nesting deeper than 10 levels.

## 4. Idempotency

The four messaging endpoints (`POST /send`, `/send-direct`, `/send-bulk`, `/schedule` under the communications
prefix) **require** an `Idempotency-Key` header: 8–128 characters from `[A-Za-z0-9._:-]`. A missing or invalid
key returns `400`. Repeating a request with the same key returns the original record instead of queueing a second
message (`src/database/services/CommunicationService.js`). Use one new key per logical message (for example a UUID).

## 5. Response conventions

Most handlers return JSON of the form `{ success: boolean, data | error, timestamp }`. Unknown paths return `404`.
The global error handler (server A) maps Mongoose validation errors to `400`, duplicate keys to `409`, and other
errors to `500`. Stack traces are logged only when `NODE_ENV=development`; passwords, tokens and secrets in error
details are redacted.

## 6. Endpoint catalogue

Total: **198 route definitions** in 13 route files (plus the operational endpoints in §2.1).
"Tokens" lists the roles that are accepted. Servers: A = `api-server.js`, B = `express-server.js` and
`express-server-inmemory.js`.

| Route file | Servers | Prefix | Endpoints |
|---|---|---|---|
| [People (contacts, owners, tenants, buyers)](#61-people-contacts-owners-tenants-buyers) (`people.routes.js`) | A | `/api/people` | 8 |
| [Properties](#62-properties) (`property.routes.js`) | A | `/api/properties` | 8 |
| [Tenancies](#63-tenancies) (`tenancy.routes.js`) | A | `/api/tenancies` | 10 |
| [Ownerships](#64-ownerships) (`ownership.routes.js`) | A | `/api/ownerships` | 7 |
| [Buying inquiries](#65-buying-inquiries) (`buying.routes.js`) | A | `/api/buying` | 7 |
| [Agents](#66-agents) (`agent.routes.js`) | A | `/api/agents` | 7 |
| [Commissions](#67-commissions) (`CommissionRoutes.js`) | A | `/api/commissions` | 17 |
| [Commission rules](#68-commission-rules) (`commission-rules.routes.js`) | A | `/api/commission-rules` | 18 |
| [Communications (WhatsApp messaging queue)](#69-communications-whatsapp-messaging-queue) (`communication.routes.js`) | A+B | `/api/communications` | 26 |
| [Analytics](#610-analytics) (`analytics.routes.js`) | A | `/api/analytics` | 14 |
| [Invoices](#611-invoices) (`invoice.routes.js`) | A | `/api/invoices` | 25 |
| [Notifications](#612-notifications) (`notification.routes.js`) | A | `/api/notifications` | 23 |
| [DAMAC Hills 2 inventory (v1)](#613-damac-hills-2-inventory-v1) (`damacApiRoutes.js`) | B | `/api/v1/damac` | 28 |

### 6.1 People (contacts, owners, tenants, buyers)

Source: `src/api/routes/people.routes.js` · Prefix: `/api/people` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/people` | read, admin | List all people with optional filtering and pagination |
| 2 | GET | `/api/people/:id` | read, admin | Get a specific person by ID |
| 3 | POST | `/api/people` | admin | Create a new person |
| 4 | PUT | `/api/people/:id` | admin | Update a person |
| 5 | DELETE | `/api/people/:id` | admin | Delete a person |
| 6 | GET | `/api/people/role/owners` | read, admin | Get all owners |
| 7 | GET | `/api/people/role/tenants` | read, admin | Get all tenants |
| 8 | GET | `/api/people/role/agents` | read, admin | Get all agents |

### 6.2 Properties

Source: `src/api/routes/property.routes.js` · Prefix: `/api/properties` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/properties` | read, admin | List all properties with filtering and pagination |
| 2 | GET | `/api/properties/:id` | read, admin | Get a specific property by ID |
| 3 | POST | `/api/properties` | admin | Create a new property |
| 4 | PUT | `/api/properties/:id` | admin | Update a property |
| 5 | DELETE | `/api/properties/:id` | admin | Delete a property |
| 6 | GET | `/api/properties/cluster/:clusterId` | read, admin | Get properties by cluster |
| 7 | GET | `/api/properties/developer/:developerId` | read, admin | Get properties by developer |
| 8 | PUT | `/api/properties/:id/availability` | admin | Update property availability status |

### 6.3 Tenancies

Source: `src/api/routes/tenancy.routes.js` · Prefix: `/api/tenancies` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/tenancies` | read, admin | List all tenancy contracts |
| 2 | GET | `/api/tenancies/:id` | read, admin | Get a specific tenancy contract |
| 3 | POST | `/api/tenancies` | admin | Create a new tenancy contract |
| 4 | PUT | `/api/tenancies/:id` | admin | Update a tenancy contract |
| 5 | DELETE | `/api/tenancies/:id` | admin | Delete a tenancy contract |
| 6 | GET | `/api/tenancies/property/:propertyId` | read, admin | Get all tenancy contracts for a property |
| 7 | GET | `/api/tenancies/tenant/:tenantId` | read, admin | Get all tenancy contracts for a tenant |
| 8 | POST | `/api/tenancies/:id/payment` | admin | Record a payment for a tenancy contract |
| 9 | GET | `/api/tenancies/:id/payments` | read, admin | Get all payments for a tenancy |
| 10 | GET | `/api/tenancies/:id/rent-calculation` | read, admin | Calculate total rent for a tenancy |

### 6.4 Ownerships

Source: `src/api/routes/ownership.routes.js` · Prefix: `/api/ownerships` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/ownerships` | read, admin | List all property ownerships |
| 2 | GET | `/api/ownerships/:id` | read, admin | Get a specific ownership record |
| 3 | POST | `/api/ownerships` | admin | Create a new ownership record |
| 4 | PUT | `/api/ownerships/:id` | admin | Update an ownership record |
| 5 | DELETE | `/api/ownerships/:id` | admin | Delete an ownership record |
| 6 | GET | `/api/ownerships/property/:propertyId` | read, admin | Get all owners of a property |
| 7 | GET | `/api/ownerships/owner/:ownerId` | read, admin | Get all properties owned by a person |

### 6.5 Buying inquiries

Source: `src/api/routes/buying.routes.js` · Prefix: `/api/buying` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/buying` | read, admin | List all buying agreements |
| 2 | GET | `/api/buying/:id` | read, admin | Get a specific buying agreement |
| 3 | POST | `/api/buying` | admin | Create a new buying agreement |
| 4 | PUT | `/api/buying/:id` | admin | Update a buying agreement |
| 5 | DELETE | `/api/buying/:id` | admin | Delete a buying agreement |
| 6 | GET | `/api/buying/buyer/:buyerId` | read, admin | Get all buying agreements for a buyer |
| 7 | GET | `/api/buying/seller/:sellerId` | read, admin | Get all selling agreements for a seller |

### 6.6 Agents

Source: `src/api/routes/agent.routes.js` · Prefix: `/api/agents` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/agents` | read, admin | List all agent assignments |
| 2 | GET | `/api/agents/:id` | read, admin | Get a specific agent assignment |
| 3 | POST | `/api/agents` | admin | Create a new agent assignment |
| 4 | PUT | `/api/agents/:id` | admin | Update an agent assignment |
| 5 | DELETE | `/api/agents/:id` | admin | Delete an agent assignment |
| 6 | GET | `/api/agents/property/:propertyId` | read, admin | Get all agents assigned to a property |
| 7 | GET | `/api/agents/agent/:agentId` | read, admin | Get all properties assigned to an agent |

### 6.7 Commissions

Source: `src/api/routes/CommissionRoutes.js` · Prefix: `/api/commissions` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/commissions` | admin | Create a new commission |
| 2 | GET | `/api/commissions/:commissionId` | read, admin | Get commission by ID |
| 3 | GET | `/api/commissions/agent/:agentPhone` | read, admin | Get all commissions for an agent |
| 4 | PUT | `/api/commissions/:commissionId` | admin | Update commission |
| 5 | POST | `/api/commissions/:commissionId/mark-paid` | admin | Mark commission as paid |
| 6 | GET | `/api/commissions/agent/:agentPhone/earnings` | read, admin | Get earnings for an agent |
| 7 | POST | `/api/commissions/calculate` | admin | Calculate commission from sale price |
| 8 | GET | `/api/commissions/metrics/:agentPhone` | read, admin | Get agent metrics |
| 9 | POST | `/api/commissions/update-metrics/:agentPhone` | admin | Refresh agent metrics |
| 10 | POST | `/api/commissions/payments` | admin | Create payment transaction |
| 11 | GET | `/api/commissions/payments/:agentPhone` | read, admin | Get payment history for agent |
| 12 | POST | `/api/commissions/payments/:paymentId/complete` | admin | Mark payment as completed |
| 13 | POST | `/api/commissions/deals` | admin | Create a new deal |
| 14 | GET | `/api/commissions/deals/:agentPhone` | read, admin | Get deals for agent |
| 15 | POST | `/api/commissions/deals/:dealId/close` | admin | Close deal and generate commission |
| 16 | PUT | `/api/commissions/deals/:dealId/status` | admin | Update deal status |
| 17 | GET | `/api/commissions/reports/:agentPhone` | read, admin | Generate commission report |

### 6.8 Commission rules

Source: `src/api/routes/commission-rules.routes.js` · Prefix: `/api/commission-rules` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/commission-rules` | admin | approvalRequired, approvalThreshold } |
| 2 | GET | `/api/commission-rules` | read, admin | Query: ?active=true&type=percentage&propertyType=villa&transactionType=sale&limit=50 |
| 3 | GET | `/api/commission-rules/:ruleId` | read, admin | Get a specific commission rule |
| 4 | PUT | `/api/commission-rules/:ruleId` | admin | Body: Any fields to update |
| 5 | DELETE | `/api/commission-rules/:ruleId` | admin | Delete a commission rule permanently |
| 6 | POST | `/api/commission-rules/:ruleId/deactivate` | admin | Soft-deactivate a rule (preserves history) |
| 7 | POST | `/api/commission-rules/calculate` | admin | ruleId: 'rule-xxx' (optional - auto-match if not specified) |
| 8 | POST | `/api/commission-rules/preview` | admin | Body: Same as /calculate |
| 9 | POST | `/api/commission-rules/batch-calculate` | admin | options: { createRecord: true } |
| 10 | POST | `/api/commission-rules/find-rules` | admin | Body: { propertyType, transactionType, transactionValue, agentPhone, project } |
| 11 | GET | `/api/commission-rules/approvals/pending` | read, admin | Query: ?limit=50 |
| 12 | POST | `/api/commission-rules/approvals/:calculationId/approve` | admin | Body: { approvedBy: 'manager_name', createCommission: true } |
| 13 | POST | `/api/commission-rules/approvals/:calculationId/reject` | admin | Body: { rejectedBy: 'manager_name', reason: 'explanation' } |
| 14 | GET | `/api/commission-rules/calculations/:agentPhone` | read, admin | Query: ?status=approved&ruleId=rule-xxx&limit=50 |
| 15 | GET | `/api/commission-rules/calculations/detail/:calculationId` | read, admin | Get a specific calculation record |
| 16 | GET | `/api/commission-rules/reports/earnings/:agentPhone` | read, admin | Query: ?startDate=2026-01-01&endDate=2026-12-31 |
| 17 | GET | `/api/commission-rules/reports/rule-stats/:ruleId` | read, admin | Get performance statistics for a specific rule |
| 18 | POST | `/api/commission-rules/seed` | admin | Seed default commission rules (for initial setup) |

### 6.9 Communications (WhatsApp messaging queue)

Source: `src/api/routes/communication.routes.js` · Prefix: `/api/communications` (server A); `/api/v1/damac/communication` (server B) · Servers: A+B

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/communications/templates` | admin | Create a new communication template |
| 2 | GET | `/api/communications/templates` | read, admin | Query params: category, status, tags, search, page, limit, sortBy, sortOrder |
| 3 | GET | `/api/communications/templates/categories` | read, admin | Get all categories with counts |
| 4 | GET | `/api/communications/templates/:id` | read, admin | Get a specific template |
| 5 | PUT | `/api/communications/templates/:id` | admin | Update a template |
| 6 | DELETE | `/api/communications/templates/:id` | admin | Soft delete (archive) a template |
| 7 | POST | `/api/communications/templates/:id/approve` | admin | Approve template for use |
| 8 | POST | `/api/communications/templates/:id/activate` | admin | Activate template (skip approval) |
| 9 | GET | `/api/communications/templates/:id/preview` | read, admin | Query params: lang, variables (JSON encoded) |
| 10 | GET | `/api/communications/templates/:id/analytics` | read, admin | Get template usage analytics |
| 11 | POST | `/api/communications/send` | messaging, admin | Send a message using a template |
| 12 | POST | `/api/communications/send-direct` | messaging, admin | Send ad-hoc message without template |
| 13 | POST | `/api/communications/send-bulk` | messaging, admin | Send template message to multiple recipients |
| 14 | POST | `/api/communications/schedule` | messaging, admin | Schedule a message for later delivery |
| 15 | GET | `/api/communications/consent/:phone` | admin | — |
| 16 | PUT | `/api/communications/consent/:phone` | admin | — |
| 17 | GET | `/api/communications/logs` | read, admin | List message logs with filtering |
| 18 | GET | `/api/communications/logs/:logId` | read, admin | Get specific log entry |
| 19 | GET | `/api/communications/history/:phone` | read, admin | Get communication history for a phone number |
| 20 | GET | `/api/communications/bulk/:bulkId` | read, admin | Get bulk send status |
| 21 | GET | `/api/communications/dashboard` | read, admin | Overall communication dashboard |
| 22 | GET | `/api/communications/delivery-stats` | read, admin | Get delivery statistics |
| 23 | POST | `/api/communications/queue/process` | admin | Process all queued messages |
| 24 | POST | `/api/communications/queue/retry` | admin | Retry failed messages |
| 25 | GET | `/api/communications/queue/scheduled` | read, admin | Get scheduled messages due for sending |
| 26 | POST | `/api/communications/seed` | admin | Seed default templates |

`POST /queue/process` always returns `501`: queue processing needs an active WhatsApp bot worker, which is not wired yet.

### 6.10 Analytics

Source: `src/api/routes/analytics.routes.js` · Prefix: `/api/analytics` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | GET | `/api/analytics/dashboard` | read, admin | Real-time portfolio KPIs across all systems |
| 2 | GET | `/api/analytics/properties` | read, admin | Query params: propertyId, clusterId, limit |
| 3 | GET | `/api/analytics/tenants` | read, admin | Tenant portfolio analytics — lease, renewal, payment |
| 4 | GET | `/api/analytics/financial` | read, admin | Query params: startDate, endDate |
| 5 | GET | `/api/analytics/agents` | read, admin | Query params: limit |
| 6 | GET | `/api/analytics/agents/:phone` | read, admin | Single agent deep-dive analytics |
| 7 | GET | `/api/analytics/trends` | read, admin | Query params: metric (occupancyRate\|rentalRevenue\|commissions\|activeDeals\|messageVolume\|totalProperties), days |
| 8 | POST | `/api/analytics/snapshot` | admin | Generate daily KPI snapshot (idempotent — one per day) |
| 9 | POST | `/api/analytics/reports` | admin | Body: { name, type, startDate, endDate, filters, createdBy, format, description } |
| 10 | GET | `/api/analytics/reports` | read, admin | Query params: type, status, createdBy, limit |
| 11 | GET | `/api/analytics/reports/:id` | read, admin | Get a specific report with full data |
| 12 | DELETE | `/api/analytics/reports/:id` | admin | Delete a report |
| 13 | GET | `/api/analytics/quick-stats` | read, admin | WhatsApp-formatted text summary |
| 14 | GET | `/api/analytics/export/properties` | read, admin | Query params: clusterId, limit |

### 6.11 Invoices

Source: `src/api/routes/invoice.routes.js` · Prefix: `/api/invoices` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/invoices` | admin | — |
| 2 | GET | `/api/invoices` | read, admin | — |
| 3 | GET | `/api/invoices/overdue` | read, admin | — |
| 4 | GET | `/api/invoices/upcoming` | read, admin | — |
| 5 | GET | `/api/invoices/quick-stats` | read, admin | — |
| 6 | GET | `/api/invoices/:id` | read, admin | — |
| 7 | PUT | `/api/invoices/:id` | admin | — |
| 8 | POST | `/api/invoices/:id/send` | admin | — |
| 9 | POST | `/api/invoices/:id/cancel` | admin | — |
| 10 | POST | `/api/invoices/generate/tenancy` | admin | — |
| 11 | POST | `/api/invoices/recurring` | admin | — |
| 12 | POST | `/api/invoices/recurring/process` | admin | — |
| 13 | POST | `/api/invoices/payments` | admin | — |
| 14 | GET | `/api/invoices/payments` | read, admin | — |
| 15 | GET | `/api/invoices/payments/:paymentId` | read, admin | Note: /payments must come BEFORE /:id so it matches first |
| 16 | POST | `/api/invoices/payments/:paymentId/complete` | admin | — |
| 17 | POST | `/api/invoices/payments/:paymentId/fail` | admin | — |
| 18 | POST | `/api/invoices/payments/:paymentId/refund` | admin | — |
| 19 | GET | `/api/invoices/payments/:paymentId/receipt` | read, admin | — |
| 20 | POST | `/api/invoices/reconcile/auto` | admin | — |
| 21 | POST | `/api/invoices/reconcile/manual` | admin | — |
| 22 | GET | `/api/invoices/reconcile/history` | read, admin | — |
| 23 | GET | `/api/invoices/reports/revenue` | read, admin | — |
| 24 | GET | `/api/invoices/reports/outstanding` | read, admin | — |
| 25 | GET | `/api/invoices/reports/tenant/:phone` | read, admin | — |

### 6.12 Notifications

Source: `src/api/routes/notification.routes.js` · Prefix: `/api/notifications` · Servers: A

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/notifications/rules` | admin | — |
| 2 | GET | `/api/notifications/rules` | read, admin | — |
| 3 | GET | `/api/notifications/rules/:id` | read, admin | — |
| 4 | PUT | `/api/notifications/rules/:id` | admin | — |
| 5 | DELETE | `/api/notifications/rules/:id` | admin | — |
| 6 | POST | `/api/notifications/rules/:id/toggle` | admin | — |
| 7 | POST | `/api/notifications/rules/seed` | admin | — |
| 8 | GET | `/api/notifications/rules/performance` | read, admin | — |
| 9 | POST | `/api/notifications` | admin | — |
| 10 | GET | `/api/notifications` | read, admin | — |
| 11 | GET | `/api/notifications/stats` | read, admin | — |
| 12 | GET | `/api/notifications/:id` | read, admin | — |
| 13 | POST | `/api/notifications/:id/send` | admin | — |
| 14 | POST | `/api/notifications/:id/cancel` | admin | — |
| 15 | POST | `/api/notifications/:id/acknowledge` | admin | — |
| 16 | POST | `/api/notifications/:id/snooze` | admin | — |
| 17 | POST | `/api/notifications/process/pending` | admin | — |
| 18 | POST | `/api/notifications/process/retry` | admin | — |
| 19 | POST | `/api/notifications/process/escalate` | admin | — |
| 20 | POST | `/api/notifications/scan/all` | admin | — |
| 21 | POST | `/api/notifications/suppress` | admin | — |
| 22 | GET | `/api/notifications/reports/delivery` | read, admin | — |
| 23 | GET | `/api/notifications/reports/recipient/:phone` | read, admin | — |

### 6.13 DAMAC Hills 2 inventory (v1)

Source: `src/api/routes/damacApiRoutes.js` · Prefix: `/api/v1/damac` · Servers: B

| # | Method | Path | Tokens | Description |
|---|---|---|---|---|
| 1 | POST | `/api/v1/damac/owners` | admin | Create a new owner |
| 2 | GET | `/api/v1/damac/owners` | read, admin | List all owners with pagination |
| 3 | GET | `/api/v1/damac/owners/:id` | read, admin | Get owner by ID |
| 4 | GET | `/api/v1/damac/owners/phone/:phone` | read, admin | Get owner by phone |
| 5 | GET | `/api/v1/damac/owners/email/:email` | read, admin | Get owner by email |
| 6 | GET | `/api/v1/damac/search/:query` | read, admin | Search owners by name, email, phone |
| 7 | PUT | `/api/v1/damac/owners/:id` | admin | Update owner |
| 8 | DELETE | `/api/v1/damac/owners/:id` | admin | Archive/delete owner |
| 9 | POST | `/api/v1/damac/owners/:id/verify` | admin | Verify owner |
| 10 | GET | `/api/v1/damac/owners/:id/properties` | read, admin | Get owner's properties |
| 11 | GET | `/api/v1/damac/owners/:id/audit-trail` | read, admin | Get owner's audit trail |
| 12 | POST | `/api/v1/damac/contacts` | admin | Create new contact |
| 13 | GET | `/api/v1/damac/contacts` | read, admin | List all contacts |
| 14 | GET | `/api/v1/damac/contacts/:id` | read, admin | Get contact by ID |
| 15 | PUT | `/api/v1/damac/contacts/:id` | admin | Update contact |
| 16 | DELETE | `/api/v1/damac/contacts/:id` | admin | Delete contact |
| 17 | POST | `/api/v1/damac/import/owners` | admin | Bulk import owners |
| 18 | POST | `/api/v1/damac/import/contacts` | admin | Bulk import contacts |
| 19 | POST | `/api/v1/damac/sync/owners` | admin | Sync owners (merge existing + new) |
| 20 | GET | `/api/v1/damac/analytics/dashboard` | read, admin | Get dashboard overview |
| 21 | GET | `/api/v1/damac/analytics/owners` | read, admin | Get owner statistics |
| 22 | GET | `/api/v1/damac/analytics/contacts` | read, admin | Get contact statistics |
| 23 | GET | `/api/v1/damac/analytics/properties` | read, admin | Get property statistics |
| 24 | GET | `/api/v1/damac/analytics/quality` | read, admin | Get data quality score |
| 25 | GET | `/api/v1/damac/analytics/activity` | read, admin | Get recent activity |
| 26 | GET | `/api/v1/damac/analytics/status` | read, admin | Get migration status |
| 27 | GET | `/api/v1/damac/health` | read, admin | Health check |
| 28 | GET | `/api/v1/damac/info` | read, admin | API information |

## 7. Typical web-app flow (messaging)

1. The web app sends `POST /api/communications/send` with the messaging token and a new `Idempotency-Key`.
2. Linda validates the request, requires recorded consent for the recipient (`ContactConsentService.hasConsent`;
   otherwise the request fails, or the recipient is skipped in bulk sends), and stores a `CommunicationLog` with
   status `queued`.
3. The web app polls `GET /api/communications/logs/:logId` or `GET /api/communications/history/:phone`.
4. **Today the status stays `queued`** because no worker sends it (see section 8).

## 8. Known gaps and planned work

| ID | Gap | Planned resolution | Status |
|---|---|---|---|
| API-G1 | No WhatsApp delivery for API-queued messages: `CommunicationService.processQueue(sendFn)` exists but nothing in the bot calls it; `/queue/process` returns 501. | Separate feature: a bot-side queue worker that drains `CommunicationLog` through the active master client, inside the campaign safety limits and honouring idempotency. | Planned |
| API-G2 | The bot and the API run as separate processes; the API cannot see live WhatsApp session state. | Expose session state to the API through MongoDB (the worker records heartbeat and master status). | Planned |
| API-G3 | Two API servers with different prefixes (`/api/*` vs `/api/v1/damac/*`). | Choose one public base path for the web app and keep the other for compatibility. | To decide |
| API-G4 | Activation and timing of the API alongside the bot (when it starts, which server) is not decided. | Check and add later, as agreed on 2026-10-26. | Open |

Single account: until multi-account support is built, all API messaging is intended to go through the master
WhatsApp account only.
