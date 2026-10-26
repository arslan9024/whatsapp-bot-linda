# 01 · Software development plan (RUP)

| | |
|---|---|
| Document | Software development plan |
| Method | Rational Unified Process (RUP), tailored for a one-person team with an AI pair |
| Version | 1.0 — 2026-10-26 |
| Inputs | [Vision](../00-vision/VISION.md), [Risk list](RISK_LIST.md) |

## 1. Why RUP for Linda

RUP has three core practices, and each one fits a project this size:

| RUP practice | What it means for Linda |
|---|---|
| **Use-case driven** | Each terminal menu code or playbook is a use case. A use case is done only when a user can type its number and get the result. |
| **Architecture-centric** | One stable skeleton (adapter, state machines, session store, terminal OS) is proven in Elaboration before features multiply. |
| **Iterative and risk-driven** | Short iterations, each removing the biggest open risk first (account ban, session loss, WhatsApp breakage). |

## 2. Lifecycle: phases and milestones

```text
   Inception ──► Elaboration ──► Construction ──────────────► Transition
   I1            E1  E2           C1   C2   C3   C4             T1
        ▲ LCO            ▲ LCA                       ▲ IOC           ▲ PR
```

| Phase | Goal | Exit milestone | Exit criteria |
|---|---|---|---|
| **Inception** | Agree on what Linda is and whether it is worth building | **LCO** Lifecycle Objectives | Vision approved; problem register with ≥ 20 `PS`; top 10 risks listed; plans structure in place |
| **Elaboration** | Prove the architecture and remove the technical risks | **LCA** Lifecycle Architecture | Master session lifecycle live-verified; WhatsApp adapter boundary in place; algorithms `ALG-001`–`ALG-008` implemented; `plans:check` in CI |
| **Construction** | Build the features as numbered, tested increments | **IOC** Initial Operational Capability | All baseline `PS` Implemented; coverage ≥ 90 % on traced modules; 30 days of the bot running without data loss |
| **Transition** | Make it a dependable release | **PR** Product Release | Install and restore runbook; backups; versioned release; user guide built from playbooks |

Each later roadmap level (`L2`–`L6`) is a new **evolution cycle** that runs
all four phases again at a smaller size.

## 3. Iteration plan (current cycle: L0 → L2)

An iteration lasts 2 weeks or less. It names the problems it closes and ends
with a demo by menu number.

| Iteration | Phase | Theme | Problems closed | Status |
|---|---|---|---|---|
| I1 | Inception | Vision, register, risks, plans system | — (artifacts) | **Done** (this baseline) |
| E1 | Elaboration | Master session: link, restore, relink, honest status — [plan](iterations/E1-master-session.md) | PS-002, PS-003, PS-004, PS-005 | Implemented; live acceptance pending |
| E2 | Elaboration | Architecture baseline: WhatsApp adapter boundary, single instance, state store, terminal OS | PS-001, PS-013, PS-014, PS-015 | Partial |
| C1 | Construction | Self-healing: reconnect with jitter, logout detection, multi-account start | PS-006, PS-007, PS-008, PS-012 | Partial |
| C2 | Construction | Safe messaging: validation, adaptive rate budget, dedupe, scheduler | PS-010, PS-016, PS-017 | Partial |
| C3 | Construction | Insight: streaming report, priority inbox, search | PS-009, PS-018, PS-019 | Partial / Planned |
| C4 | Construction | Contacts and intent: deduplication, intent routing | PS-011, PS-020 | Partial |
| T1 | Transition | Packaging, backup and restore, runbooks, release `v2.0.0` | — | Planned |

The iteration for each problem is also listed in the
[traceability matrix](../TRACEABILITY.md).

## 4. Disciplines and the artifacts they own

| RUP discipline | Artifact in this repo |
|---|---|
| Business modeling | [Vision](../00-vision/VISION.md) §3–4, domain notes in `docs/goraha`, `docs/bot` |
| Requirements | [Problem register](../02-problems/PROBLEM_REGISTER.md), [SRS](../05-srs/SRS.md) |
| Analysis and design | [Algorithms](../03-algorithms/README.md), [Flowcharts](../04-flowcharts/README.md), [Design](../06-design/SOFTWARE_DESIGN.md) |
| Implementation | `src/` (layered as in the design), `tools/` |
| Test | `tests/unit`, `tests/integration`; a `Verification` section in every algorithm |
| Deployment | `npm run dev:24-7`, `docs/delivery`, T1 runbooks |
| Configuration and change management | Git (`main`), [CHANGELOG](../../../CHANGELOG.md), append-only IDs and menu codes |
| Project management | This plan, [Risk list](RISK_LIST.md), [Roadmap](../07-roadmap/ROADMAP_100X.md) |
| Environment | ESLint, Jest, `npm run doctor`, `npm run plans:check`, `.githooks` |

How the effort in each discipline rises and falls across the phases (the
RUP "hump chart"):

```text
                    Inception  Elaboration  Construction  Transition
Business modeling   ████▇▅▂     ▂▁
Requirements        ███████     █████▃▂     ▂▂▂▂▂
Analysis & design   ▂▃▅         ████████    ▅▅▃▃▂
Implementation      ▁           ▃▅▆▆        ██████████    ▃▂
Test                ▁           ▂▃▄▄        ████████      ███
Deployment                                  ▁▂▂           █████
```

## 5. Roles (one person, several hats)

| Role | Played by | Responsibility |
|---|---|---|
| Product owner / stakeholder | Arslan | Vision, priorities, iteration acceptance by live demo |
| Architect | Arslan + AI pair | Design, module ownership, ADRs |
| Algorithm designer | AI pair, reviewed by Arslan | `ALG-nnn` documents, complexity proofs |
| Implementer / tester | AI pair | Code, tests, lint, `plans:check` |
| Release manager | Arslan | Approves commit and push to `main` |

## 6. Definition of done (per problem)

A problem `PS-nnn` is **Implemented** when all of the following are true:

1. `ALG-nnn` and `FC-nnn` are written and match the code.
2. Every `FR` that traces to the problem has an automated test.
3. If the user can trigger it, it has a menu code and counter, and a playbook
   step where the problem is user-facing.
4. `npm test`, `npm run lint` (0 errors) and `npm run plans:check` pass.
5. The CHANGELOG is updated and the traceability row shows the new status.

It is **Live-verified** only after a dated observation on a real account is
recorded in the iteration plan.

## 7. Iteration workflow

```text
pick top-risk PS ─► write/adjust ALG + FC ─► add FR to SRS ─► design module
      ▲                                                        │
      │                                                        ▼
 update status ◄─ demo by menu number ◄─ tests + lint + plans:check ◄─ code
```

## 8. Measurement

Each iteration's demo reports these metrics:

| Metric | Source | Target |
|---|---|---|
| Problems Implemented / total | [Traceability](../TRACEABILITY.md) | Rising each iteration |
| Unit tests passing | `npx jest` | 100 % |
| Lint errors | `npx eslint src tools tests/unit` | 0 |
| Plans integrity | `npm run plans:check` | Pass |
| Master uptime | Dashboard / `4.3 analytics uptime` | ≥ 99.5 % |
| Feature usage | Dashboard counters (`×n`) | Shows which features to deepen |
