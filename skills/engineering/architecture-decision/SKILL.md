---
name: architecture-decision
description: Record a hard-to-reverse architectural choice, its alternatives, and accepted trade-offs. Use when a durable design decision needs future explanation.
disable-model-invocation: true
---

# Architecture Decision Workflow

Use an ADR only when all three conditions apply:

1. The decision is hard to reverse.
2. The choice is surprising without its context.
3. Real alternatives and trade-offs were assessed.

Do not create ADRs for routine implementation choices or temporary plans.

## Ordered Steps

1. State the user-visible goal, decision deliverable, work stages, reason for
   the chosen path, and any decision the user must make.
2. Define the architectural question and the constraints that make it material.
3. Inspect current behavior, repository structure, relevant domain terms, and
   existing decisions.
4. Invoke `research` or `codebase-design` only when that evidence is needed.
5. Compare credible alternatives and their trade-offs.
6. Select a recommendation or report that the ADR threshold is not met.
7. Obtain approval before writing a durable ADR.
8. Link the ADR from current technical context when one is created.

Do not turn an architecture discussion into implementation planning unless the
user requests that handoff.

## Record

Use `docs/adr/NNNN-<short-title>.md` in the target repository:

```markdown
# <Decision title>

## Status

Accepted

## Context

What problem and constraints forced this decision?

## Decision

What option was selected?

## Alternatives

What reasonable alternatives were assessed, and why were they not selected?

## Consequences

What benefits, costs, risks, and constraints are accepted?
```

Keep product requirements in the ticket or specification. Keep current system
facts in `tech-context.md`. Link this ADR from the technical context index.
