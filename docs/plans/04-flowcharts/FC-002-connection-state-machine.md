# FC-002 — Connection state machine

| | |
|---|---|
| Algorithm | [ALG-002](../03-algorithms/ALG-002-connection-state-machine.md) |
| Problem | [PS-002](../02-problems/PROBLEM_REGISTER.md) |

Node numbers match the step numbers in ALG-002. Rounded nodes are terminals; diamonds are decisions.

```mermaid
flowchart TD
  S([start]) --> A1{"1 · saved session?"}
  A1 -- yes --> RESTORING
  A1 -- no --> UNLINKED
  UNLINKED -- "2 · qr / code" --> PAIRING
  RESTORING -- "3 · authenticated" --> AUTHENTICATED
  PAIRING -- "3 · authenticated" --> AUTHENTICATED
  AUTHENTICATED -- "4 · ready" --> ONLINE
  ONLINE -- "5 · disconnected" --> D{"5 · reason?"}
  D -- "LOGOUT / UNPAIRED" --> LOGGED_OUT
  D -- "other + saved session" --> LINKED_OFFLINE
  D -- "other, no session" --> UNLINKED
  RESTORING -- "6 · auth_failure / needs fresh auth" --> NEEDS_AUTH
  NEEDS_AUTH -- "7 · user relink" --> PAIRING
  LOGGED_OUT -- "7 · user relink" --> PAIRING
  LINKED_OFFLINE -- "ALG-006 reconnect" --> RESTORING
  ONLINE -.-> P["8 · persist state ALG-005 + show next action"]
```
