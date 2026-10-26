# ALG-009 — Streaming conversation report

| | |
|---|---|
| Solves | [PS-009](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-009](../04-flowcharts/FC-009-conversation-report.md) |
| Requirements | FR-014, FR-015, NFR-001 |
| Module | M-07 `src/terminal/TerminalConversationAnalysis.js` |
| User trigger | `8.11 convos`, `8.9 chats`, `8.10 analyze`, playbook `P7`, automatic after master `ready` |
| Status | Implemented |

## Problem
After login, report the total conversations (people and groups), the
messages per conversation (incoming, outgoing, unread), the latest
conversation, and the top-k chats. It must work for thousands of chats with
bounded memory and time, and must never send anything.

## Input
- Chat list `C` (|C| = c), a per-chat message cap `L` (env
  `LINDA_CHAT_REPORT_LIMIT`), top-k `k` (default 5).

## Output
- A report: `totalChats`, `individualChats`, `groupChats`, `unreadChats`,
  `unreadMessages`, `totalMessages`, `incoming`, `outgoing`, `last`, the
  `entries` table, and `cappedChats` (marked with `+`).

## Invariants
- I1. Read-only: no message is sent or marked as read.
- I2. Each chat is counted at most once (dedupe by serialized id).
- I3. A chat with more than L messages is shown as "at least L" (`L+`), never
  as an exact number.

## Algorithm
```text
1. chats ← dedupe(getChats()) by id, keep only user / group / lid ids
2. sort chats by timestamp desc                       # O(c log c); last = chats[0]
3. totals ← 0; H ← min-heap(size k) by messages
4. for each chat (bounded concurrency P = 4):
5.   msgs ← fetchMessages(chat, limit L)              # ≤ L per chat
6.   in/out ← one pass over msgs; capped ← |msgs| = L
7.   totals += (in, out, unread); push (chat, |msgs|) into H, pop if |H| > k
8.   on error: count as skipped (messages = null), continue
9. emit report; OUTPUT panel shows the summary, `convos` shows the full table
```

## Complexity
- Time: O(c log c + N), where N = Σ min(Lᵢ, L) ≤ c·L.
- Memory: O(c) for the entries plus O(L) for one chat's messages at a time
  plus O(k) for the heap.

## Edge cases
1. Disconnect during the report: stop and report "connection changed; retry
   after recovery".
2. Media-only last message: the preview shows `[image]` and similar.
3. Control characters in a chat name: removed by `safeLabel`.

## Current implementation
Matches steps 1–9, with fetches running sequentially (P = 1). Planned: P = 4
with a semaphore, and an incremental update from `message` events so the
report refreshes without a full rescan.

## Verification
- Unit tests in `tests/unit` cover the summary and report lines and the
  marking of capped chats.
- Live: compare `convos` with the phone for 3 chats.
