---
description: Prevent recurring agent mistakes through design, types, or focused checks
argument-hint: "[mistake and scope]"
---

Investigate `${@:-the recurring mistake identified in this conversation}`.

# Correct

Prevent a recurring mistake instead of adding another reminder. Work in the
main agent. Repository instructions and approval requirements still apply.

## Find the recurring mistake

1. Start with the mistake and scope the user named. If neither is clear, ask
   which recurring problem to investigate. Do not start a repository-wide sweep.
2. Read relevant instructions, code, and available evidence from corrections,
   commits, reverts, or reviews. Stay within the current project.
3. Group repeated instances by cause. Cite two occurrences, or label recurrence
   as user-reported when independent evidence is unavailable. Do not invent a
   pattern from one incident.
4. Explain the affected behavior, existing enforcement, and smallest proposed
   correction. Present findings before changing repository files.

## Choose the enforcement

Prefer the smallest mechanism that prevents the demonstrated mistake:

1. **Design.** Give state one owner, remove unsupported paths, and derive copies
   from one source of truth. Do not redesign unrelated code.
2. **Types.** Make the invalid state or unsupported operation unrepresentable
   where the language can express the invariant.
3. **Focused checks.** Use an existing lint, configuration validator, or CI
   check. Name the supported alternative in the error. Use an agent hook only
   for an observable tool or session policy, not subjective code quality.
4. **Behavioral verification.** Exercise the real boundary. Load `test-audit`
   before test work, and obtain approval before adding or changing tests.
5. **Instructions.** Keep a short rule only when enforcement needs judgment or
   cannot cover the mistake. Do not duplicate an effective check's procedure.

A stronger mechanism is not automatically a better investment. Compare its
coverage, maintenance cost, runtime cost, and risk of rejecting valid work.

## Fix and prove

- Implement local fixes only within an approved scope. Ask before expanding
  scope, changing product behavior, or making a material architectural change.
- Work on one coherent mistake class at a time. Do not create commits or
  perform remote writes without explicit approval each time.
- Show that the check rejects a real past mistake or a faithful reproduction,
  then accepts the corrected case. Use an isolated scratch location when needed.
- Run the narrowest relevant check. Ask before full or slow suites. Report any
  unavailable baseline or unverified claim.
- Keep scratch evidence outside Git. Add a durable check only when it provides
  continuing value. A lint is not useful if it merely matches the past example.
- Revise agent instructions only when requested or included in the approved
  scope. Remove a reminder only after proving equivalent enforcement; retain
  policy and recovery information the check cannot explain.
- Do not record private transcripts, ticket IDs, or session artifacts in code
  or commits. Do not mine unrelated projects or start subagents.

## Report

For each class, state the evidence, chosen enforcement, why a more structural
fix was not appropriate, rejected and accepted cases, and remaining gaps.
