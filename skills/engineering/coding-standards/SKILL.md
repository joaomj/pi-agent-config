---
name: coding-standards
description: Apply general implementation standards for correctness, configuration, idempotency, concurrency, security, and maintainability. Use when making code changes.
---

# Coding Standards

## Correctness

- Validate external input at the boundary.
- Preserve invariants with explicit checks.
- Prefer clear early returns over deep nesting.
- Keep side effects visible at the interface.
- Measure before optimizing.

## Configuration

- Keep runtime configuration in a central validated configuration module.
- Do not inline secrets, credentials, URLs, ports, paths, timeouts, thresholds,
  retry counts, or environment-specific values.
- Keep fixed protocol constants and true invariants as named constants.

## Side effects

- Make mutations idempotent and safe to retry.
- Use deduplication keys, transactions, locks, or equivalent controls where
  repeated execution can corrupt state.
- Bound batches, pagination, retries, and long-running loops.
- Prefer dry-run and resume options for risky operations.
- Report attempted, succeeded, skipped, failed, and retriable work for jobs.

## Concurrency

- State thread-safety assumptions.
- Protect shared state and critical sections.
- Use structured concurrency where the language supports it.
- Test ordering, retry, and duplicate-processing behavior when it affects users.

## Security

- Do not commit or log secrets, tokens, or sensitive data.
- Validate authorization at the user-visible seam.
- Use parameterized queries and safe subprocess interfaces.
- Treat external input as untrusted until validated.
