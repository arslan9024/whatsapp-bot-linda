# 01 · Risk list

Each risk has an **exposure = probability (1–5) × impact (1–5)**. IDs are
permanent, so the table is listed by ID. RUP iterations attack the highest
exposure first. The current order is R-02 (16), then R-01 and R-03 (15),
then R-04 (12).

| ID | Risk | P | I | Exposure | Mitigation (problem / algorithm) | Owner iteration |
|---|---|---|---|---|---|---|
| R-01 | WhatsApp bans or limits the account for automated sending | 3 | 5 | **15** | Adaptive token-bucket budget, jitter, number validation, no unsolicited bulk sending (`ALG-010`, `ALG-017`) | C2 |
| R-02 | A WhatsApp Web update breaks `whatsapp-web.js` | 4 | 4 | **16** | One adapter boundary (`M-02`), pinned version, smoke check on start, degrade per feature | E2 |
| R-03 | Session credentials are lost or corrupted on a crash or restart | 3 | 5 | **15** | Atomic write with fsync and rename, generation counter, restore check (`ALG-005`) | E1 |
| R-04 | The phone revokes the linked device without Linda noticing | 3 | 4 | 12 | Classify logout and device removal and show `needs authentication` (`ALG-002`, `ALG-007`) | C1 |
| R-05 | Two bot instances fight over the same browser profile | 2 | 5 | 10 | OS-level loopback port lease (`ALG-001`) | E2 |
| R-06 | Reconnect storms (thundering herd) when many accounts reconnect at once | 3 | 3 | 9 | Decorrelated jitter backoff, circuit breaker, startup concurrency limit (`ALG-006`, `ALG-008`) | C1 |
| R-07 | Memory grows without limit (caches, chat lists, Chromium) | 3 | 3 | 9 | Bounded LRU+TTL caches, streaming aggregation, browser count limit (`ALG-009`, `ALG-016`) | C2 |
| R-08 | Wrong recipient or duplicate message is sent | 2 | 4 | 8 | E.164 validation, idempotency key per send, preview before bulk (`ALG-010`, `ALG-016`) | C2 |
| R-09 | Scope creep stalls delivery ("100× everything at once") | 4 | 2 | 8 | Roadmap levels, one theme per iteration, definition of done | All |
| R-10 | Private message content leaks to third parties | 1 | 5 | 5 | Local-first rule, secret scan, redacted logs (`NFR-006`) | E2 |
| R-11 | A single maintainer is a bus factor | 3 | 3 | 9 | Plans plus playbooks make the system learnable; `plans:check` keeps them current | T1 |

Review this list at the start of every iteration. Close risks by moving them
to the bottom with a dated note and the evidence.
