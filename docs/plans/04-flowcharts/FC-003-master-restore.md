# FC-003 - Master readiness and restore-first recovery

| | |
|---|---|
| Algorithm | [ALG-003](../03-algorithms/ALG-003-master-restore.md) |
| Problem | [PS-003](../02-problems/PROBLEM_REGISTER.md) |

Step numbers match ALG-003. Linking evidence, local login and live connection
are separate facts. A failed live check is not proof of logout.

```mermaid
flowchart TD
  S(["master check / master ready"]) --> A1{"1. Master configured and enabled?"}
  A1 -- No --> STOP(["Explain configuration or disabled state"])
  A1 -- Yes --> A2{"2. Current client CONNECTED? Probe at most 10 s"}
  A2 -- Yes --> OK(["ONLINE: keep client, continue"])
  A2 -- "No / error / timeout" --> A3{"3. Initialization or recovery in progress?"}
  A3 -- Yes --> BUSY(["Wait or finish pairing; then master check"])
  A3 -- No --> A4{"4. Saved login eligible, no fresh-auth requirement?"}
  A4 -- No --> AUTH(["Choose link-code or link-qr; approve on phone"])
  A4 -- Yes --> A5{"5. Check-only?"}
  A5 -- Yes --> OFF(["OFFLINE: suggest master ready"])
  A5 -- No --> A6["6. Shared recovery: one phone and profile owner"]
  A6 --> GUARD{"Shutdown, disabled or conflicting operation?"}
  GUARD -- Yes --> BLOCK(["Explain; do not start duplicate browser"])
  GUARD -- No --> RESTORE["Close old client; start same saved profile; await ready"]
  RESTORE --> A7{"7. Recovery result?"}
  A7 -- "Fresh authentication" --> AUTH
  A7 -- "Network / browser / persistence failure" --> FAIL(["Keep profile; show error; fix cause and retry"])
  A7 -- Success --> A8{"8. Restored client live CONNECTED?"}
  A8 -- No --> FAIL
  A8 -- Yes --> OK
  OK --> A9["9. Live monitoring and saved-session recovery: ALG-006"]
```

The coordinator releases operation/profile ownership on success or failure.
Automatic cooldown retries do not force QR/code or resume an intentional pause.
