# FC-007 — Logout detection

| | |
|---|---|
| Algorithm | [ALG-007](../03-algorithms/ALG-007-logout-detection.md) |
| Problem | [PS-007](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-007. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([disconnected reason r]) --> A1{"1 · r known?"}
  A1 -- yes --> T1["rows 1–3: LOGOUT/UNPAIRED → LOGGED_OUT · auth_failure → NEEDS_AUTH · CONFLICT → ask user"]
  A1 -- no --> A2["2 · probe getState, 10 s timeout"]
  A2 --> A3["3 · rows 4–6: timeout → NETWORK ALG-006 · unauthorized → NEEDS_AUTH · else UNKNOWN"]
  T1 --> A4
  A3 --> A4(["4 · emit ALG-002 event + counter + next action"])
```
