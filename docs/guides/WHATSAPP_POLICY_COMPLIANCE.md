# WhatsApp/Meta Policy Compliance Guide

This guide is maintained so future work keeps messaging features compliant with WhatsApp/Meta rules.

## Mandatory Rules (Always Apply)

1. Explicit opt-in is required before any bot-initiated message.
2. Honor opt-out immediately (STOP/unsubscribe must be enforced).
3. No unsolicited/spam campaigns and no purchased/scraped contact lists.
4. Rate limiting must remain enforced for all outbound messages.
5. Never bypass limits with multi-account spam distribution.
6. Do not send prohibited content.
7. Keep compliance/audit records for messaging activity.

For full strict policy text and references, also read:
- `COPILOT_CONTEXT.md` → section: **WhatsApp/Meta Policy Compliance — STRICTLY ENFORCED**

## Conversation Metadata Recording (Google Sheets)

The bot supports conversation metadata export to Google Sheets per WhatsApp account.

### Purpose

Track and export:
- Oldest conversation
- Top/latest active conversation
- Conversation with most replies
- Conversations where recipient has not seen our message
- Conversations where recipient never replied

### Configuration

In `.env`:
- `GOOGLE_CONVERSATION_METADATA_SHEET_ID` (optional, falls back to `GOOGLE_SHEET_ID`)
- `GOOGLE_CONVERSATION_METADATA_FLUSH_MS` (default 300000)
- `GOOGLE_CONVERSATION_METADATA_SHEET_PREFIX` (default `Conversations`)

### Output Model

- One spreadsheet can be shared across all accounts.
- One sheet tab is created per account (`<prefix>-<account>`).
- Metadata rows include conversation identifiers, first/last activity, replies, outgoing counts, unread-not-seen counts, and ack status.

### Manual Export Commands

- Terminal: `sheets conversations [spreadsheet-id] [account-phone]`
- WhatsApp bridge: `linda sheets conversations [spreadsheet-id] [account-phone]`
