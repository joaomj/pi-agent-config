# FFF first-use prototype

## Current result

The isolated FFF prototype passes three focused integration scenarios with Pi 1.1.0 and `@ff-labs/pi-fff@0.11.0`.
The three existing permission checks also pass after the shared session fixture changes.
Final focused run: **6 tests passed, 0 failed**, 5.6 seconds reported by Node.
The paired comparison is complete: five warm pairs and five isolated-cache cold pairs, plus two excluded warm-ups.
Warm readiness saves 74.7 ms in the paired median, winning only 3/5 pairs.
Cache-cold readiness regresses 3.3 ms in the paired median, winning only 2/5 pairs.
First file search regresses 316.8 ms warm and 427.8 ms cache-cold, losing all pairs.
The following first content search is faster, but it runs after finder initialization and is not an independent first-use measure.
Do not adopt this measured boundary as a reliable startup improvement.
Evidence: `$HOME/.local/state/pi-startup-experiments/fff-paired-20261012-003515/`.
Working settings and working FFF databases remain unchanged. Undo remains deferred.

## Load boundary

The active setup uses `tools-only`, but the upstream session-start handler still awaits `ensureFinder(activeCwd)`.
Search and autocomplete already use that shared initializer. Native SDK loading is already dynamic.

The prototype removes only the eager session-start finder call and its scan-status work.
Configuration, tool registration, mode restoration, factories, and autocomplete registration remain at startup.
The original picker still awaits `waitForScan(SCAN_TIMEOUT_MS)` on first use.
Search semantics, auxiliary routing, pagination, symlink settings, and index coverage are retained in source.

The first search or autocomplete lookup creates the finder. `/fff-health` and `/fff-rescan` also initialize on first use.
Home-scan warning and status tracking move with finder initialization rather than suggesting that startup already scanned.
Concurrent requests retain the existing shared promises.

Shutdown invalidates pending main creation. A finder that finishes afterward is destroyed instead of attached to the closed session.
The auxiliary pool also rejects use after destruction and destroys a picker created after shutdown.
Autocomplete reports a distinct initialization failure once, then retains the normal fallback provider.
Successful completion clears that error latch. Tool errors remain failed tool results.

Only `src/index.ts` and `src/aux-finders.ts` change in the generated overlay.
The recipe pins the reviewed version and both source hashes. It retains the upstream package and license.
Pi supplies the legacy TypeBox import through its loader alias; no extra dependency installation is needed.
The overlay remains outside Git and outside working extension discovery.

## Approved checks and test value

Primary owner: [`tests/startup/fff.test.mjs`](../../tests/startup/fff.test.mjs).
Each scenario uses a fresh process so the global native SDK cache cannot hide a broken installation.
The scenarios reuse the existing [real Pi session fixture](../../tests/startup/session-fixture.mjs).
Temporary workspaces and private FFF database paths keep working index state untouched.
An offline provider supplies actions; actual Pi hooks, the permission engine, and the native FFF engine execute them.
No production export, flag, or injection hook exists solely for these tests.

| Scenario | Observable contract and credible regression | Result |
| --- | --- | --- |
| First/concurrent search | Real fuzzy file search, content grep, and an outside-workspace auxiliary search succeed in the first turn and on repeat. Deferral must not skip initialization or break concurrent routing. | Pass for unchanged and lazy variants |
| Autocomplete and lifecycle | First autocomplete returns a real indexed file; health/rescan work; override survives reload; fresh sessions work. A pending lazy autocomplete cannot deliver stale results after shutdown, and a fresh finder reopens the same private databases. | Pass; interrupted initialization is checked on lazy only |
| Deferred SDK failure | A broken isolated SDK import produces failed searches and visible command/autocomplete errors. Repeated keystrokes do not repeat the same notification. An unrelated real read still succeeds. | Pass for lazy variant |

The fuzzy query distinguishes FFF override behavior from built-in glob search.
Failure tests alter only the isolated package's import targets, without mocking the loader or native search decisions.
These contracts are not covered by the readiness probe or by the permission checks.

## Verification gaps

- No autocomplete latency measurement; API behavior checks are not terminal timing checks.
- Autocomplete is checked through Pi's provider API, not terminal key handling or display rendering.
- No home/root scan opt-out scenario, symlink scenario, pagination scenario, or large-tree scan timeout.
- No separate auxiliary-creation/shutdown race scenario.
- No full upstream suite or TypeScript check.
- No comparison on a different Pi or FFF version.

## Next decision

Reject this measured first-use boundary. The comparison retains the working permission extension.
Use the separate [compiled permission recommendation](compiled-permissions.md) for the confirmed cache-cold gain.
See the [roadmap](../ROADMAP.md) and [recipe usage](../../scripts/startup-experiment/fff/README.md).
