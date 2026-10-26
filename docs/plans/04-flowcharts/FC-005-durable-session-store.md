# FC-005 — Durable session store

| | |
|---|---|
| Algorithm | [ALG-005](../03-algorithms/ALG-005-durable-session-store.md) |
| Problem | [PS-005](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-005. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  subgraph SAVE
    S1["1 · generation+1, savedAt"] --> S2["2 · body + sha256 checksum"]
    S2 --> S3["3 · write F.tmp + fsync"]
    S3 --> S4["4 · rename F.tmp → F"]
    S4 --> S5["5 · fsync dir"]
    S5 --> S6["6 · rotate F.bak"]
  end
  subgraph LOAD
    L1{"1 · F valid? parse + checksum"} -- yes --> LR([return F])
    L1 -- no --> L2{"2 · F.bak valid?"}
    L2 -- yes --> LB([return F.bak])
    L2 -- no --> L3(["3 · default state + warning"])
  end
  subgraph RESTORE
    R1["1 · accounts with wasOnline"] --> R2["2 · masters first ALG-008, rungs R1–R2 ALG-003"]
    R2 --> R3(["3 · summary restored k / n + next actions"])
  end
```
