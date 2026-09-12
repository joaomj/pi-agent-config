---
name: code-review
description: Review a requested code change for P0 and P1 correctness, security, and regression risks. Use when the user requests a review or the delivery workflow reaches its review gate.
license: MIT
---

# Code Review

Use this skill when the user requests a review or when an approved delivery
workflow reaches the review phase. Do not run it for every code edit.

## Review Scope

- Inspect the requested diff and the relevant current code.
- Report only P0 and P1 findings.
- Group findings by file.
- Omit line numbers.
- Write review comments in the prose of a typical software engineer with concrete references, per `AGENTS.md`. Also avoid comprehensive, crucial, and it is important to note. Do not impersonate a named person or sign as them.
- Explain the current behavior, the impact, and one recommendation that
  addresses the risk.
- Skip cosmetic, speculative, and non-critical suggestions.

## Review Mode

Select the mode before inspecting the diff in detail. Use adversarial review when
one critical trigger exists, or when two or more risk amplifiers exist. Use
standard review otherwise. Report the selected mode and the evidence for it.

### Critical triggers

Any one of these selects adversarial review:

- Authentication, authorization, permissions, or tenant isolation changes
- Secret, credential, encryption, or sensitive-data handling changes
- Destructive operations, data migrations, or irreversible state changes
- Payment, billing, financial, or quota enforcement changes
- Concurrency, locking, idempotency, retry, or duplicate-processing changes
- External input reaches a command, query, template, file path, or deserializer
- Failure recovery, rollback, checkpoint, or partial-execution logic changes
- A fix for a security incident, data-loss event, or repeated production failure
- A public contract change with material compatibility risk

### Risk amplifiers

Two or more of these select adversarial review:

- The change affects a shared module with many callers.
- The change crosses multiple systems or trust boundaries.
- The change adds a new external integration.
- The change introduces a complex state machine.
- The specification has unresolved or conflicting requirements.
- Deployed behavior conflicts with the ticket or specification.
- Verification does not cover the main user-visible failure path.
- The environment prevents meaningful verification.
- The change has a large operational blast radius.
- The implementation uses a new or unfamiliar design pattern.
- The change depends on timing, ordering, eventual consistency, or background
  work.

Diff size alone does not select adversarial review.

### Standard review

Check the diff against the requested behavior, current code, relevant documents,
security boundaries, error handling, and available verification. Reproduce a
confirmed concern at the highest useful black-box seam.

### Adversarial review

Try to disprove that the change is safe and correct:

1. Identify the protected invariants and acceptance criteria.
2. Identify attacker, misuse, invalid-input, retry, concurrency, and partial-
   failure scenarios.
3. Test assumptions against current or deployed behavior.
4. Search for counterexamples to the expected user-visible behavior.
5. Verify the strongest scenarios at a black-box seam.
6. Check rollback, recovery, authorization, data boundaries, and compatibility.
7. Report only evidence-backed P0 and P1 findings.

Adversarial review is a stronger search strategy. It does not lower the finding
threshold and does not turn speculation into a finding.

## Evidence

Check deployed or remote behavior first when available, then local code, updated
documentation, and Jira tickets. Report conflicts between evidence sources.

## Verification

- Reproduce confirmed bugs at the highest useful black-box seam.
- Do not use internal mocks for user-visible behavior.
- Do not create low-signal tests only to increase coverage.
- A clean review states that no P0 or P1 findings were found and records any
  verification gap.
