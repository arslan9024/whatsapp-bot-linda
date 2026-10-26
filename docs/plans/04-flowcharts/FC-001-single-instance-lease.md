# FC-001 — Single-instance lease

| | |
|---|---|
| Algorithm | [ALG-001](../03-algorithms/ALG-001-single-instance-lease.md) |
| Problem | [PS-001](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-001. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([start]) --> A1["1 · id = resolve projectRoot, lowercase on Windows"]
  A1 --> A2["2 · h = SHA-256 id"]
  A2 --> A3["3 · port = 49152 + h mod 16384"]
  A3 --> A4{"4 · listen 127.0.0.1:port exclusive?"}
  A4 -- EADDRINUSE --> A5["5 · fail: another Linda owns this project"]
  A4 -- ok --> A6["6 · unref server"]
  A6 --> A7(["7 · return lease"])
  A5 --> E([exit, no browsers touched])
```
