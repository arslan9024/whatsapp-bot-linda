# ALG-010 — Safe send pipeline

| | |
|---|---|
| Solves | [PS-010](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-010](../04-flowcharts/FC-010-safe-send.md) |
| Requirements | FR-016, FR-017, FR-018 |
| Module | M-08 `src/campaigns/CampaignRateLimiter.js`, `src/shared/validateContactNumber.js` |
| User trigger | `8.2 validate`, `8.1 send`, playbook `P8` |
| Status | Partial (validation and a fixed daily cap exist) |

## Problem
Every outgoing message must go to a valid, registered number and stay within
a sending budget that WhatsApp tolerates. The same logical message must
never be sent twice.

## Input
- `to` (raw number), `body`, an `idempotencyKey` (default
  hash(to, body, minute)), and per-account budget parameters: bucket capacity
  `b` = 8, refill rate `r` = 1 token per 20 s, daily cap `D` = 45.

## Output
- `SENT(messageId)`, or `REJECTED(reason)`, or `DEFERRED(retryAt)`.

## Invariants
- I1. A token bucket allows at most b + r·t sends in any window of length t,
  and at most D per day.
- I2. A send is executed at most once per idempotencyKey (24 h window).
- I3. Nothing is sent to a number that fails E.164 validation or is not
  registered.

## Algorithm
```text
1. n ← normalizeE164(to, defaultCountry = AE)  else REJECTED("invalid number")
2. if not isRegisteredUser(n) → REJECTED("not on WhatsApp")      # cached 24 h
3. if seen(idempotencyKey) → REJECTED("duplicate")
4. refill: tokens ← min(b, tokens + r × (now − last)); last ← now
5. if tokens < 1 or sentToday ≥ D → DEFERRED(now + (1 − tokens)/r)
6. tokens ← tokens − 1; wait human-like jitter U(1.5 s, 4 s)
7. id ← client.sendMessage(n, body); mark idempotencyKey; sentToday += 1
8. AIMD: on failure or rate signal r ← r/2 (multiplicative decrease);
         after 50 clean sends r ← min(r_max, r + δ) (additive increase)
9. return SENT(id)
```

## Complexity
O(1) per send. Memory is O(keys within 24 h) for idempotency, held in a
bounded LRU.

## Edge cases
1. A local number such as `050…`: step 1 adds `+971`.
2. The bucket is empty during a campaign: messages are DEFERRED and the
   scheduler (ALG-017) picks them up.
3. The account is offline: REJECTED("account not online"), never queued
   silently.

## Current implementation
`CampaignRateLimiter` enforces a fixed limit of 45 per day and per-campaign
limits. `validateContactNumber` validates the format. Gaps: the token bucket,
AIMD, idempotency and the registered-user cache.

## Verification
- Unit with a fake clock: the bucket allows b sends in a burst, then 1 per
  20 s. A repeated key is rejected. A failure halves r.
