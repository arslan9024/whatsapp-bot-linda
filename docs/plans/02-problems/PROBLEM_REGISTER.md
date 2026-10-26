# 02 · Problem register

A problem statement says **what hurts and how we will know it is solved**,
without saying how. The how is written in `ALG-nnn` with the same number.

## Summary

| ID | Problem | User trigger (menu code / playbook) | Goal | Status | Iteration |
|---|---|---|---|---|---|
| PS-001 | Only one Linda may own the browsers and sessions | automatic at start | G-2 | Implemented | E2 |
| PS-002 | Tell linked / online / offline / needs-auth apart | `1.18`, dashboard | G-2 | Implemented | E1 |
| PS-003 | Check master readiness; restore the saved login before relinking | `1.20`, `1.21`, `1.19`, `1.16`, `P1` | G-2 | Implemented | E1 |
| PS-004 | Link a device by pairing code, refreshing it when late | `2.1`, `1.12`, `P2`, `P3` | G-2 | Implemented | E1 |
| PS-005 | Persist sessions so a restart restores exactly what ran | `1.7`, `P4` | G-3 | Implemented | E1 |
| PS-006 | Reconnect without storms or endless loops | automatic | G-2 | Partial | C1 |
| PS-007 | Detect logout or device removal and route to relink | `1.13`, `1.9`, `P5` | G-2 | Partial | C1 |
| PS-008 | Start and supervise many accounts with bounded resources | `1.10`, `1.4`, `P6` | G-2 | Partial | C1 |
| PS-009 | Summarize all conversations quickly | `8.11`, `8.9`, `8.10`, `P7` | G-4 | Implemented | C3 |
| PS-010 | Send messages safely (right number, within budget) | `8.2`, `8.1`, `P8` | G-5 | Partial | C2 |
| PS-011 | Merge duplicate contacts without false merges | `3.2`, `3.4`, `8.7`, `P9` | G-4 | Partial | C4 |
| PS-012 | One health number per account that predicts trouble | `6.1`, `1.14`, `1.18`, `P10` | G-2 | Implemented | C1 |
| PS-013 | Resolve any typed input to one action, instantly | every input | G-1 | Partial | E2 |
| PS-014 | Fit five dashboard zones on any terminal size | automatic | G-1 | Implemented | E2 |
| PS-015 | Count every feature use and never lose counts | dashboard `×n` | G-7 | Implemented | E2 |
| PS-016 | Never process the same inbound message twice | automatic | G-5 | Implemented | C2 |
| PS-017 | Run scheduled campaigns in time order within quiet hours | `6.4` | G-5 | Partial | C2 |
| PS-018 | Show who to answer next (priority inbox) | future code `8.12` | G-4 | Planned | C3 |
| PS-019 | Search every chat by words in under a second | future code `8.13` | G-4 | Planned | C3 |
| PS-020 | Route each incoming message to the right intent handler | `8.5` | G-4 | Partial | C4 |

## Problem details

### PS-001 — Single owner of browsers and sessions
Two Linda processes on one machine would open the same Chromium profiles and
corrupt them. **Solved when:** a second start fails within 1 s and changes
nothing, and the guard frees itself after a crash with no manual cleanup.

### PS-002 — Honest connection state
"Linked" (the device is registered on the phone) is not "online" (a live
session right now). Mixing them sends the user to relink when a restore is
enough. **Solved when:** every account is always in exactly one of the
documented states, and the dashboard shows that state and the next action.

### PS-003 — Restore the master
The master may have a phone-side linked-device entry yet no live session, or
even no usable local login on this computer.
**Solved when:** Linda checks live first, keeps an online client, waits for
in-flight work, and restores an eligible saved login without a new code.
Missing/revoked credentials require explicit pairing; transient failures keep
the profile and expose the real error. A foreground readiness action performs
one recovery attempt rather than an endless interactive ladder.

### PS-004 — Pairing code with refresh
Pairing codes expire, and the user may be slow or the link may fail.
**Solved when:** a fresh code is shown before the old one expires or when the
user asks for one. The number of attempts is capped and the user can switch
to QR.

### PS-005 — Durable sessions
A crash during a save must not leave half-written state, and "last active
today" must mean the session really was saved. **Solved when:** state is
always the last fully written version, and a restart restores every account
that was online.

### PS-006 — Reconnect without storms
Fixed backoff synchronizes many accounts and hammers WhatsApp.
**Solved when:** reconnect delays are randomized and capped, an account that
keeps failing is paused by a circuit breaker, and attempts are bounded per
batch. Eligible transient failures resume after progressive cooldown rather
than stopping permanently; authentication, pause, disable and shutdown guards
remain respected. Durable breaker history and unified named breaker states
remain gaps, so this problem is still Partial.

### PS-007 — Logout and device removal
**Solved when:** these are told apart from network drops within one event,
saved credentials are kept or cleared according to policy, and the user is
pointed to `1.9 relink`.

### PS-008 — Many accounts
**Solved when:** N accounts start with at most K browsers launching at once,
the master starts first, and memory stays within a stated budget per account.

### PS-009 — Conversation report
**Solved when:** total chats, messages per chat, latest conversation, and top
and quiet chats are computed in one pass, in O(N) time and O(C + k) memory.

### PS-010 — Safe sending
**Solved when:** every number is normalized to E.164 and checked as
registered. Every send uses a token from a per-account budget that adapts to
failures. Duplicate sends are blocked by an idempotency key.

### PS-011 — Contact deduplication
**Solved when:** contacts that are the same person are merged by an
explainable rule, comparisons stay near-linear thanks to blocking, and
different people are never merged on a name match alone.

### PS-012 — Health score
**Solved when:** one 0–100 score per account combines uptime, error rate and
latency with documented weights and smoothing, and a falling trend raises an
alert before a failure.

### PS-013 — Numbered command resolution
**Solved when:** codes (`1.16`), playbook steps (`p1.2`), words (`recover`)
and close typos resolve to one action or a short "did you mean" list, in
O(length of input), with `0` back and `00` home everywhere.

### PS-014 — Screen budget
**Solved when:** HEADER, FEATURES, INPUT, OUTPUT and PROCESS always fit the
window by a fixed priority rule, and OUTPUT never drops below its minimum
height.

### PS-015 — Counters
**Solved when:** every action and playbook run increments exactly one key,
and counts survive restarts and crashes, losing at most 1 s of updates.

### PS-016 — Inbound deduplication
**Solved when:** a message that is delivered again (after a reconnect or a
replay) is processed at most once, using bounded memory.

### PS-017 — Campaign scheduling
**Solved when:** due jobs run in time order, quiet hours and the rate budget
are respected, and missed jobs after downtime are handled by a stated policy.

### PS-018 — Priority inbox
**Solved when:** chats waiting for the user's reply are ranked by a
documented score (waiting time, contact value, intent urgency), and the top k
are returned in O(C log k).

### PS-019 — Full-text search
**Solved when:** any word in any chat is found in under 1 s for 1 M messages,
using an incrementally updated inverted index stored on disk.

### PS-020 — Intent routing
**Solved when:** each incoming message gets one intent with a confidence
score, below a threshold it goes to "unknown" (never guessed), and new
intents can be added without touching the router.
