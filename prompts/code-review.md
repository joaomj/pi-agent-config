---
description: Review a change for P0/P1 correctness, security, and regression risks
argument-hint: "[scope]"
---

Review `${ARGUMENTS:-the current change}`.

Inspect the requested diff and enough surrounding code, tests, configuration,
and repository guidance to verify each concern. Review correctness, security,
error handling, compatibility, user-visible regressions, and missing
verification.

Report only substantiated, actionable P0 or P1 findings:

- P0: a release-blocking issue with catastrophic impact, such as widespread outage, irreversible data loss, or a critical security breach.
- P1: an urgent issue that breaks a core user flow or creates substantial security, data integrity, or availability risk.

Assess severity from demonstrated impact and realistic triggering conditions, not hypothetical worst cases.
Exclude P2/P3 issues, cosmetic preferences, refactoring suggestions, and nitpicks. Do not inflate severity to include a finding.
Check whether existing guards invalidate each concern before reporting it.

Order findings by severity. For each finding, include:

- Severity and user or operational impact in plain words
- Precise file and line or symbol, current behavior, and triggering conditions
- Evidence or reproduction that supports the finding
- A concise recommended correction, without a detailed implementation plan

Do not edit files or implement fixes during review.
Do not invent findings to fill the report. If none qualify, say: No P0/P1 findings identified.
State verification gaps separately without presenting them as confirmed bugs or claiming the change is risk-free.
