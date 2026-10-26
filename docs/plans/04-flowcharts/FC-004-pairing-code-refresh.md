# FC-004 — Pairing code refresh

| | |
|---|---|
| Algorithm | [ALG-004](../03-algorithms/ALG-004-pairing-code-refresh.md) |
| Problem | [PS-004](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-004. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([2.1 link-code]) --> A1["1 · a = 0"]
  A1 --> A2{"2 · a < A?"}
  A2 -- no --> A9(["9 · GAVE_UP → hint 2.2 link-qr / P3"])
  A2 -- yes --> A3["3 · request code, a = a+1, t0 = now"]
  A3 --> A4["4 · show code + countdown in INPUT"]
  A4 --> A5{"5 · first event?"}
  A5 -- ready --> A6(["6 · ONLINE"])
  A5 -- "user qr" --> A7(["7 · switch to QR flow 2.2"])
  A5 -- "refresh / timer" --> A8["8 · new code"]
  A8 --> A2
```
