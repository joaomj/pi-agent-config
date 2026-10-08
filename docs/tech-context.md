# Technical context and engineering decisions

## Purpose and authority

This repository defines shared Pi configuration, not shared installed package versions.
Executable templates and source files implement the decisions below. Update this document when those decisions change.
Credentials, transcripts, caches, backups, and account-local preferences do not belong in Git.

## Account separation

Each computer user has independent Node.js, npm, Pi, installed extensions, credentials, and sessions.
On the Mac Mini, private binaries resolve through `~/.local/bin`, npm global packages use `~/.local`, and each account has its own npm cache.
The shared Homebrew-prefix Pi installation was removed.

The normal configuration directory is `~/.pi/agent`; `PI_CODING_AGENT_DIR` can override it.
[settings.base.json](../settings.base.json) supplies defaults. A [profile](../profiles/) supplies package declarations.
Untracked `settings.local.json` and `mcp.local.json` supply explicit account overrides.
The generator writes `settings.json` and `mcp.json`. Do not edit those generated files to establish shared defaults.

The shared default model is OpenAI Sol. Model access and account-specific selections can differ.
The VPS's Meta selection and local development checkout are not copied into Mac account paths.

## User interface, trust, and telemetry

Pi uses its native fullscreen interface. `pi-open-tui`, `proper-compact`, and `open-tui.json` are no longer shared configuration.
Pi supplies compaction and session management.

`defaultProjectTrust: "ask"` requires approval before Pi loads project-local configuration and resources.
The permission extension also checks sensitive paths and mutations. Neither tool visibility nor project trust replaces the approval policy in [AGENTS.md](../AGENTS.md).

Pi install telemetry and analytics are disabled in shared defaults.
The workstation profile declares `@spences10/pi-telemetry`, whose local session recording defaults to off.
Its `telemetry.json` preference and SQLite database are ignored by Git and preserved during sync.
Only the Mac Mini's `joao` account has recording enabled and an explicit install-telemetry override.
`admin` has recording disabled. Pi analytics remain disabled for both accounts.

## Single-agent workflow and prompt commands

The main agent does the work directly. There are no shared agent definitions or delegated workflows.
Follow [AGENTS.md](../AGENTS.md) for collaboration, approval, test, and Git rules.
Use [/plan](../prompts/plan.md) for product-oriented planning and [/code-review](../prompts/code-review.md) for evidence-backed P0/P1 review.

[/bro](../prompts/bro.md) requests a plain-language restatement.
[/correct](../prompts/correct.md) investigates recurring mistakes and selects an appropriate enforcement mechanism.
Both are prompt templates rather than skills. The duplicate skill copies are removed.
Their upstream MIT notice is retained in [prompts/LICENSE](../prompts/LICENSE).
Other skills retain their specialized responsibilities, including technical writing, research, test audit, and skill assessment.

## Tools and search

The model directly sees `read`, `bash`, and `codemode`.
[tool-visibility.ts](../extensions/tool-visibility.ts) hides other active declarations while preserving their availability through codemode.
Discover schemas with `searchTools()` or `describeTool()` and call extension tools through `tools`.
Hidden tools remain initialized; hiding declarations is not a security boundary.

`@ff-labs/pi-fff` supplies indexed local search through `fffind` and `ffgrep`.
Follow the search rules in `AGENTS.md`; use native search only for exact checks, unsupported searches, or fallback.
FFF is a Pi extension, not an MCP server. Indexing is not a workspace sandbox.

[session-responsiveness.ts](../extensions/session-responsiveness.ts) caps foreground shell calls and requests progress reports after prolonged silence.
Use `bgrun` for commands expected to exceed 30 seconds or 100 output lines.
[btw.ts](../extensions/btw.ts) supplies a tool-free side question; [exit.ts](../extensions/exit.ts) supplies the shutdown alias.

## Installed capabilities

Profiles declare unversioned npm and Git package sources. They do not constrain installed versions.
The workstation profile includes visualization, attention styles, background jobs, optional local telemetry, and subscription-usage display.
The server profile omits visualization and telemetry packages. The minimal profile contains search, permissions, and secret redaction.

The workstation and server profiles declare `git:github.com/joaomj/pi-claude-directsdk`.
The public package source replaces a VPS-only relative path. It does not change the default model.
Claude DirectSDK uses a qualifying Claude Code CLI and that account's Claude login as its subscription transport.
The qualified CLI range is `>=2.1.263 <2.2.0`; see the [package README](https://github.com/joaomj/pi-claude-directsdk#requirements).
Sync does not install Claude Code, manage authentication, prove model entitlement, or guarantee billing behavior.

A local permission-system checkout requires explicit selection through `--local-permissions`, `PI_PERMISSIONS_SRC`, or a local setting.
Its presence on disk does not silently replace the published package.

`visual-explainer` provides HTML diagrams, reviews, and slide-related tools.
PPTX export is optional. Previous npm audits found denial-of-service advisories in its `image-size` dependency chain.
Do not use PPTX export with untrusted images; inspect the current dependency audit before enabling that path.

## MCP connections

[mcp.base.json](../mcp.base.json) enables only Exa through Pi's built-in MCP support.
The server uses `codemode` exposure and a 300-second timeout.
Exa supplies web search, fetch, and research tools. Use `/mcp` to inspect the connection.

[scripts/mcp-auth.sh](../scripts/mcp-auth.sh) resolves the Exa Authorization header from an exported variable, macOS keychain, or Linux libsecret.
Shared files contain no API key. The helper does not source a `.env` file.
Optional account-local MCP entries are explicit overrides, not shared defaults.

## Configuration synchronization

[README.md](../README.md#synchronize-configuration) documents the user command:

```bash
node ~/.pi/agent/scripts/sync.mjs
```

[scripts/sync.mjs](../scripts/sync.mjs) performs these operations:

1. Validate the platform, Git state, upstream layout, and untracked-file collisions.
2. Fetch upstream and back up tracked configuration, patches, and Git history under `~/.pi/backups/`.
3. Replace tracked files with the upstream revision.
4. Generate configuration from shared templates, the selected profile, and explicit local overrides.
5. Leave installed Pi and extensions unchanged.
6. Write a private package-difference report under `~/.pi/reports/`.

[scripts/package-report.mjs](../scripts/package-report.mjs) compares pre-sync local declarations and the local npm manifest inventory with the remote shared profile.
It excludes personal overrides from the remote list and does not query a registry for latest versions.
The report supports user decisions about package removal and updates; it does not perform those actions.

**Caution:** sync replaces tracked local changes and commits after creating a backup. It is not a merge.
Untracked and ignored files remain unless an incoming path conflicts, in which case sync stops.
A generation failure does not revert the fetched configuration revision.

`--dry-run` previews incoming changes. `--generate` regenerates configuration without fetching or replacing tracked files.
The installer bootstraps Pi under `~/.local` only when missing; it leaves existing Pi and extensions unchanged.

## Software updates and verification limits

Only the user invokes extension updates:

```bash
pi update --extensions
```

Pi can install a missing declared package during startup. That behavior is separate from updating installed extensions.
Update Pi itself with `pi update`. Restart Pi after configuration or extension changes.

Focused sync checks use temporary repositories and reject unexpected Pi or npm calls.
Deployment verification compares installed-package metadata and the Pi executable before and after synchronization.
These checks do not send model requests or prove UI rendering, provider authentication, model entitlement, billing, or live MCP connectivity.
Ask before adding tests or running broad or slow suites, as required by `AGENTS.md`.
