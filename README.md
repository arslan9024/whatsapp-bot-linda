# 🤖 WhatsApp Bot Linda

**Enterprise-grade WhatsApp automation platform** for real estate property management, built with Node.js, MongoDB, and Express.

[![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-green.svg)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green.svg)]()
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-Jest-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-ISC-blue.svg)]()

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Bot Commands](#-bot-commands)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Documentation](#-documentation)

---

## ✨ Features

### Core Bot
- **Multi-Bot Support** — Run multiple WhatsApp bots simultaneously
- **Campaign Management** — Bulk messages with scheduling and rate limiting
- **Contact Validation** — Phone number validation with country code checking
- **Message Analyzer** — Intelligent incoming message analysis
- **Google Sheets Integration** — Read/write property data to Google Sheets
- **Session Persistence** — Automatic QR code handling and session restore
- **24/7 Production Mode** — Keep-alive, health monitoring, auto-recovery

### Advanced Features
- **📧 Communication Templates** — Template management, variable substitution, WhatsApp/email/SMS delivery (16 API endpoints, 11 bot commands)
- **💰 Commission Tracking** — Percentage, fixed, tiered & revenue-share calculations with approval workflows (17 endpoints, 10 commands)
- **📊 Analytics & Reporting** — Portfolio analytics, market comparisons, performance snapshots & trend analysis (14 endpoints, 10 commands)
- **🧾 Payment & Invoicing** — Invoice generation, payment recording, aging reports & overdue tracking (25 endpoints, 12 commands)
- **🔔 Automated Notifications** — Contract expiry alerts, payment reminders, maintenance schedules & escalation chains (22 endpoints, 13 commands)

### Database
- **16 Mongoose Models** — Normalized, relational schema for properties, tenants, contracts, payments, commissions, and more
- **94 RESTful API Endpoints** — Full CRUD across all entities
- **56 WhatsApp Bot Commands** — Natural language property management via chat

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22.13+ (Node.js 24 LTS recommended)
- npm or yarn
- WhatsApp account
- Google API credentials (for sheets integration)

### Installation

1. **Clone and Install**
```bash
cd WhatsApp-Bot-Linda
npm install
```

The bot uses Puppeteer through `whatsapp-web.js`; no separate `chromium` npm
package is needed. Allow npm install scripts to run so Puppeteer can install its
browser. You can select an existing Chrome installation with
`PUPPETEER_EXECUTABLE_PATH` or `CHROME_BIN`.

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

Alternatively, keep private files under the root `secrets` folder, whose entire
contents are ignored by Git. The shared `secrets/.env` can contain settings for
Linda and other applications. To load it with the bot on PowerShell:

```powershell
$env:DOTENV_CONFIG_PATH = Join-Path $PWD 'secrets\.env'
npm run dev
```

Linda reads only the variable names supported by its runtime; unrelated settings
do not enable integrations automatically. Shared names such as `PORT`,
`NODE_ENV` and database URLs must be appropriate for Linda too. The REST API
requires `API_ACCESS_TOKEN` before it can start.

The root `.env` remains the default; files are not moved automatically. Git
ignoring prevents new files from being added normally, but does not encrypt them,
untrack previously committed files, or protect them from host backup/sync tools.

3. **Add Google API Credentials**
```bash
# Place your keys.json in config/google/
# Obtained from Google Cloud Console
```

For Goraha Gmail Contacts (separate from Sheets/Drive service accounts), save a
Desktop OAuth client as `secrets/goraha-bot-people-app.json`. Enable People API,
add `goraha.properties@gmail.com` as a test user when in Testing, and allow the
`https://www.googleapis.com/auth/contacts` scope. Then run:

```powershell
npm run contacts:authorize
```

Open the printed link on the same computer and sign in as
`goraha.properties@gmail.com`. The setup uses a loopback callback, state and
PKCE, verifies the account email and a read request, and saves a refresh token
to `secrets/goraha-contacts-token.json`. No contacts are modified by setup.
Incomplete callback requests do not end setup; complete the original Google
sign-in flow within ten minutes. If consent is denied or setup expires, run the
command again and use its new link rather than reloading an old callback URL.
The Contacts bridge uses this token; CRM OAuth and Sheets/Drive credentials are
unchanged. Normal token refreshes are persisted. Protect the secrets folder with
appropriate Windows ACLs. Testing-mode refresh tokens for Contacts generally
expire after seven days; reauthorize as needed and review production publishing
requirements before relying on unattended operation.

4. **Run the Bot**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### First Run

1. Start the bot and type `link-code` for pairing-code linking or `link-qr` for QR
   linking of the configured master.
2. The selected method starts immediately for this attempt only; no preference
   is saved. `link master` still offers a code/QR choice.
3. Open WhatsApp on the configured phone: **Settings** (iPhone) or **menu** (Android)
   → **Linked devices** → **Link a device**.
4. For a pairing code, select **Link with phone number instead** and enter the
   code shown in the bot terminal. For QR linking, scan the displayed QR.
5. The bot authenticates and saves the session for future restarts.

Valid saved sessions restore without a prompt. Adding or explicitly relinking
accounts through the older commands offers a fresh code/QR choice. An expired
session reports `AUTH REQUIRED`; restoration does not start device linking.
Use `code <phone>` during an active linking flow to switch from
QR to a pairing code for that attempt. Pairing codes are not SMS verification
codes.

If the pairing code is delayed, expired, or the phone reports that linking
failed, type `r` (or `refresh` / `new code`) and press Enter in the bot terminal
while linking is still waiting. A new code is requested immediately, even though
the link command is still running. With several accounts linking at once, use
`code <phone>`. If no code appears for 90 seconds, the terminal shows this hint again.

After WhatsApp becomes ready, Linda checks that the login has actually been
written to `sessions/session-<id>` and prints `💾 Session saved on this computer`.
Do not restart Linda until that message appears, or the new login may be lost.
On restart, restore uses the local profile that holds a saved WhatsApp login, even
if older metadata points to a different profile. Profile folders without a saved
login (for example, an unfinished link attempt) are not counted as restorable.

Primary-master auto-recovery uses the same saved-session restore flow as the
terminal. It does not restart a client while a connection, reconnect, or QR/code
prompt is active. Logged-out or authentication-failed sessions require manual
`link-code` or `link-qr` authentication; session files alone do not mean the
account is connected.

In a WhatsApp group containing the connected master bot, group admins or the
master account can send `!link-code` or `!link-qr` to start master linking.
These commands may disconnect the master while it re-authenticates; complete
the process in the bot terminal. Pairing codes are never posted to the group.
The bot must already be connected to receive group commands.

`link-method` / `!link-method` now only explain the replacement commands.
Old preference files and `WHATSAPP_LINK_METHOD` settings are no longer read or
updated. Terminal prompts work with forwarded/piped stdin (such as nodemon),
even when Node does not report a TTY. With no readable stdin, use the explicit
`link-code` or `link-qr` command rather than a flow that needs a choice.

### Compact device dashboard and session recovery

In an interactive terminal the dashboard is split into three pinned, colored panels
that always stay above the logs: **OUTPUT** (cyan, device status), **FEATURES**
(green, every feature with its ID and usage counter) and **INPUT**
(yellow, the current question, active pairing code, or command hints). Logs
scroll only in the area below them. QR codes temporarily use the full screen.
Set `NO_COLOR=1` for plain colors or `LINDA_PLAIN_TERMINAL=1` to disable pinning.

The terminal shows one row per device with **ACTIVE**, **OFFLINE**, **LINKING**,
**AUTHENTICATED**, or **LOGGED OUT** state and saved-session availability.
Authentication alone is not an active connection: only WhatsApp's `ready` event
marks the device active. The view refreshes after commands and device events;
unchanged automatic refreshes do not repeat the menu. QR/code challenges and
input prompts remain visible while linking.

Use `recover <phone>` to initialize that account's saved LocalAuth session, or
`restore-sessions` to attempt all known accounts. Recovery preserves the actual
client ID used when linking. Saved profile files are candidates, not proof of
valid authentication. A revoked/logged-out session needs fresh linking.
Startup also discovers saved profiles for enabled configured accounts when
`session-state.json` has no account records. It uses the persisted client ID
or configured session path, rather than assuming every profile is named after
the phone number. The dashboard labels the primary account `[MASTER]`, shows
the selected saved profile, and counts it as `ACTIVE` only with a live
connected client. Profile files alone never imply an active session.

**Recovery is not device linking.** Use `recover <phone>` or `restore-sessions`
to reconnect an existing LocalAuth profile. Recovery preserves authentication
data, closes only that account's client, and never kills all browsers or deletes
session folders. Periodic cleanup does not age out LocalAuth profiles.
The dashboard separately reports previously linked accounts, active connections,
saved profiles, `RECONNECTING`, `RESTORE FAILED`, and `AUTH REQUIRED`.
A disconnected browser is not automatically a logged-out device.
If WhatsApp asks for fresh authentication, restore stops without displaying a
new QR/code. The dashboard shows **Link** (device registered on the phone, last
known) separately from **Connection** (online now). Reactivating an offline
linked device (`recover <phone>`) is not relinking. For the **primary master**,
Linda automatically asks once per offline episode:
`[1] Reconnect saved linked session` (default, no relink), `[2] Relink with
pairing code`, `[3] Relink with QR code`, or `cancel`. If reconnecting fails,
it falls back to the code/QR relink prompt; a logged-out master goes straight to
relinking. Other accounts still require an explicit command.
Each restart automatically attempts saved profiles, including accounts previously
marked `OFFLINE`, `RESTORE FAILED`, or `AUTH REQUIRED`. If WhatsApp requests fresh
authentication again, automatic retries pause for that running process instead
of repeatedly opening browsers. An explicit `recover <phone>` can also retry.
These restore attempts use saved credentials only; only the primary master
fallback above opens a QR/code prompt.
Confirmed logout or authentication
failure still requires explicit linking. Recovery errors identify the selected
profile and distinguish missing files from an authentication request.
Reconnect counters reset only when WhatsApp becomes ready, and pending retry
timers are cancelled at that point. Manual recovery does not race an in-progress
browser replacement. Disconnects immediately clear live status; a later browser
disconnect cannot undo a confirmed authentication failure. Shutdown closes each
managed client once. The dashboard prioritizes current recovery progress over
stale saved status and retains the original connection error while offline.

Startup, `recover`, `restore-sessions`, and scheduled reconnects share a single
per-account recovery coordinator. Concurrent recovery requests join the same
operation; they do not launch competing browsers. The coordinator closes the
old account client before creating its replacement and rejects profiles already
owned by another account. Initialization succeeds only
after WhatsApp emits `ready`, with a five-minute readiness deadline.
An authentication challenge or failure ends that wait immediately. Late events
from timed-out or replaced clients cannot mark an account active.

A persisted client ID/session path is authoritative: missing files produce a
profile-specific error instead of silently selecting a different saved profile.
Without persisted metadata, discovery prefers the configured profile, then the
phone-named profile. Browser authentication and cache directories are anchored
to the project, independent of the process's working directory. Shutdown blocks
new recovery work and cancels readiness waits before closing clients.

Your phone's "last active" proves past activity, not that local credentials are
still valid or that the bot is currently connected.

### Master account readiness and local conversation inspection

The current design and live acceptance checklist are in
[the master-account session plan](docs/plans/01-rup/iterations/E1-master-session.md).
Successful automated tests are not proof of live WhatsApp authentication.

- `disconnect <phone>` closes only that account and retains its saved session.
  It pauses automatic reconnect until explicit `recover <phone>` or restart.
- `chats [phone] [page]` lists available chats for an active account (default:
  configured master). Page one refreshes stable chat numbers; subsequent pages
  contain twenty entries each and do not refetch message history.
- `analyze <phone> <chat-number> [limit]` reads only the selected chat's available
  sample, default 100 and maximum 500 messages. It reports local counts, media
  count, incoming question-mark count and latest direction, not AI interpretation.
- These actions also appear under `menu` > Devices and accounts > Select
  account/device > Conversations. Local disconnect requires numeric confirmation
  in the menu. Direct typed commands execute explicitly without an extra prompt.
- The sample analyzer does not print/save message bodies, download media, call
  external AI, or send replies. It does not explicitly mark chats read. WhatsApp
  read requests still contact WhatsApp and may return incomplete history.
- Session metadata is written atomically. Corrupt metadata stops restoration
  without overwriting the file; inspect/repair it deliberately rather than
  deleting authentication. New POSIX metadata files request mode `0600`; Windows
  permissions and disk encryption require host configuration.
- A project-specific exclusive loopback port prevents duplicate bot startup.
  It exposes no HTTP endpoint or application data. An occupied port stops startup
  safely; crash/exit releases the reservation without deleting Chromium locks.
- Git ignores session metadata and caches. This does not untrack already tracked
  files or prevent host backup/cloud sync. Verify Windows folder permissions,
  disk protection and synchronization settings before treating storage as private.

### Terminal campaigns with headless Chromium

1. Start the bot with `npm start` (or `npm run dev`).
2. Enter `campaigns`, or numbered action `6.4`, in the bot terminal.
3. Choose **1 = New campaign**. Enter a name, message, interval, and numbered
   sending account, then choose an import source. No browser dashboard is started.
4. Import **CSV**, **Excel (.xlsx)**, **Google Sheets**, or **pasted CSV**.
   File imports accept a local Windows path (quoted paths are supported).
   Paste CSV on one line using literal `\n` between rows, for example
   `phone,name\n15550000002,Alex`. Messages also accept `\n` for line breaks.
   The first row contains headers: `phone`, `name`, optional `group`, and any
   custom columns such as `company`. Phone numbers need a country code; store
   them as text in Excel. Imports deduplicate numbers and report invalid rows.
5. Open a saved campaign by its number. Action **4** selects/filters recipients
   by name, phone or group; contact numbers toggle selection. `opted_out=true`
   also excludes a row. Customize the message with `{name}`, `{phone}`, `{date}`,
   and imported column variables such as `{company}`. Preview before sending;
   missing variables block Start instead of sending an incomplete message.
6. Drafts save automatically. Action **2** edits the message, sending account
   and 3-3600 second interval (fixed `10` or random range `6-10`); **5** previews a personalized message; **6/7**
   add/remove images, MP4 videos, PDFs, text, Word documents or spreadsheets.
   Up to 5 attachments, each at most 12 MB.
7. Action **8** shows a sending summary; enter **1** to explicitly Start / Resume,
   or **0** to cancel. Action **9** pauses. **12** permanently stops a task;
   pending recipients remain unsent and the task cannot resume. **13** deletes
   the task and local attachment copies after explicit confirmation, waiting
   for an in-flight recipient to finish. It does not delete WhatsApp messages
   or the original attachment files.
8. Follow deduplicated live counters. Action **10** shows paginated recipient
   results; **11** exports all results to a CSV path without overwriting files.
   Use **0** to cancel/back; from the campaigns list, **0** returns to the device
   dashboard. While inside campaigns, numbers refer to the campaign menu.
   **14** selects All or Failed results (including uncertain deliveries).
   Result numbers are masked; CSV exports contain full recipient numbers.
   At the task list, type `drafts`, `sending`, `history`, or `all` to filter
   saved tasks. History contains completed and stopped tasks.

The overview displays the sending account's connection state, recipients,
message (`None` when empty), attachment count, interval and processed/total
progress with sent, failed, pending and unknown-delivery counters. Empty-message
drafts are allowed, but sending requires either message text or an attachment.
Unknown deliveries after a restart or connection error remain review-only:
check WhatsApp before preparing a follow-up; resume only sends pending recipients.
Keep Linda running and its sending account connected. Tasks and attachment copies
are local to this installation, not browser storage, and do not sync to devices.
Type `help` anywhere in the workspace for storage and task-control guidance.

WhatsApp continues using the existing Puppeteer client with `headless: 'new'`.
Chrome/Chromium runs in the background without a visible window. Campaigns use
that same linked client and saved LocalAuth session: no extension, separate
WhatsApp Web tab, local web server, or browser dashboard is required.
This is local headless Chromium, not a remote Browserless service.
QR and pairing-code linking remain in the terminal.

Draft preparation and file imports do not require MongoDB. Sending requires a
connected account and MongoDB for shared limits, opt-out checks, and message
reservations. Google Sheets import additionally requires the existing Google
service account to be initialized and granted access to the spreadsheet.

As configured for this local workspace, a positive opt-in record is not required;
**known revoked/opted-out contacts are always excluded**, and imports never create
consent records. Existing legacy campaign consent requirements are unchanged.
Only message recipients you are authorized to contact and follow WhatsApp policies.
Existing application-level daily limits and failure cooldowns are retained; these
are not claims about official WhatsApp account limits or guarantees against bans.
The campaign limit is 10 actual messages/day and the shared account limit is 45.
Each attachment (and any separate long-caption text) counts as a message, not
just as one recipient; insufficient remaining capacity pauses before that recipient.

Pause stops before the next recipient; an in-flight recipient and its attachments
finish first. Intervals apply between recipients and between attachments.
Sent, failed and uncertain deliveries are never automatically retried.
After a bot restart, running campaigns become paused; uncertain in-flight recipients
require manual delivery review, and resuming processes only pending recipients.
Started campaigns are read-only; prepare a new draft for follow-ups.

Contact imports are limited to 5 MB / 5,000 rows. Campaign state and attachments
are stored locally under `data/campaign-workspace/` (ignored by Git, not encrypted).
Protect this directory like your contact lists. Campaign management is local to
the bot terminal, not a hosted multi-user service.

### Numbered terminal navigation

The terminal displays a hierarchical menu with counts for accounts, devices,
terminal actions, command categories, and all registered WhatsApp commands.
Type `menu` to return to the root and refresh the counts.

| Code | Section |
|------|---------|
| `1` | Devices and accounts |
| `2` | Direct master linking |
| `3` | Contacts / Goraha |
| `4` | Analytics |
| `5` | Google Sheets |
| `6` | System |
| `7` | WhatsApp command catalog (reference only) |

Choose an item by its number at the current level, or enter its full dotted
code from any level. For example:

- `2.1` starts master linking with a pairing code.
- `2.2` starts master linking with a QR code.
- `1.5` starts linking the primary master.
- `1.8` lists numbered accounts/devices; `1.8.1.1` shows the first one's details.
- `5.1` reads a spreadsheet, prompting for its ID and range.
- `6.4` opens terminal-only campaigns; WhatsApp stays headless.

Use `0` to go back or cancel data entry, and `00` to return home when not
entering data. Navigation needs only numbers; new values such as a spreadsheet
ID, search text, or phone number are requested separately. Row deletion and
exiting monitoring require `1` to confirm or `0` to cancel.

Codes stay fixed within the displayed menu snapshot until `menu` refreshes it.
Account/device codes can change after refresh or restart if the configured
list changes, so use the displayed labels. Existing text commands still work
when no data prompt is pending. Linking-method prompts consume their own input,
not menu navigation.

The WhatsApp catalog lists usage, examples, enabled/authentication metadata, and
whether a handler is registered. A registered handler may still be a placeholder;
catalog entries do not execute WhatsApp-only commands from the terminal.

### Full numbered feature list (dotted codes)

At startup Linda prints every terminal feature with a dotted code and a usage
counter. If the panels are not pinned, it also prints the list after each command.
Type the code and press Enter to run it. For example, `2.1` runs link-code, `1.13`
shows device details by phone, `8.2` validates a number and `8.10` analyzes a chat
by phone. Linda prompts for any inputs it needs; optional ones show `[optional]`.
Type `features` (or `list-all`, or `6.5`) to print the list again. When the
panels are pinned, the green FEATURES panel shows `code command ×uses`.
Counters are kept per action. Phone numbers are ignored, so `relink master +971…`
and code `1.9` count together. They are saved in `data/feature-usage.json`.
To stop the automatic printing, set `LINDA_FEATURE_LIST=0`. Existing codes never
change, because new actions are only added at the end of a section.

### Full terminal UI and conversation report

When the terminal supports it, Linda pins a full UI to the top of the window, from
top to bottom:

1. **HEADER** (magenta): Linda version, Node version, PID, start time and uptime,
   the master account status, device totals and what Linda is doing now.
2. **FEATURES** (green): the sub-header with the numbered sections, each with its
   action count and total uses.
3. **INPUT** (yellow): the current question or pairing code. Otherwise it is the full
   input board: every section with each code, command and use counter, then the
   playbooks (see below).
4. **OUTPUT** (cyan): devices plus the conversation report.
5. **PROCESS VIEWBOARD** (blue bar): logs and processing scroll below it.

On short windows the features and header switch to one line each. If OUTPUT would
drop below 8 rows, the input board switches to a compact grid of sections and
playbooks. Long OUTPUT is cut with a `… +N more lines` note.

#### Playbooks (problem → numbered steps)

Each playbook is an ordered algorithm for one problem. Every step is a fixed menu
code. Run the next step only if the previous one did not fix the problem.

| Input | What it does |
| --- | --- |
| `p` | list every playbook with its steps |
| `p1` | show the steps of P1 with the real commands |
| `p1.1` | run step 1 of P1 (`{master}` is filled with the master phone) |

| # | Problem | Steps |
| --- | --- | --- |
| P1 | Restore master (offline but still linked) | 1.16 recover → 1.9 relink master → 2.1 link-code |
| P2 | Link a new master | 2.1 link-code → 2.2 link-qr → 1.3 masters |
| P3 | Pairing code delayed or failed | 1.12 code → 2.2 link-qr → 1.9 relink master |
| P4 | Sessions missing after restart | 1.7 restore → 1.18 health → 1.16 recover |
| P5 | Device removed / logged out | 1.13 device → 1.9 relink master → 1.7 restore |
| P6 | Add a servant account | 1.10 relink servant → 1.4 servants → 1.14 health |
| P7 | Analyze conversations | 8.11 convos → 8.9 chats → 8.10 analyze |
| P8 | Send a message safely | 8.2 validate → 8.1 send |
| P9 | Clean contacts | 3.2 goraha verify → 3.4 goraha filter → 8.7 dedupe |
| P10 | Daily health check | 6.1 status → 1.18 health → 8.3 score → 4.3 analytics uptime |

Steps that need a value you have not given (a phone, file or number) ask for it.
`restore master [+phone]` (menu `1.19`) reactivates the master's saved session
without a new code.

#### Master-first readiness and automatic recovery

The prompt always shows `features = all commands | help`; `menu` offers numbered
choices. Startup checks the master's live WhatsApp state, rather than treating a
saved login as proof that it is online.

- `master check` (`1.20`): check the live master connection before continuing.
- `master ready` (`1.21`): check first, then restore the saved login if offline,
  without creating a new pairing code or replacing an already connected client.
- If authentication was revoked or no saved login exists, choose `link-code` or
  `link-qr`. If restoration fails, Linda shows the error and the relink command.
  Relinking is never silently forced.

While connected, bounded live checks detect unresponsive sessions; three failed
checks trigger saved-session recovery. Temporary disconnects use exponential
backoff. After ten retries, a progressive cooldown (up to 30 minutes) allows
recovery to resume instead of suspending forever. Explicit local disconnect,
shutdown, and authentication-required states still stop automatic recovery.

This improves availability but cannot guarantee uninterrupted uptime: the bot
process, computer and network must stay running, and WhatsApp may require
phone approval again after logout or session revocation.

Each account reuses one resolved LocalAuth profile across restore and relink.
New accounts default to the phone number without `+`; existing saved profile IDs
are retained so a working login is not silently moved. Device-status metadata is
stored separately in `data/device-status/<phone-without-plus>.json`, never in an
extra `session-+<phone>` directory. Keep the configured session path aligned with
the selected profile. Old profile folders are not automatically deleted or merged:
stop the bot, confirm which profile to keep, and explicitly approve cleanup.

About 8 seconds after an account logs in, Linda reads its chat list and counts the
messages in each chat. This is read-only: no messages are sent or marked as read.
Progress shows in the process area.

The master section of OUTPUT depends on the master's state:

- **Master online:** a **MESSAGE ANALYZER** section with the report and the analyzer
  codes (`8.11` convos, `8.9` chats, `8.10` analyze).
- **Master offline:** a **RELINK** section. If the phone still lists the device and a
  saved session exists, it suggests `1.16 recover <phone>` first (reactivate, no new
  code). It suggests `1.9 relink master <phone>` only if that fails. A logged-out
  master gets relink and `2.1` / `2.2` link options plus the last error.

When the master is online, the MESSAGE ANALYZER section shows:

- total conversations (people / groups) and unread counts
- the last conversation: name, time, and a short preview of the last message
- the most recent chats, each with its message count

The live Inbox line takes one chat-list baseline per connected client, then uses
WhatsApp events rather than a 30-second recount loop. `unread_count` supplies the
exact new count for a chat: changing 3 to 4 adds only 1 to the total; reading it
back to 0 subtracts 4. Message events discover chats but never independently add
unread messages, avoiding double counts when events arrive in either order.
Reconnect takes a fresh baseline. Dashboard redraws do not fetch the chat list.

Other online accounts get a one-line summary.

Type `convos [phone]` (or `8.11`) to rerun the report and print the full table:
`#`, chat, messages, in, out, unread and last activity. The `#` numbers match
`analyze <phone> <#>`. A count like `200+` means the chat reached the per-chat limit.

| Variable | Default | Meaning |
| --- | --- | --- |
| `LINDA_AUTO_CHAT_REPORT` | on | `0` turns off the automatic report after login |
| `LINDA_CHAT_REPORT_DELAY_MS` | `8000` | wait after login before analyzing |
| `LINDA_CHAT_REPORT_LIMIT` | `200` | most messages counted per chat (max 5000) |
| `LINDA_CHAT_REPORT_MAX_CHATS` | `500` | most chats whose messages are counted |

### Feature IDs, counters and restored tools

Every terminal feature also has a fixed legacy ID (`F1`–`F33`) and a usage counter.
Type `features f` for the F-id list, or run any feature by ID: `f11` (list devices), `f7 +9715…` (reactivate a device),
`f21 0501234567` (validate a number). Counters persist in
`data/feature-usage.json` (git-ignored). Features marked `*` were restored from
the archived project:

| ID | Command | What it does |
|----|---------|--------------|
| F17 | `score [+phone]` | 0–100 health score, rating, trend, prediction and tips (offline devices are capped at CRITICAL) |
| F20 | `send <number> <message>` | Send one message from a connected account after a y/N confirmation |
| F21 | `validate <number>` | Normalize (UAE default), check the format and confirm the number is on WhatsApp |
| F24 | `sentiment <text>` | Emoji, keyword and punctuation sentiment score |
| F25 | `intent <text>` | Intent (pricing, viewing, complaint…) with confidence and a suggested reply |
| F26 | `similar <a> \| <b>` | Compare two names or phone numbers |
| F27 | `dedupe <file>` | Find exact and likely duplicate contacts in a CSV, XLSX or JSON file (max 10 MB) |

The same actions are in the numbered menu under **8. Messaging & intelligence**
(and `6.5` for the feature list).

Maintenance tools:

```bash
npm run security:scan            # scan tracked files for leaked credentials (exit 1 on findings)
npm run security:scan -- --staged
npm run doctor:google            # check every Google service account can get a token
npm run doctor:google -- --offline
```

---

## 📁 Project Structure

Application code lives in `src/`, grouped by domain. Configuration, runtime data,
documentation and archived legacy code each have their own top-level folder.

```
whatsapp-bot-linda/
├── index.js                 # Bot entry point (npm run dev / npm start)
├── src/
│   ├── core/                # Logger, ServiceRegistry, BotInstanceGuard, shutdown, startup diagnostics
│   ├── sessions/            # SessionManager, login detection, save/restore, keep-alive, cleanup
│   ├── accounts/            # Account config, bootstrap, health and relinking
│   ├── connection/          # ConnectionManager, reconnect, circuit breaker, browser cleanup
│   ├── linking/             # Device linking (pairing code / QR), recovery, diagnostics
│   ├── terminal/            # Terminal dashboard, menus, interactive setup
│   ├── whatsapp/            # WhatsApp client, message handlers, command bridge
│   ├── commands/            # Bot command handlers
│   ├── campaigns/           # Campaign workspace, scheduler, safety and consent
│   ├── api/                 # api-server, express-server(-inmemory), routes/, middleware/
│   ├── database/            # Mongoose schemas/, services/, connection config
│   ├── integrations/        # google/ (Sheets, Contacts, OAuth) and goraha/
│   ├── analytics/           # Analytics, dashboards, reports/
│   ├── intelligence/        # AI / conversation intelligence services
│   ├── services/            # Other business services
│   └── shared/              # Shared helpers and static data
├── config/                  # bots-config.json, alertRules.json, google/ (accounts, keys)
├── data/                    # Runtime data (data/app, data/local) — not watched by nodemon
├── bot/                     # Bot framework (hybrid architecture)
├── tools/                   # doctor, status, session and backup utilities
├── scripts/                 # npm-referenced feature/API test scripts
├── tests/                   # Jest unit, integration, security and e2e suites
├── examples/                # Usage examples
├── docs/                    # Documentation (guides, api, architecture, plans, project, archive)
├── archive/                 # Unreferenced legacy code and scripts (kept for reference, not loaded)
├── sessions/                # WhatsApp session storage (git-ignored)
└── logs/                    # Application logs
```

`archive/` is excluded from Jest, ESLint and nodemon. Nothing in `src/` imports from it.

---
## ⚙️ Configuration

### Environment Variables

```bash
cp .env.example .env
```

Key variables:
```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/linda-bot
API_ACCESS_TOKEN=<random-secret-at-least-32-characters>
API_READ_TOKEN=<optional-distinct-secret-at-least-32-characters>
API_MESSAGING_TOKEN=<optional-distinct-secret-at-least-32-characters>
API_CORS_ORIGINS=https://your-frontend.example
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<base64-encoded-key>
GOOGLE_SHEET_ID=<your-spreadsheet-id>
PORT=3000
```

Generate an API token locally with:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

All API routes require a bearer token. `API_ACCESS_TOKEN` grants full access;
optional `API_READ_TOKEN` and `API_MESSAGING_TOKEN` credentials are restricted
to read-only requests and message submission respectively.
Configure `API_CORS_ORIGINS` as a comma-separated list of exact browser
origins. The `/health` endpoint remains public; an empty origin list disables
cross-origin browser access.

Messaging endpoints require a granted recipient-consent record. A full-access
administrator can record or revoke consent with `PUT
/api/communications/consent/:phone` using a JSON body:

```json
{ "granted": true, "source": "signed form", "evidence": "Form record ID" }
```

Grants require evidence; an inbound `STOP`, `UNSUBSCRIBE`, or `OPT OUT` message
also revokes consent. The legacy DAMAC server exposes the same routes under
`/api/v1/damac/communication/consent/:phone`.

Every communication send or schedule request requires a unique
`Idempotency-Key` header (8-128 characters). The key is reserved before the
send is attempted to prevent accidental duplicate delivery. If a worker stops
after sending but before recording completion, the reservation is not retried
automatically; inspect the message log and resolve it manually.

`POST /api/communications/queue/process` returns `501` on API-only servers;
queue processing requires a WhatsApp bot worker. See
[database backup and recovery](./docs/guides/DATABASE_BACKUP_RECOVERY.md) for
backup and isolated restore-verification commands.

---

## 🔌 API Endpoints

Start the complete feature API:
```bash
npm run api-server          # MongoDB-backed feature API, defaults to port 3000
npm run api-dev             # Same API with auto-reload
```

The complete feature API mounts people, properties, tenancies, ownerships,
buying, agents, commissions, commission rules, communications, analytics,
invoices, and notifications under `/api/*`.

The legacy DAMAC API remains available separately:
```bash
npm run express-server      # MongoDB-backed DAMAC API, defaults to port 5000
npm run express-inmemory    # In-memory DAMAC API for development
```
It serves DAMAC and communication routes under `/api/v1/damac/*`.

---

## 💬 Bot Commands

56 commands available via WhatsApp. Examples:
```
!template list              # List communication templates
!commission calculate       # Calculate commission on a deal
!analytics portfolio        # Portfolio performance summary
!invoice create             # Create a new invoice
!notify scan                # Scan for due notifications
!help                       # Show all available commands
```

---

## 🧪 Testing

```bash
# Run Phase 5 feature test scripts
npm run test:phase5

# Run Jest tests
npm test -- --runInBand

# Generate Jest coverage for application source under src/
npm run test:coverage -- --runInBand

# Individual feature test scripts
npm run test:communication
npm run test:commission
npm run test:analytics
npm run test:invoice
npm run test:notification

# Infrastructure tests
npm run phase5-express        # E2E + performance + load tests
npm run test:all-features     # Everything combined
```

## Database backups

See [the backup and recovery guide](./docs/guides/DATABASE_BACKUP_RECOVERY.md)
for creating backups and testing restores. The commands require MongoDB
Database Tools and a configured `MONGODB_URI`.

---

## 🚀 Running

```bash
# Bot (24/7 production mode)
npm start

# Bot (development with auto-reload)
npm run dev

# API Server
npm run express-server

# API Server (development with auto-reload)
npm run express-dev
```

---

## 📚 Documentation

All documentation is organized in `docs/`:

| Path | Contents |
|------|----------|
| `docs/ARCHITECTURE.md`, `docs/DEVELOPER_GUIDE.md` | Architecture overview and developer guide |
| `docs/CODING_STANDARDS.md`, `docs/CAPABILITIES.md` | Coding standards and feature capabilities |
| `docs/guides/` | Setup, deployment, and reference guides |
| `docs/plans/` | Engineering program: vision → RUP → problems → algorithms → flowcharts → SRS → design → 100× roadmap, linked by `TRACEABILITY.md` and checked by `npm run plans:check` ([index](docs/plans/README.md)) |
| `docs/api/` | API documentation and references |
| `docs/architecture/` | Architecture diagrams and decisions |
| `docs/security/` | Security audits and remediation guides |
| `docs/bot/` | Bot framework documentation |
| `docs/project/` | Project context, status dashboards and TODO |
| `docs/archive/` | Historical phase reports, session notes and legacy code notes |

---
## 📄 License

ISC License — See LICENSE file for details.

## 👤 Author

**Arslan Malik** — Built for 24/7 production real estate operations in Dubai/UAE.
