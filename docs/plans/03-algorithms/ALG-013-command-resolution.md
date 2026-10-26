# ALG-013 — Numbered command resolution (keypad-menu engine)

| | |
|---|---|
| Solves | [PS-013](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-013](../04-flowcharts/FC-013-command-resolution.md) |
| Requirements | FR-022, FR-023, FR-024 |
| Module | M-07 `src/terminal/TerminalNumberMenu.js`, `TerminalPlaybooks.js`, `FeatureCatalog.js`, `TerminalHealthDashboard.js` |
| User trigger | Every line typed in INPUT |
| Status | Partial (codes, playbooks, words and features done; typo suggestions planned) |

## Problem
Turn any typed line into exactly one action, a question for a missing value,
or a short "did you mean" list, the way a keypad-phone operator menu does.
`0` means back and `00` means home everywhere. Field answers are never
mistaken for commands.

## Input
- `line` (a string), the menu tree `T` (codes such as `1.16`), the playbooks
  `P1…P10`, the feature list `F1…Fn`, the command vocabulary `V`, and the
  `pending` question state.

## Output
- One of: `RUN(command)`, `ASK(field)`, `NAVIGATE(node)`, `SUGGEST(list)`,
  `ERROR(message)`.

## Invariants
- I1. **Priority order is fixed.** An answer to a pending question goes
  first, then navigation keys, then playbook steps, menu codes, features,
  commands and suggestions. The first resolver that matches wins, so the
  result is deterministic.
- I2. Menu codes are append-only. An existing code always keeps its meaning.
- I3. Every `RUN` increments exactly one counter (ALG-015).

## Algorithm (chain of responsibility)
```text
1. s ← trim(line)
2. if pending question → ANSWER(s) (validate; on success continue the action)
3. if s = "0" → NAVIGATE(parent); if s = "00" → NAVIGATE(root)
4. if s ~ /^p(\d+)(\.(\d+))?$/   → playbook: list | details | RUN(step command or ASK)
5. if s ~ /^\d+(\.\d+)*$/         → walk T by segments            # O(depth)
       leaf with command → RUN or ASK(missing args); inner node → NAVIGATE
6. if s ~ /^[f#]\d+/              → feature Fn → RUN
7. head ← first word (or the two-word head in MULTI_WORD); if head ∈ V → RUN(s)
8. else SUGGEST(top 3 of V by bounded Levenshtein(head, v) ≤ 2)   # O(|V|·L)
9. if no suggestion → ERROR("unknown — type menu or help")
```

## Complexity
Steps 2–7 are O(L) for an input of length L (code walking is O(depth ≤ 4)).
Step 8 is O(|V| · L · 2) with a banded edit distance. With |V| ≈ 150 this
takes well under 1 ms.

## Edge cases
1. The user types `1.16` while a "Phone number?" question is pending: step 2
   treats it as the answer, which fails validation, and the question is asked
   again (I1).
2. `p1.1` with no master configured: the step's menu code asks for the phone.
3. A number past the last code (`1.99`): ERROR plus the section's valid range.

## Current implementation
Steps 1–7 are implemented in the dashboard input handler, `TerminalNumberMenu`,
`TerminalPlaybooks` and `FeatureCatalog`. Gap: step 8 (typo suggestions).

## Verification
- Unit: `TerminalNumberMenu.test.js`, `TerminalPlaybooks.test.js` and the
  dashboard input tests (playbooks run with the master and are counted).
  Planned: `recovr` suggests `recover`.
