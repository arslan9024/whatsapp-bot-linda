# FC-006 - Live monitoring, retry batches and cooldown

| | |
|---|---|
| Algorithm | [ALG-006](../03-algorithms/ALG-006-reconnect-backoff.md) |
| Problem | [PS-006](../02-problems/PROBLEM_REGISTER.md) |

```mermaid
flowchart TD
  S(["1. Ready: monitor current client"]) --> A2{"2. Bounded live probe CONNECTED?"}
  A2 -- Yes --> RESET["Reset probe failures; record verified activity"]
  RESET --> WAIT["Wait for next health interval"]
  WAIT --> A2
  A2 -- "No / error / timeout" --> A3{"3. Three consecutive failures?"}
  A3 -- No --> WAIT
  A3 -- Yes --> OFF["Mark offline; stop health timers"]
  DROP(["Disconnected event"]) --> A4
  OFF --> A4{"4. Eligible to reconnect?"}
  A4 -- "Stopped / auth required / suspended" --> STOP(["No automatic launch"])
  A4 -- "Already online" --> S
  A4 -- "Already reconnecting" --> JOIN(["Request follow-up; no duplicate browser"])
  A4 -- Yes --> A5{"5. Increment count: exceeds 10?"}
  A5 -- No --> DELAY["Wait min exponential delay, 60 s, plus jitter"]
  DELAY --> A6["6. Recheck guards; shared same-profile recovery"]
  A6 --> A7{"7. Ready?"}
  A7 -- Yes --> OK["Reset attempts; restart monitoring"]
  OK --> S
  A7 -- "Transient failure" --> ERROR["Log cause; keep credentials"]
  ERROR --> A4
  A7 -- "Authentication required" --> AUTH(["Stop; offer explicit code or QR"])
  A5 -- Yes --> COOL["Cooldown: 1, 5, 15, then 30 minutes"]
  COOL --> A8{"8. Cooldown expired and still eligible?"}
  A8 -- No --> STOP
  A8 -- Yes --> NEW["Reset batch; set DISCONNECTED"]
  NEW --> A4
  MANUAL(["9. master ready"]) --> ALG3["ALG-003: check first, restore if eligible"]
```

Cooldown is not permanent failure. An explicit local disconnect cancels owned
timers; logout never enters an automatic QR/code loop.
