# Roadmap

## Current priority

Improve Pi startup while preserving useful features and permission enforcement.
Undo work is deferred. The agreed undo scope is recorded below; do not implement it in the startup work.
A compiled eager permission entry confirms a cache-cold startup improvement without removing extensions. See the [compiled permission record](startup/compiled-permissions.md). Routine warm startup has no reliable gain. Working settings and installed source remain unchanged; adoption requires approval.

## Startup improvements

### Goal and constraints

Measure process launch to acceptance of a prompt through the interactive editor.
Measure first-use delay separately so faster startup does not hide unacceptable deferred work.

- Preserve the current protection policy, including secret paths, shell-mediated access, and nested/custom tools.
- Preserve useful tools and provider features; package-removal profiles are diagnostic comparisons, not proposed defaults.
- Use isolated profiles and recoverable measurements. Keep working settings unchanged during experiments.
- Do not require a Pi fork.
- Keep raw logs, caches, archives, configuration snapshots, and credentials outside Git.
- Obtain separate approval for new tests and full or slow verification suites.

The available options remain:

- **A — Adopt a better extension.** Requires compatible behavior, protection coverage, and a measured readiness benefit.
- **B — Change current extension settings.** Use supported configuration without code changes.
- **C — Create our own extension inspired by others.** Code changes, including lazy-loading adapters, belong here.

### Completed evidence

- [x] Build a readiness probe that consumes input before a model request.
- [x] Complete 186 warm launches, including 26 warm-ups, and 160 measured cold launches.
- [x] Compare presentation, terminal replies, MCP, skills, prompts, context, individual packages, and grouped integrations.
- [x] Inspect FFF and current permission startup paths; identify eager work despite existing dynamic imports.
- [x] Collect and classify all 61 permission-catalog entries from published source and metadata without running them.
- [x] Record measurements, uncertainty, compatibility exclusions, and recovery locations in the repository documentation.

The isolated lazy permission boundary has been benchmarked and is not recommended. No replacement package has been benchmarked.
The [settings audit](startup/settings-audit.md) found no supported feature-preserving deferral setting for permissions or FFF.

### Completed: supported settings check — B

- [x] Inspect supported permission and FFF settings for ways to defer startup work without losing protection or useful features.
- [x] Report why supported settings cannot solve the loading boundary in the [settings audit](startup/settings-audit.md).
- [x] Decide whether a settings benchmark is applicable: no feature-preserving candidate was found, so no settings benchmark was run.

**Deliverable:** a bounded settings decision, not another broad catalog search.

### Evaluated: minimal lazy permission prototype — C

The settings audit establishes this condition. The prototype retains the eager service/lifecycle boundary and defers gate and agent-preparation components. See the [prototype record](startup/permission-prototype.md) for passing checks and verification gaps.

- [x] Create a minimal extension boundary that retains the current permission policy rather than rewriting its security engine.
- [x] Register enforcement before the editor becomes usable and check the first triggering action directly.
- [ ] Complete behavior verification for input, skill/resource, agent preparation, lifecycle, trust, and shutdown. The focused checks cover skills, reload, fresh sessions, trusted-project policy, and startup service access; other cases remain unverified.
- [x] Block protected actions if initialization fails; report the failure instead of allowing execution.
- [x] Verify the first action, shell-mediated secret access, nested/custom calls, and failure behavior with approved checks.
- [x] Compare readiness and first-use latency: 20 measured launches and two warm-ups. The boundary regresses warm readiness and cache-cold first-tool delay; see the [measurement record](startup/permission-measurements.md).

**Deliverable complete:** measurements and focused protection evidence support rejecting this boundary. Other security cases remain unverified; do not expand this unsuccessful candidate into a larger verification task.
Keep undo out of this prototype so its startup effect remains interpretable.
Retain the current setup if the prototype weakens enforcement or only moves an unacceptable delay to first use.

### Evaluated: FFF as a separate experiment

- [x] Prepare an isolated first-use boundary for finder creation and scanning; keep startup registration and the original permission extension.
- [x] Preserve shared initialization and scan wait in source; pass focused search, autocomplete, command, lifecycle, and failure checks. See the [FFF prototype record](startup/fff-prototype.md) for remaining gaps.
- [x] Compare readiness and first file/content search separately: 20 measured launches and two warm-ups. No consistent cache-cold readiness gain; first file search slows in every pair. Autocomplete timing remains unmeasured.

**Deliverable complete:** reject the measured first-use boundary as an adoption candidate. The [FFF record](startup/fff-prototype.md) contains costs and coverage limits.

### Confirmed: eager compiled permission entry — C

- [x] Compile the existing engine without a new gate design or deferred enforcement.
- [x] Preserve original source locations and host helper identities; avoid the full SDK barrel.
- [x] Pass the existing first-action and lifecycle protection checks.
- [x] Confirm 1060.7 ms paired median cache-cold saving with ten wins in ten pairs.
- [x] Verify first-use receipts, unchanged tool lists, empty isolated auth stores, and source/license retention.
- [x] Record [concrete adoption steps](startup/compiled-permissions.md) and unverified security cases.

This is the measured feature-preserving recommendation for cache-cold startup, not a warm-start speed claim.

### Adoption decision

- [x] Update the findings with measured gains, first-use costs, protection coverage, and remaining gaps.
- [x] Compare A, B, and C: no proven replacement or supported-setting fix; C has a confirmed compiled-entry gain and rebuild cost.
- [ ] Obtain approval before changing working settings or adopting a replacement.

Do not adopt a package solely because it has fewer dependencies, a compiled entry, or an undo feature.

## Deferred: undo the last turn's local file changes

**Status:** scope agreed; implementation and further undo work deferred.

### Agreed scope

- A turn is one user prompt and all agent work until that response finishes, not each internal model/tool step.
- One undo operation restores that turn's local file changes together.
- Coverage includes shell-created changes, not only calls to `edit` and `write`.
- Preserve changes that existed before the turn and do not silently overwrite later user edits.
- Remote side effects are outside the recovery guarantee.
- Do not add older-history navigation, conversation rewind, or a general recovery suite.

### Requirements when work resumes

- [ ] Design how to identify the last turn's local changes, including shell effects, without discarding unrelated work.
- [ ] Resolve attribution for background/subagent changes and handling of untracked files, staged Git state, and files outside the project.
- [ ] Make snapshot failures, conflicts, and partial recovery visible; never report complete recovery when it failed.
- [ ] Evaluate useful snapshot mechanisms from other extensions without adopting their broader interfaces or silent failure behavior.
- [ ] Verify recovery with separately approved checks before offering it as a reliable feature.

These tasks are deferred and are not part of the current startup prototype.

## Evidence and related documentation

- [Startup investigation overview](startup/overview.md): all screening and confirmation results, limits, and local evidence locations.
- [Permission catalog review](startup/permission-catalog.md): all 61 entries, loading behavior, coverage differences, and recovery risks.
- [Experiment runner](../scripts/startup-experiment/README.md): readiness metric, isolated profiles, cache conditions, and operational cautions.

- [Permission prototype](startup/permission-prototype.md): load boundary, approved check results, and remaining verification gaps.

- [FFF prototype](startup/fff-prototype.md): focused checks and a rejected measured first-use boundary.
