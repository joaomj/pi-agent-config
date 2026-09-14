---
name: codebase-investigation
description: Explain how the current repository or behavior works through focused read-only investigation, without proposing delivery work unless requested. Use when the user wants explanation without implementation.
disable-model-invocation: true
---

# Codebase Investigation

Use this workflow when the requested result is an evidence-backed explanation
of the current repository, behavior, data flow, or architecture. The question
may be phrased as a bug suspicion, system question, or request to understand a
module. Classify the expected result, not the wording alone.

## Exclude

Use `bug-resolution` when the user wants a fix or root-cause repair. Use
`software-delivery` when the user wants changes. Use the option-comparison
section below when the user wants to compare known alternatives.

## Ordered Steps

1. State the user-visible goal, deliverable, work stages, reason for the chosen
   path, and any decision the user must make.
2. State the specific question being answered.
3. Inspect the smallest useful set of repository files, tests, history, and
   observed behavior.
4. Trace the relevant entry points, data flow, state transitions, errors, and
   external boundaries.
5. Separate observed facts, strong inferences, and unknowns.
6. Explain the current behavior and the evidence for it.
7. State verification gaps and contradictions.
8. Stop.

## Allowed Skills

Invoke `codebase-design` when module depth, seams, or test boundaries matter.
Use focused product discovery when terms or states are ambiguous. Hand a
requested reproduction and repair to `bug-resolution`.

Do not turn an investigation into a design recommendation or plan unless the
user requests that handoff.

## Deliverable

Return a concise explanation with:

- Question
- Current behavior
- Evidence
- Relevant boundaries and failure paths
- Unknowns or verification gaps
- Optional next workflows

## Side Effects

Do not edit project files, create artifacts, create branches, run destructive
operations, or commit changes.

## Option comparison (merged from focused-exploration)

When the user wants to compare a known set of options rather than just explain current behavior: list each option, evidence for/against from the repo, cost/risk/unknowns, and recommend one. Stop there — do not plan implementation or create artifacts unless asked.
