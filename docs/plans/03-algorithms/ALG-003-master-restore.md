# ALG-003 — Master readiness and restore-first recovery

| | |
|---|---|
| Solves | [PS-003](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-003](../04-flowcharts/FC-003-master-restore.md) |
| Requirements | FR-004, FR-005 |
| Module | M-04 `SessionRecoveryService`, M-07 `TerminalDashboardSetup`, M-06 `ConnectionManager` |
| User trigger | `1.20 master check`, `1.21 master ready`, `1.19 restore master`, `1.16 recover`, playbook `P1` |
| Status | Implemented; live acceptance pending ([E1](../01-rup/iterations/E1-master-session.md)) |

## Problem
Check the master before continuing work. Preserve an active connection; restore
the same saved login when offline; request phone approval only when necessary.
Device linking, local login availability and live connectivity are separate
facts. A temporary outage is not evidence that the device must be relinked.

## Input
- Configured master phone, enabled flag and resolved LocalAuth profile ID.
- Current client/manager, in-flight recovery ownership and persisted metadata.
- Saved login availability, explicit logout/authentication signals and pause state.
- Mode: check-only (`master check`) or check-and-restore (`master ready`).
- Live probe deadline: 10 seconds. Client readiness deadline: 5 minutes.

## Output
- A readiness decision and a next action from the scenario table below.
- These decision labels describe the algorithm; they are not a new runtime enum.
- Only a current live `CONNECTED` result permits the readiness command to say
  "ONLINE, ready to continue." Restore initialization also requires `ready`.

## Scenario decision table

Read top to bottom. A live result from the current client takes precedence over
stale persisted flags; disabled accounts are not activated.

| Scenario | Decision | Safest next action |
|---|---|---|
| No master configured | NOT_CONFIGURED | Choose `2.1 link-code` or `2.2 link-qr` |
| Master disabled | DISABLED | Enable it deliberately before recovery |
| Current client answers CONNECTED | ONLINE | Keep it; continue work; do not relink |
| Pairing, initialization or recovery already owns the account | IN_PROGRESS | Finish phone approval or wait; then `master check`; never launch a second browser |
| Local disconnect requested, no live client | PAUSED | Stay paused automatically; `master ready` explicitly resumes if the saved login is eligible |
| No live connection, saved login available, no fresh-auth requirement | LINKED_OFFLINE | `master ready`: restore the same profile without QR/code |
| Network/browser failure during restore | RESTORE_FAILED | Keep login; fix the reported cause and retry; automatic recovery follows ALG-006 when scheduled |
| WhatsApp requests authentication, rejects credentials, or confirms logout | NEEDS_AUTH / LOGGED_OUT | Explicit `link-code` or `link-qr`; approve on the phone |
| No saved login on this computer | NO_LOCAL_LOGIN | Explicit pairing on this computer; a phone-side device entry cannot recreate missing local credentials |

Phone-side "Linked devices" is useful operator evidence, not a continuously
queried API fact. Saved files or old `deviceLinked` metadata alone cannot prove
that WhatsApp still accepts the login. Do not automatically remove a phone-side
device or erase a profile to fix a network error.

## Invariants
- I1. Recovery never deletes saved credentials or silently changes profile ID.
- I2. At most one recovery operation owns a phone and one account owns a profile.
- I3. `authenticated`, saved files and timer ticks are not proof of readiness.
- I4. Restore never silently becomes registration; fresh QR/code needs an explicit
  linking command.
- I5. Pause, disable and shutdown are respected. Explicit recovery can resume a
  local pause; ordinary background retries cannot.
- I6. Browser RPC probes and readiness waits have deadlines. Browser destruction,
  factory work and persistence do not yet have a single end-to-end deadline;
  never promise a fixed total recovery duration.

## Algorithm
```text
1. Resolve configured master. If absent or disabled, explain and stop.
2. Probe current client for at most 10 s.
   If CONNECTED and still the same client, return ONLINE without replacing it.
   Log a probe error/timeout; do not infer logout.
3. If initialization/pairing/recovery owns the account, return IN_PROGRESS.
4. Resolve saved login and authentication flags for that profile.
   If missing or fresh authentication is required, show explicit code/QR choices.
5. If check-only, report offline and suggest master ready; do not mutate clients.
6. If check-and-restore, call the shared recovery coordinator:
   a. Join any existing operation for this phone; reject competing profile use.
   b. Respect disabled, shutdown and automatic-pause/authentication guards.
   c. Manual restore keeps a current client if its bounded live check succeeds.
      Scheduled stale-session recovery replaces the stale client directly.
   d. Close only the old account client, then create one on the SAME profile.
      If closure fails or initialization remains pending, refuse a duplicate.
   e. Wait for ready, auth challenge/failure, cancellation or the 5-minute deadline.
      Persist outcome; release operation/profile ownership on either result.
7. If recovery fails, report the real reason. Keep credentials.
   Network/browser failure -> retry restore after addressing the cause.
   Fresh authentication -> explicit linking; no automatic QR/code.
8. After successful restore, probe the restored client again.
   Only CONNECTED returns ONLINE; otherwise report not ready and next action.
9. While online, use ALG-006 to detect silent failures and recover automatically.
```
Startup attempts saved-session restoration through the existing startup manager;
the terminal then performs a check-only readiness check. `master ready` is an
explicit user action, not an endless foreground retry loop. `restore master`
and `recover <phone>` remain direct recovery commands. For `auth_required`,
direct recovery may explicitly retry the saved profile without displaying a
challenge, whereas `master ready` guides the operator to explicit linking.

Best normal path: **live check -> reuse if online -> restore same profile if
offline -> verify -> continue**. Relink is an escalation, not the default.

## Complexity
One foreground recovery attempt creates at most one replacement client.
Account/profile resolution scans configured accounts and active profiles;
bookkeeping is constant-time map access. Browser and network work dominate.
Background retries are separate bounded batches, not additional foreground rungs.

## Edge cases
1. Internet down: preserve credentials and show the actual connection error.
   Do not turn a timeout into NEEDS_AUTH.
2. Hung browser probe: time out after 10 s; close through the recovery coordinator,
   never start a second browser while the first initialization is pending.
3. Profile locked: report the owner/closure failure. Never delete locks based on
   age or kill unrelated browsers.
4. Account already connecting: wait and recheck; do not run repeated relinks.
5. Phone still shows a linked device but local login is missing: explain the
   mismatch and require explicit pairing on this machine.
6. Logout during recovery: stop automatic authentication attempts, preserve the
   profile and require phone approval.

## Current implementation
[TerminalDashboardSetup](../../../src/terminal/TerminalDashboardSetup.js) owns
the live readiness callback.
[SessionRecoveryService](../../../src/sessions/SessionRecoveryService.js) owns
per-phone/per-profile recovery coordination.
[ConnectionManager](../../../src/connection/ConnectionManager.js) owns readiness
deadlines, live monitoring and retry scheduling.

There is no separate "soft reconnect API" rung, no automatic two-attempt ladder,
and no guarantee that a successful saved-session restore needs new registration.
The earlier ladder description is superseded by this decision-based flow.

## Verification
- `TerminalSessionDashboard`: online reuse, offline check-only, restore plus live
  verification, missing profile, auth-required states and in-flight ownership.
- `TerminalNumberMenu`: startup check and `1.20` / `1.21` dispatch.
- `SessionRecoveryService`: hung old browser, shared ownership, same-profile
  restore, stale recovery, logout and pause behavior.
- `SavedSessionReconnect`: live probe timeouts, failed checks, cooldown and guards.
- Live acceptance remains pending; record actual outcomes in
  [E1](../01-rup/iterations/E1-master-session.md). No uptime guarantee follows
  from mocked tests.
