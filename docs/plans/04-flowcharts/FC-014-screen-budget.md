# FC-014 — Screen budget layout

| | |
|---|---|
| Algorithm | [ALG-014](../03-algorithms/ALG-014-screen-budget.md) |
| Problem | [PS-014](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-014. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([render, H × W]) --> A1["1 · fixed = HEADER + FEATURES + PROCESS_min + prompt"]
  A1 --> A2["2 · avail = H − fixed"]
  A2 --> A3{"3 · OUTPUT room with full INPUT?"}
  A3 -- no --> D1["compact INPUT"]
  D1 --> A4{"4 · still short?"}
  A4 -- yes --> D2["FEATURES 1 line"]
  D2 --> A5{"5 · still short?"}
  A5 -- yes --> D3["HEADER 1 line"]
  A3 -- yes --> A6
  A4 -- no --> A6
  A5 -- no --> A6
  D3 --> A6["6 · OUTPUT = remaining rows"]
  A6 --> A7["7 · truncate to W − 2, pad"]
  A7 --> A8(["8 · draw with absolute cursor"])
```
