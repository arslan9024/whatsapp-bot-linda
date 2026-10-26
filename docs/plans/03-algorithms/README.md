# 03 · Algorithms

Each algorithm solves the problem with the same number in the
[problem register](../02-problems/PROBLEM_REGISTER.md). It is written before
the code and kept in sync with it. Each file states the input, output,
invariants, numbered steps, complexity, edge cases, current implementation
and verification. New files start from the
[template](../templates/ALGORITHM_TEMPLATE.md).

| ID | Algorithm | Core technique | Complexity |
|---|---|---|---|
| [ALG-001](ALG-001-single-instance-lease.md) | Single-instance lease | OS-owned loopback port as a mutex, port derived from a hash of the path | O(1) |
| [ALG-002](ALG-002-connection-state-machine.md) | Connection state machine | Finite-state machine with a total transition function | O(1) per event |
| [ALG-003](ALG-003-master-restore.md) | Master restore ladder | Escalation ladder with bounded attempts per rung | O(R) attempts |
| [ALG-004](ALG-004-pairing-code-refresh.md) | Pairing code with refresh | Lease timer with refresh before expiry, capped attempts | O(A) |
| [ALG-005](ALG-005-durable-session-store.md) | Durable session store | Write to a temp file, fsync, atomic rename; generation counter; checksum | O(S) per save |
| [ALG-006](ALG-006-reconnect-backoff.md) | Reconnect with jitter and a circuit breaker | Decorrelated-jitter exponential backoff with a 3-state breaker | O(1) per attempt |
| [ALG-007](ALG-007-logout-detection.md) | Logout and device-removal classifier | Decision table over (event, reason, credential probe) | O(1) |
| [ALG-008](ALG-008-multi-account-orchestration.md) | Multi-account orchestration | Priority queue plus a semaphore (K concurrent launches) | O(N log N) |
| [ALG-009](ALG-009-conversation-report.md) | Streaming conversation report | One-pass aggregation, min-heap top-k, per-chat cap | O(N + C log k) |
| [ALG-010](ALG-010-safe-send.md) | Safe send pipeline | E.164 normalization, token bucket, AIMD adaptation, idempotency key | O(1) per send |
| [ALG-011](ALG-011-contact-dedup.md) | Contact deduplication | Blocking, pairwise scoring, union–find | ≈ O(n α(n) + Σ b²) |
| [ALG-012](ALG-012-health-score.md) | Health score | Weighted sum of normalized signals, EWMA, slope alert | O(1) per sample |
| [ALG-013](ALG-013-command-resolution.md) | Numbered command resolution | Ordered resolver chain, code-tree lookup, bounded Levenshtein | O(L) / O(V·L) fallback |
| [ALG-014](ALG-014-screen-budget.md) | Terminal screen budget | Priority allocation with minimums and degrade steps | O(Z) |
| [ALG-015](ALG-015-usage-counters.md) | Usage counters | In-memory map, dirty flag, debounced atomic flush | O(1) per record |
| [ALG-016](ALG-016-inbound-dedup.md) | Inbound message deduplication | Hash plus an LRU map with TTL | O(1) per message |
| [ALG-017](ALG-017-campaign-scheduler.md) | Campaign scheduler | Min-heap timer queue with quiet-hour shifting and a catch-up policy | O(log J) per job |
| [ALG-018](ALG-018-priority-inbox.md) | Priority inbox | Scoring with exponential decay, top-k min-heap | O(C log k) |
| [ALG-019](ALG-019-full-text-search.md) | Full-text search | Incremental inverted index, posting-list intersection, BM25 | O(Σ postings) |
| [ALG-020](ALG-020-intent-routing.md) | Intent routing | Plugin classifiers, argmax with a confidence threshold | O(H·L) |

## How every algorithm is written

1. **Bounded.** Every loop, retry, queue and cache states its bound.
2. **Total.** Every input, including invalid ones, leads to a defined output.
   Nothing throws past the boundary that is not documented.
3. **Observable.** Each run reports its result to the OUTPUT panel or the
   PROCESS log and increments a counter.
4. **Testable.** The `Verification` section names the tests that pin the
   invariants.
