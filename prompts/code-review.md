---
description: Review a change for material correctness and regression risks
argument-hint: "[scope]"
---

Review `${ARGUMENTS:-the current change}`.

Inspect the requested diff and enough surrounding code, tests, configuration,
and repository guidance to verify each concern. Review correctness, security,
error handling, compatibility, user-visible regressions, and missing
verification.

Report only actionable findings. Order them by severity. For each finding,
include:

- Precise file and line or symbol
- Current behavior
- User or operational impact
- Recommended correction
- Evidence or reproduction when available

Do not report cosmetic preferences unless they create a material maintenance or
correctness risk. Do not invent findings to fill a report. If no material
finding exists, say so and state any verification gaps.
