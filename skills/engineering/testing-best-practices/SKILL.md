---
name: testing-best-practices
description: Use for test strategy, regression tests, black-box tests, and test review. Prefer the highest useful user-facing seam and real dependencies.
license: MIT
---

# Testing Best Practices

Use this skill when writing, changing, reviewing, or planning tests. The goal
is a strong regression signal, not maximum test count.

## Test Doctrine

- Test the system through the same interface as a user or operator.
- Prefer the highest useful seam: user flow, e2e, integration, then unit or
  property tests for complex pure logic.
- Assert user-visible outcomes: status codes, response bodies, rendered state,
  CLI output, files, logs, or observable events.
- Use real dependencies where practical. A test database, broker, filesystem,
  or local fake external service is acceptable.
- Do not mock or patch internal functions, classes, or modules.
- Test error paths, authorization boundaries, retries, and duplicates when
  they affect users.
- Do not add tests only to increase coverage or to test ordinary wiring.

## Black-Box Boundary

Tests must not inspect private methods, private state, internal call order, or
internal collaborators. Do not use `unittest.mock`, `MagicMock`, `patch.object`,
or `jest.mock` for local code. `pytest.monkeypatch` is acceptable for external
seams such as environment variables, clocks, filesystem locations, and
configuration values.

Use the interface available to a real user:

| Interface | Test boundary |
|---|---|
| Web UI | Browser automation and visible page state |
| HTTP API | HTTP client, status, headers, and response body |
| CLI | Process exit code, stdout, stderr, and files |
| WebSocket or SSE | Client connection and received events |
| Email | Mailbox or local SMTP test service |

## Regression Tests

For a confirmed bug, use the reproduction and hypothesis loop in
`bug-resolution`. This skill owns the test seam and test quality.

1. Reproduce the user-visible failure at the highest useful black-box seam.
2. Confirm the test fails before the fix when the environment permits.
3. Apply the smallest fix.
4. Run the regression test and relevant suite.
5. Record verification gaps and keep the regression test permanently.

Use a unit or property test only when the behavior is complex pure logic or no
higher seam provides a useful signal. A bug does not require an e2e test when a
stronger or cheaper black-box seam exists.

## Feature Tests

1. Identify the user-visible workflow and expected outcomes.
2. Select the cheapest seam that gives a strong regression signal.
3. Cover successful, invalid, unauthorized, and recovery outcomes when they
   matter.
4. Keep assertions at the boundary.
5. Keep tests deterministic, repeatable, isolated, and safe.

## Review Checklist

- The test would fail if user-visible behavior regressed.
- The test uses a real boundary and does not mock internal code.
- The test name describes the behavior or failure it protects.
- The test does not depend on shared user state or live destructive services.
- The test covers the relevant error, authorization, retry, or recovery path.
- The test records what was skipped and why when verification is incomplete.

## Running Tests

Use the repository's supported command and `uv` policy. A live test may use a
running development or staging instance. Do not build a large test harness
before checking whether a small user-facing loop can answer the question.

```bash
uv run pytest tests/e2e/ -q
```

Report the target instance, command, result, skipped checks, and remaining
verification gap.
