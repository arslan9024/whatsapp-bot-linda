# 00 · Vision — Linda

| | |
|---|---|
| Document | Vision (RUP artifact) |
| Version | 1.1 — 2026-10-26 |
| Owner | Arslan Malik (product owner) |
| Status | Baseline for Inception milestone LCO |

| Version | Change |
|---|---|
| 1.0 | First baseline: keypad-menu idea, goals G-1..G-8, principles, scope, constraints, levels L0–L6 |
| 1.1 | Added the engine identity and system boundary with the company web app (§1.1, §11), the engine pillars (§12), the sending policy with operator-chosen working hours (§13), the technical baseline (§14), and an honest list of current gaps (§15). Corrected the API size (198 endpoints, 49 models) |

## 1. One sentence

**Linda is a terminal operating system for a WhatsApp account. Every
operation is a number you type, every number runs a proven algorithm, and
every run is counted.**

### 1.1 What Linda is, as a system

Linda is a **dedicated, terminal-driven WhatsApp automation engine**. It is
the communication backbone for real-estate operations:

- It drives WhatsApp through `whatsapp-web.js` and a **local headless
  Chromium** (`headless: 'new'`), so there is no visible browser and no
  graphical overhead.
- The operator runs it from the terminal only.
- Other company systems use it through a secure REST API.

The company's web app and CRM delegate messaging to Linda. They do not need
to manage browsers, sessions or rate limits themselves. Linda keeps the
WhatsApp session, the safety rules and the delivery record.

## 2. The idea: a keypad-phone operator menu, rebuilt for WhatsApp

Linda borrows from the menus that mobile operators give keypad phones,
like USSD codes (`*123#`) and SIM Toolkit menus. There is no touch screen,
no mouse and no app store:

```text
*123#                         Linda terminal
1. Balance                    1 Devices and accounts   ×12
2. Offers                     2 Link master directly   ×3
3. Bundles                    3 Contacts / Goraha      ×7
0. Back   00. Main menu       0 back · 00 home · p playbooks
```

Those menus work because they follow a few rules, and Linda follows the
same ones:

| Keypad-menu property | Linda equivalent |
|---|---|
| Everything is reachable by a short number | Menu codes `1.16`, playbook steps `p1.2` |
| The screen always shows where you are | Fixed zones: HEADER, FEATURES, INPUT, OUTPUT, PROCESS |
| `0` back, `00` home, works everywhere | Same keys in every menu |
| The operator asks for one value at a time | Pending questions ("Phone number?") replace the board |
| Works on the weakest device | Plain terminal, any width, compact fallback |
| An offer is a guided sequence | Playbooks: problem → numbered steps |

Linda adds what those menus never had: algorithms with proven complexity,
counters on every action, honest live status, and growth to a full WhatsApp
operations suite.

## 3. Problem statement (product level)

> A professional who runs their business on WhatsApp (for example a Dubai
> real-estate agent with owners, tenants, buyers and sellers) has thousands
> of conversations, several devices and accounts, and no way to operate
> them systematically.
>
> The phone app is built for chatting, not for operations. It cannot
> measure, schedule, deduplicate, prioritize, recover or audit.
>
> Linda turns the account into an operable system: measured, recoverable and
> automatable, from one terminal, without giving data to a third party.

## 4. Stakeholders and users

| Stakeholder | Interest |
|---|---|
| Owner-operator (primary user) | Run every WhatsApp operation from the terminal, fast, by number |
| Master account | The main WhatsApp number Linda controls; must stay linked and online |
| Servant accounts | Extra numbers Linda operates for campaigns and load |
| Contacts (owners, tenants, buyers, sellers) | Get correct, timely, non-spam messages |
| Future team members | Learn the system from numbered plans and playbooks |
| Future customers (L5–L6) | Run their own Linda as a product |

## 5. Goals

Each goal is measurable and is traced to problems in the
[problem register](../02-problems/PROBLEM_REGISTER.md).

| ID | Goal | Measure of success |
|---|---|---|
| G-1 | **Total control from the terminal.** Every WhatsApp operation is reachable by a numbered code | 100 % of features have a menu code; 0 operations need the phone app |
| G-2 | **Always on.** The master stays linked and online, and recovers by itself | Uptime ≥ 99.5 %; recovery without a new code ≥ 95 % when the device is still linked |
| G-3 | **Never lose a session.** Restarts restore exactly what was running | 0 sessions lost across restarts; atomic persistence |
| G-4 | **Know the account.** Measured insight into every conversation | Conversation report in ≤ 5 s for 10 000 chats; priority inbox |
| G-5 | **Act safely.** Outgoing messages never risk a ban or reach the wrong person | 0 sends above the rate budget; 0 sends outside the operator's working hours; 0 sends to opted-out contacts; 100 % of numbers validated before sending |
| G-6 | **Prove it.** Each feature is an algorithm with stated complexity, a flowchart, a requirement and a test | `npm run plans:check` passes; coverage of traced modules ≥ 90 % |
| G-7 | **Count everything.** Every feature and playbook shows a usage counter | Counters persist across restarts; visible on the dashboard |
| G-8 | **Local-first privacy.** Credentials and messages stay on the machine | No message content leaves the host without an explicit command |

## 6. Product principles (binding on design)

1. **Number-first.** A feature is not done until it has a menu code, an
   optional playbook step and a counter.
2. **Algorithm-first.** No feature code is written before its `ALG-nnn` is
   written and reviewed. The algorithm states its input, output, invariants
   and time and space complexity.
3. **Honest status.** Linked, online, offline and needs-authentication are
   different states and are always shown as they are. Unit tests are never
   presented as live proof.
4. **Degrade, don't die.** On a small screen, a slow network or a missing
   integration, Linda shrinks the view or disables one feature, never the
   whole system.
5. **Bounded everything.** Every queue, cache, retry loop and report has a
   stated upper bound in time and memory.
6. **Append-only contracts.** Menu codes, IDs and persisted formats are never
   renumbered. They are versioned and migrated.
7. **Local-first.** Data leaves the machine only through a named,
   user-triggered integration (Google Sheets or Contacts). WhatsApp
   session profiles are stored on this machine only.
8. **Reactivate before relink.** A device that is still linked on the
   phone is restored from its saved local session after a restart or a
   drop. A new pairing code or QR is asked for only when WhatsApp has
   really revoked the link.
9. **Send only in working hours.** The operator chooses the daily window
   (for example 09:00–20:00). No sender (campaigns, API queue, scheduler)
   sends outside it. Outside the window, work waits; it is not dropped.
10. **Clear boundaries.** Linda owns WhatsApp delivery. The company web app
    owns the people, properties and deals (§11).

## 7. Scope

**In scope (product line):**

- account lifecycle: linking, restore, relink and multi-account;
- the terminal OS (menus, playbooks, dashboards);
- conversation analytics, search and priority inbox;
- safe messaging and campaigns;
- contact intelligence: deduplication and classification;
- Google Sheets and Contacts integration;
- the real-estate domain module;
- the secure REST API used by the company web app (exists now, see §11);
- a later multi-tenant service.

**Out of scope until L5 or later:** graphical UI, mobile app, and hosting
other people's accounts.

**Never in scope:** bypassing WhatsApp security, scraping without consent,
and bulk unsolicited messaging.

## 8. Constraints and assumptions

| # | Constraint / assumption | Consequence |
|---|---|---|
| C-1 | Built on `whatsapp-web.js` (an unofficial WhatsApp Web automation) | Breakage risk on WhatsApp updates → adapter layer, risk `R-02` |
| C-2 | WhatsApp rate limits and anti-spam rules are unpublished | Conservative adaptive budgets (`ALG-010`), risk `R-01` |
| C-3 | Runs on a single Windows host with Node ≥ 22.13 (24 LTS recommended) and headless Chromium | Single-instance guard (`ALG-001`), bounded browser count |
| C-4 | One operator, at first | Terminal UI; multi-user deferred to L5 |
| C-5 | Linked-device credentials can be revoked by the phone at any time | Recovery cannot be guaranteed; show `needs authentication` honestly |
| C-6 | The bot and the API servers are separate processes that share only MongoDB | API requests are queued in MongoDB; the bot delivers them (§11) |
| C-7 | Contacts must not be messaged at unsocial hours | Operator-set working hours apply to every sender (§13) |

## 9. Product position

```text
                    systematic / measurable
                              ▲
                              │         ★ Linda (target L4–L6)
     WhatsApp Business API    │
     (official, paid, no      │
     personal inbox)          │
  ─────────────────────────────┼──────────────────────────► full personal
     manual phone use         │                            account control
                              │   browser extensions
                              │   (unmeasured, unsafe)
```

## 10. Vision evolution

The [100× roadmap](../07-roadmap/ROADMAP_100X.md) defines the levels in
detail:

**L0 Basic bot → L1 Reliable OS → L2 Assistant → L3 Analyst → L4 Operator
→ L5 Platform → L6 Product**

## 11. System architecture and boundaries

Linda is an isolated communication service. The company web app talks to
it only through the authenticated REST API. The operator controls it only
through the terminal.

```text
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ COMPANY RE WEB APP / CRM     │        │ LINDA TERMINAL (operator)    │
│ dashboards, listings, deals  │        │ menus, live status, logs     │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │ HTTPS + Bearer token                  │ runs locally
               ▼                                       ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ EXPRESS API (2 servers)      │        │ BOT PROCESS (index.js)       │
│ validates, authorises,       │  Mongo │ ApiQueueWorker, campaigns,   │
│ queues messages ────────────►│───────►│ session restore, dashboard   │
└──────────────────────────────┘ queue  └──────────────┬───────────────┘
                                                       ▼
                                        ┌──────────────────────────────┐
                                        │ whatsapp-web.js + headless   │
                                        │ Chromium (LocalAuth profiles)│
                                        └──────────────────────────────┘
```

| Linda owns (in scope) | The company web app owns (out of scope for Linda) |
|---|---|
| WhatsApp sessions: linking, local persistence, automatic restore | Agent and client UIs, dashboards, leaderboards |
| Headless Chromium lifecycle, single-instance lock | Property inventory, listings and search |
| Delivery: queue, rate limits, working hours, consent, delivery status | Creating deals, editing employees, portfolio definitions |
| Campaign throttling and daily caps | Public file and media hosting for third parties |
| Read-only conversation audits from the terminal | Primary business logic and CRM records |

Details: [Architectural boundaries](../../software_docs/ARCHITECTURAL_BOUNDARIES.md).

## 12. Engine pillars

### 12.1 Terminal-first control centre

- One pinned, colour-coded dashboard with fixed zones: HEADER, FEATURES,
  INPUT, OUTPUT and PROCESS. There is no web dashboard.
- **Master first.** The master account is shown and restored before any
  servant account.
- Each device shows two separate facts: **Link** (registered on the phone,
  as last known) and **Connection** (online now). An offline but linked
  device is reactivated with `recover <phone>` and does not need relinking.
- Linking uses `link-code` (pairing code) or `link-qr`.
- Menu codes and feature IDs: [Terminal dashboard guide](../../software_docs/TERMINAL_DASHBOARD_GUIDE.md).

### 12.2 Session persistence and automatic recovery

- WhatsApp sessions are `LocalAuth` profiles kept **on this machine only**.
  They are never uploaded or sent to the API.
- On restart, every account with a saved session is restored automatically,
  master first. Linda only asks for a new code if WhatsApp has revoked the
  link (C-5).
- A single-instance lock stops two bots from fighting over one profile.
- Status is honest (principle 3). Linda shows "Auth required" or "Relink
  needed" only when that is true. A failed attempt is not shown as linked.

### 12.3 Secure API bridge

- **198 REST endpoints** on two Express servers, backed by **49 Mongoose
  models**. Reference: [API reference](../../software_docs/API_REFERENCE.md)
  and [Mongoose schemas](../../software_docs/MONGOOSE_SCHEMAS.md).
- Three bearer tokens give tiered access:
  - `API_ACCESS_TOKEN`: full access;
  - `API_READ_TOKEN`: read only;
  - `API_MESSAGING_TOKEN`: messaging.
- The `Idempotency-Key` header stops a message from being sent twice when a
  request is retried.
- API messages are queued in MongoDB. The bot's **API queue worker**
  delivers them through the master account. It is opt-in
  (`API_QUEUE_WORKER=1`), sends one message at a time, and applies the
  sending policy in §13.

### 12.4 Campaigns from the terminal

- Import contacts, personalise the template (for example the name), select
  or deselect contacts, and skip opted-out contacts automatically.
- Set a random interval between messages (3–3600 s).
- Pause, resume and stop a campaign, and see progress and results.
- Everything is managed in the terminal campaign workspace and saved locally.

### 12.5 Local intelligence and conversation analysis

- Rule-based features run locally: sentiment, intent and duplicate checks.
  There is no external AI service yet, so message text stays on the host
  (G-8).
- Conversation analysis is **read-only**: list the chats, see which
  direction each conversation went, and build the priority inbox
  (`ALG-009`, `ALG-018`).

## 13. Sending policy (safety)

Every outgoing message must pass all of these rules.

| Rule | Policy | Applies to |
|---|---|---|
| **Working hours** | Messages are sent only between `WORK_HOURS_START` and `WORK_HOURS_END` in `WORK_HOURS_TIMEZONE`. The default is **09:00–20:00 Asia/Dubai**, and the operator chooses the window, e.g. 9 to 20. Outside the window, sending waits until the next opening. Campaigns stay running and can still be paused or stopped | Terminal campaigns, API queue worker, legacy scheduler |
| Window formats | `9`, `09:30`; the end may be `24`. A start later than the end spans midnight. `0`–`24` means all day. Invalid values fall back to the default and show a warning | All senders (one shared setting) |
| Daily account cap | 45 messages per account per day, shared by every sender | Terminal campaigns, API queue worker, legacy scheduler |
| Per-campaign cap | 10 messages per campaign per day by default | Campaigns |
| Random intervals | A random gap between sends: chosen per campaign (3–3600 s); 30–90 s for the API worker | Campaigns, API queue worker |
| Circuit breaker | 5 failures in 10 minutes pause the account for 5 minutes | All senders |
| Reservations | Each message is reserved in MongoDB before it is sent, so a duplicate is skipped and never sent twice | Campaigns, API queue worker |
| Consent | Opted-out contacts are never messaged; the API worker checks consent again just before sending | All |
| Unknown delivery | A send that may have gone out but was not confirmed is marked `DELIVERY_UNKNOWN` and is **never** retried automatically | Campaigns, API queue worker |
| Stale messages | Queued API messages more than 24 h overdue are cancelled as `EXPIRED` | API queue worker |

Configuration: `.env` (see `.env.example`), plus the `config/` folder.

## 14. Technical baseline

| Area | Choice |
|---|---|
| Runtime | Node.js ≥ 22.13; Node 24 LTS recommended; ES modules |
| Automation | `whatsapp-web.js` over Puppeteer with local headless Chromium (`headless: 'new'`) |
| Sessions | `LocalAuth` profiles on the local disk |
| Data | MongoDB with Mongoose (49 models). It holds the shared daily limits, the message queue and reservations, and the delivery history |
| API | Express, bearer tokens, `Idempotency-Key` |
| Configuration | `.env` variables plus local `config/` files |
| Quality | Jest unit tests; `npm run plans:check` for the plan traceability |

## 15. Current reality and known gaps

Principle 3 applies here too. This table separates what is proven from what
is only planned.

| Item | State |
|---|---|
| Automatic master restore after restart | Implemented and unit-tested; live verification on the real master device is in progress |
| API queue worker (API → WhatsApp delivery) | Implemented, opt-in, unit-tested; not yet live-verified. Text messages only |
| Working hours for all senders | Implemented and unit-tested; not yet live-verified |
| Legacy campaign scheduler | Older path kept for compatibility; it now uses the shared working hours, and its undefined `CampaignMessageDelayer` reference (which would have crashed it) is fixed. Not live-verified |
| API media messages, delivery receipts and webhooks | Planned (API-G2..G4 in [Architectural boundaries](../../software_docs/ARCHITECTURAL_BOUNDARIES.md)) |
| `POST /queue/process` | Returns 501 by design, because the bot's worker does the delivery |
| Terminal dashboard follow-ups | Open TD-P items in the [Terminal dashboard guide](../../software_docs/TERMINAL_DASHBOARD_GUIDE.md) |
| External AI | Not used; intelligence is local and rule-based |

## 16. Related documents

- [Software docs index](../../software_docs/README.md)
- [Problem register](../02-problems/PROBLEM_REGISTER.md) ·
  [SRS](../05-srs/SRS.md) ·
  [Software design](../06-design/SOFTWARE_DESIGN.md) ·
  [100× roadmap](../07-roadmap/ROADMAP_100X.md)
