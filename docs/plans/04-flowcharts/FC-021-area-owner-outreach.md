# FC-021 — Area owner outreach

| | |
|---|---|
| Algorithm | [ALG-021](../03-algorithms/ALG-021-area-owner-outreach.md) |
| Problem | [PS-021](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-021. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S(["outreach &lt;project&gt;"]) --> A1["1 · read sheet tabs, project aliases"]
  A1 --> A2["2 · records: normalise phones, reject landline/invalid"]
  A2 --> A3["3 · union-find → owners, rank numbers"]
  A3 --> A4{"4 · owner in project? flagged?"}
  A4 -- flagged --> SK1["skipped: do-not-contact"]
  A4 -- ok --> A5{"5 · number in ledger or chat list?"}
  A5 -- yes --> EX["existing conversation"]
  A5 -- no --> A6["6 · sort new owners"]
  A6 --> A7["7 · available = min(D − today, M − month)"]
  A7 --> A8{"8 · slot left?"}
  A8 -- yes --> V{"getNumberId finds a number?"}
  V -- yes --> TD["today: send to that number"]
  V -- no --> SK2["skipped: not on WhatsApp"]
  A8 -- no --> A9["9 · schedule tomorrow / later by D and M"]
  TD --> A10["10 · summary, CSV, draft campaign, Sheet1 status"]
  A9 --> A10
  EX --> A10
  SK1 --> A10
  SK2 --> A10
  A10 --> A11{"11 · at send: chat exists or reserve()?"}
  A11 -- allowed --> SEND(["send"])
  A11 -- limit --> DEF(["DEFERRED until next day / month"])
```
