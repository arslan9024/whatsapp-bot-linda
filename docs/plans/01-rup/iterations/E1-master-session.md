# Master WhatsApp account: sessions, terminal control, local analysis

Updated: 2026-10-26
Status: implemented and automatically tested; live acceptance pending.

This is the detailed feature plan linked from [MASTER_PLAN.md](../../ARCHIVE/legacy-plans/MASTER_PLAN.md).
The older [LINDA_BOT_MASTER_PLAN.md](../../ARCHIVE/legacy-plans/LINDA_BOT_MASTER_PLAN.md) is historical context,
not evidence of production readiness.

## 1. Scope and contract

- Run local headless Chromium with a terminal-only workspace.
- Link the configured master explicitly using either QR or a WhatsApp pairing code.
  Do not assume a fixed pairing-code length and do not save a preferred method.
- Keep LocalAuth credentials in the project-local `sessions` directory. Session
  metadata and web cache are local too; no RemoteAuth credential storage.
- Start by automatically restoring enabled saved accounts, including a previous
  failed attempt or authentication-required result.
- Only the WhatsApp `ready` event establishes an active connection.
- Reconnect is not registration. Never display QR/code during restore, delete
  profiles on ordinary failure, or kill unrelated browsers.
- Confirmed logout/authentication failure requires explicit authentication.
- Saved files and phone-side "last active" are not proof of accepted credentials.

## 2. Architecture and ownership

1. Bootstrap reserves project-process ownership before initializing accounts.
2. Startup, terminal recovery and scheduled reconnect use SessionRecoveryService.
3. Concurrent requests for one account join one operation.
4. A profile cannot be opened by two accounts in that process.
5. Close the previous account client before creating its replacement.
6. Reuse the persisted client ID; missing persisted profiles produce a precise
   error, not an automatic switch to another identity.
7. Without metadata, discover the configured profile before a phone-named profile.
8. Bind lifecycle handlers once per client and reject stale client events.
9. Resolve readiness on ready/authentication failure/challenge/deadline/cancellation.
10. Shutdown blocks recovery, drains persistence, and closes managed clients once.

The process guard uses an exclusive loopback TCP reservation derived from the
project's absolute path. It has no HTTP API and accepts no application data.
The OS releases it after a crash. A port collision stops startup with an error;
it never kills the owner. Separate copies of the project and non-bot Chromium
processes remain subject to Chromium's own profile locks. Never delete those
locks based on age.

## 3. State and terminal design

Show independent fields: live connection, local profile, previous linking,
selected profile ID, last error and recovery progress. Keep counts and refresh
deduplication; do not erase QR/code or data-entry prompts.

Account workspace:

1. Device/session details
2. Health
3. Metrics
4. Recover saved session (or active/in-progress explanation)
5. Explicit authentication (only when not active/connecting)
6. Disconnect locally, retaining session (confirmation)
7. Account analytics
8. Conversations: numbered chat list and selected sample analysis

Keep existing direct `link-code`, `link-qr`, `recover`, and `restore-sessions`.
`disconnect <phone>` pauses automatic reconnection for this running process.
Explicit recovery or a restart reconnects; this is not phone-side logout.
Confirmed authentication-required/logged-out state is not erased by disconnect.

## 4. Persistence and privacy

- Write metadata to an exclusive temporary file, flush it, then atomically rename.
- Parse/validate existing metadata; fail visibly without overwriting corrupt data.
- Ignore profiles, caches, metadata, recovery state, temporary metadata and
  optional analysis output in Git. Ignoring does not untrack existing files.
- Session contents must not be printed, committed, uploaded, or included in
  diagnostics exports.
- New metadata uses restrictive POSIX creation mode where supported. Windows ACLs,
  disk encryption, backup software, and cloud folder synchronization are separate
  host controls, not guarantees supplied by LocalAuth.
- A folder under Documents may be synchronized by host software. Confirm it is
  excluded or relocate the whole project deliberately; never silently move or
  merge authentication directories.
- No new cloud credential backup or credential export.

## 5. Conversation-analysis gate and first increment

Analysis requires an active client. Do not auto-import all conversations.

- `chats [phone] [page]`: obtain available chat names/IDs, keep stable numbers
  in memory, and display twenty per page. Refresh page one explicitly.
- `analyze <phone> <chat-number> [limit]`: read only that selected chat's
  available sample, default 100 and maximum 500 messages.
- Deduplicate by message ID within the selected account/chat sample.
- Report incoming/outgoing/media counts, incoming question-mark count and latest
  message direction. These are local statistics, not semantic AI summaries,
  sentiment diagnoses or proof that a question is unanswered.
- Do not print/save message bodies, download attachments, send replies,
  mark chats read explicitly, export data, or invoke external AI.
- Chat numbers expire when the account client changes.
- No additional message-content persistence: no retention/export/delete subsystem
  is needed for this initial read-only sample tool.
- WhatsApp reads still use WhatsApp's network and may expose only partial history.

Future semantic summaries, topics, action items, historical indexing and exports
require a separate design and explicit data/retention approval. External AI is not
enabled by this plan. Existing bot commands/campaigns retain their own behavior;
this sample tool is not a privacy certification of every legacy feature.

## 6. Acceptance and evidence

Automated checks:

- [x] Atomic persistence and corrupt-file preservation.
- [x] Duplicate process ownership and release after process exit.
- [x] Existing recovery/lifecycle/profile/shutdown regressions.
- [x] Paused local disconnect and explicit recovery.
- [x] Numbered terminal action dispatch and confirmations.
- [x] Selected-chat-only analysis, bounded sample, deduplication and no sends.
- [x] Lint, native ESM imports and entrypoint syntax.

Automated evidence: 243 tests passed across 17 focused suites on 2026-10-26.
The suites include native Node persistence tests and a two-process ownership
test, plus mocked WhatsApp transport tests. No live account was started and no
real messages were sent. Local session metadata was removed from Git tracking
while retaining the working file; prior Git history was not rewritten.

Live checks (not replaceable by mocks; do not mark done without evidence):

- [ ] Reach ACTIVE on the actual configured master.
- [ ] Stop and restart without QR/code; same profile reaches ACTIVE.
- [ ] Repeat through nodemon restart.
- [ ] Network interruption recovers without registration or lost credentials.
- [x] Duplicate launch fails without disturbing the running account.
- [ ] Local disconnect remains paused until explicit recovery or restart.
- [ ] Phone-side logout stops retries and requires explicit authentication.
- [ ] Inspect one explicitly selected chat without replies or body logging.
- [ ] Verify host folder synchronization/ACLs and disk protection.

No percentage-based production-readiness claim is justified until these checks
have recorded outcomes. Do not send real messages just to validate recovery.

### Live verification attempt: 2026-10-26, approximately 16:50 +04:00

- Started `npm start` using the VS Code task `Linda: start bot`.
- Startup exited with code 1 because the ownership port was already reserved.
  The listener belonged to an existing `node --no-warnings index.js` process
  started at approximately 16:00. No process was stopped or browser changed.
- Local metadata last written at approximately 16:00 recorded the configured
  master as `auth_required`, retaining client ID `arslan-malik` and its profile.
  This is saved-state evidence, not a fresh live connection check.
- ACTIVE and restart restoration remain unverified. The existing terminal must
  be inspected; if it still requests authentication, explicitly link with QR or
  code before testing a graceful restart. No test messages were sent.
