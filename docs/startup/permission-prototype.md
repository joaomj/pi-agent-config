# Lazy permission prototype

## Current result

The isolated prototype passes three focused integration checks with Pi 1.1.0 and permission package 40.1.4.
The [paired comparison](permission-measurements.md) is complete and does not support adopting this boundary. Passing the focused checks does not establish complete protection equivalence.
Working settings remain unchanged. Undo remains deferred.

## Load boundary

Deferring the entire extension would delay its synchronous service and startup lifecycle.
The prototype therefore keeps configuration, trust handling, service publication, forwarding, shutdown, and approval UI eager.
It defers agent-preparation handlers and skill/tool gate components until their first use.

The recipe changes only the installed entry point's loading and construction boundary.
It retains the existing policy, resolver, parser, gate implementations, and service registries.
The wrapper registers events at factory time and directly checks the triggering action after initialization.
Initialization uses shared promises. A failed initialization remains failed until a new extension generation replaces it.
Tool failures use the existing fail-closed boundary. Skill initialization failures produce a visible error and consume the input.

The prototype lives outside Git. The durable recipe is [`prepare.py`](../../scripts/startup-experiment/permission/prepare.py).
It requires the reviewed version and entry SHA256, preserves the upstream license, and references installed dependencies without installing packages.
This is an experiment, not an adopted replacement or an automatically discovered repository extension.

## Approved integration checks

Command owner: [`tests/startup/permission.test.mjs`](../../tests/startup/permission.test.mjs).
The fixture uses real Pi SDK sessions, the real permission engine, and real tools against temporary files.
An offline scripted provider supplies intentions, not permission decisions or tool results.
Random file markers confirm actual allowed reads. Allowed controls prevent blanket denial from passing the checks.

| Check | Observable contract and regression risk | Result |
| --- | --- | --- |
| First-turn protection | Protected direct, shell, nested, and registered custom-tool reads fail; corresponding allowed reads succeed. Direct enforcement must not miss the action that triggers loading. | Pass for unchanged and lazy variants |
| Skills and lifecycle | Denied skills never reach the provider; allowed skills do. Reload and a fresh session apply changed global/trusted-project rules and retain custom extraction and allowed actions. | Pass for unchanged and lazy variants |
| Deferred load failure | Removing a gate module after startup blocks first and later tool calls, including allowed controls. Skill input stops before provider execution and reports the initialization error. | Pass for lazy variant |

The fixture also checks that a sibling extension can synchronously query the session service at startup.
The custom tool registers its path extractor through the real `permissions:ready` service.
Fresh-session verification uses session shutdown and SDK session recreation, not interactive history navigation.

These checks own adapter transport and lifecycle risks that the readiness probe cannot reach.
They do not add production exports, flags, or injection hooks for testing.
The failure scenario changes the isolated package on disk rather than mocking its loader.

Final focused run: **3 tests passed, 0 failed**, 6.6 seconds reported by Node's test runner.
Earlier runs failed in fixture setup: missing custom-model `baseUrl`, initial placeholder model selection, and incorrect nested-result conversion.
Those failures were not evidence of a permission bypass. The final run uses explicit offline model selection and the documented nested outcome.

## Verification gaps

- No complete policy-equivalence audit or upstream full suite.
- No interactive approval-dialog check, headless ask check, or untrusted-project scenario.
- No in-process subagent inheritance or cross-process approval forwarding check.
- No separate resource-reload or agent-preparation initialization-failure scenario.
- No filesystem-cold measurement, larger confirmation, or first-skill timing for the prototype.

The retained eager components constrain this boundary. The measured comparison regresses warm readiness and cache-cold first-tool delay.

## Credential and live-check note

A separate user-run OpenRouter smoke check passed with one small request.
It verifies credentials and transport only; it does not provide permission-test coverage.
The three integration checks use a dummy in-memory credential and make no paid model calls.
No real credential was copied into the repository or the test fixtures.

## Next decision

Do not adopt this boundary. Continue with the separate FFF experiment recorded in the roadmap.
Any different permission boundary needs its own protection and performance evidence.
See the [roadmap](../ROADMAP.md) and [recipe usage](../../scripts/startup-experiment/permission/README.md).
