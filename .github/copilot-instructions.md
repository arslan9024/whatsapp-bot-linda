# WhatsApp Bot Linda — Copilot & Agent Instructions

> **Authoritative engineering rules, architectural laws, and runtime guardrails for `whatsapp-bot-linda`.**  
> All developers and AI assistants MUST strictly follow these rules on every task.

---

## 1. Stack & Runtime Reality

- **Runtime:** Node.js `>= 22.13.0` (ES Modules only, `"type": "module"` in `package.json`).
- **Core Frameworks:** Express 5 (`express@5.2.1`), `whatsapp-web.js` (`^1.34.2`).
- **Persistence & State:** MongoDB / Mongoose, ServiceRegistry (`src/core/ServiceRegistry.js`).
- **Logging:** Structured Logger (`src/core/Logger.js`), winston-like rotation to `logs/`.
- **Testing:** Jest with ES module support (`npm test`).
- **Linting & Code Quality:** ESLint (`npm run lint`), Prettier (`npm run format`).
- **Process Supervision:** nodemon 24/7 supervisor (`npm run dev:24-7`).

---

## 2. Core Architectural Laws (Adopted from Enterprise Standards)

### 2.1 The Single Purpose File Law
- **Single responsibility:** Every file must have exactly one well-defined responsibility.
- **File size limits:** Production files must not exceed **300–400 lines**.
  - Monoliths (e.g. legacy files > 500 lines) must be decomposed into focused submodules (handlers, formatters, services, state slices).
- **Separate orchestration from logic:** Keep routing/controllers, business rules, and external WhatsApp client calls in separated layers.

### 2.2 Continuous Deduplication & Optimization Law (PERMANENT)
- **Zero code duplication:** Duplicate route definitions, redundant services, and parallel competing server entry points are strictly prohibited.
- **Single source of truth:** If an abstraction exists (e.g. `src/core/Logger.js`, `ServiceRegistry`, `RateLimiter`), extend and reuse it. Never create parallel duplicate utilities.
- **Dead code elimination:** Deprecated functions, unused imports, and dead experimental scripts must be purged or archived.

### 2.3 No Architectural Drift
- Never create competing architectures (e.g. running 3 different Express server architectures simultaneously).
- Follow the established layer structure:
  - `src/api/` — HTTP REST API endpoints, middleware, and express configuration.
  - `src/services/` — Pure business domain logic (Commission, Invoicing, Notifications, CRM).
  - `src/whatsapp/` — WhatsApp client lifecycle, linking, message routing, and event handling.
  - `src/core/` — Infrastructure singletons: Logger, ServiceRegistry, RateLimiter, Database connection.
  - `src/terminal/` — CLI dashboards, interactive consoles, and menus.
  - `tools/` — Operational and diagnostic scripts (`doctor.js`, backup, clean-sessions).

### 2.4 Adversarial Integrity & Small Iterative Batches
- **Small Batches:** Keep diffs concise and focused (< 500 lines per turn) to ensure reviewability and stability.
- **No placeholder logic:** Never leave stub returns (`return true; /* TODO */`) or simulated functionality in production paths.
- **Graceful degradation:** Every integration failure (WhatsApp disconnect, Google Sheets timeout, DB hiccup) must be safely handled with fallbacks.

---

## 3. Author's WhatsApp Production Laws (NON-NEGOTIABLE)

These laws are established by the project author (Arslan Malik) to protect 24/7 production operation and account safety:

### Law 1: NEVER Kill `node.exe`
- Crash recovery and cleanup scripts may **ONLY** kill browser processes (`chrome.exe`, `chromium.exe`).
- **NEVER** execute `taskkill /F /IM node.exe`. The bot runs supervised 24/7 under nodemon. Killing Node terminates the bot permanently.
- *Verified by `npm run doctor`.*

### Law 2: Strict ES Modules Only
- Always use `import` / `export` syntax. CommonJS `require()` / `module.exports` is prohibited.
- Always include the `.js` extension in all relative imports (e.g., `import { logger } from '../core/Logger.js';`).

### Law 3: Structured Logger Over `console.log`
- Use `logger` from `src/core/Logger.js` for all operational and background logging:
  - `logger.info(msg, meta)`
  - `logger.warn(msg, meta)`
  - `logger.error(msg, error)`
- Direct `console.log` is **ONLY** allowed in interactive terminal dashboards (`src/terminal/`) and one-off CLI tools (`tools/`).

### Law 4: `ServiceRegistry` for Shared State
- Never use `global.xxx` for service access.
- Register and retrieve singletons via `ServiceRegistry.js`:
  ```js
  import services from '../core/ServiceRegistry.js';
  const db = services.getOrThrow('database');
  ```

### Law 5: Mandatory Rate Limiting on WhatsApp Sends
- Every outgoing message must pass through `rateLimiter.acquire()` before calling `client.sendMessage()`.
- Unthrottled sends trigger WhatsApp spam detection and lead to number bans.
- Strict limits: 1 msg/sec per contact, max 60 msgs/min, 200 msgs/hr.

### Law 6: Sessions Are Sacred
- Never delete or modify folders in `sessions/` during normal bot operation.
- Session cleanup must only be done via dedicated user-initiated tools (`npm run clean-sessions`).

### Law 7: Zero Secrets in Source Control
- API keys, service account credentials, and phone auth tokens must live in `.env` (gitignored).
- Crash dumps and logs must sanitize personal identifiable information (PII) and credentials.

---

## 4. Error Handling & Logging Standards

1. **Async Safety:** Every async route handler and service call must be wrapped in `try/catch` or an `asyncHandler` wrapper.
2. **Contextual Metadata:** Errors must include context (e.g. `{ phone, action, step }`):
   ```js
   logger.error('Failed to dispatch campaign message', { err: error.message, phone, campaignId });
   ```
3. **No Silent Swallowing:** Never use empty `catch (e) {}` blocks. If an error is non-fatal, log it at `warn` level with the rationale.

---

## 5. Implementation Quality Gates (Definition of Done)

Before concluding any feature, refactor, or bugfix:

1. **Health Verification:** `npm run doctor` must pass **12/12 checks**.
2. **Linting Check:** Run `npm run lint` and verify no new syntax or formatting regressions.
3. **Targeted Tests:** Run relevant unit/integration tests (`npm test` or specific `node scripts/test-*.js`).
4. **Clean Git Hygiene:** No temporary test files, no unversioned crash dumps, no secrets committed.

