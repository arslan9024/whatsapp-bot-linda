# FC-012 — Health score

| | |
|---|---|
| Algorithm | [ALG-012](../03-algorithms/ALG-012-health-score.md) |
| Problem | [PS-012](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-012. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([sample tick]) --> A1["1 · raw = weighted sub-scores"]
  A1 --> A2["2 · EWMA S, α = 0.3"]
  A2 --> A3["3 · ring buffer W = 10"]
  A3 --> A4["4 · least-squares slope"]
  A4 --> A5{"5 · S < 50 or slope < −2?"}
  A5 -- yes --> AL["alert with weakest signal"]
  A5 -- no --> A6
  AL --> A6(["6 · rating band, dashboard, history"])
```
