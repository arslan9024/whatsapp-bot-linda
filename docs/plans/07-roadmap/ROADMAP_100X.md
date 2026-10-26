# 07 — Roadmap to 100× Linda

"100× better" is not one feature. It is the **product of several gains**,
each one measured:

```
100× ≈ 3× reliability · 3× speed-to-act · 3× coverage · 4× automation
     (uptime/recovery) (keys & seconds)  (features)    (work done for you)
```

Each level below must meet its **exit metrics** before the next level
starts (RUP milestone discipline, [RUP plan](../01-rup/RUP_PLAN.md)). A
level is a release; iterations (I1, E1, E2, C1–C4, T1) deliver it.

## Level ladder

| Level | Name | Theme | Problems | Iterations |
|---|---|---|---|---|
| L0 | Basic bot | Connect, send, receive | — | (history) |
| L1 | Reliable OS | Never lose the master; numbered terminal OS | PS-001…PS-005, PS-013…PS-015 | I1, E1, E2 |
| L2 | Assistant | Recover by itself; safe sending | PS-006…PS-008, PS-010, PS-012, PS-016, PS-017 | C1, C2 |
| L3 | Analyst | Know every conversation instantly | PS-009, PS-018, PS-019 | C3 |
| L4 | Operator | Understand and route every message | PS-011, PS-020 | C4 |
| L5 | Platform | Plugins, local API, multi-user, Linux | new PS-021+ | T1 + next cycle |
| L6 | Product | Installable, licensed, supported | new PS-0xx | next cycle |

## Exit metrics by level

| Metric | L0 (baseline) | L1 | L2 | L3 | L4 | L5–L6 |
|---|---|---|---|---|---|---|
| Master uptime while host is up | ~90 % | 97 % | 99.5 % (NFR-005) | 99.5 % | 99.7 % | 99.9 % |
| Mean time to recover, network drop | manual | < 10 min | < 2 min, no input | < 2 min | < 1 min | < 1 min |
| State lost on crash | sometimes | never (NFR-002) | never | never | never | never |
| Keys to reach any feature | words | ≤ 4 | ≤ 3 (NFR-004) | ≤ 3 | ≤ 3 | ≤ 3 |
| Report or search time | n/a | report < 60 s | report < 30 s | search < 1 s p95 | same | same |
| Numbered features | ~20 | 60+ | 80+ | 95+ | 110+ | plugin-extensible |
| Messages handled without the owner | 0 % | 0 % | 10 % (auto-reply) | 25 % | 50 % routed by intent | 70 % |
| Test suites / lint errors | few / many | 60+ / 0 | 80+ / 0 | 95+ / 0 | 110+ / 0 | 130+ / 0 + CI matrix |

## What each level adds

### L1 — Reliable OS (current, mostly done)
- Single-instance lease, a state model that separates linked from online,
  `1.19 restore master`, pairing-code refresh, durable session store.
- Five-zone terminal, append-only codes, playbooks P1–P10, `×n` counters.
- **Remaining:** typo suggestions (FR-024), session generation and checksum
  (ALG-005 gap), debounce max-wait (ALG-015 gap).

### L2 — Assistant
- Decorrelated-jitter reconnect plus circuit breaker (ALG-006); classified
  disconnects (ALG-007); bounded multi-account startup (ALG-008).
- Safe send with an AIMD token bucket and idempotency (ALG-010). The
  campaign heap honours quiet hours and has a catch-up policy (ALG-017).
- **Math showcase:** jitter distributions, AIMD convergence, heap
  scheduling, EWMA plus regression health trend.

### L3 — Analyst
- Priority inbox: exponential-decay urgency with top-k heap (ALG-018).
- Local full-text search: inverted index, galloping intersection, BM25
  (ALG-019).
- Incremental conversation statistics (ALG-009, streamed and capped).
- **Math showcase:** information retrieval ranking, saturating decay
  functions, O(k log n) selection.

### L4 — Operator
- Intent routing with confidence threshold and ambiguity margin (ALG-020).
- Contact entity resolution: blocking, Jaro-Winkler and union-find
  (ALG-011).
- Owner-approved reply templates per intent; every automated action
  audited and counted.
- **Math showcase:** classification under uncertainty, record linkage,
  disjoint sets with near-constant amortized time.

### L5 — Platform
- Plugin API for commands and intent handlers (`src/plugins`).
- Localhost REST and WebSocket API, with restricted operator roles and an
  audit log.
- Linux support and a CI matrix; property tests and benchmarks in CI.

### L6 — Product
- Installer, a first-run wizard driven by playbooks, update channel,
  licence, documentation site generated from `docs/plans`.

## How to grow, one step at a time
1. Pick the highest-exposure open risk ([RISK_LIST](../01-rup/RISK_LIST.md))
   or the next level's unmet metric.
2. Write or refine the PS row, then the ALG, FC, FR, and TRACEABILITY rows.
   `npm run plans:check` must pass.
3. Implement behind a menu code, write the test, run lint and Jest.
4. Update the status (`Planned`, then `Partial`, then `Implemented`, then
   `Live-verified`), CHANGELOG, and counters.
5. At the end of the level, measure the exit metrics and record the result
   in the RUP plan.
