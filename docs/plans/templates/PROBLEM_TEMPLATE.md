# PS-nnn template

Add one summary row to the
[problem register](../02-problems/PROBLEM_REGISTER.md):

```markdown
| PS-nnn | <What hurts, in one line> | <menu code / playbook / automatic> | G-n | Planned | <iteration> |
```

Then add a detail block below the summary:

```markdown
### PS-nnn — <Title>
<Who suffers, when, and what it costs.> **Solved when:** <a testable,
measurable condition with numbers, without describing the solution>.
```

Rules:
- Describe the pain, not the fix. The fix goes in `ALG-nnn`.
- "Solved when" must be checkable by a test or a dated live observation.
- Use the next free number. Never reuse a retired one.
