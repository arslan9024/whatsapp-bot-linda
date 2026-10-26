# ALG-006 - Live monitoring and reconnect batches with cooldown

| | |
|---|---|
| Solves | [PS-006](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-006](../04-flowcharts/FC-006-reconnect-backoff.md) |
| Requirements | FR-010, FR-011 |
| Module | M-06 `src/connection/ConnectionManager.js`, shared `SessionRecoveryService` |
| User trigger | Automatic after ready/drop; `1.20 master check`, `1.21 master ready` for manual inspection/recovery |
| Status | Partial (runtime retry batches implemented; named breaker states and durable breaker history remain future work) |

## Problem

Recover a temporary network/browser outage without deleting authentication,
creating duplicate browsers or stopping forever after a short retry budget.
Detect silent failures with real requests, not artificial activity timestamps.
An explicit logout is not a temporary outage.

## Input

- Live `getState()` result; current manager/client identity and lifecycle events.
- Health-check interval 30 s; probe deadline 10 s; stale threshold 3 failures.
- Retry base 5 s; exponential cap 60 s; additive random jitter in [0, 1 s).
- Retry batch limit 10 scheduled attempts.
- Progressive cooldowns: 1 min, 5 min, 15 min, then 30 min for later trips.
- Shutdown, paused/disabled state, authentication requirement and recovery ownership.

## Output

- ONLINE after successful ready lifecycle; or retry scheduled, recovery in
  progress, cooldown, or an explicit stopped/authentication-required condition.
- A retry batch ends; recovery across batches can continue while the process
  runs and the account remains eligible. There is no permanent GAVE_UP solely
  because ten transient reconnects failed.

## Invariants

- I1. A timer tick alone never counts as proof that WhatsApp is connected.
- I2. At most one live probe and one reconnect timer per manager; shared recovery
  prevents competing phone/profile browser ownership.
- I3. Retry delay is `min(5 s * 2^(attempt-1), 60 s) + U[0, 1 s)`.
  The 60-second cap applies before jitter, so total delay can approach 61 s.
- I4. No reconnect during cooldown; when eligible, reset the batch budget and
  schedule a new attempt after the cooldown.
- I5. Logout/authentication-required and intentional pause/shutdown must not
  silently resume or display QR/code.
- I6. Network/timeout failure does not erase credentials or prove logout.

## Algorithm

```text
1. After ready, start live monitoring. Skip overlapping probes.
2. Every health interval, probe getState with a 10-second deadline.
   Ignore a result if the client changed, manager stopped, or state changed.
   CONNECTED -> reset consecutive failures and record verified activity.
   Error/timeout/non-CONNECTED -> log and increment consecutive failures.
3. On three failures, mark offline, stop health/keep-alive timers and schedule
   saved-session recovery. A disconnected event can schedule it immediately.
4. Before scheduling: stop if destroyed, intentionally suspended, already online
   or authentication-required. If reconnect is in flight, request a follow-up
   rather than opening another browser.
5. Increment batch attempt count.
   If count exceeds 10, enter progressive cooldown; schedule no browser launch.
   Otherwise schedule one attempt after capped exponential delay plus jitter.
6. When the timer fires, recheck guards and call the shared coordinator using
   source=automatic and the same connection manager/profile.
   It also checks disabled/paused/authentication metadata and profile ownership.
7. Success requires ready; the lifecycle resets reconnect attempts and restarts
   live monitoring. Failure keeps the profile, logs the real cause and schedules
   another eligible attempt. Fresh authentication stops automatic reconnect.
8. At cooldown expiry, clear its timer. Recheck shutdown/authentication/state.
   If still eligible, reset errors and batch attempts, set DISCONNECTED and
   return to step 4. Later cooldowns rise to a maximum of 30 minutes.
9. Manual inspection uses master check. Explicit master ready uses ALG-003.
   Local disconnect cancels timers and retains the login; it does not log out.
```

The existing critical-error circuit breaker may also enter cooldown before a
batch is exhausted. Its purpose is resource protection, not authentication.

## Complexity

O(1) scheduling state per account; account/profile scans occur in the recovery
coordinator. Ten scheduled attempts per batch, followed by cooldown. Individual
probes and initialization waits are bounded, but there is no finite total
duration for all batches or a hard deadline on all browser/persistence work.

## Edge cases

1. Internet outage lasts hours: repeated batches with cooldown, never repeated
   registration. The machine and process must remain running.
2. Silent browser failure: after three failed probes, replace the stale browser
   even if a later cached `getState()` misleadingly says CONNECTED.
3. Logout while a timer waits: the timer cannot authenticate automatically.
4. User disconnects during cooldown: cancel its timer and preserve paused state.
5. Manual recovery overlaps a scheduled attempt: coordinator ownership prevents
   duplicate clients; current-operation or closure errors are visible.
6. Restart: enabled saved accounts follow startup restoration. Cooldown/trip
   history is currently in memory, not a durable cross-restart guarantee.

## Current implementation

[ConnectionManager](../../../src/connection/ConnectionManager.js) is the active
per-client retry path; it calls
[SessionRecoveryService](../../../src/sessions/SessionRecoveryService.js).
It uses exponential backoff with additive jitter, not decorrelated jitter.
The runtime represents cooldown as SUSPENDED plus an owned reset timer rather
than a unified CLOSED/OPEN/HALF_OPEN enum.

Still planned: durable breaker history and a single named breaker-state model.
Those gaps keep PS-006 Partial; do not describe them as implemented or promise
100% uptime. Phone approval can still be required after credential revocation.

## Verification

- `SavedSessionReconnect`: successful/failed/timed-out probes, non-overlap,
  stale-client rejection, three-failure recovery, cooldown resumption and guards.
- `SessionRecoveryService`: real manager/lifecycle integration with fake
  transport, same-profile replacement, paused/logout guards and hung old client.
- Live: interrupt the actual connection, restore it and observe same-profile
  readiness without QR/code. Record evidence in
  [E1](../01-rup/iterations/E1-master-session.md); this remains pending.
