# ALG-020 — Intent routing

| | |
|---|---|
| Solves | [PS-020](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-020](../04-flowcharts/FC-020-intent-routing.md) |
| Requirements | FR-032, FR-033 |
| Module | M-09 `src/intelligence` (IntentClassifier and handlers), M-02 `MessageRouter.js` |
| User trigger | `8.5 intent <text>` (test), automatic on inbound messages |
| Status | Partial |

## Problem
Give every inbound message exactly one intent (for example
`property.viewing`, `rent.inquiry`, `payment`, `greeting`, `unknown`) with a
confidence score. Never act on a guess below the threshold. Let new intents
be added as plugins without editing the router.

## Input
- A message `m`; registered handlers `H₁…H_n`, each with `match(m) → p ∈
  [0,1]` and `handle(m)`; a threshold `θ` = 0.6; an ambiguity margin
  `Δ` = 0.1.

## Output
- `(intent, p)` and the result of the handler that was run, or `unknown`
  queued for the human (priority inbox, ALG-018).

## Invariants
- I1. At most one handler acts per message.
- I2. If `p_best < θ`, or `p_best − p_second < Δ` (ambiguous), the message is
  routed to `unknown`. Linda does not guess.
- I3. A slow or crashing handler cannot block the others: each has a
  timeout of 2 s and its own try/catch.

## Algorithm
```text
1. if from me, a status update, or a duplicate (ALG-016) → ignore
2. fast path: exact command prefix (e.g. "!") → command handler, p = 1
3. scores ← for each Hᵢ: pᵢ ← Hᵢ.match(m) with timeout 2 s (catch → 0)
4. best, second ← top 2 of scores
5. if best.p < θ or best.p − second.p < Δ → intent ← unknown; push to inbox; stop
6. result ← best.handle(m) with timeout; record counter "intent:<name>"
7. learn: store (features(m), intent, outcome) for offline evaluation (no auto-retrain in L2)
```

## Complexity
O(n · L) for n handlers on a message of length L. Each handler is
O(keywords) or one model call. Memory is O(n).

## Edge cases
1. Two handlers both at 0.9: ambiguous, so it goes to the human (I2).
2. A handler throws: it scores 0 and the error is logged with its name.

## Current implementation
`IntentClassifier`, `MessageRouter` and the `8.5 intent` test command exist.
Gaps: the ambiguity margin Δ, per-handler timeouts, the plugin registration
contract, and routing `unknown` into the priority inbox.

## Verification
- Unit: below θ gives unknown; an ambiguous pair gives unknown; a throwing
  handler is isolated; the command prefix fast path works.
