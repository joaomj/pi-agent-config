---
name: coding-standards
description: Apply hard-won implementation safeguards for error handling, configuration, file size, logging, idempotency, interruption recovery, concurrency, security, and maintainability. Use when making code changes.
---

# Coding Standards

Follow repository-specific conventions before these global rules. Apply each
rule where the behavior exists; do not add machinery for hypothetical needs.

## Errors and recovery

- Never swallow an unexpected error or exception.
- Catch specific errors. Preserve the original cause when wrapping.
- Give failures one explicit outcome: a user-visible error, a contextual
  propagated error, or a contextual log followed by re-raise.
- Do not convert unexpected failures into `None`, empty data, or success.
- Distinguish validation, transient, permanent, and operator-action failures
  when callers need different responses.
- Define partial-failure behavior for multi-step work. Use checkpointing,
  resume, rollback, or a clear manual recovery path when interruption matters.
- Make retried mutations idempotent. Use deduplication keys, transactions,
  locks, compare-and-set, or an equivalent guard when duplicates can corrupt
  state.
- Bound retries and backoff. Preserve the final error when retries end.

## Configuration and constants

- Put environment-specific values in environment variables or a central,
  validated configuration module.
- Do not hardcode credentials, deployment URLs, ports, paths, timeouts,
  thresholds, retry limits, or environment-specific identifiers.
- Keep true domain invariants and protocol constants in code as named constants.
- Validate configuration at startup or at the owning boundary. Fail with the
  missing or invalid setting name and a corrective action.

## Logging and observability

- Log the operation, relevant identifiers, outcome, and recovery context.
- Use the repository's structured logging conventions and severity levels.
- Do not log secrets, tokens, credentials, or unnecessary sensitive data.
- Do not log and suppress an error. Re-raise or return an explicit failure.
- For batch or resumable work, report attempted, succeeded, skipped, failed,
  and retriable counts when those outcomes exist.

## Size and design

- Keep each hand-written source file at or below 1,000 physical lines.
  Generated, vendored, fixture, snapshot, and migration files are exempt.
- Do not grow an existing oversized source file. Extract a coherent
  responsibility when it is in scope; otherwise report the constraint.
- Split by responsibility and interface, not by arbitrary line ranges.
- Prefer clear control flow, narrow interfaces, and visible side effects.
- Do not add abstractions for hypothetical variation or refactor unrelated code.

## Correctness, concurrency, and security

- Validate untrusted input at the boundary and preserve explicit invariants.
- Bound loops, pagination, batches, queues, and memory growth.
- State concurrency assumptions when shared state or ordering matters.
- Protect critical sections and test retry, ordering, and duplicate behavior
  when users can observe them.
- Check authorization at the user-visible boundary.
- Use parameterized queries and safe subprocess argument interfaces.
- Measure before optimizing.
