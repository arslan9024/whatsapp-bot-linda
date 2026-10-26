# FC-009 — Conversation report

| | |
|---|---|
| Algorithm | [ALG-009](../03-algorithms/ALG-009-conversation-report.md) |
| Problem | [PS-009](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-009. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([ONLINE or 8.11 convos]) --> A1["1 · getChats, dedupe, filter ids"]
  A1 --> A2["2 · sort by timestamp desc"]
  A2 --> A3["3 · totals = 0, top-k heap"]
  A3 --> A4{"4 · next chat? concurrency P"}
  A4 -- none --> A9(["9 · report → OUTPUT summary, convos table"])
  A4 -- chat --> A5["5 · fetchMessages limit L"]
  A5 --> OK{"fetched?"}
  OK -- no --> A8["8 · count skipped"]
  OK -- yes --> A6["6 · in/out pass, capped flag"]
  A6 --> A7["7 · add totals, push heap"]
  A7 --> A4
  A8 --> A4
```
