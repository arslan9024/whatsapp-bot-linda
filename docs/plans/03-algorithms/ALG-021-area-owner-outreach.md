# ALG-021 — Area owner outreach under a new-conversation budget

| | |
|---|---|
| Solves | [PS-021](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-021](../04-flowcharts/FC-021-area-owner-outreach.md) |
| Requirements | FR-034, FR-035, FR-036, FR-037 |
| Module | M-15 `src/outreach/` (`OwnerSheetExtractor`, `MasterChatDirectory`, `NewConversationBudget`, `AreaOwnerOutreachPlanner`, `OutreachReport`, `OutreachCommand`) |
| User trigger | `outreach <project…>`, `outreach projects`, `outreach budget` (menu `9.1`–`9.3`) |
| Status | Implemented |

## Problem
The owners sheet lists thousands of property owners per area (DAMAC Hills 2:
Sheet1 plus one tab per cluster). For a chosen project, Linda must tell apart
owners the master account already talks to (an "old conversation") from new
owners, and decide who may get a **new** conversation today. WhatsApp punishes
accounts that open too many new chats, so new conversations are capped
(default **30 per Dubai calendar month and 2 per day**). The cap must hold for
every send path: campaigns, the API queue and the terminal `send` command.

## Input
- Sheet tabs `T` (values only). Sheet1 is the main tab; cluster tabs are
  matched to projects by the abbreviation table (`Project | Abbreviation`).
- Selected projects `P` (names or abbreviations, resolved at run time).
- Master account `a`; its chat list (`getChats()`), mapped to phone numbers
  through `getContactLidAndPhone` for `@lid` chats.
- Ledger `L` of new conversations started by Linda:
  `(account, phone, at, day, month, source)` in `data/outreach/new-conversations.json`.
- Limits `D` (per day), `M` (per month), time zone `z` (Asia/Dubai).

## Output
- Plan: `existing` (has a chat), `today` (≤ available slots, verified on
  WhatsApp), `tomorrow`, `later` (estimated day for each), `skipped` (with
  a reason: do-not-contact or not on WhatsApp).
- Terminal summary, CSV at `data/outreach/`, an optional draft campaign with
  today's picks, and an optional `Linda Outreach` status column in Sheet1.

## Invariants
- I1. For every account and Dubai day `d`: new conversations recorded on `d`
  ≤ `D`; for every month `m`: ≤ `M`.
- I2. An owner with a chat on **any** of their numbers is never counted as new.
- I3. A new owner is contacted on exactly one number (the best ranked one that
  is registered on WhatsApp).
- I4. Planning never consumes budget; only a send reserves a slot, and the
  slot is reserved **before** the send (a failed send still counts).
- I5. A number already in `L` for the account is not counted again.
- I6. Flagged owners (do-not-contact responses) are never planned.

## Algorithm
```text
1. read tabs T; aliases ← projectAliases(T)
2. records ← rows of Sheet1 + cluster tabs; normalise every phone (E.164 digits,
   reject invalid and landline numbers); project ← column or tab alias
3. union-find over phones: rows sharing any number → one owner;
   rank numbers (Sheet1 before tabs; mobile before secondary)
4. owners ← owners of P; skip flagged (I6)
5. for each owner:
     if any number ∈ L(a)            → existing ("started by Linda")
     elif any number ∈ chats(a)      → existing ("WhatsApp chat")   (I2)
     else                            → new
6. sort new: property status rank, Sheet1 first, sheet order
7. available ← min(D − usedToday, M − usedMonth)
8. for each new owner while |today| < available:
     n ← first number with getNumberId(n) ≠ null (≤ verifyLimit lookups)
     found → today (sendTo n); none → skipped "not on WhatsApp";
     limit hit → waiting
9. waiting → scheduleDays from tomorrow: per day min(D, M − usedMonth),
   month counter resets on the 1st (z)
10. report: summary, CSV, draft campaign (today only), Sheet1 status column
11. at send time (campaign / API / terminal): guard(a, phone)
      chat exists → allowed (not counted)
      else reserve(L) → allowed, or DEFERRED until next day / next month
```

## Complexity
Extraction is O(R·k α(R)) for R rows with k numbers each (union-find). Chat
lookup is O(C) once to build the directory, then O(1) per number. Sorting is
O(N log N) for N new owners. Scheduling is O(N + days). Verification costs at
most `verifyLimit` network calls per run.

## Edge cases
1. The same owner appears in Sheet1 and in a cluster tab with a different
   number: merged by union-find, Sheet1 numbers preferred.
2. UAE landlines (`04…`, `02…`, 9 digits with a leading 0) are rejected, not
   misread as mobiles.
3. `@lid` chats without a phone: resolved with `getContactLidAndPhone`; if
   unresolved they cannot match, which can only make an owner look new (the
   guard re-checks at send time).
4. Chats started manually from the phone are not in `L`; they are detected
   once a message exists in the chat list.
5. Budget exhausted mid-campaign: later recipients are DEFERRED with a retry
   time (next Dubai day or month), never dropped. API messages deferred past
   their max age are cancelled.
6. `getNumberId` fails (offline): today's picks are kept unverified and
   marked so in the report.
7. `getChatById` is never used for lookup, because it creates the chat.

## Current implementation
Implemented in `src/outreach/`. Enforcement hooks: `CampaignWorkspace`
(defer), `CampaignWorkspaceSetup.checkRecipient`, `ApiQueueWorker`
(`DEFERRED` / `NEW_CONVERSATION_LIMIT`), `CommunicationService.processQueue`
(reschedule or cancel) and `TerminalFeatureCommands.sendSingleMessage`.
Config: `NEW_CONVERSATIONS_*` and `OUTREACH_*` in `.env`.

## Verification
- `tests/unit/AreaOwnerOutreach.test.js`: normaliser (landlines, multiple
  numbers per cell), budget day/month limits and retry times, chat directory
  and guard, extractor merging and aliases, planner today/tomorrow/later and
  verification, CSV and status column, the command flow, and a campaign run
  that defers over budget.
- Real sheet dry run: 7165 owners, 61 project aliases, VARDON 558 owners.
