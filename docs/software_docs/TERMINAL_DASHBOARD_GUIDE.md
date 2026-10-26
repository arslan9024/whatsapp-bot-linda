# Terminal Dashboard Guide — Linda Control Center

| Item | Value |
|---|---|
| Document ID | LINDA-SD-003 |
| Status | Current state (as built), with planned items marked **Planned** |
| Date | 2026-10-26 |
| Source of truth | `src/terminal/TerminalLayout.js`, `TerminalHealthDashboard.js`, `TerminalNumberMenu.js`, `FeatureCatalog.js`, `TerminalPlaybooks.js`, `TerminalCampaignMenu.js` |
| Related | [ARCHITECTURAL_BOUNDARIES.md](./ARCHITECTURAL_BOUNDARIES.md), [ALG-013 command resolution](../plans/03-algorithms/ALG-013-command-resolution.md), [ALG-014 screen budget](../plans/03-algorithms/ALG-014-screen-budget.md), [ALG-015 usage counters](../plans/03-algorithms/ALG-015-usage-counters.md) |

## 1. Purpose and scope

The terminal is the operator's only control surface for Linda. This guide describes the screen layout, the three
input styles (menu codes, feature IDs and text commands), every menu code, the numbered playbooks and the campaign
workspace. It covers the **master WhatsApp account** workflow; servant accounts appear in menus but multi-account
operation is a later phase.

Start the bot with `npm start` (or the VS Code task **Linda: start bot**). Only one bot can run per project folder:
a second launch exits without touching the running account (single-instance lock, see
[ALG-001](../plans/03-algorithms/ALG-001-single-instance-lease.md)).

## 2. Screen layout

On an interactive terminal (TTY) the panels are pinned to the top of the window. Logs scroll only in the area below
them, so the panels never get pushed away. The panels redraw after every command.

```
╭─ LINDA · WHATSAPP BOT CONTROL CENTER ───────────────── (HEADER, magenta)
│ Linda vX · Node vX · PID · started · uptime
│ Master: +971… · ONLINE|status · link | Devices: …
│ Idle · waiting for your command | Working: <command>
╰──────
╭─ FEATURES · SECTIONS [code] ACTIONS ×USES ──────────── (FEATURES, green)
│ Sections with their menu code, number of actions and usage counters
╰──────
╭─ INPUT · YOUR ACTION · ALL OPTIONS & PLAYBOOKS ─────── (INPUT, yellow)
│ Current menu level, prompts, confirmations, playbooks
╰──────
╭─ OUTPUT · DEVICES & MESSAGE ANALYZER | RELINK MASTER ─ (OUTPUT, cyan)
│ Device list, master status, conversation summaries, last result / notice
╰──────
── PROCESS VIEWBOARD · live logs & processing below ──── (PROCESS, blue)
  …scrolling logs…
```

| Panel | Content | When the window is short |
|---|---|---|
| HEADER | Linda version, Node version, PID, start time, uptime; master phone, status and link state; current activity | Compact single line |
| FEATURES | Menu sections with code, action count and usage counter (`×uses`) | Compact form |
| INPUT | Current menu level and its numbered choices, field prompts, `1 = execute / 0 = cancel` confirmations, playbooks | Compact form when OUTPUT would drop below 8 rows |
| OUTPUT | Devices (link and connection state), master section, conversation summaries, the latest result | Truncated with "… +N more lines" |
| PROCESS VIEWBOARD | Divider; logs and processing output scroll below it (at least 8 rows) | Always shown |

The OUTPUT title changes with the master state:

- **MESSAGE ANALYZER** when the master is online (conversation summaries, `convos`).
- **RELINK MASTER** when it is offline. It recommends reactivating the saved session first (`recover <phone>`,
  code 1.16) and relinking only if that fails (2.1 / 2.2).

### 2.1 Device states in OUTPUT

| Field | Values | Meaning |
|---|---|---|
| Link | LINKED / NOT LINKED | Whether the device is registered on the phone (last known) |
| Connection | ACTIVE (online) / CONNECTING / OFFLINE / AUTH REQUIRED / … | Whether Linda is connected right now |
| session | saved (`<clientId>`) / relink needed | Whether a local LocalAuth profile exists under `sessions/` |

A **linked but offline** device does not need relinking: reactivate it with `recover <phone>`. On restart Linda
restores saved sessions automatically ([ALG-003](../plans/03-algorithms/ALG-003-master-restore.md)).

### 2.2 Plain mode

Set `LINDA_PLAIN_TERMINAL=1`, or pipe the output, to disable pinning. Set `NO_COLOR` to disable colours. Non-TTY
output is never redrawn.

## 3. Input styles

All three styles run the same commands. Type at the prompt and press Enter.

| Style | Example | Notes |
|---|---|---|
| Menu code | `1.16`, `2.1`, `8.11` | Dotted path from the root; `1` then `16` also works step by step |
| Feature ID | `f7 +971505760056`, `#7` | Stable IDs F1–F34 with usage counters (`features` lists them) |
| Text command | `recover +971505760056`, `link-code` | Direct commands; see §5 |
| Playbook | `p1`, `p1.2` | Shows a numbered problem playbook, or runs one step of it |

Navigation keys inside the menu:

| Input | Action |
|---|---|
| `menu` | Refresh and show the numbered menu |
| `0` | Back one level (or cancel a prompt/confirmation) |
| `00` | Back to the menu root |
| `1` (at a confirmation) | Execute the confirmed action |
| Enter on an empty field | Use the shown default value |

Actions that change state (disconnect, quit, delete row) always ask for confirmation. Field values are validated
(for example phone numbers must match `+<country><number>`, 7–15 digits).

## 4. Menu codes

Codes are stable as long as the menu order in `TerminalNumberMenu.js` does not change. Playbooks refer to them.

### 1 · Devices and accounts

| Code | Action | Command run |
|---|---|---|
| 1.1 | All accounts | `accounts` |
| 1.2 | All devices | `list` |
| 1.3 | Master accounts | `masters` |
| 1.4 | Servant accounts | `servants` |
| 1.5 | Link primary master | `link master` |
| 1.6 | Add master account (phone, display name) | `link master <phone> <name>` |
| 1.7 | Restore all sessions | `restore-sessions` |
| 1.8 | Select account/device → per-device submenu (§4.1) | — |
| 1.9 | Relink master by phone | `relink master <phone>` |
| 1.10 | Relink servant by phone | `relink servant <phone>` |
| 1.11 | Relink device by phone | `relink <phone>` |
| 1.12 | Request pairing code by phone | `code <phone>` |
| 1.13 | Device details by phone | `device <phone>` |
| 1.14 | Account health by phone | `health <phone>` |
| 1.15 | Account metrics by phone | `stats <phone>` |
| 1.16 | Recover session by phone (reactivate, no new code) | `recover <phone>` |
| 1.17 | Disconnect by phone, keep session (confirm) | `disconnect <phone>` |
| 1.18 | Health of all accounts | `health` |
| 1.19 | Restore master (reactivate saved session, no new code) | `restore master` |
| 1.20 | Check master live before continuing | `master check` |
| 1.21 | Make master ready (check, then restore if offline) | `master ready` |

#### 4.1 Per-device submenu (1.8.n)

`1.8.<n>` selects device *n*; its actions are `1.8.<n>.<m>`:

| m | Action | Notes |
|---|---|---|
| 1 | Device details | `device <phone>` |
| 2 | Account health | `health <phone>` |
| 3 | Account metrics | `stats <phone>` |
| 4 | Recover saved session | Replaced by "Session is active" or "Recovery in progress" when not applicable |
| 5 | Authenticate master/servant (choose QR/code) | Replaced by "Device linking not needed" when active or connecting |
| 6 | Disconnect locally, keep session (confirm) | `disconnect <phone>` |
| 7 | Account analytics | `analytics account <phone>` |
| 8 | Conversations (local, read-only) → 1 list chats, 2 more chats by page, 3 analyze selected chat | `chats`, `analyze <phone> <n> [max]` |

### 2 · Link master directly (no saved preference)

| Code | Action | Command |
|---|---|---|
| 2.1 | Link with pairing code | `link-code` |
| 2.2 | Link with QR code | `link-qr` |

While a pairing code is shown, type `r` to request a fresh code.

### 3 · Contacts / Goraha

| Code | Action | Command |
|---|---|---|
| 3.1 | Contact status | `goraha status` |
| 3.2 | Verify and recount | `goraha verify` |
| 3.3 | Contact count | `goraha contacts` |
| 3.4 | Search contacts | `goraha filter <text>` |

### 4 · Analytics

| Code | Action | Command |
|---|---|---|
| 4.1 | Real-time dashboard | `analytics` |
| 4.2 | Full report | `analytics report` |
| 4.3 | Uptime report | `analytics uptime` |
| 4.4 | Account analytics by phone | `analytics account <phone>` |

### 5 · Google Sheets

| Code | Action | Command |
|---|---|---|
| 5.1 | Read data | `sheets read <id> <range>` |
| 5.2 | Add row | `sheets add <id> <sheet> <values…>` |
| 5.3 | Update cell | `sheets update <id> <cell> <value>` |
| 5.4 | Delete row (confirm) | `sheets delete <id> <sheet> <row>` |
| 5.5 | Search data | `sheets search <id> <range> <text>` |
| 5.6 | Spreadsheet metadata | `sheets info <id>` |

### 6 · System

| Code | Action | Command |
|---|---|---|
| 6.1 | Health dashboard | `status` |
| 6.2 | Text command help | `help` |
| 6.3 | Exit terminal monitoring (confirm) | `quit` |
| 6.4 | Campaigns workspace (terminal only, headless sending) | `campaigns` |
| 6.5 | All features with counters | `features` |

### 7 · WhatsApp command catalog (reference only)

Read-only reference of the `!commands` that contacts can send over WhatsApp, grouped by category, with usage,
examples and enabled/handler state. Nothing in this section is executed from the terminal.

### 8 · Messaging & intelligence

| Code | Action | Command |
|---|---|---|
| 8.1 | Send one message (confirm first) | `send <number> <message>` |
| 8.2 | Validate a number | `validate <number>` |
| 8.3 | Health scores (all accounts) | `score` |
| 8.4 | Sentiment of text (local, rule-based) | `sentiment <text>` |
| 8.5 | Intent of text (local, rule-based) | `intent <text>` |
| 8.6 | Compare names/phones | `similar <a> \| <b>` |
| 8.7 | Find duplicate contacts in a file (CSV/XLSX/JSON) | `dedupe <file>` |
| 8.8 | Health score by phone | `score <phone>` |
| 8.9 | List chats by phone | `chats <phone> [page]` |
| 8.10 | Analyze chat by phone | `analyze <phone> <n> [max]` |
| 8.11 | Conversation report (all chats, message counts; blank = master) | `convos [phone]` |

Conversation analysis is read-only: Linda only fetches chats and messages (`fetchMessages`) from the active session
and never sends anything while analyzing.

## 5. Feature IDs (F1–F34)

Each feature has a stable ID and a usage counter stored in `data/feature-usage.json`. Run one with `f<id>` or
`#<id>`, followed by arguments when it needs them.

| ID | Command | Name | Category |
|---|---|---|---|
| F1 | `status` | Dashboard | Devices |
| F2 | `link-code` | Link master (code) | Devices |
| F3 | `link-qr` | Link master (QR) | Devices |
| F4 | `link master [+phone] [name]` | Add master account | Devices |
| F5 | `relink master\|servant [+phone]` | Relink device | Devices |
| F6 | `code <+phone>` | New pairing code | Devices |
| F7 | `recover <+phone>` | Reactivate device | Devices |
| F8 | `restore` / `restore-sessions` | Restore all sessions | Devices |
| F9 | `disconnect <+phone>` | Disconnect (keep session) | Devices |
| F10 | `device <+phone>` | Device details | Devices |
| F11 | `list` | List devices | Devices |
| F12 | `masters` | Master accounts | Devices |
| F13 | `servants` | Servant accounts | Devices |
| F14 | `accounts` | All accounts | Devices |
| F15 | `health [+phone]` | Account health | Health |
| F16 | `stats <+phone>` | Account metrics | Health |
| F17 | `score [+phone]` | Health score 0–100 | Health |
| F18 | `analytics [report\|uptime\|account <phone>]` | Analytics | Health |
| F19 | `campaigns` | Message Sender | Messaging |
| F20 | `send <number> <message>` | Send one message | Messaging |
| F21 | `validate <number>` | Validate number | Messaging |
| F22 | `chats [+phone] [page]` | List chats | Messaging |
| F23 | `analyze <+phone> <n> [max]` | Analyze chat | Messaging |
| F24 | `sentiment <text>` | Sentiment of text | Intelligence |
| F25 | `intent <text>` | Intent of text | Intelligence |
| F26 | `similar <a> \| <b>` | Compare names/phones | Intelligence |
| F27 | `dedupe <file>` | Find duplicate contacts | Intelligence |
| F28 | `goraha [verify\|contacts\|filter <text>]` | Goraha contacts | Data |
| F29 | `sheets read\|add\|update\|delete\|search\|info …` | Google Sheets | Data |
| F30 | `menu` | Numbered menu | System |
| F31 | `features` | Feature list | System |
| F32 | `help` | Help | System |
| F33 | `quit` / `exit` | Quit | System |
| F34 | `convos [+phone]` | Conversation report | Messaging |

## 6. Playbooks (p1–p10)

Numbered problem → step procedures. `p<n>` shows a playbook; `p<n>.<step>` runs that step. `{master}` is replaced
with the master phone. Steps without a full command open their menu code and ask for the missing values.

| Playbook | Problem | Steps (menu code → action) |
|---|---|---|
| p1 | Restore master (offline but still linked) | 1.16 `recover {master}` → 1.9 `relink master {master}` only if step 1 fails → 2.1 last resort |
| p2 | Link a new master | 2.1 pairing code → or 2.2 QR → 1.3 check it is listed |
| p3 | Pairing code delayed or failed | 1.12 `code {master}` (or `r` while linking) → 2.2 QR → 1.9 relink |
| p4 | Sessions missing after restart | 1.7 restore all → 1.18 health of all → 1.16 recover master |
| p5 | Device removed / logged out | 1.13 `device {master}` → 1.9 relink (needs new code/QR) → 1.7 restore others |
| p6 | Add a servant account | 1.10 link servant → 1.4 check listed → 1.14 health |
| p7 | Analyze conversations | 8.11 `convos {master}` → 8.9 `chats {master}` → 8.10 analyze one chat |
| p8 | Send a message safely | 8.2 validate → 8.1 send (confirm) |
| p9 | Clean contacts | 3.2 verify → 3.4 search → 8.7 dedupe file |
| p10 | Daily health check | 6.1 dashboard → 1.18 all accounts → 8.3 scores → 4.3 uptime |

## 7. Campaign workspace (`campaigns`, 6.4, F19)

A terminal-only workspace for bulk sends through the master account's headless browser. It has no web UI. Inside a
campaign task:

| # | Action |
|---|---|
| 1 | Refresh progress |
| 2 | Edit draft / account / interval |
| 3 | Append contacts (file, paste, Google Sheets) |
| 4 | Select / filter contacts |
| 5 | Preview personalized message (contact variables) |
| 6 | Add attachment (image, video, document) |
| 7 | Remove attachment |
| 8 | Start / Resume (confirmation required) |
| 9 | Pause |
| 10 | Review results (sent, failed, not sent) |
| 11 | Export results CSV |
| 12 | Stop task (cannot resume) |
| 13 | Delete task and attachment copies |
| 14 | Results filter: All / Failed |
| 0 / 00 | Back to campaigns / campaigns home |

Safety limits (randomized intervals, 45 messages per account per day, 10 per campaign per day by default) are
described in [ARCHITECTURAL_BOUNDARIES.md §6](./ARCHITECTURAL_BOUNDARIES.md#6-messaging-safety-limits).

## 8. Keeping the screen short (deduplication)

- OUTPUT shows one line per device, not one line per event.
- Only the **latest** warning, error, ready or success notice is kept (`Notice: …`, max. 180 characters); it
  replaces the previous one instead of stacking.
- Dashboard redraws triggered by notices are debounced, so bursts of events cause one redraw.
- While a QR code or pairing code is on screen, notices are not drawn over it.
- Detailed logs go to the PROCESS VIEWBOARD area below the panels.

## 9. Planned changes

| ID | Change | Status |
|---|---|---|
| TD-P1 | PROCESS VIEWBOARD as a full panel listing running jobs (restore, campaign, analysis, API queue worker) with progress, not only a divider | Planned |
| TD-P2 | API queue worker status (queued / sent today / last error) in HEADER and PROCESS | Planned, depends on API-G1 in [API_REFERENCE.md](./API_REFERENCE.md#8-known-gaps-and-planned-work) |
| TD-P3 | Multi-account view (servants as first-class accounts) | Later phase |
| TD-P4 | "Link attempt 0/5 failed" notice shown when no attempt has started | Known defect, fix pending (`src/linking/DeviceLinkedManager.js`) |
