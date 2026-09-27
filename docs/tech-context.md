# Technical context and engineering decisions

## Purpose and authority

This document is the single source of truth for the intended architecture, engineering decisions, and operating model of this Pi configuration.
It describes this instance, not every feature that Pi supports.

Executable configuration and source files implement these decisions. Links below identify the implementation for each topic.
If configuration and this document disagree, report the discrepancy and update both when the decision changes.
Do not silently treat an implementation difference as a new decision.

Keep this document current when changing agent responsibilities, model assignments, permissions, dependencies, or installation behavior.
Keep credentials, transcripts, temporary plans, and machine-local caches out of this document and Git.

## Operating model

This repository is installed as the user's global Pi configuration, normally at `~/.pi/agent`.
There is one global multi-agent configuration per computer user. We do not maintain project-specific agent definitions as part of this setup.
`PI_CODING_AGENT_DIR` can relocate the configuration directory.

The repository is shared between the personal Asus Vivobook and Mac-mini. These machines are intended to use the same model/provider set.
Other computers can have different provider access. The repository currently has no machine-specific model selection layer.
Check provider authentication and agent model resolution when installing on another computer.

Pi and the extension still support project-level overrides. This repository does not disable that capability; it simply does not rely on it.
Run Pi from the project to work on that project's files while loading these global definitions.

### Collaboration contract

Treat the user as a product manager:

- Lead with user outcomes, deliverables, scope, and trade-offs.
- Handle routine technical choices independently within the agreed scope.
- Ask before expanding scope or changing a product decision.
- Explain material effects on user behavior, risk, cost, or delivery in plain words, with a recommendation.
- Include implementation details only when they explain a decision, risk, or verification result, or when requested.

These rules do not waive approval requirements for tests, Git operations, or external changes.
[AGENTS.md](../AGENTS.md) contains the full collaboration and engineering rules.

## Main agent and delegation

The main agent coordinates work, supplies task context, checks delegated results, and communicates with the user.
Subagents have narrow responsibilities. Delegation is useful when it separates independent work or contains investigation context, not for every small action.

A typical bug-fix sequence is:

1. Explorer locates relevant code when needed.
2. Debugger establishes the symptom and cause.
3. Planner defines deliverables, acceptance criteria, and trade-offs.
4. Implementer applies the agreed change.
5. The main agent checks the reported outcome and verification evidence.

Handoffs return through the main agent. This sequence is a working convention, not an automatically executed pipeline.
No custom agent enables nested delegation. Scripted workflows are disabled.
Reviewer is not a mandatory stage after implementation or before merging.

### Agent responsibilities and models

| Role | Responsibility and output | Model | Thinking | Worktree |
| --- | --- | --- | --- | --- |
| [Explorer](../agents/explorer.md) | Brief code map: files, symbols, connections, and search limits | `meta/muse-spark-1.3-contributor` | `xhigh` | Off |
| [Debugger](../agents/debugger.md) | Diagnosis: symptom, cause, evidence, impact, and uncertainty | `meta/muse-spark-1.3-contributor` | `xhigh` | Off |
| [Planner](../agents/planner.md) | High-level structured plan: outcomes, deliverables, trade-offs, risks, and scope | `openai-codex/gpt-6-astra` | `max` | Off |
| [Implementer](../agents/implementer.md) | Scoped implementation and outcome/verification report | `meta/muse-spark-1.3-contributor` | `xhigh` | Required |
| [Reviewer](../agents/reviewer.md) | Substantiated P0/P1 findings with user impact first | `openai-codex/gpt-6-astra` | `medium` | Off |

These assignments are user-selected cost, speed, and reasoning trade-offs. They are not comparative benchmark results.
Muse handles exploration, diagnosis, and implementation. Astra handles planning and independent review.

All five definitions use `prompt_mode: append` to inherit the parent's instructions and approval rules.
This is system-prompt inheritance, not automatic inheritance of the full conversation.
The caller must provide sufficient task context; conversation inheritance is a separate option.

Only Implementer has the built-in `edit` and `write` tools.
The other roles retain shell access and are instructed not to change project state.
That instruction is not a filesystem security boundary. Extensions also load by default; built-in tool lists do not restrict every extension tool.

### Planning and review decisions

Planner follows the product-oriented approach in [`/plan`](../prompts/plan.md).
It investigates enough technical context to ground its recommendations, but does not return code-level implementation instructions by default.
The plan is returned as structured text. A requested plan file stays local and untracked; Planner hands its content to the coordinating agent.

Debugger does not fix code or design the implementation plan.
If reproduction requires changes, it reports that need rather than making the changes.
It separates confirmed causes from hypotheses.

Implementer can choose routine implementation details. It stops affected work when scope or a product decision must change.
It reports delivered outcomes and whether observable acceptance criteria were met.

Reviewer runs only before opening a pull request or when the user requests review.
Both Reviewer and [`/code-review`](../prompts/code-review.md) use these thresholds:

- **P0:** release-blocking, catastrophic impact, such as widespread outage, irreversible data loss, or a critical security breach.
- **P1:** urgent failure of a core user flow, or substantial security, data integrity, or availability risk.

Severity requires evidence and realistic triggering conditions. Do not inflate severity to include a finding.
Exclude P2/P3 findings, style preferences, refactoring suggestions, and nitpicks.
Report verification gaps separately; no P0/P1 findings does not mean the change is risk-free.

## Multi-agent runtime settings

[Global subagent settings](../subagents.json) define:

| Setting | Value | Decision |
| --- | --- | --- |
| `maxConcurrent` | `4` | Limit simultaneous ordinary background work; queue excess runs |
| `defaultMaxTurns` | `20` | Bound prolonged runs without imposing a very small initial allowance |
| `graceTurns` | `3` | Allow a short wrap-up period after the turn limit |
| `showModel` | `true` | Make effective model and thinking assignments visible |
| `worktreeIsolation` | `true` | Permit isolated implementation work |
| `workflowsEnabled` | `false` | Keep initial orchestration simple |
| `disableDefaultAgents` | `true` | Avoid overlap with built-in Explore, Plan, and general-purpose |
| `fallbackSubagent` | `none` | Reject unknown types instead of silently substituting another role |

A turn is a model response, not necessarily one tool call. The limit is not a token, time, or spending cap.
At the limit, the extension requests a final answer and permits the grace turns before aborting.
The 20-turn value is a default; a caller or agent definition can override it.

The four-agent limit is not universal. Foreground runs have a separate limit, left at the extension's unlimited default.
Workflow agents use a separate pool, but workflows are disabled here.

Background execution, session persistence, and output transcripts remain at extension defaults.
Remembered agent sessions and transcripts are local runtime data, not repository artifacts.
Model-scope enforcement is not explicitly enabled. Do not treat `enabledModels` as a hard subagent allowlist.

Use `/agents` to inspect agent types, running work, and actual resolved models.
Its Settings menu writes project overrides; edit this repository's `subagents.json` for shared global decisions.
Restart Pi after changes that affect registered tools or advertised agent types.

## Isolation, preservation, and approvals

Implementer's frontmatter pins `isolation: worktree`.
The other four agents pin `isolation: off` so they inspect the current checkout, including uncommitted changes.

A worktree starts from committed repository state. It does not include staged or uncommitted changes from the main checkout.
Do not assume an implementation agent can see unfinished parent edits.

When an implementation run finishes, pi-subagents removes its temporary worktree.
If the run changed files, the extension preserves them in a local branch with an automatic commit.
This automatic local preservation commit is explicitly authorized. It is not permission to push, merge, or create other commits.
Review the returned branch and verification evidence before integrating changes. Integration still requires approval.

Worktrees separate working copies; they are not security sandboxes.
An agent with shell access can leave its assigned directory, so the prompt also prohibits changes to the original checkout.
A preservation branch enables recovery but does not prove correctness.

[Permission configuration](../extensions/pi-permission-system/config.json) complements the instructions:

- General operations are allowed unless a more specific rule applies.
- Sensitive credential paths are denied or require approval.
- Destructive commands, installation commands, Git mutations, and many remote writes require approval.
- Permission review logging is enabled; its logs are ignored by Git.

Do not assume these rules inspect every internal operation performed by an extension.
The documented approval policy remains applicable even when no interactive prompt appears.

## Search architecture

FFF supplies local code search through [`@ff-labs/pi-fff`](../npm/package.json).
Its [global configuration](../pi-fff.json) selects `tools-only`:

- `fffind` discovers file paths.
- `ffgrep` searches file contents.
- Native Pi search tools and editor autocomplete remain available.

This avoids replacing autocomplete used for agent mentions and requires no separate MCP server.
Explorer, Debugger, Planner, and Reviewer explicitly prefer FFF. The main agent inherits the same preference from `AGENTS.md`.

Keep `rg` and `fd` for exact checks, unsupported searches, and fallback when FFF is unavailable.
Read source context to verify fuzzy matches. Ranked, paginated, or incomplete results do not prove absence.
Use pagination when complete coverage is required.

FFF builds an index for the session working directory and can search other paths. It is not a workspace sandbox.
Indexing and native loading costs can increase with concurrent sessions.
The default local database directory, `fff/`, is ignored by Git. Existing Neovim databases or environment overrides can change the location.

CLI and environment options can override `pi-fff.json`; a saved session mode can also affect resumed sessions.
Use `/fff-mode` and `/fff-health` to inspect effective behavior after startup.

## Main-session configuration and extensions

[settings.json](../settings.json) selects `meta/muse-spark-1.3-contributor` with `xhigh` thinking as the main-session default.
Its enabled-model list also includes Astra at `low` and Luna at `max`.
These main-session choices do not replace the explicit thinking levels in agent frontmatter.

Agent frontmatter model and thinking values take precedence over caller overrides in pi-subagents.
If a pinned model cannot resolve, the extension can inherit the parent model rather than fail.
Inspect the effective model on each newly configured computer; do not assume a pin guarantees availability.

[models.json](../models.json) sets local metadata overrides for all three models:
250,000 context tokens and 64,000 maximum output tokens. Muse also has a 300-second short prompt-cache value.
These are client-side declarations, not proof that a provider accepts every requested limit.
Automatic compaction keeps 20,000 recent tokens and reserves 64,000 tokens.

### Installed capabilities

Exact package versions are maintained together in [settings.json](../settings.json), [npm/package.json](../npm/package.json), and [the lockfile](../npm/package-lock.json).
Use those files for version numbers rather than a second version inventory here.

| Package or local extension | Purpose |
| --- | --- |
| `@tintinweb/pi-subagents` | Role-based delegation, agent management, and worktree preservation |
| `@ff-labs/pi-fff` | Indexed local code search |
| `donsetch` | Web search, fetch, crawl, and screenshots |
| `@gotgenes/pi-permission-system` | Local permission policy and approval prompts |
| `@kiranpg/pi-sentry` | Installed Sentry integration; no instance-specific setup is described here |
| `pi-usage-meters` | Usage display integration |
| `pi-open-tui` | Terminal UI customization through [open-tui.json](../open-tui.json) |
| [btw.ts](../extensions/btw.ts) | `/btw`: a tool-free side question using a conversation snapshot and the selected model |
| [exit.ts](../extensions/exit.ts) | `/exit`: alias that requests Pi shutdown |

The UI uses fullscreen mode. Model selection, authentication, and session management remain Pi responsibilities.
`/btw` uses low reasoning and does not perform new tool work or continue the main task.

[Prompts](../prompts/) provide reusable user commands; [skills](../skills/) provide task-specific instructions.
They do not replace agent role boundaries or approval requirements.

## Installation and synchronization

[README.md](../README.md) contains the user-facing installation and update commands.
[scripts/sync.mjs](../scripts/sync.mjs) implements the process.

1. Detect OS and Node.js architecture before synchronization changes files.
2. Accept Linux or macOS on x64/arm64. On Linux, identify glibc or musl.
3. Check runtime requirements, repository state, upstream configuration, and file collisions.
4. Fetch upstream and back up tracked configuration, patches, and Git history under `~/.pi/backups/`.
5. Replace tracked configuration with the upstream revision.
6. Install the Pi version from [.pi-version](../.pi-version) if needed.
7. Install locked packages in a temporary directory with lifecycle scripts disabled.
8. Verify installed versions and the selected platform's FFF native package and library import.
9. Check donsetch's platform binary, then activate the staged packages and verify extension loading and CLI startup.
10. Restore previous packages if activation verification fails.

The OS-specific step selects the native package; the backup, dependency installation, and verification stages remain shared.
Absent optional packages for other platforms are allowed. The selected FFF native package must exist and match the lockfile.
Donsetch can download its locked release binary and verifies the release checksum.

**Caution:** sync replaces tracked local changes and local commits with upstream after creating a backup.
It is not a merge-based update. Untracked and ignored files remain unless they conflict with incoming tracked paths; collisions stop sync.
Generated `npm/node_modules` is replaced by the installation process.
A package failure preserves or restores the prior packages, but does not revert configuration already reset to upstream.

Use `node scripts/sync.mjs --install` to install the current local configuration without fetching or resetting tracked files.
Use the normal sync command only when upstream replacement is intended.

Change package pins and regenerate the lockfile together. Do not use `pi update --extensions` to synchronize machines; it bypasses this repository's lockfile.
Do not change global npm settings to install this configuration.

## Verification and remaining limits

Verification completed during this setup:

- Agent frontmatter, model/thinking assignments, role tool lists, and isolation settings were checked.
- Global JSON configuration, package pins, and lockfile alignment were checked.
- Linux x64/glibc installation and repeat installation succeeded.
- Nine extensions loaded and CLI startup completed without a model request.
- FFF's native engine found expected files and content in this repository.
- Three existing focused tests passed: npm failure preservation, extension-load rollback, and manifest/settings mismatch rejection.
- Script syntax and whitespace checks passed.

Not yet verified:

- Installation and native search on the Mac-mini, ARM64 Linux, or musl Linux.
- Model-driven execution of the five custom roles with their pinned models and thinking levels.
- FFF tool availability and behavior inside a live delegated session.
- The complete diagnosis-to-plan-to-implementation handoff and automatic preservation commit path.
- A full test-suite run after these changes.

Do not present configuration validation as proof of those runtime behaviors.
Ask before adding tests or running full or slow suites, as required by `AGENTS.md`.
