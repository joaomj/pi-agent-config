---
name: software-delivery
description: Orchestrate an approved feature, refactor, configuration, or infrastructure change from intent through verification and optional review or pull request. Use when approved work needs end-to-end delivery.
---

# Software Delivery

Use this workflow after the user approves the behavior and implementation plan,
or for a small clear change that does not need those artifacts. It delivers the
approved change through verification, commit, and push. Pull-request creation is
the only final confirmation point.

## Ordered Steps

1. Confirm the approved PRD, behavior specification, ADR references, tickets,
   implementation plan, and acceptance criteria when they exist.
2. Inspect the exact files named by the plan and the current branch state.
3. Create a branch from `origin/<default-branch>` using repository naming
   conventions. Do not alter the default branch.
4. Execute the plan in order. Each step must pass its gate before the next step.
5. Load `coding-standards`, `error-handling`, `python-tooling`, and
   `testing-best-practices` when applicable.
6. Run the useful user-facing tests and the plan's verification gates. Report
   every failure and verification gap.
7. Run a focused diff self-check against the approved behavior, security
   boundaries, error handling, and repository conventions.
8. Treat P0 and P1 code review as optional. Run the `code-review` workflow only
   when the user requests it or the change has a material review risk. Do not
   make code review an automatic delivery gate.
9. Create commits with the repository's required naming convention. Keep each
   commit small and explain the user-visible result.
10. Push the source branch to `origin`. Treat a successful push as complete.
    Inspect the remote only when the push reports an error or the user asks.
11. Ask the user once whether to create the assigned pull request against the
   detected default branch. Do not create it without that confirmation.

## Progress Contract

- Report progress after each work stage. Group related reads or searches into
  one stage, then report the result before you start the next stage.
- Report before a large batch of searches, edits, or checks, and when the
  approach, scope, or risk changes.
- Explain findings and outcomes in product terms. Use examples or analogies
  when useful.
- Surface every material decision with a recommendation, its reason, and its
  product impact. Ask for approval before substantial or hard-to-reverse changes.
- Do not state time estimates, duration estimates, delivery dates, deadlines, or
  ETAs.
- Report blockers, failures, and verification gaps immediately. Do not hide
  them inside a final summary.

## Approval Boundaries

- Small, clear, reversible work may proceed directly.
- Substantial feature and architecture work needs user approval before edits.
- A specification and implementation plan need approval before delivery when
  they define the behavior or implementation contract.
- Approval of the implementation plan authorizes the branch, edits, tests,
  commits, and push for that approved scope.
- Pull-request creation always needs a separate final prompt.

## Deliverable

Return the requested change, verification evidence, commit, push result, and
remaining gaps. If the final prompt is not approved, stop after push and report
the branch and the exact pull-request command or handoff.

## Side Effects

Only perform side effects allowed by the approved plan and selected route. Do
not push unrelated changes. Do not create a pull request without the final
prompt.
