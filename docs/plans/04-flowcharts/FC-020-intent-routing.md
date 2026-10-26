# FC-020 — Intent routing

| | |
|---|---|
| Algorithm | [ALG-020](../03-algorithms/ALG-020-intent-routing.md) |
| Problem | [PS-020](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-020. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([inbound message]) --> A1{"1 · mine / status / duplicate?"}
  A1 -- yes --> IG([ignore])
  A1 -- no --> A2{"2 · command prefix?"}
  A2 -- yes --> CMD([command handler, p = 1])
  A2 -- no --> A3["3 · score all handlers, 2 s timeout, error → 0"]
  A3 --> A4["4 · best, second"]
  A4 --> A5{"5 · best < θ or margin < Δ?"}
  A5 -- yes --> UNK([unknown → priority inbox])
  A5 -- no --> A6["6 · best.handle + counter"]
  A6 --> A7(["7 · store outcome for evaluation"])
```
