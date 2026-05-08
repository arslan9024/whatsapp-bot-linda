# WhatsApp Bot Linda — Repository Overview

## Purpose
WhatsApp Bot Linda is an enterprise-oriented WhatsApp automation platform for real-estate workflows (properties, contacts, communications, commissions, analytics, invoicing, and notifications).

## Core Stack
- Node.js (ES modules)
- whatsapp-web.js + Chromium for WhatsApp automation
- Express 5 for REST APIs
- MongoDB + Mongoose for persistent storage
- Google APIs for Sheets integration
- Jest for testing
- ESLint + Prettier for linting/formatting

## High-Level Architecture
1. **Entry Points**
   - `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/index.js` (main runtime)
   - `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/express-server.js` (API server)
   - `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/express-server-inmemory.js` (in-memory API mode)
   - `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/bot/bot-main.js` (hybrid bot bootstrap)

2. **Bot Layer (`/bot`)**
   - Bot initialization, connection mode handling, command routing, session management, and webhook integration.

3. **Application Layer (`/code`)**
   - `Commands/`: WhatsApp command handlers and command registry.
   - `Routes/`: Express route modules per feature domain.
   - `Services/`: business logic engines (campaigns, commissions, analytics, notifications, etc.).
   - `Database/`: Mongoose schemas + service/data access wrappers.
   - `WhatsAppBot/`: multi-account orchestration, message handling, monitoring, security.
   - Additional domains: AI, Contacts, Campaigns, GoogleSheet, Analytics, Messaging, Integration, middleware, utils.

4. **Data and Operations**
   - `data/`: project JSON datasets and mappings.
   - `scripts/`: phased validation, setup, benchmarks, and integration scripts.
   - `tests/`: Jest suites and feature test coverage.
   - `tools/`: operational scripts (session, status, maintenance helpers).

## Feature Domains (Phase 5+)
- Communication templates and delivery workflows
- Commission calculation and rules
- Portfolio and operational analytics
- Invoicing and payment tracking
- Notification automation and escalation support

## Command and API Organization
- Bot commands are grouped by feature in `/code/Commands`.
- REST endpoints are grouped by domain in `/code/Routes`.
- Business services are grouped by capability in `/code/Services`.
- Data models are grouped in `/code/Database/*Schema.js` with corresponding service logic.

## Quality and Tooling
- **Lint**: `npm run lint`
- **Tests**: `npm test`
- **Dev bot runtime**: `npm run dev`
- **API runtime**: `npm run express-server`

## Notes for Contributors
- Keep changes domain-local (Command + Service + Route + Schema as needed).
- Prefer updating existing feature modules over creating duplicate pathways.
- Preserve backward compatibility in command names and API contracts when possible.
