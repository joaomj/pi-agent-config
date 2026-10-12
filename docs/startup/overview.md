# Pi startup investigation overview

## Current requirements and options

The startup metric is process launch to acceptance of a prompt through the interactive editor. Preserve useful features and permission enforcement. Do not require a Pi fork.

The three solution options are:

- **A — Adopt a better extension.** Compare measured readiness, policy coverage, last-turn undo, compatibility, and migration effort.
- **B — Change current extension settings.** Use supported settings without code changes. Package removal measurements remain diagnostic trade-offs, not feature-preserving fixes.
- **C — Create our own extension inspired by the others.** A lazy-loading adapter or other code change belongs here, not under settings.

The agreed sequence is a supported-settings check under B, followed by a narrow, policy-preserving C experiment if settings do not solve the loading cost. A remains open, but no replacement has demonstrated equivalent protection and a readiness improvement. Tasks and deferred undo scope are recorded in the [roadmap](../ROADMAP.md). Isolated implementations and comparisons are complete. Working settings and installed source remain unchanged.

## Confirmed feature-preserving recommendation

[Compile the current eager permission entry](compiled-permissions.md), rather than remove an extension or defer enforcement.
The final comparison confirms a 1060.7 ms paired median cache-cold saving, with ten wins in ten pairs.
Warm startup and first-use delay show no reliable change. Two real-Pi protection scenarios pass.
The recommendation has a version-pinned rebuild cost and remaining security verification gaps; adoption requires approval.
The measured FFF first-use boundary is not recommended.

## Undo requirement: last turn only

The user requests only undo of the last turn's changes. The undo operation must target the changes from that turn together, not an arbitrary number of recent file edits.

Do not expand the requested feature into older-history navigation, conversation rewind, or a general recovery suite. Existing package capabilities are reference material, not additional requirements.

A turn is one user prompt and all agent work until that response finishes, including internal model/tool steps. Undo covers that turn's local file changes, including shell-created changes, not only edit/write calls. Remote side effects are outside the recovery guarantee. Implementation details for background/subagent attribution, untracked files, staged Git state, and files outside the project remain to be designed. Undo work is deferred; see the [roadmap](../ROADMAP.md).

Snapshot failures, partial recovery, and conflicts with later user edits must remain visible. A successful undo must not silently discard unrelated work. No undo implementation or recovery verification has been performed.

## What was actually measured

The campaign completed 186 warm launches: 160 measured samples and 26 excluded warm-ups. It also completed 160 measured cold launches. All 346 launches succeeded.

The initial matrices contain 20 configurations and five measured launches per configuration in each cache condition. Confirmation contains six configurations and ten measured launches per configuration in each cache condition. The combined optional-integrations-plus-FFF profile appears in confirmation, not the initial matrices.

Working settings remained unchanged. Cases use isolated profiles derived from the active installed configuration, which differs from repository settings. The probe stops before a model request, so these launches incur no model charges.

### Ten-launch confirmation

Savings are differences between case medians and the baseline median in the same batch. They are not guaranteed savings for every launch.

| Configuration | Warm median (ms) | Cold median (ms) | Warm saving (ms) | Cold saving (ms) |
| --- | ---: | ---: | ---: | ---: |
| `baseline` | 1405.1 | 3765.1 | 0.0 | 0.0 |
| `optional-integrations-off` | 1343.0 | 3326.1 | 62.0 | 439.0 |
| `without-pi-claude-directsdk` | 1358.0 | 3511.3 | 47.1 | 253.8 |
| `without-pi-fff` | 1380.2 | 3571.9 | 24.9 | 193.2 |
| `optional-integrations-and-fff-off` | 1256.0 | 3114.9 | 149.1 | 650.3 |
| `terminal-no-replies` | 1472.0 | 3771.5 | -66.9 | -6.4 |

The optional group is Sentry, telemetry, subscription usage, and Claude Direct SDK. Grouped removal wins 10/10 matched rounds in both conditions. Claude-only removal wins 8/10 warm rounds and 6/10 cold rounds. FFF removal wins 8/10 warm rounds and 7/10 cold rounds. Combined removal wins 9/10 warm rounds and 10/10 cold rounds.

These profiles remove features. Their measurements are evidence about cost, not proof that lazy loading will save the same amount.

### All five-launch screening comparisons

Every row below was measured in both warm and cold matrices. These are screening results, not ten-launch confirmation. Compare each row with the baseline in this table, not the confirmation baseline above.

| Configuration | Warm median (ms) | Cold median (ms) | Measured samples per condition |
| --- | ---: | ---: | ---: |
| `baseline` | 1442.1 | 3874.7 | 5 |
| `terminal-no-replies` | 1523.5 | 3958.4 | 5 |
| `quiet-startup` | 1439.2 | 3866.5 | 5 |
| `dark-theme` | 1457.6 | 3809.6 | 5 |
| `fullscreen` | 1516.4 | 3696.6 | 5 |
| `no-mcp` | 1547.0 | 3859.7 | 5 |
| `no-skills` | 1447.4 | 3769.0 | 5 |
| `no-prompts` | 1423.4 | 3711.9 | 5 |
| `no-context` | 1445.9 | 3761.3 | 5 |
| `no-extensions-diagnostic` | 997.7 | 1229.3 | 5 |
| `optional-integrations-off` | 1382.3 | 3648.0 | 5 |
| `without-pi-fff` | 1380.5 | 3622.1 | 5 |
| `without-pi-permission-system` | 1203.1 | 2419.6 | 5 |
| `without-pi-sentry` | 1511.8 | 3936.2 | 5 |
| `without-visual-explainer` | 1468.2 | 3884.8 | 5 |
| `without-pi-attention-span` | 1461.8 | 3685.4 | 5 |
| `without-pi-extensions` | 1440.0 | 3557.4 | 5 |
| `without-pi-telemetry` | 1447.3 | 3813.0 | 5 |
| `without-pi-subscription-usage` | 1414.3 | 3531.4 | 5 |
| `without-pi-claude-directsdk` | 1407.3 | 3640.6 | 5 |

### Conclusions outside permissions

- Quiet startup, dark theme, fullscreen mode, MCP, skills, prompt templates, and context files were measured. The screening results do not justify adopting those changes for speed.
- Every configured package was removed separately in diagnostic profiles. This includes FFF, Sentry, visual-explainer, attention-span, the git-sourced pi-extensions package, telemetry, subscription usage, and Claude Direct SDK.
- Some individual cold package comparisons show potential savings, including subscription usage and the git-sourced pi-extensions package. They have only five samples and were not confirmed separately. Do not rank them as established wins.
- Optional integrations and FFF received the confirmation comparisons above. Their removal reduces functionality.
- Terminal replies were measured both ways. Withholding replies is not a recommended optimization.
- The launcher already enables Node compilation caching. Cold experiments used new Node and jiti caches per launch and cleared reclaimable Linux filesystem caches. Caching was a controlled measurement condition, not a new working-setting change.
- Native startup diagnostics were inspected. `PI_STARTUP_BENCHMARK` includes a 150 ms wait and stops the UI; it does not measure prompt readiness.
- FFF source was inspected. Its SDK import is already dynamic, but `session_start` calls `ensureFinder()` and waits for the scan. Deferring that call has not been implemented or measured.

## Permission and undo research

The cold screening median changes from 3874.7 ms baseline to 2419.6 ms with permissions removed, about 1455.1 ms. The warm screening difference is 239.0 ms. Removing safeguards is diagnostic only, and these differences do not predict lazy-loading savings.

All 61 official catalog entries were collected and classified from published source and metadata. No third-party package was installed or executed. The review distinguishes gates, narrow guards, sandboxes, add-ons, bundles, workflows, and other-host packages.

`@pify/yolo` supplies useful file snapshots and prompt checkpoints, but its existing interface is broader than last-turn undo. File undo counts history entries; Git rewind excludes untracked files and does not restore the index or remote effects. Snapshot writers silently ignore failures. Its design is inspiration, not a validated fit for the narrowed requirement.

## Work not performed

- No alternative permission package was run or benchmarked in Pi.
- No lazy permission or lazy FFF implementation was created or measured.
- No last-turn undo implementation was created or verified.
- First real prompt, first protected tool, and first file search latency were not measured. The current probe measures editor acceptance only.
- The completed [settings audit](settings-audit.md) found no supported feature-preserving setting that defers the permission load or FFF finder initialization.
- No working settings, Pi core files, commits, or remote repositories were changed by the experiments.

## Documentation and raw evidence

This document, the [permission catalog review](permission-catalog.md), and the [settings audit](settings-audit.md) are the durable investigation record.
The [experiment README](../../scripts/startup-experiment/README.md) documents the runner and probe.

Raw evidence remains outside Git under `~/.local/state/pi-startup-experiments/`.
Paths below are relative to that local root, not this document:

- Warm screening: `20261011-ready-matrix/summary.json` and individual launch records.
- Warm confirmation: `20261011-ready-confirmation/summary.json` and individual launch records.
- Cold screening: `20261011-181411-cold-55765/matrix/summary.json` and individual launch records.
- Cold confirmation: `20261011-181411-cold-55765/confirmation/summary.json` and individual launch records.
- Historical warm report: `20261011-results.md`.
- Historical combined report: `20261011-181411-cold-55765/results.md`.
- Catalog archives and provenance: `20261011-permission-catalog-review/`.

These local files are not required to read the findings. They retain the raw evidence for further investigation.
Do not copy logs, package archives, caches, configuration profiles, or credentials into this documentation directory.

The runner sets `PI_TELEMETRY=0` in every measured case. Removing the telemetry package therefore measures its additional loading contribution under that condition, not the full cost of active telemetry.

Caution: Keep experiment output private. Configuration snapshots can contain sensitive settings. Cold reset records prove clearing of reclaimable filesystem caches, not hardware caches or pinned pages. Synthetic terminal replies and approximately 10 ms input-attempt resolution apply.

## Lazy permission follow-up

The isolated gate/agent-preparation boundary passes three focused checks but is not recommended after measurement.
Five paired runs per condition show a 248.0 ms paired warm-readiness regression and a 314.6 ms paired cache-cold first-tool regression.
Cold readiness does not show a consistent gain. Working settings remain unchanged.
See the [measurement record](permission-measurements.md) for method, group medians, paired deltas, and limits.
These instrumented, cache-cold results are not directly comparable with the earlier filesystem-cold medians.
