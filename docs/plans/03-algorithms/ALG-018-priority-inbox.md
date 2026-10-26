# ALG-018 — Priority inbox

| | |
|---|---|
| Solves | [PS-018](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-018](../04-flowcharts/FC-018-priority-inbox.md) |
| Requirements | FR-030 |
| Module | M-09 `src/intelligence` (new `PriorityInbox.js`), M-07 OUTPUT panel |
| User trigger | Planned menu code `8.12 inbox` |
| Status | Planned |

## Problem
Out of thousands of chats, show the k that most need a reply now, with a
reason for each one.

## Input
- For each chat i: `waitingSince` (time of the last incoming message not yet
  answered), `unread`, `contactValue v ∈ [0,1]` (owner/buyer tags, deal
  stage), `urgency u ∈ [0,1]` (ALG-020 intent, for example "viewing today"),
  and `muted`.
- k (default 10); half-life h = 6 h.

## Output
- The top-k chats ordered by score, each with its reason
  (`waiting 3h · buyer · urgent`).

## Invariants
- I1. Muted chats, chats whose last message is mine, and archived chats get
  score 0 and are never in the list.
- I2. The score is monotonic: more waiting, more value or more urgency never
  lowers it.

## Algorithm
```text
1. for each chat i with an unanswered incoming message:
2.   w ← 1 − 2^(−waitHours/h)        # saturating wait in [0,1)
3.   score ← 100 × (0.40w + 0.25v + 0.25u + 0.10·min(1, unread/5))
4.   push (score, i) into min-heap H of size k; pop the minimum if |H| > k
5. return H sorted descending with reasons (largest factors first)
6. incremental: on each message event update only that chat and re-heap it
```

## Complexity
A full pass is O(C log k). An incremental update is O(log C), using an
indexed heap. Memory is O(C) for the per-chat stats.

## Edge cases
1. A group chat: only counts if I am mentioned or it is a reply to me.
2. An auto-reply was sent but no human reply: it still counts as waiting.

## Current implementation
None yet. The data source is the ALG-009 report entries plus ALG-020 intents.

## Verification
- Unit: ordering on fixed fixtures; monotonicity property test (I2); muted
  chats excluded (I1).
