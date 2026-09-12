---
name: bug-resolution
description: Resolve incorrect, failing, slow, or broken behavior through reproduction, diagnosis, minimal repair, regression protection, and verification. Use when the user wants a bug fixed.
---

# Bug Resolution

Use this workflow when the user wants a broken behavior understood or fixed.
Separate diagnosis from repair. Do not begin with a theory.

## Ordered Steps

1. State the user-visible goal, requested deliverable, work stages, reason for
   the chosen path, and any decision the user must make.
2. Build a feedback loop at the highest useful black-box seam.
3. Reproduce the exact user-visible symptom.
4. Minimize the reproduction without losing the failure.
5. Generate three to five ranked, falsifiable hypotheses.
6. Test one variable at a time and preserve exact errors and outputs.
7. Turn the reproduction into one black-box regression test when a useful seam
   exists.
8. Apply the smallest fix within the approved scope.
9. Re-run the original scenario, regression test, and relevant verification.
10. Remove temporary diagnostic artifacts and report any blocked verification.

## Allowed Skills

Invoke `testing-best-practices` for the regression seam, `error-handling` for
failure classification and recovery, and `coding-standards` for idempotency,
concurrency, and security.

For a medium or high complexity fix, offer `/write-postmortem` after the root
cause and verification evidence are complete. Do not create the postmortem
automatically because it is a user-invoked workflow.

## Deliverable

Return the reproduction command and result, minimized scenario, tested
hypotheses, root cause, fix, regression test, verification evidence, and gaps.

## Side Effects

Temporary diagnostic artifacts and approved code or tests are allowed. Do not
commit or create a pull request unless explicitly requested.
