---
description: Build an evidence-backed implementation plan before starting a ticket
argument-hint: "<ticket or change>"
---

Create an implementation plan for `$ARGUMENTS`. Do not implement the change.

1. Read the ticket or request, repository guidance, current code, relevant
   tests, documentation, and useful history.
2. State the intended user-visible result and acceptance criteria.
3. Resolve material product or technical unknowns before fixing the design.
4. Describe one coherent implementation strategy. Name repository-relative
   files and symbols when evidence identifies them.
5. Organize the work into important stages. Include dependencies, risks, open
   decisions, and out-of-scope work.
6. Put a deterministic verification gate between important dependent stages.
   Each gate must state the exact command or observable check and its pass
   condition. Do not add gates after trivial edits.
7. Include final verification for the complete user-visible behavior.

Return the plan in chat by default. If the user explicitly requests a file,
keep planning and implementation-plan artifacts local and untracked. Never
stage or commit them. Do not create a branch, edit application code, commit, or
push while planning.
