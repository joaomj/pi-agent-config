---
name: implementation-planning
description: Produce a repository-backed implementation plan when the user requests delivery steps for a clear change without implementing it. Use when the user wants a plan instead of code.
---

# Implementation Planning

Use this workflow when the user wants repository-specific implementation steps.
Do not select it merely because the request is uncertain or technically
interesting.

## Ordered Steps

1. State the user-visible goal, plan deliverable, work stages, reason for the
   chosen path, and any decision the user must make.
2. Confirm that the user wants an implementation plan rather than exploration,
   research, a specification, an ADR, or implementation.
3. Identify the ticket or request identifier. Use one when the request provides
   it. Do not require a ticket ID unless repository policy requires one.
4. Inspect current code, tests, repository history, relevant documentation,
   glossary, ADRs, and remote behavior.
5. Confirm that the behavior is clear enough for a plan. Hand unresolved
   product or domain questions to the matching discovery workflow.
6. Build one ordered chain of numbered steps. Every step must depend only on
   the preceding step and must produce one small, concrete outcome.
7. Split work by repository when more than one repository is involved. Use one
   `## Repository: ...` subsection per repository, while keeping one global
   step-number sequence across all repository subsections.
8. Use complete repository-relative paths for every code reference. Include the
   repository name, path, and symbol or line range when known. Never use a bare
   filename or an incomplete directory reference.
9. Write each step so a junior engineer can implement it without further design
   help. State the exact files, symbols, edits, commands, expected result, and
   stop condition.
10. Put a mandatory verification gate after every step. A gate must use an exact
    command or an independent observable check with an exact pass condition. It
    must verify behavior or a durable artifact, not only restate the edit.
11. Do not use optional gates, parallel steps, vague manual approval, or
    "if possible" verification. If no objective gate exists, stop and return
    discovery work instead of writing a plan.
12. Do not start the next step until the preceding gate passes. Record the
    command and result as evidence; stop on failure.
13. Back every step with current files, symbols, and behavior. Mark unknown areas
    as discovery work. Include acceptance criteria, risks, dependencies, open
    decisions, out-of-scope work, the selected established pattern, its
    rationale and trade-offs, and one alternative.
14. Do not create a branch, edit application code, commit, or push while
    planning. The approved plan authorizes those delivery actions in
    `software-delivery`.
15. Write only the user-approved plan file after the user approves that file.

## Plan Acceptance Gate

Reject the draft and revise it before asking for approval if any condition fails:

- The plan has one global numbered chain with no parallel or optional steps.
- Every step has one small outcome and a complete repository-relative path.
- Every step can be implemented from its text without an unstated design choice.
- Every step has a mandatory, objective gate with an exact pass condition.
- Every gate must pass before the next step begins.
- Multiple repositories have separate repository subsections.
- The plan states acceptance criteria, risks, dependencies, open decisions,
  out-of-scope work, and verification evidence.

## Required Step Shape

Use this shape for every step. Keep each field concrete and short:

```markdown
### Step <global number>: <one outcome>
- Repository: `<repository name>`
- Complete paths: `<repository>/<path>::<symbol or line range>`
- Change: <the exact small edit>
- Acceptance criteria: <the observable result>
- Dependency: <the preceding step and its passing gate>
- Pattern: <the established pattern, why it fits, and its trade-off>
- Alternative: <one rejected alternative and why>
- Out of scope: <what this step does not change>
- Risk and rollback: <one concrete risk and safe reversal>
- Gate command or check: `<exact command or independent check>`
- Gate pass condition: <the exact output or observable result>
- Stop condition: <what blocks the next step>
```

Do not replace a command, pass condition, or stop condition with a general
review statement. Do not use a path such as `main.py` when the complete path is
`repository/src/main.py`.

## Deliverable

Return the plain-language strategy and the approved repository-specific plan.
The plan is not implementation and does not create a commit or pull request.

## Side Effects

The only persistent project artifact is the requested plan. Do not create a
branch, edit application code, commit, push, or create a pull request.
