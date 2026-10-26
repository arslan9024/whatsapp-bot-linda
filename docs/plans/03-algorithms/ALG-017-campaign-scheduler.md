# ALG-017 — Campaign scheduler

| | |
|---|---|
| Solves | [PS-017](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-017](../04-flowcharts/FC-017-campaign-scheduler.md) |
| Requirements | FR-028, FR-029 |
| Module | M-08 `src/campaigns/CampaignScheduler.js`, `CampaignExecutor.js` |
| User trigger | `6.4 campaigns` |
| Status | Partial |

## Problem
Run scheduled sends in time order, respecting quiet hours (for example 21:00
to 09:00 Asia/Dubai) and the send budget (ALG-010). After downtime, handle
missed jobs by a stated policy, never by a burst.

## Input
- Jobs `j = (dueAt, campaignId, recipient, body, policy ∈ {SKIP, RUN_ONCE_SPREAD})`.
- Quiet window `Q`, and the ALG-010 budget.

## Output
- Each job ends `SENT`, `SKIPPED(missed)`, `DEFERRED` or `FAILED(reason)`.

## Invariants
- I1. A job never runs before `dueAt` or inside `Q`.
- I2. Jobs run in non-decreasing `effectiveDueAt` order.
- I3. Catch-up after downtime never exceeds the ALG-010 token rate (no
  bursts).

## Algorithm
```text
1. H ← min-heap by effectiveDueAt; persist jobs (ALG-005 pattern)
2. on start: for each job with dueAt < now:
     SKIP → mark skipped; RUN_ONCE_SPREAD → effectiveDueAt ← now + i × (1/r)
3. loop:
4.   j ← peek(H); if none → sleep until a job is added
5.   t ← shiftOutOfQuiet(j.effectiveDueAt, Q)      # move to the end of Q if inside
6.   sleep until t (a timer, woken early when a job is added)
7.   pop j; result ← ALG-010.send(j)
8.   DEFERRED(retryAt) → push j back with effectiveDueAt ← retryAt
9.   record the result; counter "campaign:<id>"
```

## Complexity
Push and pop are O(log J). There is one timer, never one timer per job.
Memory is O(J).

## Edge cases
1. A daylight-saving change does not apply in Asia/Dubai. The time zone is
   still read from config for other markets.
2. The account goes offline: jobs are DEFERRED and the scheduler sleeps until
   `ONLINE` (ALG-002 event).
3. Thousands of jobs at the same time: the token bucket spreads them out (I3).

## Current implementation
`CampaignScheduler`, `CampaignMessageDelayer` and `CampaignRateLimiter`
exist, and `isWithinWorkingHours` and `getNextAvailableSendTime` handle
working hours. Gaps: a single heap with one timer, the catch-up policy, and
persisting the queue.

## Verification
- Unit with a fake clock: jobs inside Q move to Q's end; order is preserved;
  `SKIP` versus `RUN_ONCE_SPREAD` after a simulated outage.
