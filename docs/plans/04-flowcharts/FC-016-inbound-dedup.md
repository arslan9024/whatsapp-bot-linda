# FC-016 — Inbound deduplication

| | |
|---|---|
| Algorithm | [ALG-016](../03-algorithms/ALG-016-inbound-dedup.md) |
| Problem | [PS-016](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-016. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([inbound message]) --> A1["1 · key = serialized id or sha1"]
  A1 --> A2["2 · e = map.get key"]
  A2 --> A3{"3 · e and age < τ?"}
  A3 -- yes --> DUP([count+1, DUPLICATE])
  A3 -- no --> A4["4 · map.set key"]
  A4 --> A5{"5 · size > W?"}
  A5 -- yes --> EV["evict oldest"]
  A5 -- no --> A7
  EV --> A7([7 · NEW])
  BG([every 2τ]) --> A6["6 · remove expired"]
```
