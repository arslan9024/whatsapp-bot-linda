# FC-011 — Contact deduplication

| | |
|---|---|
| Algorithm | [ALG-011](../03-algorithms/ALG-011-contact-dedup.md) |
| Problem | [PS-011](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-011. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([8.7 dedupe / P9]) --> A1["1 · normalize phone, name, email"]
  A1 --> A2["2 · union-find n"]
  A2 --> A3["3 · exact phone pass"]
  A3 --> A4["4 · exact email pass"]
  A4 --> A5["5 · blocking key surname3 + phone4"]
  A5 --> A6{"6 · next pair in block?"}
  A6 -- none --> A10(["10 · clusters, merge fields, report"])
  A6 -- pair --> A7["7 · Jaro-Winkler + corroborate"]
  A7 --> A8{"8 · s ≥ θ_merge and corroborated?"}
  A8 -- yes --> U["union"]
  A8 -- no --> A9{"9 · s ≥ θ_review?"}
  A9 -- yes --> RV["review list"]
  A9 -- no --> A6
  U --> A6
  RV --> A6
```
