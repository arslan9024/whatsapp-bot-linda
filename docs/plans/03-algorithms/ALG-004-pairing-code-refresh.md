# ALG-004 — Pairing code with refresh

| | |
|---|---|
| Solves | [PS-004](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-004](../04-flowcharts/FC-004-pairing-code-refresh.md) |
| Requirements | FR-006, FR-007 |
| Module | M-05 `src/linking`, M-07 terminal pairing panel |
| User trigger | `2.1 link-code`, `1.12 code`, `2.2 link-qr`, playbooks `P2`, `P3` |
| Status | Implemented |

## Problem
Show a valid pairing code for the whole time the user may type it. Replace
it before it expires or when the user asks. Stop after a bounded number of
codes and offer QR instead.

## Input
- `phone`, code lifetime `T` (WhatsApp ≈ 160 s; configure a safe value
  `T_safe = T − margin`), maximum codes `A` (default 5), user commands
  `refresh` and `qr`.

## Output
- `ONLINE` (linked), or `GAVE_UP` with the hint "try 2.2 link-qr".

## Invariants
- I1. The code on screen is never older than `T_safe`.
- I2. At most `A` codes are requested per linking session (protects against
  rate limits).
- I3. Only one pairing session per phone at a time.

## Algorithm
```text
1. a ← 0
2. loop while a < A:
3.   code ← requestPairingCode(phone); a ← a + 1; t0 ← now
4.   show code in the INPUT panel with a countdown (T_safe − (now − t0))
5.   wait for the first of: ready | user "refresh" | user "qr" | timer(T_safe)
6.     ready          → return ONLINE
7.     user "qr"      → switch to the QR flow (2.2 link-qr), return its result
8.     refresh | timer → continue loop (new code)
9. return GAVE_UP with hint "2.2 link-qr" / playbook P3
```

## Complexity
At most `A` requests. Wall time ≤ A × T_safe (≈ 12 min at the defaults).

## Edge cases
1. The user types the code just as it is replaced: WhatsApp rejects it, and
   the new code is already on screen.
2. The phone number is not registered on WhatsApp: step 3 fails, so stop and
   show the reason (do not count it as an attempt).
3. Pairing is started while already `ONLINE`: refuse and suggest
   `1.17 disconnect` first.

## Current implementation
The pairing panel shows the code and accepts a refresh request. `1.12 code`
issues a new code. The gap is that the countdown and the cap `A` should be
shown on screen and enforced in one place.

## Verification
- Unit: a fake clock makes the timer fire at `T_safe`, giving a new code. The
  cap gives `GAVE_UP` after `A` codes.
- Live: let a code expire once, then check that a new code appeared before
  the old one stopped working.
