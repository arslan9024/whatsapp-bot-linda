# ALG-012 — Health score

| | |
|---|---|
| Solves | [PS-012](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-012](../04-flowcharts/FC-012-health-score.md) |
| Requirements | FR-021 |
| Module | M-04 `src/accounts/HealthScorer.js` |
| User trigger | `1.14 health`, `1.18 health`, `6.1 status`, playbook `P10` |
| Status | Implemented (weighted score) · EWMA trend alert planned |

## Problem
Summarize account health as one number from 0 to 100 that a person can read
at a glance. It must be smooth enough not to flap and quick enough to warn
before a failure.

## Input
Per sample (every 60 s), signals normalized to [0, 1]:
- `u`: uptime ratio over 24 h;
- `e`: 1 − error rate;
- `l`: latency score `= clamp(1 − p95/5000 ms)`;
- `m`: message processing success rate;
- `q`: link quality (recent auth or pairing failures).

## Output
- `score ∈ [0,100]`, `rating` (A ≥ 90, B ≥ 75, C ≥ 50, D otherwise),
  `trend`, and alerts.

## Invariants
- I1. The weights sum to 1, so the score stays in [0, 100].
- I2. An alert fires only on a sustained fall (a slope over 10 samples), not
  on one bad sample.

## Algorithm
```text
1. raw ← 100 × (0.35u + 0.25e + 0.15l + 0.15m + 0.10q)
2. S ← α·raw + (1 − α)·S_prev, α = 0.3                    # EWMA smoothing
3. keep the last W = 10 S values in a ring buffer
4. slope ← least-squares slope of the ring                 # O(W)
5. if S < 50 or slope < −2 points/sample → alert(phone, S, slope, top weak signal)
6. rating ← band(S); show in the dashboard; record history (bounded 1440 samples)
```

## Complexity
O(W) per sample. Memory is O(W + history), both bounded.

## Edge cases
1. Fresh account with no history: S ← raw and no slope until W samples
   exist.
2. Missing signal: reassign its weight across the present signals (keeps I1).

## Current implementation
`HealthScorer` computes weighted sub-scores (uptime, QR quality, error rate,
response time, message processing) and has `predictHealthTrend`. Gaps: the
EWMA and slope alert defined above, and the weights documented in one place.

## Verification
- Unit: all signals 1 → 100; all 0 → 0; a step drop triggers an alert only
  after a sustained slope.
