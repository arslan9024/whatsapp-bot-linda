# ALG-008 — Multi-account orchestration

| | |
|---|---|
| Solves | [PS-008](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-008](../04-flowcharts/FC-008-multi-account-orchestration.md) |
| Requirements | FR-013, NFR-003 |
| Module | M-04 `src/accounts/AccountBootstrapManager.js` |
| User trigger | Automatic on start · `1.10 relink servant`, `1.4 servants`, playbook `P6` |
| Status | Partial |

## Problem
Start N accounts (one master and the servants) without launching N Chromium
processes at once. The master comes first, and the total memory stays within
budget.

## Input
- Accounts `a₁…a_N` with `role ∈ {master, servant}`, `lastOnlineAt`,
  `healthScore`.
- `K` = maximum concurrent launches (default 2), `B` = maximum live browsers
  (from free memory ÷ about 300 MB per Chromium).

## Output
- Each account ends `ONLINE`, `LINKED_OFFLINE` (deferred) or failed with a
  reason.

## Invariants
- I1. At most K launches run at any time (semaphore).
- I2. At most B browsers are alive. Accounts beyond B are deferred, not
  dropped.
- I3. The master is launched before any servant.

## Algorithm
```text
1. priority(a) = (role = master ? 0 : 1, −healthScore(a), −lastOnlineAt(a))
2. Q ← min-heap of accounts by priority             # O(N log N)
3. sem ← semaphore(K); live ← 0
4. while Q not empty:
5.   a ← pop(Q)
6.   if live ≥ B: mark a deferred (LINKED_OFFLINE); continue
7.   acquire sem; live ← live + 1
8.   launch a asynchronously → on finish: release sem; if failed: live ← live − 1
9. await all launches; print the summary (online / deferred / failed)
```

## Complexity
O(N log N) to order the accounts. The wall time is about ⌈min(N,B) / K⌉ ×
the launch time. Memory is O(min(N,B)) browsers.

## Edge cases
1. The master fails to launch: servants still start, and the master goes to
   ALG-003.
2. Memory drops at runtime: B is recomputed and the lowest-priority servant
   is suspended first.

## Current implementation
`AccountBootstrapManager` starts accounts in sequence (K = 1), which is safe
but slow. Gaps: K > 1 with a semaphore, the B budget, and health-based
ordering.

## Verification
- Unit: with fake launchers, the maximum concurrency observed is K, the
  master is launched first, and accounts beyond B are marked deferred.
