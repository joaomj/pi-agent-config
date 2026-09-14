---
description: Record a material architecture decision and its trade-offs
argument-hint: "<decision>"
---

Evaluate and record the architecture decision `$ARGUMENTS`.

Create an architecture decision record only when the choice is hard to reverse,
surprising without context, and supported by credible alternatives. Inspect the
current architecture and existing decision convention first. If the threshold
is not met, explain why and stop.

Use the repository's template and location. Otherwise use:

```markdown
# <Decision title>

## Status

Accepted

## Context

## Decision

## Alternatives

## Consequences
```

State constraints, evidence, rejected alternatives, benefits, costs, risks, and
follow-up constraints. Do not invent consensus or requirements. Ask before
writing the durable record when the user's request did not already authorize
file creation. Do not implement the decision.
