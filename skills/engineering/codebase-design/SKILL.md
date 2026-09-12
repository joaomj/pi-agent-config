---
name: codebase-design
description: Evaluate module interfaces, seams, adapters, depth, locality, and testability. Use when choosing a design, refactor boundary, or high-signal test seam.
---

# Codebase Design

Codebase design answers: "Where should complexity live, and what interface
should hide it?"

## Vocabulary

- **Module**: anything with an interface and an implementation.
- **Interface**: everything a caller must know, including errors and invariants.
- **Seam**: the place where behavior can change without editing the caller.
- **Adapter**: a concrete implementation that fills an interface.
- **Depth**: behavior provided per unit of interface a caller must learn.
- **Locality**: how much related change, knowledge, and verification stay together.

Use this vocabulary consistently.

## Method

1. Identify the caller and the behavior it needs.
2. Apply the deletion test: would deleting the module remove complexity, or only
   move it to every caller?
3. Inspect whether the interface is smaller than the implementation.
4. Prefer one strong external seam for user-visible behavior.
5. Do not add an abstraction for hypothetical variation. One adapter is a
   possible seam; two adapters show a real variation.
6. Compare at least two established designs when the decision is material.
7. State the selected design, trade-offs, and alternative.

The interface is the test surface. If a test must reach behind it, explain why
the current interface cannot express the behavior and whether that is a design
problem.

## Result

Return:

- Current module and interface
- Main source of shallow design or coupling
- Candidate seam
- Recommended design and pattern
- Trade-offs
- Alternative
- Test seam
- Whether an ADR is justified
