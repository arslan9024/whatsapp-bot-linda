# 00 · Vision — Linda

| | |
|---|---|
| Document | Vision (RUP artifact) |
| Version | 1.0 — 2026-10-26 |
| Owner | Arslan Malik (product owner) |
| Status | Baseline for Inception milestone LCO |

## 1. One sentence

**Linda is a terminal operating system for a WhatsApp account. Every
operation is a number you type, every number runs a proven algorithm, and
every run is counted.**

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
| G-5 | **Act safely.** Outgoing messages never risk a ban or reach the wrong person | 0 sends above the rate budget; 100 % of numbers validated before sending |
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
   user-triggered integration (Google Sheets or Contacts).

## 7. Scope

**In scope (product line):**

- account lifecycle: linking, restore, relink and multi-account;
- the terminal OS (menus, playbooks, dashboards);
- conversation analytics, search and priority inbox;
- safe messaging and campaigns;
- contact intelligence: deduplication and classification;
- Google Sheets and Contacts integration;
- the real-estate domain module;
- a later API and multi-tenant service.

**Out of scope until L5 or later:** graphical UI, mobile app, and hosting
other people's accounts.

**Never in scope:** bypassing WhatsApp security, scraping without consent,
and bulk unsolicited messaging.

## 8. Constraints and assumptions

| # | Constraint / assumption | Consequence |
|---|---|---|
| C-1 | Built on `whatsapp-web.js` (an unofficial WhatsApp Web automation) | Breakage risk on WhatsApp updates → adapter layer, risk `R-02` |
| C-2 | WhatsApp rate limits and anti-spam rules are unpublished | Conservative adaptive budgets (`ALG-010`), risk `R-01` |
| C-3 | Runs on a single Windows host with Node ≥ 22 and Chromium | Single-instance guard (`ALG-001`), bounded browser count |
| C-4 | One operator, at first | Terminal UI; multi-user deferred to L5 |
| C-5 | Linked-device credentials can be revoked by the phone at any time | Recovery cannot be guaranteed; show `needs authentication` honestly |

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
