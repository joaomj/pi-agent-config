# Technical context and engineering decisions

## Purpose and authority

This document is the single source of truth for the intended architecture, engineering decisions, and operating model of this Pi configuration.
It describes this instance, not every feature that Pi supports.

Executable configuration and source files implement these decisions. Links below identify the implementation for each topic.
If configuration and this document disagree, report the discrepancy and update both when the decision changes.
Do not silently treat an implementation difference as a new decision.

Keep this document current when changing permissions, dependencies, or installation behavior.
Keep credentials, transcripts, temporary plans, and machine-local caches out of this document and Git.

## Operating model

This repository is installed as the user's global Pi configuration, normally at `~/.pi/agent`.
There is one global configuration per computer user. We do not maintain project-specific definitions as part of this setup.
`PI_CODING_AGENT_DIR` can relocate the configuration directory.

The repository is shared between the personal Asus Vivobook and Mac-mini. These machines are intended to use the same model/provider set.
Other computers can have different provider access. The repository currently has no machine-specific model selection layer.
Check provider authentication and model resolution when installing on another computer.
The local package path must point to an existing development checkout on that computer.
Do not replace those sources with npm packages merely because the paths differ.

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

## Single-agent workflow

The main agent does all work directly and communicates with the user.
There is no delegation, no isolated worktrees, and no scripted workflows.

A typical bug-fix sequence is:

1. Locate relevant code when needed.
2. Establish the symptom and cause.
3. Define deliverables, acceptance criteria, and trade-offs.
4. Apply the agreed change.
5. Check the outcome and verification evidence.

### Planning and review decisions

Planning follows the product-oriented approach in [`/plan`](../prompts/plan.md).
Investigate enough technical context to ground recommendations, but do not return code-level implementation instructions by default.
The plan is returned as structured text. A requested plan file stays local and untracked.

Separate diagnosis from fix planning. If reproduction requires changes, report what is needed rather than making unrelated changes.
Separate confirmed causes from hypotheses.

Implementation can choose routine implementation details. Stop affected work when scope or a product decision must change.
Report delivered outcomes and whether observable acceptance criteria were met.

Run [`/code-review`](../prompts/code-review.md) only before opening a pull request or when the user requests review.
It uses these thresholds:

- **P0:** release-blocking, catastrophic impact, such as widespread outage, irreversible data loss, or a critical security breach.
- **P1:** urgent failure of a core user flow, or substantial security, data integrity, or availability risk.

Severity requires evidence and realistic triggering conditions. Do not inflate severity to include a finding.
Exclude P2/P3 findings, style preferences, refactoring suggestions, and nitpicks.
Report verification gaps separately; no P0/P1 findings does not mean the change is risk-free.

### Testing decisions

Test work follows the [`test-audit`](../skills/engineering/test-audit/SKILL.md) skill: gate each new test at write time and run audits as focused sweeps. Prefer a few end-to-end black-box tests per `AGENTS.md`. Run the narrowest check that proves the change and ask before full or slow suites. In this repository, sync checks run with `node --test tests/sync.test.mjs`.

## Approvals

[Permission configuration](../extensions/pi-permission-system/config.json) complements the instructions:

- General operations are allowed unless a more specific rule applies.
- Sensitive credential paths are denied or require approval.
- Destructive commands, installation commands, Git mutations, and many remote writes require approval.
- Permission review logging is enabled; its logs are ignored by Git.

Do not assume these rules inspect every internal operation performed by an extension.
The documented approval policy remains applicable even when no interactive prompt appears.

## Search architecture

FFF supplies local code search through `@ff-labs/pi-fff`, declared in [settings.json](../settings.json).
Its [global configuration](../pi-fff.json) selects `tools-only`:

- `fffind` discovers file paths.
- `ffgrep` searches file contents.
- Editor autocomplete remains available.
- Native Pi search tools can be called directly or through codemode.

This avoids replacing autocomplete used for agent mentions and requires no separate MCP server.
Prefer FFF as defined in `AGENTS.md`.

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
Its enabled-model list also includes Sol at `high`, Luna at `xhigh`, and Astra at `low`.

[models.json](../models.json) sets local metadata overrides for Muse, Sol, Luna, and Astra:
250,000 context tokens and 64,000 maximum output tokens. Muse also has a 300-second short prompt-cache value.
These are client-side declarations, not proof that a provider accepts every requested limit.
Automatic compaction keeps 20,000 recent tokens and reserves 64,000 tokens.

### Installed capabilities

[settings.json](../settings.json) is the authoritative package list.
Published npm packages use unversioned sources and update to latest releases on an explicit update.
The official [`visual-explainer` Pi package](https://pi.dev/packages/visual-explainer) uses the `npm:visual-explainer` source in [settings.json](../settings.json).
The permission package retains its local development source.
Missing local sources are errors, not reasons to substitute published packages.
Pi generates npm manifests and lockfiles locally; these installation records are not tracked.
Machine-local `deviceId` and `lastChangelogVersion` values must not enter shared settings commits.

| Package or local extension | Purpose |
| --- | --- |
| `@ff-labs/pi-fff` | Indexed local code search |
| `donsetch` | Binary for native MCP web search, fetch, crawl, and screenshots; package extension disabled |
| `@gotgenes/pi-permission-system` | Local permission policy and approval prompts |
| `@kiranpg/pi-sentry` | Secret redaction for inputs, tool output, and session messages |
| `pi-usage-meters` | Usage display integration |
| `pi-open-tui` | Terminal UI customization through [open-tui.json](../open-tui.json) |
| `pi-claude-directsdk` | Claude Code subscription transport; retained because native Anthropic sign-in warns of per-token extra usage |
| `visual-explainer` | HTML visualization skill, prompt commands, and native renderer for diagrams, reviews, tables, and slide decks |
| [claude-codemode.ts](../extensions/claude-codemode.ts) | Request-local JSON fallback for native codemode on Claude DirectSDK only |
| [btw.ts](../extensions/btw.ts) | `/btw`: a tool-free side question using a conversation snapshot and the selected model |
| [exit.ts](../extensions/exit.ts) | `/exit`: alias that requests Pi shutdown |

`defaultTools: ["+codemode"]` adds codemode to Pi's default `read`, `bash`, `edit`, and `write` tools.
`codemode.mode: "on"` keeps direct tool declarations visible.
Direct calls handle simple actions; codemode can batch calls and filter large results.
The inline declaration budget stays at Pi's default 3,000 estimated tokens.
Batching and output filtering can reduce conversation overhead; savings are not guaranteed.

[mcp.json](../mcp.json) connects DonSeTch through Pi's built-in MCP extension.
The launcher resolves its binary from `PI_CODING_AGENT_DIR`, or `~/.pi/agent` when unset.
The server uses `codemode` exposure and a 620-second request timeout for long crawls.
The package resource filters disable DonSeTch's custom extension to avoid duplicate connections and tools.
Native tools use names such as `mcp__donsetch__web_fetch`; codemode can discover their declarations.
FFF remains a native extension, not an MCP connection.
The MCP server manager is available through `/mcp`.
Claude DirectSDK rejects grammar-based tools. A request-local compatibility extension replaces native codemode's OpenAI-only grammar with best-effort JSON schema input for that provider.
The extension does not change authentication, billing, stored history, or strict requirements on other tools.
Other providers keep native codemode's original declaration.
MCP OAuth credentials and rotated logs are ignored by Git.

The `visual_explainer` render actions write HTML pages to `~/.agent/diagrams/` and open them in the browser by default.
PPTX export is optional and best-effort. On this instance, an npm override resolves `pptxgenjs` to `4.0.0`.
The audit still reports two high-severity denial-of-service advisories in its transitive `image-size@1.2.1` dependency (`GHSA-5p2g-fcmc-qvqq` and `GHSA-w3rx-r6r6-pgpr`).
Do not use PPTX export with untrusted images. The override is in generated, ignored npm files and can be replaced by package updates; check the advisories again after updates.

The UI uses fullscreen mode. Model selection, authentication, and session management remain Pi responsibilities.
`/btw` uses low reasoning and does not perform new tool work or continue the main task.

[Prompts](../prompts/) provide reusable user commands; [skills](../skills/) provide task-specific instructions.
They do not replace approval requirements.

## Installation and synchronization

[README.md](../README.md) contains the user-facing installation and update commands.
[scripts/sync.mjs](../scripts/sync.mjs) implements the process.

1. Detect OS and Node.js architecture before synchronization changes files.
2. Accept Linux or macOS on x64/arm64. On Linux, identify glibc or musl.
3. Check runtime requirements, repository state, upstream configuration, and file collisions.
4. Fetch upstream and back up tracked configuration, patches, and Git history under `~/.pi/backups/`.
5. Replace tracked configuration with the upstream revision.
6. Check that configured local package sources exist.
7. Bootstrap the latest Pi under `~/.local` if needed, or use Pi's native self-update.
8. Back up managed npm files and use Pi's native package update command.
9. Check the selected FFF native package, its library import, and DonSeTch's binary.
10. Verify extension loading and CLI startup without a model request.
11. Restore managed npm files if package installation or verification fails.

The installer removes inherited `PI_OFFLINE` from online update commands.
Pi's version lookup treats any nonempty value, including `0`, as offline.
The installer disables npm lifecycle scripts through command settings and child-process environment.
Package updates replace generated npm manifests and installed packages with a fresh installation from `settings.json`.
DonSeTch's binary check can download its release and verifies the release checksum.
Pi's self-update is separate from package recovery and is not rolled back.
Updates run only when explicitly requested; normal launches do not update installed packages.
Machines updated on different days can use different latest releases.

**Caution:** sync replaces tracked local changes and local commits with upstream after creating a backup.
It is not a merge-based update. Untracked and ignored files remain unless incoming paths conflict; collisions stop sync.
A package failure restores managed npm files but does not revert configuration already reset to upstream.

Use `node scripts/sync.mjs --install` to update the current local configuration without fetching or resetting tracked files.
Use the normal sync command only when upstream replacement is intended.
Do not change global npm settings to install this configuration.

## Verification and remaining limits

Completed checks:

- The current setup updated successfully on macOS arm64.
- FFF's native package and library import, DonSeTch's binary, extension loading, and CLI startup passed.
- DonSeTch connected through native MCP with four tools and no duplicate bridge.
- An offline SDK check confirmed native default tools and codemode in the model-facing declarations.
- Nested codemode/read execution passed with the permission and secret-redaction extensions loaded.
- Claude DirectSDK accepted codemode's JSON input without changing other providers or strict requirements on other tools.
- Eight focused updater checks passed, including private-file preservation, failure recovery, and inherited offline-variable handling.

The updater checks use temporary repositories and simulated package commands.
The compatibility checks do not send model requests.
These results do not prove subscription billing, UI rendering, or token savings.

Installation on other supported platforms remains unverified.
Ask before adding tests or running full or slow suites, as required by `AGENTS.md`.
