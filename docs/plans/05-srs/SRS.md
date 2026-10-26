# 05 — Software Requirements Specification (SRS)

Structure follows ISO/IEC/IEEE 29148 (the successor of IEEE 830).
Every requirement has a stable ID, a source problem (`PS-nnn`), a priority
(MoSCoW) and a verification method. Requirements are written as "shall"
statements and must be testable.

## 1. Introduction

### 1.1 Purpose
This document defines what Linda shall do. It covers the WhatsApp terminal
operating system described in [VISION](../00-vision/VISION.md). It is the
contract between the plans ([algorithms](../03-algorithms/README.md)) and the
code ([design](../06-design/SOFTWARE_DESIGN.md)).

### 1.2 Scope
Linda is a local Node.js application. It drives one or more WhatsApp accounts
through `whatsapp-web.js`. All control is through a numbered terminal menu
(keypad-phone / USSD style), playbooks and an optional local API.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Master | The owner's primary WhatsApp account. It controls the servants. |
| Servant | An additional account that Linda operates. |
| Linked | The device is paired, so a saved profile exists. It can still be offline. |
| Online | The client reported `ready` and can send and receive now. |
| Menu code | A dotted number like `1.19` that names exactly one action. Codes are append-only. |
| Playbook | A numbered recipe `P1…Pn` of menu codes for a whole task. |
| Counter | A persistent use count for each feature, shown as `×n`. |

### 1.4 References
[VISION](../00-vision/VISION.md) · [RUP plan](../01-rup/RUP_PLAN.md) ·
[Problem register](../02-problems/PROBLEM_REGISTER.md) ·
[Traceability](../TRACEABILITY.md)

## 2. Overall description

### 2.1 Product perspective
```
 Owner ── terminal (5 zones: HEADER · FEATURES · INPUT · OUTPUT · PROCESS)
              │ numbered codes / playbooks
              ▼
 Linda core ── accounts · linking · connection · sessions · intelligence · analytics
              │
              ▼
 whatsapp-web.js ── Chromium (one profile per account) ── WhatsApp Web
              │
 Local data: sessions/, data/*.json, MongoDB (optional), Google Sheets (optional)
```

### 2.2 User classes
| Class | Needs |
|---|---|
| Owner-operator | Full control from the keyboard; codes they can learn by heart. |
| Assistant operator (L4+) | Restricted codes, with an audit trail. |
| Integrator (L5+) | Local REST API and plugins. |

### 2.3 Constraints
These are the vision's C-1 to C-5: local first, an unofficial client (so
risk limits apply), Windows plus Node 22, a single owner, and no message
content sent to third parties without explicit opt-in.

### 2.4 Assumptions
WhatsApp Web stays reachable, and Chromium can run on the host. The owner's
phone is online at least once every 14 days, so linked devices stay valid.

## 3. Functional requirements

Priority: **M** = must, **S** = should, **C** = could.
Verification: **T** = automated test, **D** = demonstration, **I** = inspection.

### 3.1 Process and connection (E1, E2, C1)
| ID | Requirement | Source | Pri | Verify | Status |
|---|---|---|---|---|---|
| FR-001 | Linda shall refuse to start a second instance for the same project folder, and shall leave the browsers and sessions untouched when it refuses. | PS-001 | M | T `BotInstanceGuard` | Implemented |
| FR-002 | The system shall keep, for each account, exactly one connection state from {UNLINKED, PAIRING, AUTHENTICATED, ONLINE, RESTORING, LINKED_OFFLINE, NEEDS_AUTH, LOGGED_OUT}. | PS-002 | M | T | Implemented |
| FR-003 | The dashboard shall show linked status and online status separately, plus the next action code for the current state. | PS-002 | M | D, T `TerminalLayout` | Implemented |
| FR-004 | `1.19 restore master` shall try the automatic rungs (soft reconnect, then restore from the same profile) before asking the user anything. | PS-003 | M | T `SavedSessionReconnect` | Implemented |
| FR-005 | Restore shall never delete or replace the saved profile without the user's explicit confirmation. | PS-003 | M | T, I | Implemented |
| FR-006 | `2.1 link-code` shall show the pairing code with a countdown. It shall refresh the code on `refresh` or when the code expires, up to A attempts. | PS-004 | M | T | Implemented |
| FR-007 | After A failed attempts, pairing shall stop and suggest `2.2 link-qr` and playbook P3. | PS-004 | S | T | Implemented |
| FR-008 | Session state shall be saved atomically: temp file, fsync, then rename. A crash during a save shall leave a readable file. | PS-005 | M | T | Implemented |
| FR-009 | On start, Linda shall restore every account that was online at shutdown and print `restored k/n` with the failures. | PS-005 | M | T, D | Implemented |
| FR-010 | Reconnection shall use capped backoff with jitter and shall stop after M attempts. | PS-006 | M | T (fake clock) | Partial |
| FR-011 | A circuit breaker (CLOSED, OPEN, HALF_OPEN) shall stop retries while WhatsApp keeps failing. | PS-006 | S | T | Partial |
| FR-012 | Each disconnect shall be classified as LOGGED_OUT, NEEDS_AUTH, CONFLICT, NETWORK or UNKNOWN, and the matching next action shall be shown. | PS-007 | M | T (decision table) | Partial |
| FR-013 | Accounts shall start masters first, with at most K concurrent launches and B live browsers. Excess accounts shall be deferred, not dropped. | PS-008 | M | T | Partial |

### 3.2 Messaging and analysis (C2, C3, C4)
| ID | Requirement | Source | Pri | Verify | Status |
|---|---|---|---|---|---|
| FR-014 | When the master comes online, a conversation report (total chats, last conversation, messages per chat) shall appear in OUTPUT. | PS-009 | M | T `TerminalConversationAnalysis` | Implemented |
| FR-015 | `8.11 convos` shall show the full table, with per-chat message counts marked "capped" when the fetch limit was reached. | PS-009 | S | T | Implemented |
| FR-016 | Sending shall reject numbers that are invalid or not registered on WhatsApp, and shall say why. | PS-010 | M | T | Partial |
| FR-017 | Sending shall respect a token-bucket rate and a daily cap. Sends over budget shall be DEFERRED with a retry time, never dropped silently. | PS-010 | M | T | Partial |
| FR-018 | A send with the same idempotency key shall happen at most once. | PS-010 | S | T | Planned |
| FR-019 | Contact deduplication shall merge only on an exact phone or email match, or a fuzzy name match corroborated by another field. | PS-011 | M | T | Partial |
| FR-020 | Uncertain duplicates shall go to a review list, never to an automatic merge. | PS-011 | S | T | Partial |
| FR-021 | Each account shall have a smoothed health score 0–100 and a trend slope. The system shall alert when the score is below 50 or the slope is below −2. | PS-012 | M | T | Implemented |
| FR-027 | Each inbound message shall be processed at most once within the dedup window. | PS-016 | M | T | Implemented |
| FR-028 | Campaign jobs shall run in due-time order and never inside quiet hours. | PS-017 | M | T (fake clock) | Partial |
| FR-029 | Jobs missed during downtime shall follow their policy (SKIP or RUN_ONCE_SPREAD) and never burst. | PS-017 | S | T | Planned |
| FR-030 | `8.12 inbox` shall list the top-k chats that need a reply, with a score and reason, excluding muted and archived chats. | PS-018 | S | T | Planned |
| FR-031 | `8.13 search <words>` shall return the chats and messages containing all of the words, ranked, with snippets. | PS-019 | S | T, bench | Planned |
| FR-032 | Each inbound message shall get one intent with a confidence score. If the confidence is below θ or ambiguous, the message is routed to the human. | PS-020 | M | T | Partial |
| FR-033 | Intent handlers shall be plugins with `match` and `handle`. A failing or slow handler shall not affect the others. | PS-020 | S | T | Planned |

### 3.3 Terminal operating system (E2)
| ID | Requirement | Source | Pri | Verify | Status |
|---|---|---|---|---|---|
| FR-022 | Every action shall be reachable through a numeric menu code. Codes are append-only and never reused. | PS-013 | M | T `TerminalNumberMenu` | Implemented |
| FR-023 | Input shall resolve in this order: pending answer, then navigation (`0`, `00`), playbook, code, feature number, word command, suggestion. | PS-013 | M | T `TerminalPlaybooks` | Implemented |
| FR-024 | Unknown input shall offer up to 3 suggestions within edit distance 2. | PS-013 | S | T | Planned |
| FR-025 | The five zones shall fit any terminal of at least 80×24 by degrading in a fixed order: INPUT, then FEATURES, then HEADER. | PS-014 | M | T `TerminalLayout` | Implemented |
| FR-026 | Every action shall increment a persistent counter, shown as `×n`. Counts shall survive a crash, losing at most 1 s of updates. | PS-015 | M | T `FeatureCatalog` | Implemented |

## 4. Non-functional requirements
| ID | Quality | Requirement | Measure |
|---|---|---|---|
| NFR-001 | Performance | The conversation report shall finish in under 30 s for 2,000 chats. Search shall answer in under 1 s at p95 for 1 M messages. A menu keypress shall respond in under 50 ms. | Benchmark |
| NFR-002 | Durability | No state loss on crash or kill: atomic writes, checksum, one backup. | Crash test |
| NFR-003 | Resource bounds | Memory under 300 MB plus about 250 MB per live browser. Number of live browsers ≤ B. Every cache is bounded. | Soak test 24 h |
| NFR-004 | Usability | Every screen fits 80×24 or larger. Every state shows its next action as a code. Any feature is reachable in at most 3 keypresses from its section. | Layout test |
| NFR-005 | Availability | The master is online at least 99.5 % of the time while the host is up. Mean time to recover from a network drop is under 2 min, without user input. | Uptime analytics `4.3` |
| NFR-006 | Privacy and security | Message content stays local. Logs redact phone numbers to their last 4 digits. Secrets are never committed (secret scan in CI). | Inspection, CI |
| NFR-007 | Maintainability | Every ALG has a test. Lint has 0 errors. `npm run plans:check` passes. No module has a cyclic import. | CI |
| NFR-008 | Portability | Runs on Windows 10+ and Linux with Node 22 LTS. | CI matrix (L5) |

## 5. External interfaces
| Interface | Description |
|---|---|
| Terminal | Five zones; codes `1.x` accounts, `2.x` linking, `3.x` contacts, `4.x` analytics, `5.x` sheets, `6.x` system, `8.x` messaging and intelligence; playbooks `P1–P10`. |
| WhatsApp | `whatsapp-web.js` client per account, with LocalAuth profile under `sessions/`. |
| Files | `session-state.json`, `data/*.json` (counters, campaigns, contacts). |
| Optional | MongoDB, Google Sheets API, local REST API (`src/api`). |

## 6. Change control
New requirements get the next free number and are never renumbered. A
deleted requirement keeps its row, marked `Withdrawn`. Every requirement
change updates [TRACEABILITY](../TRACEABILITY.md) in the same commit.
