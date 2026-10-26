# ALG-014 — Terminal screen budget

| | |
|---|---|
| Solves | [PS-014](../02-problems/PROBLEM_REGISTER.md) |
| Flowchart | [FC-014](../04-flowcharts/FC-014-screen-budget.md) |
| Requirements | FR-025, NFR-004 |
| Module | M-07 `src/terminal/TerminalLayout.js` |
| User trigger | Automatic on every render or resize |
| Status | Implemented |

## Problem
Fit five zones (HEADER, FEATURES, INPUT, OUTPUT, PROCESS) into H rows and W
columns. Always keep the input prompt, and keep OUTPUT at or above its
minimum height. When space is short, degrade in a fixed order instead of
scrolling the layout away.

## Input
- `H`, `W`; the desired line counts `h_z` and compact forms `c_z` for each
  zone; `MIN_OUTPUT_ROWS` = 8; `MIN_PROCESS` = 3.

## Output
- The number of rows given to each zone, with Σ ≤ H, and the zone contents
  cut to W.

## Invariants
- I1. Σ allocated rows ≤ H, so the screen never scrolls.
- I2. The prompt row is always visible.
- I3. The degrade order is fixed and documented, so the same (H, W) always
  gives the same layout.

## Algorithm (greedy with a fixed degrade ladder)
```text
1. fixed ← HEADER + FEATURES + PROCESS_min + prompt
2. avail ← H − fixed
3. if avail − h_INPUT < MIN_OUTPUT_ROWS: INPUT ← c_INPUT          # degrade 1: compact board
4. if still short: FEATURES ← 1 line (section tabs only)           # degrade 2
5. if still short: HEADER ← 1 line                                 # degrade 3
6. OUTPUT ← H − (HEADER + FEATURES + INPUT + PROCESS + prompt)
7. truncate every line to W − 2 (panel borders); pad short zones
8. draw with absolute cursor moves (no scroll); the PROCESS log scrolls inside its own region
```

## Complexity
O(Z) to allocate (Z = 5) and O(total lines) to draw.

## Edge cases
1. `H` < 20: every zone uses its compact form and OUTPUT gets whatever is
   left, at least 1 row.
2. Non-TTY (piped output): skip the layout and print line by line.
3. Wide Unicode such as `×` and box-drawing characters: count by code points.
   Emoji are not used in panel borders.

## Current implementation
`TerminalLayout` implements steps 1–3 and 6–8 (INPUT compaction when OUTPUT
would drop below `MIN_OUTPUT_ROWS`). Degrade steps 4–5 are planned.

## Verification
- `TerminalLayout.test.js`: compaction happens when OUTPUT would drop below 8
  rows.
