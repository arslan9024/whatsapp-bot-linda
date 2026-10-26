# ALG-005 — Durable session store

| | |
|---|---|
| Solves | [PS-005](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-005](../04-flowcharts/FC-005-durable-session-store.md) |
| Requirements | FR-008, FR-009, NFR-002 |
| Module | M-03 `src/sessions/SessionStateManager.js`, `AutoSessionRestoreManager.js` |
| User trigger | `1.7 restore-sessions`, playbook `P4`, automatic on start |
| Status | Implemented (atomic write) · generation and checksum planned |

## Problem
Session metadata (which accounts exist, which were online, when they were
last saved) must survive any crash. A reader must never see a half-written
file. On restart, every account that was online is restored.

## Input
- `state` object; file path `F`.

## Output
- On save: `F` holds exactly `state` (with `generation + 1`).
- On load: the newest complete state, or the default state together with a
  warning.

## Invariants
- I1. **Atomicity.** `F` is always either the old version or the new one,
  never a mix (POSIX/NTFS rename within one directory replaces the file in
  one step).
- I2. **Durability.** After `save()` returns, the data has been fsynced.
- I3. **Monotonic.** `generation` strictly increases, so a backup or a racing
  writer with a lower generation can be detected.
- I4. **Integrity.** `checksum = SHA-256(body)`. A file whose checksum does
  not match is rejected.

## Algorithm
```text
SAVE(state):
1. state.generation ← state.generation + 1; state.savedAt ← now
2. body ← JSON(state); doc ← { body, checksum: sha256(body) }
3. write doc → F.tmp ; fsync(F.tmp)
4. rename(F.tmp → F)            # atomic replace
5. fsync(dir(F)) where supported
6. keep F.bak = previous version (rotate 1)

LOAD():
1. for candidate in [F, F.bak]:
2.   if exists and parse ok and checksum ok → return candidate.state
3. return defaultState() with warning "no valid saved state"

RESTORE ON START:
1. accounts ← LOAD().accounts where wasOnline = true
2. order masters first (ALG-008), then restore each via ALG-003 rungs R1–R2
3. print the summary: restored k / n, failed list with the next action
```

## Complexity
Save and load are O(S), where S is the state size in bytes. Restoring n
accounts follows ALG-008.

## Edge cases
1. Crash between steps 3 and 4: `F` is untouched, and `F.tmp` is ignored or
   cleaned on the next start.
2. Disk full during step 3: fail before the rename, so `F` keeps the old
   version (I1).
3. Corrupted `F`: LOAD falls back to `F.bak`.
4. "Last active today" with no save: the heartbeat calls SAVE at most once
   every 60 s (debounced), so the stored `savedAt` is ≤ 60 s stale.

## Current implementation
`SessionStateManager.saveState` already writes to a temp file, fsyncs and
renames. Gaps: there is no `generation`, `checksum` or `.bak` fallback.

## Verification
- Unit: simulate a crash after step 3 and check that LOAD returns the old
  state. A corrupted main file makes LOAD return `.bak`.
- Live: kill the process during activity, restart, then check that the
  accounts that were online are restored (`1.7`).
