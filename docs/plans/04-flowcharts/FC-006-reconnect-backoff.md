# FC-006 — Reconnect backoff with circuit breaker

| | |
|---|---|
| Algorithm | [ALG-006](../03-algorithms/ALG-006-reconnect-backoff.md) |
| Problem | [PS-006](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-006. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([disconnected, LINKED_OFFLINE]) --> A1["1 · sleep = base, n = 0"]
  A1 --> A2{"2 · n < M?"}
  A2 -- no --> A10(["10 · GAVE_UP → 1.19 / P1"])
  A2 -- yes --> A3{"3 · breaker OPEN?"}
  A3 -- yes --> W["wait openTimeout → HALF_OPEN"]
  W --> A4
  A3 -- no --> A4["4 · tryReconnect, n+1"]
  A4 --> A5{"5 · ok?"}
  A5 -- yes --> OK(["CLOSED, return ONLINE"])
  A5 -- no --> A6["6 · failures+1"]
  A6 --> A7{"7 · HALF_OPEN or failures ≥ F?"}
  A7 -- yes --> O["breaker OPEN"]
  O --> A2
  A7 -- no --> A8["8 · sleep = min cap, U base, 3·sleep"]
  A8 --> A9["9 · wait sleep"]
  A9 --> A2
```
