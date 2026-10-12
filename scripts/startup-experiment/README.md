# Pi startup readiness experiments

Measure process launch to acceptance of a prompt through Pi's interactive editor.
The probe consumes the prompt before Pi sends a model request.

## Run

Requirements: Linux, Python 3, Node.js, and an installed `pi` command.

From the repository root, run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/startup-experiment/run.py
```

For selected comparisons, run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/startup-experiment/run.py --repetitions 10 --cases baseline optional-integrations-off without-pi-claude-directsdk
```

Use `--agent-dir` to select a source configuration. Use `--output` to select a new results directory.
The runner refuses to reuse an existing results directory.

## Cold-cache runs

Use `--cache-state cold --drop-os-caches` for empty compilation caches and cleared Linux filesystem caches.
Run the experiment as your normal user. Authorize sudo before the run with `sudo -v`.
Only the filesystem cache reset uses root privileges.

Caution: `--drop-os-caches` clears reclaimable filesystem caches for the whole machine.
Other applications can become temporarily slower. Avoid concurrent workloads during measurements.
The runner calls `sync`, then writes `3` to `/proc/sys/vm/drop_caches` before each launch.
A failed reset stops the run. The reset occurs outside the measured interval.

Cold runs have no warm-up. Every launch uses a new Node compilation cache and a new temporary directory.
Jiti writes its transformation cache under that temporary directory.
Caches start empty but work normally within each launch. Existing working caches are not deleted.

Without `--drop-os-caches`, cold mode measures empty compilation caches only.
It does not establish filesystem-cold startup time.
Application databases, installed packages, model catalogs, and hardware caches remain unchanged.
Linux does not evict pinned pages when it clears reclaimable filesystem caches.

## Measurement

The runner starts normal interactive Pi in a pseudo-terminal with 120 columns and 40 rows.
It answers terminal queries with a fixed dark palette and terminal capabilities.
After terminal initialization starts, it submits a probe approximately every 10 ms.
Each attempt replaces the editor line. The probe records when Pi accepts the input event.

Python and Node.js use the Linux monotonic clock for the launch and acceptance timestamps.
The metric includes process initialization, resource loading, and interactive input readiness.
It excludes model response time and does not prove that asynchronously connected services are ready.

Each case uses a separate configuration profile with a stable path.
In warm mode, the runner records one warm-up per case and excludes warm-ups from the summary.
It randomizes case order in each measured round with a fixed seed.
The default mode measures warm-cache launches. Cold mode resets caches before each measured launch.

The runner does not use `PI_STARTUP_BENCHMARK`.
That diagnostic stops the UI before it prints timings and includes an extra 150 ms wait.
Its elapsed time is not time to usable Pi.

## Results and recovery

Results default to `~/.local/state/pi-startup-experiments/<run>/`.
The directory contains:

- `manifest.json`: cases, versions, measurement limits, and runner hash.
- `progress.log`: completed launches and final median results.
- `samples.json`: individual measurements, including marked warm-ups.
- `summary.json`: median, minimum, and maximum measured times per case.
- `profiles/`: isolated configuration snapshots.
- Per-launch directories: raw and readable terminal logs, input events, invocation, and acceptance result.
- Copies of the runner, terminal responder, and probe used for the run.

Caution: Keep the results private. Configuration snapshots can contain sensitive settings.
The runner removes copied `auth.json` files after completion or a handled failure.
A forced termination can leave those copies in `profiles/`.
Package installations and read-only resource roots are shared with the source configuration.
Third-party extensions can still write caches or state outside their configuration profile.

## Interpretation

Compare readiness measurements, not the sum of native timing groups.
Native timing rows are checkpoints and can include work outside the named function.
The first extension timing can include discovery before that extension imports.

Permission-disabled and extension-disabled cases are diagnostic only.
Do not use those profiles as startup optimizations.
Removing packages can remove providers, tools, UI features, or safeguards.
Check the saved `active_tools` and configuration before choosing a profile.

The synthetic terminal isolates startup changes; it does not reproduce every terminal emulator.
Confirm a chosen profile in the terminal you normally use before adopting it.

## Recorded investigation

The completed campaign contains 186 warm launches, including 26 excluded warm-ups, and 160 measured cold launches.
The initial matrices compare 20 configurations with five measured launches each.
Confirmation compares six configurations with ten measured launches each.

Measured comparisons include terminal replies, quiet startup, dark theme, fullscreen mode, MCP, skills, prompt templates, and context files.
Each configured package is also removed separately in a diagnostic profile.
Grouped optional integrations and grouped optional integrations plus FFF receive confirmation measurements.
The optional group contains Sentry, telemetry, subscription usage, and Claude Direct SDK.

These profiles derive from the active installed configuration, not necessarily this repository's settings.
The runner sets `PI_TELEMETRY=0` for every case.
Package removal therefore does not measure the full runtime cost of active telemetry.

The [investigation overview](../../docs/startup/overview.md) records all screening medians, confirmation results, research status, and decisions.
The [permission catalog review](../../docs/startup/permission-catalog.md) covers all 61 entries and the last-turn undo requirement.
Raw logs, archives, caches, and configuration snapshots remain outside Git in the private results root.
No alternative permission package, lazy-loading implementation, or undo implementation has been run in this campaign.

### Current decision scope

- **A:** adopt a better extension.
- **B:** change supported settings in the current extension.
- **C:** create our own extension inspired by other implementations.

Code changes, including lazy-loading adapters, belong to C rather than B.
No replacement has a measured readiness advantage and demonstrated equivalent protection.
The agreed sequence starts with supported settings, then a minimal policy-preserving C experiment if needed, and a separate FFF experiment.
The [roadmap](../../docs/ROADMAP.md) records these tasks and deferred undo work.
Working settings remain unchanged.

Undo is limited to the last turn's changes together.
Arbitrary history navigation and conversation rewind are not requested.
A turn is one user prompt and all agent work until its response finishes.
Undo includes that turn's local file changes through shell commands, not only edit/write calls.
Remote effects are outside the guarantee. Undo work is deferred; implementation details remain to be designed.
Snapshot failures, partial restore, and conflicts with later user edits must be reported.
This requirement is not an implemented or verified feature.
