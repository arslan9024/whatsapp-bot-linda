# Linda Software Documentation

Formal software documentation of Linda as built. Each document states its date and marks planned work explicitly.
Planning artifacts (vision, RUP plan, problems, numbered algorithms, flowcharts, SRS, roadmap) live in
[../plans](../plans/README.md).

| ID | Document | Contents |
|---|---|---|
| LINDA-SD-001 | [ARCHITECTURAL_BOUNDARIES.md](./ARCHITECTURAL_BOUNDARIES.md) | Product definition, processes, scope, web-app contract, safety limits, data and intelligence boundaries |
| LINDA-SD-002 | [API_REFERENCE.md](./API_REFERENCE.md) | Servers, tokens, idempotency, validation and all 198 REST routes |
| LINDA-SD-003 | [TERMINAL_DASHBOARD_GUIDE.md](./TERMINAL_DASHBOARD_GUIDE.md) | Panels, menu codes, feature IDs F1–F34, playbooks p1–p10, campaign workspace |
| LINDA-SD-004 | [MONGOOSE_SCHEMAS.md](./MONGOOSE_SCHEMAS.md) | All 49 Mongoose models with fields, references and indexes |

## Keeping these documents accurate

`API_REFERENCE.md` route tables and `MONGOOSE_SCHEMAS.md` field tables were generated from the code on 2026-10-26.
When routes, schemas or menu codes change, update the matching document in the same change.
