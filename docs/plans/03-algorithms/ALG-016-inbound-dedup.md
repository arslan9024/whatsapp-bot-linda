# ALG-016 — Inbound message deduplication

| | |
|---|---|
| Solves | [PS-016](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-016](../04-flowcharts/FC-016-inbound-dedup.md) |
| Requirements | FR-027 |
| Module | M-02 `src/whatsapp/MessageDeduplicator.js` |
| User trigger | Automatic on every inbound message |
| Status | Implemented |

## Problem
After a reconnect or replay, the same message can be delivered again. It
must be handled at most once, using bounded memory.

## Input
- A message `m` with `id._serialized` (preferred) or (from, timestamp, body).
- TTL τ = 5 min; window W = 1000 entries.

## Output
- `true` if it is a duplicate (skip it), otherwise `false` (process it, then
  register it).

## Invariants
- I1. A message seen within τ is reported as a duplicate.
- I2. Memory is O(W). Expired entries are evicted at least every 2τ.

## Algorithm
```text
1. key ← m.id._serialized ?? sha1(from | timestamp | body)
2. e ← map.get(key)
3. if e and now − e.t < τ → e.count += 1; return DUPLICATE
4. map.set(key, { t: now, count: 1 })    # Map keeps insertion order
5. if map.size > W → delete the oldest (first) key                 # LRU-ish eviction
6. background: every 2τ remove entries older than τ
7. return NEW
```

## Complexity
O(1) per message. Memory is O(W).

## Edge cases
1. A burst larger than W inside τ: the oldest keys are evicted first, and a
   very old replay could then pass. This is acceptable because WhatsApp ids
   are also checked downstream.
2. Clock jump: the TTL uses a monotonic `performance.now()` (planned).

## Current implementation
`MessageDeduplicator` uses a Map with a TTL, a window and a cleanup interval
of max(2τ, 60 s). Gap: a monotonic clock.

## Verification
- Unit: the same id twice within τ is a duplicate; after τ it is new; size
  stays ≤ W.
