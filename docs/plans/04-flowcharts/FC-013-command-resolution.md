# FC-013 — Command resolution

| | |
|---|---|
| Algorithm | [ALG-013](../03-algorithms/ALG-013-command-resolution.md) |
| Problem | [PS-013](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-013. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([input line]) --> A1["1 · trim"]
  A1 --> A2{"2 · pending question?"}
  A2 -- yes --> ANS([ANSWER and continue])
  A2 -- no --> A3{"3 · 0 or 00?"}
  A3 -- yes --> NAV([NAVIGATE parent / root])
  A3 -- no --> A4{"4 · pN or pN.M?"}
  A4 -- yes --> PB([playbook list / details / run step])
  A4 -- no --> A5{"5 · numeric code?"}
  A5 -- yes --> T{"leaf?"}
  T -- yes --> RUN([RUN or ASK args])
  T -- no --> NAV
  A5 -- no --> A6{"6 · fN / #N?"}
  A6 -- yes --> RUN
  A6 -- no --> A7{"7 · head in vocabulary?"}
  A7 -- yes --> RUN
  A7 -- no --> A8{"8 · Levenshtein ≤ 2 suggestions?"}
  A8 -- yes --> SUG([Did you mean ...])
  A8 -- no --> A9([9 · ERROR type menu or help])
```
