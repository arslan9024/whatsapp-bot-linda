# ALG-015 — Usage counters

| | |
|---|---|
| Solves | [PS-015](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-015](../04-flowcharts/FC-015-usage-counters.md) |
| Requirements | FR-026 |
| Module | M-07 `src/terminal/FeatureCatalog.js` |
| User trigger | Every action and playbook run; shown as `×n` on the dashboard |
| Status | Implemented |

## Problem
Count every use of every feature, menu code and playbook. Show the counts
live. Persist them so that a crash loses at most about 1 s of counts and
never corrupts the file.

## Input
- `record(input)` calls; counter file `C`.

## Output
- `counts[key]` (lifetime) and `sessionCounts[key]` (since start); the file
  `C`.

## Invariants
- I1. One user action increments exactly one key. The key is the first word,
  or the two-word head for the commands in `MULTI_WORD`, or `p<n>` for a
  playbook.
- I2. The file is replaced atomically (ALG-005 pattern), so it is never half
  written.
- I3. Writes are debounced: at most one write per second.

## Algorithm
```text
1. key ← actionKey(input)
2. counts[key] += 1; sessionCounts[key] += 1; dirty ← true          # O(1)
3. if no flush timer: start timer(1 s) → flush()
4. flush(): if dirty: write tmp, rename → C; dirty ← false
5. on exit or SIGTERM: flush() synchronously
```

## Complexity
O(1) per record and O(K) per flush for K keys, at most once per second.

## Edge cases
1. A crash between two flushes loses ≤ 1 s of increments (an accepted bound).
2. Unknown commands are not counted, so typos never create keys.
3. A renamed command: a migration map from old key to new key runs in
   `load()`.

## Current implementation
Matches steps 1–5. `restore master` and `p<n>` have their own keys. The gap
is that the debounce is trailing: each record restarts the 1 s timer, so
steady input can delay a flush past 1 s. Planned: add a max-wait of 5 s,
after which a flush is forced.

## Verification
- `FeatureCatalog.test.js`: keys, multi-word heads and persistence.
