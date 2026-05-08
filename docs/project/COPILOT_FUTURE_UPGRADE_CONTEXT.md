# Copilot Future Upgrade Context

## Why this file exists
This document gives GitHub Copilot Chat enough stable project context to make safe, consistent upgrades over time.

## Project Identity
- Repository: `arslan9024/whatsapp-bot-linda`
- Main domain: WhatsApp-based real-estate operations automation
- Core priorities: reliability, data integrity, command stability, and production-safe updates

## Upgrade Principles
1. **Prefer minimal, surgical edits** in existing modules.
2. **Respect current architecture boundaries** (`Commands`, `Services`, `Routes`, `Database`, `WhatsAppBot`).
3. **Avoid breaking command syntax** used by operational teams.
4. **Do not remove existing branch history**; continue iterative updates on the working branch.
5. **Use pull-request style workflow** for traceable changes before mainline integration.

## Recommended Change Flow for Copilot Chat
1. Read related files first (`README.md`, relevant `code/*` module folders, existing docs in `docs/project`).
2. Identify impacted layers:
   - Bot command layer
   - Service/business logic layer
   - API route layer
   - DB schema/service layer
3. Implement changes in small increments.
4. Run repository checks (`npm run lint`, `npm test`, and targeted scripts if relevant).
5. Update documentation for any behavioral or contract changes.
6. Commit with clear messages and keep PR checklist updated.

## Context Copilot Should Preserve
- This repository has both **bot runtime** and **API runtime** pathways.
- Many features are phase-based and documented in `docs/` and `scripts/`.
- `code/Services` is the main business-logic center; avoid bypassing service abstractions.
- Data model and service consistency are critical for commissions, invoices, analytics, and notifications.
- Multi-bot and session reliability in `code/WhatsAppBot` are operationally sensitive.

## Safe Prompt Template for Future Upgrades
Use this prompt style in Copilot Chat:

- Goal: [feature/fix]
- Scope: [specific folders/files]
- Constraints: [backward compatibility, no command breaking, no schema breaking]
- Validation: [lint/tests/scripts to run]
- Deliverables: [code + docs + checklist/progress]

## Branch and Integration Guidance
- Keep this working branch alive for iterative updates as requested.
- Integrate to `main` through normal review/merge flow (PR-based), not by deleting or replacing this branch.
- Keep changes atomic so each upgrade can be audited and rolled back safely.

## Suggested Files to Review Before Any Major Upgrade
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/README.md`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/package.json`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/code/Commands`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/code/Services`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/code/Routes`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/code/Database`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/code/WhatsAppBot`
- `/home/runner/work/whatsapp-bot-linda/whatsapp-bot-linda/docs/project`

## Current Baseline Caveat
If lint/test binaries are unavailable in the execution environment, install dependencies first (`npm install`) before validation.
