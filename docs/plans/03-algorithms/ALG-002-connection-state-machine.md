# ALG-002 — Connection state machine

| | |
|---|---|
| Solves | [PS-002](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-002](../04-flowcharts/FC-002-connection-state-machine.md) |
| Requirements | FR-002, FR-003 |
| Module | M-04 `src/accounts`, M-02 `src/whatsapp/ClientFlowSetup.js` |
| User trigger | `1.18 health`, dashboard header |
| Status | Implemented (state names are not yet unified in one module) |

## Problem
Every account must be in exactly one well-defined state. Each state must
come with the one next action the user should take. "Linked but offline"
must never be shown as "needs relink".

## Input
- Events: `start`, `qr`, `code`, `authenticated`, `ready`, `disconnected(reason)`,
  `auth_failure`, `logout`, `restore_failed`, `user_relink`.
- Facts: saved login availability, previous linking evidence, current bounded
  live check, client ownership, local pause and account enabled flag.

## Output
- `state ∈ S` and `nextAction(state)`.

## States
| State | Meaning | Next action shown |
|---|---|---|
| `UNLINKED` | Never linked, no saved session | `2.1 link-code` |
| `PAIRING` | Code or QR shown, waiting for the phone | Enter the code on the phone · `1.12` new code |
| `AUTHENTICATED` | Credentials accepted, chats loading | wait |
| `ONLINE` | Ready lifecycle established; live check confirms connection when requested | Continue; keep current client |
| `LINKED_OFFLINE` | Saved login is eligible for restore, no live connection | `1.21 master ready` or `1.19 restore master` |
| `RESTORING` | Restore in progress | wait (bounded by ALG-003) |
| `NEEDS_AUTH` | WhatsApp rejected the saved session | `1.9 relink master` |
| `LOGGED_OUT` | The phone removed the device | `1.9 relink master` |

These are normalized documentation states, not a unified runtime enum.
Keep device linking, local login and live connection as separate fields.
`PAUSED`, `DISABLED`, `IN_PROGRESS` and `NOT_CONFIGURED` are control/readiness
decisions in [ALG-003](ALG-003-master-restore.md), not extra persisted states
silently added to this table. A phone-side linked-device entry can coexist with
an offline browser or a missing local profile.

## Invariants
- I1. δ (the transition function) is **total**: every (state, event) pair has
  a defined result. Unknown pairs keep the state and are logged.
- I2. `ONLINE` only after `ready`. `AUTHENTICATED` alone never shows as
  online.
- I3. `LINKED_OFFLINE` requires `hasSavedSession`. The UI never offers relink
  as the first action in this state.

## Algorithm
Apply the lifecycle transitions below only for the current client. Then resolve
the operator's readiness decision using ALG-003, with enabled/pause/ownership
guards and a live check. Persisted flags alone must not override live evidence.
```text
1. on start:          s ← hasSavedSession ? RESTORING : UNLINKED
2. on qr | code:      s ← PAIRING
3. on authenticated:  s ← AUTHENTICATED
4. on ready:          s ← ONLINE
5. on disconnected(r):
     if r ∈ {LOGOUT, UNPAIRED}         → s ← LOGGED_OUT
     else if hasSavedSession            → s ← LINKED_OFFLINE   (ALG-006 reconnects)
     else                               → s ← UNLINKED
6. on auth_failure | restore_failed(needs_fresh_auth) → s ← NEEDS_AUTH
7. on user_relink:    s ← PAIRING
8. persist (s, timestamp) via ALG-005; render nextAction(s)
```

## Complexity
O(1) time and space per event. The table has |S| × |E| = 8 × 10 cells.

## Edge cases
1. `ready` arrives before `authenticated` (restored session): step 4 still
   gives `ONLINE`.
2. Duplicate `disconnected` events: idempotent, because the same state is
   recomputed.
3. Events arrive after the client was destroyed: ignored by checking the
   client identity.

## Current implementation
States exist as strings across `ClientFlowSetup`, `AccountHealthMonitor` and
`SessionRecoveryService` (`online`, `offline`, `auth_required`,
`logged_out`, `restoring`). The gap is that there is no single δ table.
Planned: `src/accounts/ConnectionStateMachine.js` exporting `STATES`,
`transition(s, e)` and `nextAction(s)`, and every module uses it.

## Verification
- Current: `TerminalSessionDashboard`, `SessionRecoveryService` and
  `SavedSessionReconnect` cover live-vs-persisted evidence, readiness, pause and
  stale-client rejection.
- Planned: a table-driven test of the unified transition function after that
  module exists. Do not claim all state/event pairs are already covered.
- Live: put the phone in airplane mode, then check that the dashboard shows
  `LINKED_OFFLINE` and offers `1.19`, not relink.
