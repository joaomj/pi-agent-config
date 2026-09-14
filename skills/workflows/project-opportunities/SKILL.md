---
name: project-opportunities
description: Identify and prioritize evidence-based opportunities to improve or extend an existing project. Use when returning to a project and asking what to do next, what to improve, or what features to add.
disable-model-invocation: true
---

# Project Opportunities

Use this workflow when the user wants to decide what is worth doing next in an
existing project. The result is a small, evidence-backed opportunity map, not a
general audit, roadmap, implementation plan, or code change.

## Exclude

Use `codebase-investigation` when the user only wants current-system facts.
Use the option-comparison behavior in `codebase-investigation` when the user
wants to compare a known set of options.
Use `codebase-design` when the user specifically wants structural code
improvements. Use `implementation-planning` when the user has selected the work
and wants repository-specific implementation steps.

## Ordered Steps

1. State the user-visible goal, deliverable, work stages, reason for the chosen
   path, and any decision the user must make.
2. State the project decision being supported: what should be improved, added,
   deferred, or stopped next.
3. Reconstruct the project snapshot from the smallest useful evidence set:
   current behavior, working tree, recent history, documentation, tests,
   plans, tickets, and available remote behavior.
4. Separate observed facts, strong inferences, stated intentions, and
   speculative ideas. Do not treat TODOs or old plans as commitments.
5. Identify opportunities across user value, reliability and safety, user
   experience, maintainability, documentation, operations, and new features.
6. Keep only three to five credible candidates. Each candidate must include:
   - The user or project problem
   - Evidence from the repository or observed behavior
   - Expected value
   - Cost, risk, and dependencies
   - Confidence and important unknowns
7. Rank the candidates by value, urgency, evidence, effort, risk, and
   dependency. Recommend one next opportunity and explain why it comes first.
8. Put lower-value or speculative ideas in a short deferred list.
9. State contradictions, missing evidence, and verification gaps.
10. Stop. Offer `codebase-investigation`, `implementation-planning`, or another
    matching workflow as a handoff only when useful.

## Allowed Skills

Invoke `codebase-design` when a candidate concerns module boundaries, seams, or
testability. Use focused product discovery when product terms, entities, or
states are unclear. Invoke `research` when an opportunity depends on external facts.
Invoke `testing-best-practices` when verification risk materially affects the
ranking.

These skills support the opportunity assessment. They do not authorize code
changes or change the deliverable.

## Deliverable

Return a concise report with:

- Project snapshot
- Current strengths and constraints
- Three to five opportunity candidates
- Recommended next opportunity
- Reasons it should come next
- Deferred ideas
- Unknowns and verification gaps
- Optional next workflow

Do not produce a complete backlog, generic cleanup checklist, product
requirements document, architecture decision, or implementation plan unless the
user explicitly requests that handoff.

## Side Effects

Do not edit project files, create tickets, specifications, ADRs, plans, branches,
commits, or pull requests. Read-only inspection and safe verification commands
are allowed.
