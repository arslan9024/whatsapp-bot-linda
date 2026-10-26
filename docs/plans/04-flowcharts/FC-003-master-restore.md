# FC-003 — Master restore ladder

| | |
|---|---|
| Algorithm | [ALG-003](../03-algorithms/ALG-003-master-restore.md) |
| Problem | [PS-003](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-003. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([1.19 restore master]) --> A0{"0 · already ONLINE?"}
  A0 -- yes --> OK([return ONLINE])
  A0 -- no --> A1{"1 · acquire mutex phone?"}
  A1 -- busy --> BUSY([restore already running])
  A1 -- ok --> A2["2 · R1 soft reconnect"]
  A2 --> C2{"ready?"}
  C2 -- yes --> A4["4 · ONLINE, persist, release"]
  C2 -- no --> A3["3 · R2 new client, SAME profile"]
  A3 --> C3{"ready?"}
  C3 -- yes --> A4
  C3 -- no --> A5["5 · fresh auth signalled → NEEDS_AUTH, keep profile"]
  A5 --> A6{"6 · R3 ask user: 1.9 relink master?"}
  A6 -- yes --> R3["relink on saved device"]
  A6 -- no / failed --> A7["7 · R4 2.1 link-code → ALG-004"]
  R3 --> A8
  A7 --> A8(["8 · release mutex, return state + next action"])
  A4 --> OK
```
