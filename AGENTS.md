# WhatsApp Bot Linda — Multi-Agent Operating Model & Roster

> **Authoritative agent coordination, lane ownership, and execution governance for `whatsapp-bot-linda`.**

---

## 1. Governance & Operating Lanes

All agent-assisted engineering in this repository operates under strict division of responsibilities:

| Lane | Lead Specialist | Core Scope | Primary Gate / Quality Standard |
| :--- | :--- | :--- | :--- |
| **Architecture & Reliability** | `@Ada` | Bot lifecycle, 24/7 resilience, nodemon supervision, session locks | Never kill `node.exe`; `npm run doctor` (12/12) |
| **WhatsApp Client & Protocols** | `@Linda` | `whatsapp-web.js`, QR linking, multi-account routing, event handlers | Mandatory rate-limiting; zero unthrottled sends |
| **API & Integrations** | `@Mira` | Express 5 REST APIs, MongoDB schemas, Google Contacts & Sheets | Centralized error handling; validated request payloads |
| **Campaigns & Outreach** | `@Rachel` | Bulk messaging, contact filtering, template interpolation, queues | Daily send limits; quota guardrails |
| **Quality & Adversarial QA** | `@Katherine` | Jest test suites, mock verification, security secret scans | 100% test pass rate; zero committed credentials |

---

## 2. Permanent Architectural Laws (Adopted from Enterprise Standards)

### 2.1 The Single Purpose File Law
- Every file must have a single, cohesive responsibility.
- Large files (> 350 lines) must be modularized into cohesive submodules.
- Shared logic must be extracted into `src/core/` or `src/shared/`.

### 2.2 Continuous Deduplication & Optimization Law (PERMANENT)
- Zero duplicate route definitions, parallel competing servers, or shadowed utilities.
- If an existing singleton exists in `src/core/ServiceRegistry.js`, extend and reuse it.
- Dead and deprecated code must be swept and pruned.

### 2.3 Strict Context & Resource Conservation
- Use deterministic local scripts (`tools/`, `npm run ...`) rather than guessing via LLM.
- Keep diffs small (< 500 lines) and iterative.
- Never output full duplicate files when a targeted patch suffices.

---

## 3. WhatsApp 24/7 Production Laws (Non-Negotiable)

1. **Safety #1:** Browser cleanup scripts must **ONLY** kill Chrome/Chromium (`chrome.exe`, `chromium.exe`). **NEVER** kill `node.exe`.
2. **ES Modules Only:** All source files use ES module syntax with explicit `.js` extensions.
3. **Structured Logger:** Production services log via `src/core/Logger.js`. Raw `console.log` is strictly restricted to interactive terminal UI files.
4. **ServiceRegistry:** Shared state is managed via `ServiceRegistry`, never `global.xxx`.
5. **Rate Limiting:** All outbound WhatsApp messages must pass through `rateLimiter.acquire()`.
6. **Sacred Sessions:** Never delete `sessions/` directories during runtime.

---

## 4. Definition of Done (DoD) Checklist

Before completing any task or pull request:

- [ ] `npm run doctor` passes 12/12 checks.
- [ ] Targeted tests pass without errors (`npm test`).
- [ ] No `node.exe` termination in any script.
- [ ] No hardcoded secrets or tokens.
- [ ] Diff size is within acceptable limits (< 500 lines).
- [ ] Documentation updated to reflect changes.

