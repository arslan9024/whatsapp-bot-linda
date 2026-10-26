# FC-015 — Usage counters

| | |
|---|---|
| Algorithm | [ALG-015](../03-algorithms/ALG-015-usage-counters.md) |
| Problem | [PS-015](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-015. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([command run]) --> A1["1 · key = actionKey input"]
  A1 --> A2["2 · counts+1, session+1, dirty"]
  A2 --> A3{"3 · flush timer running?"}
  A3 -- no --> T["start 1 s timer"]
  A3 -- yes --> W([wait])
  T --> A4["4 · flush: tmp write + rename, dirty = false"]
  X([exit / SIGTERM]) --> A5["5 · synchronous flush"]
```
