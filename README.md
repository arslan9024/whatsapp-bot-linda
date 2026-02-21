# 🤖 WhatsApp Bot Linda

**Enterprise-grade WhatsApp automation platform** for real estate property management, built with Node.js, MongoDB, and Express.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green.svg)]()
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-890_passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-ISC-blue.svg)]()

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Bot Commands](#-bot-commands)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Documentation](#-documentation)

---

## ✨ Features

### Core Bot
- **Multi-Bot Support** — Run multiple WhatsApp bots simultaneously
- **Campaign Management** — Bulk messages with scheduling and rate limiting
- **Contact Validation** — Phone number validation with country code checking
- **Message Analyzer** — Intelligent incoming message analysis
- **Google Sheets Integration** — Read/write property data to Google Sheets
- **Session Persistence** — Automatic QR code handling and session restore
- **24/7 Production Mode** — Keep-alive, health monitoring, auto-recovery

### Phase 5: Advanced Features (890 tests, 100% pass rate)
- **📧 Communication Templates** — Template management, variable substitution, WhatsApp/email/SMS delivery (16 API endpoints, 11 bot commands)
- **💰 Commission Tracking** — Percentage, fixed, tiered & revenue-share calculations with approval workflows (17 endpoints, 10 commands)
- **📊 Analytics & Reporting** — Portfolio analytics, market comparisons, performance snapshots & trend analysis (14 endpoints, 10 commands)
- **🧾 Payment & Invoicing** — Invoice generation, payment recording, aging reports & overdue tracking (25 endpoints, 12 commands)
- **🔔 Automated Notifications** — Contract expiry alerts, payment reminders, maintenance schedules & escalation chains (22 endpoints, 13 commands)

### Database
- **16 Mongoose Models** — Normalized, relational schema for properties, tenants, contracts, payments, commissions, and more
- **94 RESTful API Endpoints** — Full CRUD across all entities
- **56 WhatsApp Bot Commands** — Natural language property management via chat

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- WhatsApp account
- Google API credentials (for sheets integration)

### Installation

1. **Clone and Install**
```bash
cd WhatsApp-Bot-Linda
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Add Google API Credentials**
```bash
# Place your keys.json in code/GoogleAPI/
# Obtained from Google Cloud Console
```

4. **Run the Bot**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### First Run

1. The bot will display a QR code in the terminal
2. Open WhatsApp on your phone
3. Settings → Linked Devices → Link a Device
4. Scan the QR code with your phone camera
5. Bot will authenticate and start listening

---

## 📁 Project Structure

```
WhatsApp-Bot-Linda/
├── index.js                         # Bot entry point (24/7 production mode)
├── express-server.js                # Express API server (94 endpoints)
├── express-server-inmemory.js       # In-memory MongoDB dev server
├── config.js                        # Configuration management
├── logger.js                        # Structured logging system
├── errorHandler.js                  # Centralized error handling
├── validation.js                    # Input validation utilities
├── package.json                     # Dependencies & npm scripts
│
├── code/                            # Core application (483 files)
│   ├── WhatsAppBot/                 # WhatsApp client, bootstrap, session mgmt
│   ├── Commands/                    # Bot command handlers (56 commands)
│   ├── Database/                    # Mongoose schemas (16 models)
│   ├── Services/                    # Business logic & calculation engines
│   ├── Routes/                      # Express API routes (94 endpoints)
│   ├── Message/                     # Message sending & formatting
│   ├── Contacts/                    # Contact validation & linking
│   ├── Campaigns/                   # Bulk messaging campaigns
│   ├── GoogleSheet/                 # Google Sheets API integration
│   ├── AI/                          # AI-powered features
│   ├── Analytics/                   # Real-time analytics
│   ├── utils/                       # Shared utilities
│   └── ...                          # 30+ organized modules
│
├── bot/                             # Bot framework (hybrid architecture)
├── scripts/                         # Utility & migration scripts
├── tests/                           # Test suites (890 tests)
├── docs/                            # All documentation
│   ├── phases/                      # Phase 1-30 implementation docs
│   ├── sessions/                    # Session notes & summaries
│   ├── guides/                      # Setup, deployment & reference guides
│   ├── delivery/                    # Delivery packages & summaries
│   ├── architecture/                # Architecture diagrams & decisions
│   ├── security/                    # Security audits & remediation
│   ├── bot/                         # Bot framework documentation
│   ├── project/                     # Project status & dashboards
│   ├── api/                         # API documentation & references
│   ├── goraha/                      # Goraha account documentation
│   ├── qr-device/                   # QR code & device linking docs
│   └── archive/                     # Historical documentation
│
├── config/                          # Configuration files
├── data/                            # Data files & JSON databases
├── logs/                            # Application logs
├── sessions/                        # WhatsApp session storage (git-ignored)
├── Inputs/                          # Contact lists & configurations
└── Outputs/                         # Campaign results & reports
```

---

## ⚙️ Configuration

### Environment Variables

```bash
cp .env.example .env
```

Key variables:
```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/linda-bot
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-key>
GOOGLE_SHEET_ID=<your-spreadsheet-id>
PORT=3000
```

---

## 🔌 API Endpoints

Start the API server:
```bash
npm run express-server      # With live MongoDB
npm run express-inmemory    # With in-memory MongoDB (dev)
```

| Feature | Endpoints | Base Path |
|---------|-----------|-----------|
| Communication Templates | 16 | `/api/communication` |
| Commission Rules | 17 | `/api/commission-rules` |
| Analytics & Reporting | 14 | `/api/analytics` |
| Invoices & Payments | 25 | `/api/invoices` |
| Notifications | 22 | `/api/notifications` |
| Properties | varies | `/api/properties` |
| Tenants | varies | `/api/tenants` |
| Contacts | varies | `/api/contacts` |

---

## 💬 Bot Commands

56 commands available via WhatsApp. Examples:
```
!template list              # List communication templates
!commission calculate       # Calculate commission on a deal
!analytics portfolio        # Portfolio performance summary
!invoice create             # Create a new invoice
!notify scan                # Scan for due notifications
!help                       # Show all available commands
```

---

## 🧪 Testing

```bash
# Run all Phase 5 feature tests (890 tests)
npm run test:phase5

# Individual feature tests
npm run test:communication    # 120 tests
npm run test:commission       # 95 tests
npm run test:analytics        # 192 tests
npm run test:invoice          # 243 tests
npm run test:notification     # 240 tests

# Infrastructure tests
npm run phase5-express        # E2E + performance + load tests
npm run test:all-features     # Everything combined
```

---

## 🚀 Running

```bash
# Bot (24/7 production mode)
npm start

# Bot (development with auto-reload)
npm run dev

# API Server
npm run express-server

# API Server (development with auto-reload)
npm run express-dev
```

---

## 📚 Documentation

All documentation is organized in `docs/`:

| Folder | Contents |
|--------|----------|
| `docs/phases/` | Phase 1-30 implementation documentation (343 files) |
| `docs/sessions/` | Session notes and work summaries (157 files) |
| `docs/guides/` | Setup, deployment, and reference guides (57 files) |
| `docs/delivery/` | Delivery packages and summaries |
| `docs/architecture/` | Architecture diagrams and decisions |
| `docs/security/` | Security audits and remediation guides |
| `docs/bot/` | Bot framework documentation |
| `docs/project/` | Project status dashboards and reports |
| `docs/api/` | API documentation and references |

---

## 📄 License

ISC License — See LICENSE file for details.

## 👤 Author

**Arslan Malik** — Built for 24/7 production real estate operations in Dubai/UAE.

