# TODO - LINDA WHATSAPP BOT

## Progress: IN PROGRESS

---

## Current Task: Project reliability improvements

### Startup and API
- [x] Initialize WhatsApp Command Bridge once after bot managers are ready
- [x] Require bearer-token authentication for API routes
- [x] Add a package script for the complete feature API
- [ ] Validate API deployment settings and route behavior against the live environment

### Tests and project setup
- [x] Point Jest coverage collection at `code/` application sources
- [x] Set and document the Node.js runtime requirement
- [ ] Establish a measured coverage baseline and enforce thresholds from that baseline
- [x] Add and unignore a generated npm lockfile for repeatable dependency installs

### Additional hardening
- [x] Add admin, read-only, and messaging-scoped API credentials
- [x] Validate API pagination, sorting, search, and mutation bodies
- [x] Require evidence-backed consent and honor inbound opt-out messages
- [x] Add idempotency for API sends and durable campaign reservations
- [x] Add campaign failure circuit breaking and API rate limits
- [x] Redact phone numbers, message text, captions, locations, and email addresses from primary message logs
- [x] Add MongoDB backup and isolated restore-verification commands
- [x] Add readiness checks and protected request, queue, and delivery metrics
- [x] Bound pagination and escape user-provided regex search text
- [x] Update CI to use supported Node.js, locked installs, lint, tests, and dependency audit

### Follow-up validation
- [ ] Run GitHub Actions clean-install CI on Node.js 22.13+ and 24.x; the full suite passed locally on both versions
- [ ] Resolve the 13 remaining npm audit findings (11 high, 2 moderate) by upgrading or replacing the WhatsApp/Puppeteer chain only after browser compatibility testing; current stable upstream versions still include affected dependencies
- [ ] Configure distinct API role tokens and exact allowed browser origins in each deployment
- [ ] Verify MongoDB backup restore against a non-production database
- [ ] Review data-retention and recovery requirements with the deployment owner

### Validation completed locally
- [x] Fix three syntax errors that prevented repository-wide ESLint parsing
- [x] Pass repository-wide ESLint with no errors
- [x] Replace Jest 30's Windows native-resolver dependency with Jest and Babel-Jest 29.7
- [x] Pass the full Jest suite on Windows with Node.js 22.13.1 and 24.22.1: 41 suites passed, 1 skipped; 1,149 tests passed, 47 skipped
- [x] Upload Jest JSON results as a GitHub Actions artifact and align CI workflow tests with the supported Node.js matrix

### Historical items checked against current source
- `WhatsAppCommandBridge.initializeBot()` is already implemented.
- `index.js` already assigns the QR display instance into `sharedContext`.
- The `relink master` flow still requires a live WhatsApp session test; do not treat it as verified by the QR display change alone.
