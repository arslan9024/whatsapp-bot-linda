# MASTER PLAN: WhatsApp-Bot-Linda Unified Roadmap

## Current priority: master WhatsApp sessions (2026-10-26)

Use [MASTER_ACCOUNT_SESSION_PLAN.md](../../01-rup/iterations/E1-master-session.md) as the
detailed acceptance plan for linking, local-only authentication storage,
automatic recovery, terminal account management and read-only conversation
analysis. Implementation and automated tests are not live authentication proof.
All actual-account acceptance checks remain pending until observed.

## 1. Analytics & Google Sheets CRUD
- Implement robust analytics and CRUD integration for Google Sheets (PowerAgent).
- Map all columns, confirm schema design, and ensure normalized database structure.

## 2. Database & Service Layer
- Design and implement normalized MongoDB schemas with unique/composite keys and relationships.
- Explicit handling for tenants, owners, contracts, property status, payments, multi-landlord support.
- Service layers for all entities, with comprehensive documentation.

## 3. API & Bot Integration
- REST API endpoints for all features, integrated with Express server.
- WhatsApp bot framework: command bridging, device linking via code, command grouping/menu system, ice-breaker phrase, AI Q&A, subscription/linking via code.
- Strict master-only authorization for WhatsApp commands.

## 4. Error Handling & Recovery
- Centralized error handling, logging, and observability.
- Hardened error boundaries, sensitive data redaction, and admin notifications.
- Robust WhatsApp primary account/session recovery:
  - Event-driven and polling-based recovery
  - Exponential backoff and retry logic
  - Session persistence and auto-restore
  - Truthful dashboard during startup, offline recovery and activation
  - Local credentials only; explicit linking separated from saved-session recovery
  - Atomic metadata persistence and duplicate-process protection

## 5. Testing & Quality Assurance
- Expand and enforce test coverage (unit, integration, E2E).
- Mutation testing for robustness.
- All tests must pass, no errors/warnings.

## 6. Documentation & Developer Experience
- Consolidate documentation into this single master plan.
- Update code comments, onboarding scripts, and architecture diagrams.

## 7. Configuration, Deployment, & CI/CD
- 12-factor config, secrets management, hardened CI/CD, zero-downtime deploys, automated rollbacks.

## 8. Git Workflow
- Commit or push only when explicitly requested.
- This master plan is the roadmap; linked feature plans hold detailed acceptance
  criteria. Historical plans are retained, not silently deleted.

## 9. Feature Verification
- Track implemented, automatically tested, and live-verified separately.
- Primary account/session recovery still requires the recorded live checks in
  the detailed feature plan. Do not claim guaranteed restoration of revoked credentials.
- Manual and automated review of logs, API, and dashboard.

## 10. Next Steps
- All future work references this master plan.
- No fragmentation, no lost context.
- Ready for execution and team adoption.

## Pending Tasks & Enhancements (as of March 4, 2026)

### Pending Tasks
- [ ] Complete WhatsApp bot session recovery enhancements (event-driven, polling, exponential backoff, admin notification)
- [ ] Refactor API endpoints for centralized validation and error handling
- [ ] Migrate additional core modules to TypeScript
- [ ] Expand and enforce test coverage (unit, integration, E2E)
- [ ] Update and unify documentation (single source of truth)
- [ ] Optimize database queries and add caching
- [ ] Implement OpenAPI/Swagger docs for all APIs
- [ ] Harden CI/CD pipeline and deployment scripts
- [ ] Remove/archive any remaining legacy code
- [ ] Review and update onboarding materials

### Enhancement Recommendations
- WhatsApp bot: Improve health checks, auto-relink logic, dashboard status/error visibility
- API & Database: Expand schema validation, input sanitization, query performance
- Testing & CI/CD: Add mutation testing, zero-downtime deploys, automated rollbacks
- Developer Experience: Improve onboarding scripts, architecture diagrams, code comments

---

**This MASTER PLAN merges all user requests, chat instructions, and previous plans into a single, actionable roadmap. All future work will reference this file.**
