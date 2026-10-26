# Linda program plans

This folder is the engineering plan for Linda. Each document builds on the
one before it, so read them in order. Every item has a stable numbered ID and
can be traced from the vision down to code and tests.

```text
00 VISION ──► 01 RUP ──► 02 PROBLEMS ──► 03 ALGORITHMS ──► 04 FLOWCHARTS ──► 05 SRS ──► 06 DESIGN ──► code + tests
   why         how we      what hurts      how to solve       how it flows       what must    how it is
               work                        (provably)                            be true      built
                                                     07 ROADMAP (×100, gradual) ◄── TRACEABILITY.md (one table, all links)
```

| # | Folder / file | Artifact | Question it answers |
|---|---|---|---|
| 00 | [00-vision/VISION.md](00-vision/VISION.md) | Vision | What is Linda and why does she exist? |
| 01 | [01-rup/RUP_PLAN.md](01-rup/RUP_PLAN.md) | Software development plan (RUP) | Which phases, iterations, milestones and roles? |
| 01 | [01-rup/RISK_LIST.md](01-rup/RISK_LIST.md) | Risk list | What can sink the project and what we do about it |
| 01 | [01-rup/iterations/](01-rup/iterations) | Iteration plans | What is being built in the current iteration |
| 02 | [02-problems/PROBLEM_REGISTER.md](02-problems/PROBLEM_REGISTER.md) | Problem statements `PS-nnn` | What problem must be solved? |
| 03 | [03-algorithms/](03-algorithms/README.md) | Algorithms `ALG-nnn` | Exact numbered steps, invariants, complexity |
| 04 | [04-flowcharts/](04-flowcharts/README.md) | Flowcharts `FC-nnn` (Mermaid) | The same algorithm drawn as control flow |
| 05 | [05-srs/SRS.md](05-srs/SRS.md) | Software requirements spec `FR-nnn` / `NFR-nnn` | What must be true, testably |
| 06 | [06-design/SOFTWARE_DESIGN.md](06-design/SOFTWARE_DESIGN.md) | Architecture and design `M-nn` | Which module owns which algorithm |
| 07 | [07-roadmap/ROADMAP_100X.md](07-roadmap/ROADMAP_100X.md) | Growth roadmap `L0–L6` | How Linda grows ×100 in safe steps |
| — | [TRACEABILITY.md](TRACEABILITY.md) | Traceability matrix | PS → ALG → FC → FR → module → test → menu code |
| — | [templates/](templates) | Templates | How to write the next problem, algorithm or flowchart |
| — | [ARCHIVE/](ARCHIVE/INDEX.md) | Earlier plans | Kept as history, no longer maintained |

## Numbering rules

For the master-account workflow, start with the
[readiness scenario table and algorithm](03-algorithms/ALG-003-master-restore.md),
then the [readiness flowchart](04-flowcharts/FC-003-master-restore.md).
[Live monitoring and reconnect batches](03-algorithms/ALG-006-reconnect-backoff.md)
explain how an online master recovers from later outages. The
[E1 operating checklist](01-rup/iterations/E1-master-session.md) ties these
steps to terminal commands and live acceptance.

The numbers form a contract. Never reuse or renumber an ID; retire it
instead.

| Prefix | Meaning | Example |
|---|---|---|
| `G-n` | Vision goal | `G-1` Total WhatsApp control from the terminal |
| `PS-nnn` | Problem statement | `PS-003` Restore the master from the saved session |
| `ALG-nnn` | Algorithm that solves `PS-nnn` (same number) | `ALG-003` |
| `FC-nnn` | Flowchart of `ALG-nnn` (same number) | `FC-003` |
| `FR-nnn` / `NFR-nnn` | Functional / non-functional requirement | `FR-012`, `NFR-004` |
| `M-nn` | Design module | `M-03` Session store |
| `R-nn` | Risk | `R-01` Account ban |
| `I1`, `E1`, `C1`, `T1` | Iterations: Inception, Elaboration, Construction, Transition | `C2` |
| `L0`–`L6` | Roadmap level | `L2` Assistant |
| `1.16` | Terminal menu code (append-only, already in the product) | `1.16 recover` |
| `P1` | Terminal playbook (problem → numbered steps a user runs) | `p1.2` |

Each problem uses the same number across three documents, so `PS-009`,
`ALG-009` and `FC-009` all describe the conversation report. Menu codes and
playbooks are what the user types into the terminal. The algorithms are what
the code does when they type it.

## Status vocabulary

The same words are used everywhere, so a status claim is never vague.

| Status | Meaning |
|---|---|
| Planned | Written in plans only |
| Partial | Code exists but does not yet meet the algorithm as written |
| Implemented | Code meets the algorithm and has automated tests |
| Live-verified | Observed working against a real WhatsApp account, with the date recorded |

`Implemented` is not `Live-verified`. Never claim live behavior from unit tests.

## Keeping it honest

Run `npm run plans:check` after editing plans. It checks that:

- every problem in the register has its algorithm, its flowchart, at least one
  requirement and a traceability row;
- every algorithm has the required sections;
- every flowchart contains a Mermaid diagram;
- no ID is defined twice, and every FR cited by an algorithm exists in the SRS;
- statuses agree between the register, the algorithm header and the
  traceability row;
- every relative link resolves (except in `ARCHIVE/` and `templates/`).

The same check runs inside `npm test`, so broken plans fail the build.

## How to add work

1. Copy [templates/PROBLEM_TEMPLATE.md](templates/PROBLEM_TEMPLATE.md) into a
   new row of the problem register, using the next free `PS-nnn`.
2. Write `03-algorithms/ALG-nnn-<slug>.md` from
   [templates/ALGORITHM_TEMPLATE.md](templates/ALGORITHM_TEMPLATE.md).
3. Draw `04-flowcharts/FC-nnn-<slug>.md` from
   [templates/FLOWCHART_TEMPLATE.md](templates/FLOWCHART_TEMPLATE.md).
4. Add the `FR-nnn` entries to the SRS and a row to `TRACEABILITY.md`.
5. Assign the module in the design, then schedule it in an iteration.
6. Write the code and tests, add a menu code or playbook if the user can
   trigger it, and update the status.
