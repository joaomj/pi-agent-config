# Startup settings audit

## Result

Option B does not provide a supported setting that defers the main permission load or FFF finder initialization while preserving current behavior.
Proceed to the conditional option C investigation. This is a source/configuration finding, not a measured speed result or a completed prototype.
Working settings remain unchanged. Undo work remains deferred.

Scope: installed `@gotgenes/pi-permission-system@40.1.4` and `@ff-labs/pi-fff@0.11.0`.
The active configuration was inspected without copying its policy or configuration snapshots into Git.

## Permission extension

The configuration schema is a strict object. Its supported fields contain no lazy-loading, startup-deferral, or forwarding-polling disable option.
The entry point statically imports the service, policy, gate, configuration, and presentation graph before reading configuration.
A runtime setting therefore cannot prevent that graph from loading.

| Settings | Observed effect | Startup conclusion |
| --- | --- | --- |
| `debugLog` | Controls verbose log writes; already false in the active global config | No additional debug-disable change available |
| `permissionReviewLog`, `reviewLogFieldMaxWidth` | Control audit output and field size | Disabling audit changes a retained feature and does not defer static loading |
| `yoloMode`, `permission`, `shellTools`, `piInfrastructureReadPaths` | Change approvals, policy, shell aliases, or infrastructure exemptions | Do not weaken or reshape policy as a startup optimization |
| `doublePressToConfirm`, `permissionDialogKeys`, `promptNotifications`, `promptMaxRows`, `promptFieldMaxWidth` | Control approval dialog behavior | No service/load deferral |
| `forwardingTimeoutMs` | Bounds how long a child waits for an unanswered ask | Does not disable or defer forwarding initialization |
| `authorizerChain` | Selects optional reviewers; already empty in the active global config | No reviewer chain to remove |
| `toolInputPreviewMaxLength`, `toolTextSummaryMaxLength` | Deprecated and ignored | No runtime optimization |
| `$schema` | Editor/schema metadata | No startup optimization |

The factory primes global configuration. Session startup resets state, refreshes trust-aware configuration, reports issues, and activates the permission service.
`before_agent_start` separately triggers best-effort Bash parser warming without awaiting it.
The parser is already dynamically imported; there is no supported setting that makes the rest of the entry graph lazy.

Do not turn audit logging off merely to make an unverified startup claim. Its load and write costs have not been benchmarked separately.

### Primary source references

Paths are relative to the reviewed permission package:

- `src/config/config-schema.ts`: `unifiedConfigSchema`, supported fields and strict validation.
- `src/config/extension-config.ts`: `PermissionSystemExtensionConfig`, defaults, and normalization.
- `src/index.ts`: static imports, factory composition, global config refresh, and event registration.
- `src/handlers/lifecycle.ts`: `handleSessionStart`, configuration reporting, and service activation.
- `src/handlers/session-turn-prep.ts`: non-blocking parser warmup and per-turn refresh.
- `src/logging/session-logger.ts`: call-time log settings, not a load-time import switch.

Public package: [@gotgenes/pi-permission-system@40.1.4](https://www.npmjs.com/package/@gotgenes/pi-permission-system/v/40.1.4).

## FFF

The active global configuration already sets `mode: tools-only`.
That removes editor autocomplete from the active mode but does not skip finder initialization.
The session-start handler calls `ensureFinder(activeCwd)` after preparing the session in every mode unless that cwd is opted out of indexing.
The picker then waits for a scan using the package's fixed `SCAN_TIMEOUT_MS`.

| Settings, flags, or environment options | Observed effect | Startup conclusion |
| --- | --- | --- |
| `mode`, `--fff-mode`, `PI_FFF_MODE` | Select tools-and-ui, tools-only, or override behavior | No lazy mode; tools-only is already selected and still initializes |
| `enableFsRootScanning`, `--fff-enable-root-scan`, `FFF_ENABLE_ROOT_SCAN` | Allow or refuse indexing when cwd is filesystem root | Disabling indexing there removes FFF access rather than deferring it |
| `enableHomeDirScanning`, `--fff-enable-home-scan`, `FFF_ENABLE_HOME_SCAN` | Allow or refuse indexing when cwd is the home directory | Does not defer a normal project scan; home opt-out disables FFF for that cwd |
| `followSymlinks`, `--fff-follow-symlinks`, `FFF_FOLLOW_SYMLINKS` | Change which files the index can reach | Can reduce search coverage; not a behavior-preserving lazy switch |
| `warnOnHomeDirScan`, `--fff-warn-home-scan`, `FFF_WARN_HOME_SCAN` | Control the home-scan warning | Does not defer scanning |
| Database paths, `--fff-frecency-db`, `--fff-history-db`, `FFF_FRECENCY_DB`, `FFF_HISTORY_DB` | Select persistence locations | No startup-deferral control; moving databases changes state/storage conditions |
| `PI_FFF_MULTIGREP` | Enable an additional multi-grep tool | Does not gate session-start finder creation |

Root/home scan opt-outs are not general search-exclusion controls and are not a solution for the measured project-directory startup.
The configuration schema accepts no scan-timeout or lazy-initialization option.
Changing mode or scanning coverage solely for speed is not recommended.

### Primary source references

Paths are relative to the reviewed FFF package:

- `src/config.ts`: `FffConfig`, `CONFIG_KEYS`, validation, and supported modes.
- `src/index.ts`: `resolveStartupConfig`, flag registration, `prepareSession`, and the `session_start` handler.
- `src/file-picker.ts`: `FilePickerFactory.create` and `waitForScan(SCAN_TIMEOUT_MS)`.

Public package: [@ff-labs/pi-fff@0.11.0](https://www.npmjs.com/package/@ff-labs/pi-fff/v/0.11.0).

## Conditional prototype constraints

The source inspection identifies requirements, not a complete adapter design:

- Keep enforcement registered before readiness and check the first triggering action directly. Late factory registration alone can miss the current dispatch.
- Preserve skill-input checks before agent execution; ordinary input and skill invocation have different paths.
- Preserve configuration validation and reporting, project trust, agent preparation, reload, session changes, and shutdown.
- Preserve the session-scoped service and ready-event behavior used by other extensions. Synchronous service queries cannot simply become asynchronous without a behavior change.
- Treat startup service registration, forwarded requests, and custom-tool extractors as part of the load boundary, not optional details.
- On initialization failure, block protected actions with a visible error. Do not release the triggering action after failed or incomplete registration.

Evidence: `src/handlers/permission-gate-handler.ts`, `src/service.ts`, and `src/service/service-lifecycle.ts` in the reviewed permission package.
The adapter must resolve these constraints before it can be described as feature-preserving.

## Verification status and next step

No settings were changed, no alternative package was run, and no new benchmark was started.
There is no feature-preserving setting candidate to benchmark from this audit.

The existing readiness probe consumes input before an agent/model run. It does not verify protected tool execution, skill handling, or initialization failure.
The user approved three end-to-end scenarios at the real Pi boundary. They now pass; see the [prototype record](permission-prototype.md).
Those checks must include allowed control actions so accidental blanket denial cannot masquerade as correct enforcement.

See the [roadmap](../ROADMAP.md) for the task sequence and the [overview](overview.md) for measured results.
