# ALG-001 — Single-instance lease

| | |
|---|---|
| Solves | [PS-001](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-001](../04-flowcharts/FC-001-single-instance-lease.md) |
| Requirements | FR-001 |
| Module | M-01 `src/core/BotInstanceGuard.js` |
| User trigger | Automatic at start |
| Status | Implemented |

## Problem
Allow at most one Linda process per project folder to own the browsers and
sessions. The lock must free itself when the process dies, even after a
crash, and there must be no stale lock file to delete.

## Input
- `projectRoot`: absolute path of the project.

## Output
- A lease `{ port, release() }`, or an error naming the port and stating that
  nothing was changed.

## Invariants
- I1. Within one folder there is at most one live lease, because the
  operating system lets only one socket listen on a given `127.0.0.1:port`.
- I2. A lease exists only while its process is alive. The OS closes sockets
  on exit.
- I3. Nothing (browsers, sessions) is touched before the lease is held.

## Algorithm
```text
1. id   ← resolve(projectRoot); on Windows id ← lowercase(id)
2. h    ← SHA-256(id)
3. port ← 49152 + (uint16(h[0..1]) mod 16384)      # dynamic/private range
4. try listen(127.0.0.1, port, exclusive)
5.   on EADDRINUSE → fail("cannot reserve ownership on port …; no browsers were changed")
6. unref the server so it never keeps the process alive
7. return lease(port, release = close server)
```

## Complexity
O(|path|) for the hash and O(1) for the socket call. One file descriptor.

## Edge cases
1. Another unrelated program uses the same port: step 5 reports it. Two
   paths collide with probability ≈ 1/16384. Fix by moving the folder or by
   setting an override port (planned `LINDA_INSTANCE_PORT`).
2. A nodemon restart with the old process still exiting: step 5 fails, and
   nodemon waits for a file change. Planned: retry up to 3 times, 500 ms
   apart, before failing.
3. Different letter case in the path on Windows: step 1 normalizes it.

## Current implementation
Matches steps 1–7. Gaps: no retry for edge case 2 and no override port.

## Verification
- Unit: a second `acquireBotInstance` on the same root rejects, and
  `release()` lets it be acquired again.
- Live: start `npm run dev` twice and check that the second start prints the
  ownership error and leaves Chromium unchanged.
