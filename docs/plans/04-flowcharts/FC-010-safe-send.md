# FC-010 — Safe send

| | |
|---|---|
| Algorithm | [ALG-010](../03-algorithms/ALG-010-safe-send.md) |
| Problem | [PS-010](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-010. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([8.1 send]) --> A1{"1 · valid E.164?"}
  A1 -- no --> R1([REJECTED invalid number])
  A1 -- yes --> A2{"2 · registered on WhatsApp?"}
  A2 -- no --> R2([REJECTED not on WhatsApp])
  A2 -- yes --> A3{"3 · idempotency key seen?"}
  A3 -- yes --> R3([REJECTED duplicate])
  A3 -- no --> A4["4 · refill token bucket"]
  A4 --> A5{"5 · token and daily budget?"}
  A5 -- no --> DF([DEFERRED retryAt])
  A5 -- yes --> A6["6 · take token, jitter 1.5–4 s"]
  A6 --> A7["7 · sendMessage, mark key, sentToday+1"]
  A7 --> A8["8 · AIMD adjust rate"]
  A8 --> A9([9 · SENT id])
```
