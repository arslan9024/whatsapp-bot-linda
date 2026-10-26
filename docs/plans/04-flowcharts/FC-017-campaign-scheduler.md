# FC-017 — Campaign scheduler

| | |
|---|---|
| Algorithm | [ALG-017](../03-algorithms/ALG-017-campaign-scheduler.md) |
| Problem | [PS-017](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-017. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([start]) --> A1["1 · load jobs into min-heap"]
  A1 --> A2{"2 · missed jobs? policy"}
  A2 -- SKIP --> SK["mark skipped"]
  A2 -- RUN_ONCE_SPREAD --> SP["spread at 1/r"]
  SK --> A3
  SP --> A3["3 · loop"]
  A3 --> A4{"4 · peek job?"}
  A4 -- none --> WT["sleep until job added"]
  WT --> A3
  A4 -- job --> A5["5 · shift out of quiet hours"]
  A5 --> A6["6 · single timer until t"]
  A6 --> A7["7 · pop, ALG-010 send"]
  A7 --> A8{"8 · DEFERRED?"}
  A8 -- yes --> RP["push back retryAt"]
  RP --> A3
  A8 -- no --> A9["9 · record result + counter"]
  A9 --> A3
```
