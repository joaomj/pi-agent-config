---
name: testing-best-practices
description: Prevent test bloat and select the smallest test set that protects meaningful behavior and plausible regressions. Use when adding, changing, planning, or reviewing tests.
---

# Testing Best Practices

The goal is regression signal, not test count or coverage percentage.

- Follow the repository's existing test strategy and conventions.
- Add a test only when it protects meaningful behavior, an important invariant,
  or a plausible regression.
- Prefer the cheapest stable seam that would detect the defect or behavior
  change.
- Prefer one strong behavior test over many narrow unit tests.
- Do not test trivial wiring, constants, getters, framework behavior, or private
  implementation details.
- Do not add tests only to increase coverage or mirror the implementation.
- Use unit or property tests when complex isolated logic is the best seam.
- Use integration or end-to-end tests when the boundary interaction is the
  behavior at risk.
- Use mocks only when they isolate a real external boundary or make an otherwise
  valuable test deterministic. Do not mock merely to make code easy to test.
- Reuse existing fixtures and harnesses. Do not build new test infrastructure
  unless its expected regression signal justifies its maintenance cost.
- For a confirmed bug, add a regression test only when it is stable, meaningful,
  and likely to prevent recurrence.
- Cover error, authorization, retry, duplicate, or recovery paths only when they
  are material to the behavior.
- Report the tests run, their result, and any behavior that remains unverified.
