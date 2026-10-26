# ALG-006 — Reconnect with decorrelated jitter and a circuit breaker

| | |
|---|---|
| Solves | [PS-006](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-006](../04-flowcharts/FC-006-reconnect-backoff.md) |
| Requirements | FR-010, FR-011 |
| Module | M-06 `src/connection/AutoReconnectManager.js`, `CircuitBreakerManager.js` |
| User trigger | Automatic |
| Status | Partial (exponential backoff and breaker exist; jitter missing) |

## Problem
After a drop, reconnect quickly at first, then slow down. Accounts must never
retry in lock-step. An account that keeps failing must stop consuming
resources until it is probed again.

## Input
- `base` = 2 s, `cap` = 60 s, breaker `failureThreshold` F = 5,
  `openTimeout` = 5 min, `maxAttempts` M = 20 per incident.

## Output
- A sequence of reconnect attempts that ends in `ONLINE`, a breaker `OPEN`
  (paused), or `GAVE_UP` after M attempts.

## Invariants
- I1. Every delay satisfies `base ≤ delay ≤ cap`.
- I2. While the breaker is `OPEN` there are 0 attempts. It leaves `OPEN` only
  through a single `HALF_OPEN` probe.
- I3. At most M attempts per incident.

## Algorithm
Decorrelated jitter (AWS Architecture Blog, "Exponential Backoff and
Jitter"):
```text
1. sleep ← base; n ← 0
2. while n < M:
3.   if breaker = OPEN: wait until openTimeout elapsed; breaker ← HALF_OPEN
4.   ok ← tryReconnect(); n ← n + 1
5.   if ok: breaker ← CLOSED; failures ← 0; return ONLINE
6.   failures ← failures + 1
7.   if breaker = HALF_OPEN or failures ≥ F: breaker ← OPEN; continue
8.   sleep ← min(cap, random_uniform(base, sleep × 3))
9.   wait sleep
10. return GAVE_UP   (state stays LINKED_OFFLINE; user sees 1.19 / P1)
```
Why this choice: plain exponential backoff synchronizes clients. "Full
jitter" spreads them out but can retry too fast. Decorrelated jitter keeps
the delays growing while still spreading them, and gives the lowest total
work in AWS's simulation.

## Complexity
O(1) per attempt. The expected total wait is bounded by M × cap = 20 min per
incident.

## Edge cases
1. A logout event during the loop: stop immediately (ALG-007 owns it).
2. The user runs `1.19` during a wait: cancel the wait and run ALG-003 (one
   mutex).
3. A process restart resets `n`. The breaker state is persisted, so a flapping
   account stays paused.

## Current implementation
`AutoReconnectManager` doubles the backoff up to 60 s without jitter.
`CircuitBreakerManager` implements CLOSED, OPEN and HALF_OPEN. Gaps: step 8
(jitter), the M cap, and persisting the breaker state.

## Verification
- Unit with seeded random numbers: every delay is in [base, cap]; 5 failures
  open the breaker; a HALF_OPEN failure reopens it.
- Simulation: 10 accounts that drop together do not retry in the same 1 s
  window more than twice.
