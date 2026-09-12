---
name: error-handling
description: Design and review explicit error propagation, recovery, logging, and user-visible failure behavior. Use when code handles exceptions, retries, partial work, or external failures.
---

# Error Handling

Every failure must become one of:

- A clear user-visible error
- A specific propagated error with context
- A logged failure with context and re-raise
- A documented recoverable classification and recovery action
- A documented fatal classification

## Rules

- Catch specific exceptions.
- Preserve the original cause when wrapping an error.
- Do not use bare catches or empty handlers.
- Do not return `None`, empty data, or a success response for an unexpected
  failure.
- Include operation, relevant identifier, and recovery context in logs.
- Do not log secrets or sensitive values.
- Distinguish validation errors, transient errors, permanent errors, and
  operator-action errors.
- Make retry behavior explicit and safe.
- Load `coding-standards` for mutation idempotency, concurrency, and security
  rules.

For multi-step work, define what happens after each partial failure. Prefer
checkpointing, idempotency, rollback, or a clear manual recovery path.
