# 06 — Software Design

How the [SRS](../05-srs/SRS.md) is built. Each module `M-nn` lists the
algorithms it owns, so a reader can go from a requirement to its algorithm,
flowchart, module and test ([TRACEABILITY](../TRACEABILITY.md)).

## 1. Architecture: layered and event-driven

```
┌──────────────────────────────────────────────────────────────┐
│ L4 Presentation   M-07 Terminal OS (5 zones, codes, playbooks)│
│                   M-12 Local API                              │
├──────────────────────────────────────────────────────────────┤
│ L3 Application    M-04 Accounts · M-05 Linking · M-08 Campaigns│
│ (use cases)       M-09 Intelligence · M-10 Analytics           │
│                   M-11 Contacts & integrations                 │
├──────────────────────────────────────────────────────────────┤
│ L2 Domain core    connection state machine (ALG-002),          │
│                   health score, counters — pure, no I/O        │
├──────────────────────────────────────────────────────────────┤
│ L1 Infrastructure M-02 WhatsApp adapter · M-03 Session store   │
│                   M-06 Connection resilience · M-13 Data       │
├──────────────────────────────────────────────────────────────┤
│ L0 Platform       M-01 Bootstrap, instance guard, config, logs │
└──────────────────────────────────────────────────────────────┘
          ▲ events flow up (bus)        commands flow down ▼
```

Rules:
1. A layer may call only the layer below it. Upward communication uses
   events, for example `account.state`, `message.in` or `report.ready`.
2. The domain core (L2) is pure functions and classes with no I/O. That is
   where the algorithms live, so they are unit-testable with fake clocks.
3. WhatsApp is reached only through M-02. Replacing `whatsapp-web.js`
   (risk R-02) means rewriting one adapter.

## 2. Module map

| ID | Module | Location | Owns algorithms | Key public surface |
|---|---|---|---|---|
| M-01 | Bootstrap & instance guard | `src/core`, `src/shared` | ALG-001 | `BotInstanceGuard.acquire()`, config, logger |
| M-02 | WhatsApp adapter | `src/whatsapp` | ALG-016, ALG-020 (router side) | client factory, `MessageRouter`, `MessageDeduplicator` |
| M-03 | Session store | `src/sessions` | ALG-005 | `SessionStateManager.save/load`, `AutoSessionRestoreManager` |
| M-04 | Accounts | `src/accounts` | ALG-003, ALG-008 | `AccountBootstrapManager`, restore master |
| M-05 | Linking | `src/linking` | ALG-004, ALG-007 | pairing code / QR flows, `DeviceRecoveryManager` |
| M-06 | Connection resilience | `src/connection` | ALG-002, ALG-006 | `AutoReconnectManager`, `CircuitBreakerManager` |
| M-07 | Terminal OS | `src/terminal`, `src/commands` | ALG-013, ALG-014, ALG-015 | `TerminalNumberMenu`, `TerminalLayout`, `TerminalPlaybooks`, `FeatureCatalog` |
| M-08 | Messaging & campaigns | `src/campaigns` | ALG-010, ALG-017 | `CampaignScheduler`, `CampaignRateLimiter` |
| M-09 | Intelligence | `src/intelligence` | ALG-009, ALG-018, ALG-019, ALG-020 | `ConversationIntelligenceEngine`, `IntentClassifier` |
| M-10 | Analytics | `src/analytics` | ALG-012 | `HealthScorer`, uptime |
| M-11 | Contacts & integrations | `src/integrations`, `src/services` | ALG-011 | `DeduplicationService`, Goraha, Google Sheets |
| M-12 | Local API | `src/api` | — | REST routes (localhost only) |
| M-13 | Data | `src/database` | — | Mongo models, JSON stores |
| M-14 | Plans tooling | `tools` | — | `plans:check` |
| M-15 | Area owner outreach | `src/outreach` | ALG-021 | `OwnerSheetExtractor`, `MasterChatDirectory`, `NewConversationBudget`, `AreaOwnerOutreachPlanner`, `OutreachCommand` |

## 3. Key design patterns
| Pattern | Where | Why |
|---|---|---|
| State machine (table-driven) | ALG-002, M-06 | One truth for "linked vs online". Illegal transitions are impossible. |
| Adapter | M-02 | Isolates the unofficial WhatsApp client (R-02). |
| Chain of responsibility | ALG-013, ALG-020 | Input resolvers and intent handlers are added without editing the router. |
| Strategy | ALG-006 (jitter), ALG-017 (catch-up policy) | Swap a policy through config. |
| Observer / event bus | Between layers | Upward events, no cyclic imports. |
| Command | Menu codes, playbooks | Each code is an object `{code, run, ask}`, so it can be counted, replayed and audited. |
| Repository | M-03, M-13 | Storage can be swapped (JSON → SQLite/Mongo) behind one interface. |
| Circuit breaker, bulkhead | M-06, ALG-008 semaphore | One failing account cannot sink the others. |

## 4. Data design
| Store | Content | Write rule |
|---|---|---|
| `session-state.json` | Account states, `wasOnline`, generation | ALG-005: atomic write, checksum, `.bak` |
| `sessions/<profile>/` | Chromium and LocalAuth profile | Never deleted automatically (FR-005) |
| `data/feature-usage.json` | Counters | ALG-015: debounced atomic flush |
| `data/campaigns*.json` | Jobs, schedules | ALG-017: persist heap on change |
| `data/search/` (planned) | Inverted-index segments | ALG-019: append-only, merged in background |
| MongoDB (optional) | Contacts, analytics history | Repository interface |

## 5. Target folder structure (mega-project, reached gradually)
```
whatsapp-bot-linda/
├─ docs/plans/        00-vision … 07-roadmap, TRACEABILITY  (this program)
├─ src/
│  ├─ core/           M-01 bootstrap, config, logger, event bus
│  ├─ domain/         (C1+) pure algorithms: stateMachine, backoff, scoring, heap, bm25
│  ├─ whatsapp/       M-02 adapter
│  ├─ sessions/ accounts/ linking/ connection/      M-03…M-06
│  ├─ terminal/       M-07 (zones, menu, playbooks, counters)
│  ├─ campaigns/ intelligence/ analytics/           M-08…M-10
│  ├─ integrations/ services/ api/ database/        M-11…M-13
│  └─ plugins/        (L5) intent handlers and commands loaded at start
├─ tests/
│  ├─ unit/           one suite per ALG minimum
│  ├─ property/       (C1+) invariants with fast-check
│  └─ bench/          (C3+) NFR-001 benchmarks
├─ tools/             M-14 plans-check, generators
└─ data/ sessions/    runtime (git-ignored)
```
Moving code into `src/domain` happens one algorithm at a time, when that
algorithm's iteration starts. Code is never moved in a big bang (risk R-09).

## 6. Architecture decisions (ADR log)
| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Numbered codes are the primary UI; word commands are aliases. | Accepted |
| ADR-002 | Menu codes are append-only. | Accepted |
| ADR-003 | Local-first: no message content leaves the machine by default. | Accepted |
| ADR-004 | Single instance per project, through a deterministic port lease (ALG-001). | Accepted |
| ADR-005 | Never delete a WhatsApp profile automatically; relinking is always a user decision. | Accepted |
| ADR-006 | Algorithms live in pure modules with injected clock, random and I/O. | Proposed (C1) |
| ADR-007 | Plans integrity is enforced by `npm run plans:check` inside `npm test`. | Accepted |

## 7. Error handling and observability
- Every failure ends in a state plus a next-action code, never a stack trace
  in OUTPUT (NFR-004).
- The PROCESS zone is the live log. Files are written under `logs/` with
  phone numbers redacted (NFR-006).
- Counters (ALG-015) double as product analytics: unused codes are
  candidates for removal from menus, but never for code reuse (ADR-002).
