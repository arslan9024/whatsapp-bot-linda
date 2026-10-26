# FC-008 — Multi-account orchestration

| | |
|---|---|
| Algorithm | [ALG-008](../03-algorithms/ALG-008-multi-account-orchestration.md) |
| Problem | [PS-008](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-008. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([start all]) --> A1["1 · priority = master first, health desc, lastOnline desc"]
  A1 --> A2["2 · min-heap Q"]
  A2 --> A3["3 · semaphore K, live = 0"]
  A3 --> A4{"4 · Q empty?"}
  A4 -- yes --> A9(["9 · await all, summary online / deferred / failed"])
  A4 -- no --> A5["5 · a = pop Q"]
  A5 --> A6{"6 · live ≥ B?"}
  A6 -- yes --> D["defer a: LINKED_OFFLINE"]
  D --> A4
  A6 -- no --> A7["7 · acquire sem, live+1"]
  A7 --> A8["8 · launch async; release on finish; failed → live−1"]
  A8 --> A4
```
