# FC-018 — Priority inbox

| | |
|---|---|
| Algorithm | [ALG-018](../03-algorithms/ALG-018-priority-inbox.md) |
| Problem | [PS-018](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-018. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([8.12 inbox]) --> A1{"1 · next unanswered chat?"}
  A1 -- none --> A5(["5 · sorted top-k with reasons"])
  A1 -- chat --> M{"muted / archived / mine last?"}
  M -- yes --> A1
  M -- no --> A2["2 · w = 1 − 2^(−wait/h)"]
  A2 --> A3["3 · score = 100 × weighted sum"]
  A3 --> A4["4 · push to size-k min-heap"]
  A4 --> A1
  EV([message event]) --> A6["6 · update one chat, re-heap"]
```
