# 🚀 Future Upgrades Roadmap — WhatsApp Bot Linda

> This file tracks planned future improvements, feature additions, and technical debt items.  
> Add new upgrade ideas here. Move items to `ARCHIVE/` once completed.  
> Cross-reference: `MASTER_PLAN.md` for the unified roadmap, `PROJECT_CONTEXT.md` for architecture overview.

---

## 🏷️ Priority Legend

| Label | Meaning |
|-------|---------|
| 🔴 P1 | Critical — blocks production or major feature |
| 🟠 P2 | High — significant value, plan next sprint |
| 🟡 P3 | Medium — useful, schedule when capacity allows |
| 🟢 P4 | Low — nice-to-have or experimental |

---

## 📌 Pending Items (Carry-Over from MASTER_PLAN.md)

- [ ] 🔴 P1 Complete WhatsApp bot session recovery (event-driven polling, exponential backoff, admin notification on failure)
- [ ] 🟠 P2 Refactor API endpoints for centralised validation and error handling
- [ ] 🟠 P2 Expand and enforce test coverage — unit, integration, E2E (target: 90%+)
- [ ] 🟠 P2 Implement OpenAPI/Swagger documentation for all 94+ endpoints
- [ ] 🟡 P3 Migrate additional core modules to TypeScript (start with `code/Services/`)
- [ ] 🟡 P3 Optimise MongoDB queries — add indexes, query profiling, and Redis/in-memory caching layer
- [ ] 🟡 P3 Harden CI/CD pipeline — zero-downtime deploys, automated rollbacks, GitHub Actions
- [ ] 🟢 P4 Remove / archive remaining legacy code (check `code/NawalBot/`, `code/My Agents/`)
- [ ] 🟢 P4 Update and consolidate onboarding materials into a single `GETTING_STARTED.md`

---

## 🤖 Bot & WhatsApp

### Multi-Account Improvements
- [ ] 🟠 P2 Add web-based dashboard (React or plain HTML) for real-time account status and QR scanning
- [ ] 🟠 P2 Per-account rate limit configuration (allow different limits per phone number)
- [ ] 🟡 P3 Hot-add / hot-remove WhatsApp accounts without restarting the bot
- [ ] 🟡 P3 Improve `TerminalHealthDashboard` — colour-coded status, last-message timestamps, reconnect history

### Messaging & Campaigns
- [ ] 🟠 P2 Campaign A/B testing — send two message variants, track which gets better responses
- [ ] 🟠 P2 Scheduled campaign calendar UI (via Express + simple HTML frontend)
- [ ] 🟡 P3 Rich media campaign support — images, PDFs, and voice notes
- [ ] 🟡 P3 Unsubscribe / opt-out tracking integrated into `CampaignService`
- [ ] 🟢 P4 AI-generated campaign message suggestions (OpenAI / local LLM)

### Command System
- [ ] 🟡 P3 Interactive menu system — numbered menu replies for non-technical users
- [ ] 🟡 P3 Multi-language support for bot commands (Arabic / English)
- [ ] 🟢 P4 Conversation learning — store correction feedback in `LindaConversationLearner`

---

## 🏗️ API & Backend

### REST API
- [ ] 🔴 P1 Add JWT authentication middleware to all API routes (currently open)
- [ ] 🟠 P2 Centralised request validation using Zod or `express-validator`
- [ ] 🟠 P2 API versioning strategy — plan migration from `/api/v1/` to `/api/v2/`
- [ ] 🟡 P3 Pagination, filtering, and sorting on all list endpoints
- [ ] 🟡 P3 Webhook events outbound — notify external systems on contract expiry, payment received, etc.
- [ ] 🟢 P4 GraphQL layer as alternative to REST (optional, for complex data queries)

### Database
- [ ] 🟠 P2 Add compound indexes on high-frequency queries (phone + status, property + date)
- [ ] 🟠 P2 Data archival strategy — move records older than 2 years to cold storage
- [ ] 🟡 P3 Soft-delete pattern across all Mongoose schemas (`deletedAt` field)
- [ ] 🟡 P3 Automated database backups — nightly dump to Google Drive or S3
- [ ] 🟢 P4 Read replica support for analytics queries (MongoDB Atlas secondary reads)

---

## 🔐 Security

- [ ] 🔴 P1 API authentication — JWT or API key for all Express endpoints
- [ ] 🟠 P2 Rate limiting per IP on Express server (`express-rate-limit` already available via `code/middleware/`)
- [ ] 🟠 P2 OWASP security audit — review all input sanitisation and injection vectors
- [ ] 🟡 P3 Secrets rotation procedure — document how to rotate Google service account keys
- [ ] 🟡 P3 Audit logging — log all admin API actions with actor + timestamp
- [ ] 🟢 P4 Two-factor WhatsApp command auth — require OTP for destructive bot commands

---

## 📊 Analytics & Reporting

- [ ] 🟠 P2 Dashboard web UI — expose `AnalyticsManager` metrics via a `/dashboard` Express route
- [ ] 🟠 P2 SLA compliance report — automated weekly email/WhatsApp summary to master account
- [ ] 🟡 P3 Property performance analytics — occupancy trends, rent growth, maintenance frequency
- [ ] 🟡 P3 Export analytics to Google Sheets on a scheduled basis
- [ ] 🟢 P4 Integrate with an external BI tool (e.g., Metabase) for visual reporting

---

## 🧪 Testing & Quality

- [ ] 🟠 P2 Increase Jest coverage to 90%+ (currently targeted at 75%)
- [ ] 🟠 P2 Add integration tests for all Express routes using `supertest`
- [ ] 🟡 P3 Mutation testing with Stryker to validate test quality
- [ ] 🟡 P3 Load testing with k6 or Artillery for Express server under 100 rps
- [ ] 🟡 P3 Automated accessibility and smoke tests on the web dashboard (when added)
- [ ] 🟢 P4 Contract testing between bot and API server using Pact

---

## 🚢 Deployment & DevOps

- [ ] 🟠 P2 Dockerfile + `docker-compose.yml` for one-command local setup
- [ ] 🟠 P2 GitHub Actions CI pipeline — lint → test → build → deploy on merge to main
- [ ] 🟡 P3 Zero-downtime deployment script (PM2 cluster mode or rolling restart)
- [ ] 🟡 P3 Health check endpoint wired to external uptime monitor (UptimeRobot / Pingdom)
- [ ] 🟡 P3 Environment promotion workflow — dev → staging → production with approval gate
- [ ] 🟢 P4 Kubernetes / cloud-native deployment (Helm chart for scaling multiple bot instances)

---

## 🛠️ Developer Experience

- [ ] 🟡 P3 Improve `npm run doctor` — add checks for MongoDB connectivity and Google API credentials
- [ ] 🟡 P3 Single `GETTING_STARTED.md` replacing scattered setup instructions
- [ ] 🟡 P3 VS Code devcontainer setup (`.devcontainer/`) for zero-friction onboarding
- [ ] 🟢 P4 Auto-generate TypeDoc / JSDoc site from source code
- [ ] 🟢 P4 Storybook-style component explorer for bot command outputs

---

## 🧠 AI & Intelligence

- [ ] 🟡 P3 Pluggable LLM adapter — swap between OpenAI, Gemini, and local Ollama models
- [ ] 🟡 P3 Intent classification improvements — expand training data in `IntentClassifier.js`
- [ ] 🟡 P3 Sentiment-triggered escalation — alert master account when negative sentiment is detected
- [ ] 🟢 P4 Summarise long chat threads into bullet points on command (`!summarise`)
- [ ] 🟢 P4 Auto-draft email / WhatsApp replies from conversation context

---

## 📅 Completed Upgrades Archive

> Move items here once done, with a completion date and brief note.

| Feature | Completed | Notes |
|---------|-----------|-------|
| Phase 5 advanced features (890 tests) | Feb 2026 | Communication, Commission, Analytics, Invoice, Notifications |
| Phase 31 WhatsApp Command Bridge | Feb 2026 | Remote terminal control via WhatsApp chat |
| Phase 29d Circuit Breaker & Auto-Reconnect | Feb 2026 | Per-account circuit breaker with CLOSED/OPEN/HALF_OPEN states |
| Phase 29e Analytics & SLA Monitoring | Feb 2026 | UptimeTracker, MetricsDashboard, ReportGenerator |
| Phase 27 Auto-Session Restore | Feb 2026 | Sessions restored automatically on nodemon restart |
| Phase 20 Secure Credential Management | Feb 2026 | Base64-encoded Google credentials in `.env` |
| Multi-account bot support | Feb 2026 | AccountBootstrapManager, ConnectionManager per phone |

---

**Last Updated:** May 2026  
**Owner:** Arslan Malik  
**Status:** Active — add items freely, review monthly
