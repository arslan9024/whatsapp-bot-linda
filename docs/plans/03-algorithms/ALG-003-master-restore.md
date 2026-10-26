# ALG-003 — Master restore ladder

| | |
|---|---|
| Solves | [PS-003](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-003](../04-flowcharts/FC-003-master-restore.md) |
| Requirements | FR-004, FR-005 |
| Module | M-03 `src/sessions/SessionRecoveryService.js`, M-07 terminal `restore master` |
| User trigger | `1.19 restore master`, `1.16 recover`, playbook `P1` |
| Status | Implemented; live acceptance pending ([E1](../01-rup/iterations/E1-master-session.md)) |

## Problem
Bring the master from `LINKED_OFFLINE` to `ONLINE` with the least disruption
to the user. Escalate only when a cheaper rung has failed. Every rung is
bounded and the whole ladder ends.

## Input
- `phone` (E.164), `state` from ALG-002, saved session directory, `maxAttempts`
  per rung (default 2), `timeout` per attempt (default 90 s).

## Output
- `ONLINE`, or `NEEDS_AUTH` together with the next rung the user must run.

## Invariants
- I1. Saved credentials are never deleted by a restore attempt.
- I2. At most one restore runs per account at a time (a per-phone mutex).
- I3. The total time is ≤ Σ rungs × maxAttempts × timeout.

## Algorithm (ladder, cheapest rung first)
```text
0. if state = ONLINE → return ONLINE
1. acquire mutex(phone) or return "restore already running"
2. Rung R1 — soft reconnect: reuse the live client, call reconnect; wait ≤ timeout for ready
3. Rung R2 — restore: destroy the client, start a new client on the SAME saved profile; wait ≤ timeout
4. if any rung → ready: state ← ONLINE; persist; release; return ONLINE
5. if WhatsApp signals fresh authentication: state ← NEEDS_AUTH; keep the profile (I1)
6. Rung R3 — guided relink (needs the user): show "1.9 relink master" / playbook P1 step 2
7. Rung R4 — new link: P1 step 3 → 2.1 link-code (ALG-004)
8. release mutex; return final state with nextAction
```
Rungs R1–R2 are automatic. R3–R4 always ask the user first, because they
change the linked device.

## Complexity
At most 2 automatic rungs × 2 attempts = 4 client starts. Each one is O(1) in
CPU and bounded by `timeout` in wall time.

## Edge cases
1. Restore is requested while a pairing is pending: refuse with a message
   (I2).
2. Network down: R1 and R2 time out and the state stays `LINKED_OFFLINE`, not
   `NEEDS_AUTH`. ALG-006 keeps retrying in the background.
3. The profile is locked by a zombie Chromium: run browser cleanup before R2.

## Current implementation
`restore master` / `1.19` and `recover` / `1.16` cover R1–R2. Playbook `P1`
lists R1 → R3 → R4 in order. The gap is that the mutex and the total-time
bound are not enforced in one place.

## Verification
- Unit: `restore master` and `p1.1` call `onRestoreAccount(master)`
  (dashboard tests).
- Planned: a ladder test with fake clients (ready on R2 gives `ONLINE` with 2
  starts; auth failure gives `NEEDS_AUTH` and the profile is kept).
- Live: record each result in the E1 iteration plan.
