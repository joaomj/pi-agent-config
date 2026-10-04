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

The repository ships shared defaults plus install profiles (`workstation`, `server`, `minimal`). Each machine selects a profile at install time and keeps personal overrides in untracked `settings.local.json` and `mcp.local.json`. The installer generates `settings.json` and `mcp.json` from the shared base, the profile package list, and the local overrides. Do not edit the generated files directly.

Workstations use the full package set. Servers use the `server` profile, which omits telemetry and visual packages. Other computers can have different provider access. The repository currently has no machine-specific model selection layer.
Check provider authentication and model resolution when installing on another computer.
A developer checkout of the permission system can replace the published package through `--local-permissions`, `PI_PERMISSIONS_SRC`, or `settings.local.json`.

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

[settings.base.json](../settings.base.json) selects `openai/gpt-6-luna` with `xhigh` thinking as the main-session default.
Its enabled-model list contains Luna at `xhigh` and Sol at `low`.
A profile supplies the package list; `settings.local.json` supplies personal overrides. The installer writes the merged result to `settings.json`, which Pi reads.

[models.json](../models.json) sets local metadata overrides for Luna and Sol:
250,000 context tokens and 64,000 maximum output tokens.
These are client-side declarations, not proof that a provider accepts every requested limit.
Automatic compaction keeps 20,000 recent tokens and reserves 64,000 tokens.

### Installed capabilities

[settings.base.json](../settings.base.json) plus the selected profile is the authoritative package list.
Unpinned published sources resolve to [versions.lock](../versions.lock) at install time unless `--latest` is passed.
A local permission-system checkout can replace the published package (see the operating model).
Missing local sources are errors, not reasons to substitute published packages.
Pi generates npm manifests and lockfiles locally; these installation records are not tracked.
Machine-local `deviceId` and `lastChangelogVersion` values must not enter shared settings commits.

| Package or local extension | Purpose |
| --- | --- |
| `@ff-labs/pi-fff` | Indexed local code search |
| `@gotgenes/pi-permission-system` | Local permission policy and approval prompts |
| `@kiranpg/pi-sentry` | Secret redaction for inputs, tool output, and session messages |
| `pi-usage-meters` | Usage display integration |
| `pi-open-tui` | Terminal UI customization through [open-tui.json](../open-tui.json) |
| `firecrawl` via [mcp.json](../mcp.json) | Web search, scrape, crawl, and extract through account sign-in; no key in configuration |
| `parallel` via [mcp.base.json](../mcp.base.json) | Web search and URL fetch; key resolved from the environment, the macOS keychain, or Linux libsecret |
| `jina` via [mcp.base.json](../mcp.base.json) | Reader, web search, screenshots, and grounding APIs; key resolved from the environment, the macOS keychain, or Linux libsecret |
| `exa` via [mcp.base.json](../mcp.base.json) | Web search, fetch, and research agent; key resolved from the environment, the macOS keychain, or Linux libsecret |
| `visual-explainer` | HTML visualization skill, prompt commands, and native renderer for diagrams, reviews, tables, and slide decks |
| [btw.ts](../extensions/btw.ts) | `/btw`: a tool-free side question using a conversation snapshot and the selected model |
| [exit.ts](../extensions/exit.ts) | `/exit`: alias that requests Pi shutdown |
| `npm:@joaomj/pi-attention-span@0.8.0` | Attention output styles (Attention-kind, Spartan, Rundown) and `/tldr` |
| `pi-background-run` | Detached shell jobs with log files and wake on completion; use for commands past 30 seconds or 100 lines |
| `@spences10/pi-telemetry` | Token, cost, and timing telemetry (workstation profile only) |
| `@specode/pi-subscription-usage` | Subscription usage display (workstation profile only) |
| [session-responsiveness.ts](../extensions/session-responsiveness.ts) | Caps foreground shell calls at 60 seconds and steers a progress report after 5 silent minutes |

`defaultTools: ["+codemode"]` adds codemode to Pi's default `read`, `bash`, `edit`, and `write` tools.
`codemode.mode: "on"` keeps direct tool declarations visible.
Direct calls handle simple actions; codemode can batch calls and filter large results.
The inline declaration budget stays at Pi's default 3,000 estimated tokens.
Batching and output filtering can reduce conversation overhead; savings are not guaranteed.

[mcp.json](../mcp.json) connects four web MCP servers through Pi's built-in MCP extension: Exa, Parallel, Jina, and Firecrawl.
All use `codemode` exposure.
Native tools use names such as `mcp__exa__web_search_exa`; codemode can discover their declarations.
FFF remains a native extension, not an MCP connection.
The MCP server manager is available through `/mcp`.
[mcp.json](../mcp.json) also connects Firecrawl through streamable HTTP at `https://mcp.firecrawl.dev/v2/mcp-oauth`.
The entry stores no key. Sign in with `pi mcp login firecrawl`; Pi keeps the tokens in ignored `mcp-auth.json`.
The server uses `codemode` exposure and a 300-second request timeout.
[mcp.json](../mcp.json) also connects Parallel through streamable HTTP at `https://search.parallel.ai/mcp`.
The entry stores no key. Pi resolves the Bearer token at server start through scripts/mcp-auth.sh (environment variable, macOS keychain, or Linux libsecret).
The server uses `codemode` exposure and a 300-second request timeout.
[mcp.json](../mcp.json) also connects Jina through streamable HTTP at `https://mcp.jina.ai/v1`.
The entry stores no key. Pi resolves the Bearer token at server start through scripts/mcp-auth.sh (environment variable, macOS keychain, or Linux libsecret).
The server uses `codemode` exposure and a 300-second request timeout.
[mcp.json](../mcp.json) also connects Exa through streamable HTTP at `https://mcp.exa.ai/mcp`.
The entry stores no key. Pi resolves the Bearer token at server start through scripts/mcp-auth.sh (environment variable, macOS keychain, or Linux libsecret).
The server uses `codemode` exposure and a 300-second request timeout.
MCP OAuth credentials and rotated logs are ignored by Git.

The `visual_explainer` render actions write HTML pages to `~/.agent/diagrams/` and open them in the browser by default.
PPTX export is optional and best-effort. On this instance, an npm override resolves `pptxgenjs` to `4.0.0`.
The audit still reports two high-severity denial-of-service advisories in its transitive `image-size@1.2.1` dependency (`GHSA-5p2g-fcmc-qvqq` and `GHSA-w3rx-r6r6-pgpr`).
Do not use PPTX export with untrusted images. The override is in generated, ignored npm files and can be replaced by package updates; check the advisories again after updates.

The UI uses fullscreen mode. Model selection, authentication, and session management remain Pi responsibilities.
`/btw` uses low reasoning and does not perform new tool work or continue the main task.

[session-responsiveness.ts](../extensions/session-responsiveness.ts) enforces the responsiveness rule in code. Foreground `bash` and `powershell` calls are capped at 60 seconds; longer work must use `bgrun`. After 5 minutes without an assistant report, it steers a short progress report.

[Prompts](../prompts/) provide reusable user commands; [skills](../skills/) provide task-specific instructions.
They do not replace approval requirements.

[`skill-doctor`](../skills/tooling/skill-doctor/SKILL.md) grades recent Pi conversations for efficiency, code quality, procedure compliance, and verbosity, then drafts skill edits and a local HTML report. Run it with `/skill:skill-doctor`. It defaults to `--harness pi` with `--pi-home ~/.pi/agent`, discovers Pi skills recursively including nested category directories, and keeps transcripts on this machine. The optional diff-viewer bundle is not vendored; diffs render as plain text.

## Installation and synchronization

[README.md](../README.md) contains the user-facing installation and update commands.
[scripts/sync.mjs](../scripts/sync.mjs) implements the process.

1. Detect OS and Node.js architecture before synchronization changes files.
2. Accept Linux or macOS on x64/arm64. On Linux, identify glibc or musl.
3. Check runtime requirements, repository state, upstream configuration, and file collisions.
4. Fetch upstream and back up tracked configuration, patches, and Git history under `~/.pi/backups/`.
5. Replace tracked configuration with the upstream revision.
6. Generate `settings.json` and `mcp.json` from the shared base, the selected profile, pinned versions, and local overrides.
7. Check that configured local package sources exist.
8. Bootstrap the latest Pi under `~/.local` if needed, or use Pi's native self-update.
9. Back up managed npm files and use Pi's native package update command.
10. Check the selected FFF native package and its library import.
11. Verify extension loading and CLI startup without a model request.
12. Restore managed npm files if package installation or verification fails.

The installer removes inherited `PI_OFFLINE` from online update commands.
Pi's version lookup treats any nonempty value, including `0`, as offline.
The installer disables npm lifecycle scripts through command settings and child-process environment.
Package updates replace generated npm manifests and installed packages with a fresh installation from `settings.json`.
Pi's self-update is separate from package recovery and is not rolled back.
Updates run only when explicitly requested; normal launches do not update installed packages.
Pinned installs reproduce the versions in `versions.lock`; `--latest` takes current releases instead.

**Caution:** sync replaces tracked local changes and local commits with upstream after creating a backup.
It is not a merge-based update. Untracked and ignored files remain unless incoming paths conflict; collisions stop sync.
A package failure restores managed npm files but does not revert configuration already reset to upstream.

Use `node scripts/sync.mjs --install` to update the current local configuration without fetching or resetting tracked files.
Use the normal sync command only when upstream replacement is intended.
Do not change global npm settings to install this configuration.

## Verification and remaining limits

Completed checks:

- The current setup updated successfully on macOS arm64.
- FFF's native package and library import, extension loading, and CLI startup passed.
- Exa, Parallel, Jina, and Firecrawl connected through native MCP with keychain and OAuth credentials.
- An offline SDK check confirmed native default tools and codemode in the model-facing declarations.
- Nested codemode/read execution passed with the permission and secret-redaction extensions loaded.
- Eight focused updater checks passed, including private-file preservation, failure recovery, and inherited offline-variable handling.

The updater checks use temporary repositories and simulated package commands.
The compatibility checks do not send model requests.
These results do not prove subscription billing, UI rendering, or token savings.

Installation on other supported platforms remains unverified.
Ask before adding tests or running full or slow suites, as required by `AGENTS.md`.
