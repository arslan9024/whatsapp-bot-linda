# ALG-007 — Logout and device-removal classifier

| | |
|---|---|
| Solves | [PS-007](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-007](../04-flowcharts/FC-007-logout-detection.md) |
| Requirements | FR-012 |
| Module | M-05 `src/linking/DeviceRecoveryManager.js`, M-02 `ClientFlowSetup.js` |
| User trigger | `1.13 device`, `1.9 relink master`, playbook `P5` |
| Status | Partial |

## Problem
Classify a disconnect correctly. A network drop should lead to automatic
reconnect (ALG-006). A logout or device removal should lead to relink.
Rejected credentials should lead to `NEEDS_AUTH`. A wrong class wastes
minutes or loses the session.

## Input
- `event` (`disconnected` | `auth_failure` | `change_state`), `reason` string,
  and an optional probe result `probe ∈ {ok, unauthorized, timeout}` (one
  `getState()` with a 10 s timeout).

## Output
- `class ∈ {NETWORK, LOGGED_OUT, NEEDS_AUTH, CONFLICT, UNKNOWN}` and the
  matching ALG-002 event.

## Decision table
| # | event | reason / probe | class | action |
|---|---|---|---|---|
| 1 | disconnected | `LOGOUT`, `UNPAIRED`, `UNPAIRED_IDLE` | LOGGED_OUT | Keep the profile (archived); show `1.9` / P5 |
| 2 | auth_failure | any | NEEDS_AUTH | Keep the profile; show `1.9` |
| 3 | disconnected | `CONFLICT` (opened elsewhere) | CONFLICT | Do not auto-takeover; ask the user |
| 4 | disconnected | `NAVIGATION`, `TIMEOUT`, other; probe = timeout | NETWORK | ALG-006 |
| 5 | disconnected | other; probe = unauthorized | NEEDS_AUTH | as row 2 |
| 6 | anything else | — | UNKNOWN | ALG-006 with M = 3, then ask |

## Invariants
- I1. Rows are checked in order and the first match wins, so exactly one
  class is chosen.
- I2. No class deletes credentials automatically. Deletion happens only
  through an explicit user command.

## Algorithm
```text
1. if reason known → apply rows 1–3
2. else probe ← getState() with 10 s timeout
3. apply rows 4–6
4. emit ALG-002 event; record a counter "disconnect:<class>"; show next action
```

## Complexity
O(1). One probe with a timeout of at most 10 s.

## Edge cases
1. The reason string is renamed by a library update: probe-based rows 4 and
   5 still classify it.
2. Logout and network drop together: the reason wins (rows 1–3 before 4–5).

## Current implementation
`ClientFlowSetup` maps auth failures to `auth_required`.
`DeviceRecoveryManager` handles relink. The gap is that there is no single
ordered table and no CONFLICT row.

## Verification
- Unit: a table-driven test, one case per row plus the reason-renamed case.
