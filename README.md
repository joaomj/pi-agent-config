# pi-agent-config

Shared configuration for the [Pi coding agent](https://pi.dev). One command installs a working Pi instance.

## Install

Use Git, Node.js 22.19 or newer, and npm 9 or newer on Ubuntu or macOS.

One step on a new machine:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/.pi/agent
~/.pi/agent/install.sh
```

Or without cloning first:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/joaomj/pi-agent-config/main/install.sh)" -- --clone-dir ~/.pi/agent
```

For a different location, set `PI_CODING_AGENT_DIR` when you run Pi.
For a lighter setup, pass `--profile server` (no telemetry or visual packages) or `--profile minimal` (search, permissions, redaction, compaction only).
Run `./install.sh --check-only` to verify a machine without installing.

The installer generates configuration from shared templates and the selected profile.
It installs Pi under `~/.local` only if Pi is missing. Existing software remains unchanged.
Extension declarations use unversioned published packages; synchronization does not enforce `versions.lock`.

To use a local permission-system checkout, pass `--local-permissions <path>` or set `PI_PERMISSIONS_SRC`.
A checkout is never selected just because its directory exists.
Forks can point `PI_AGENT_REPO_URL` at their own repository.

Generated npm manifests, lockfiles, and installed packages stay local and outside Git.
The installer supports Linux and macOS on x64 or arm64.
Each account keeps its own configuration, installed extensions, credentials, and sessions.

### Scoped GitHub access on shared machines

Give each machine only the access it needs. On a VPS, use a repo-scoped
deploy key instead of a broad account key:

1. Add the deploy public key under the repository Settings, Deploy keys.
2. Add a host alias in `~/.ssh/config` that uses only that key:

```ssh-config
Host github-pi-agent-config
  HostName github.com
  User git
  IdentityFile ~/.ssh/pi-agent-config-deploy
  IdentityAgent none
  IdentitiesOnly yes
```

3. Point the checkout at the alias:

```bash
git remote set-url origin github-pi-agent-config:joaomj/pi-agent-config.git
```

`IdentityAgent none` keeps loaded account keys from being offered to GitHub
for this repository. Commit signing still uses the account key; a signature
grants no repository access.

## Start

From your project directory, run:

```bash
pi
```

Run `/login` to connect a model provider, then `/model` to select a model.
OpenTUI remains the interactive interface.

### Tools and web access

Only `read`, `bash`, and `codemode` are directly visible to the model.
The local tool-visibility extension keeps other active tools callable through codemode without declaring their schemas.
Discover extension tools with `searchTools()` or `describeTool()`, then call them through `tools`.
Tool visibility is not a security boundary; permission checks and secret redaction remain enabled.
Codemode can batch calls and filter results, but does not guarantee lower token use.

[mcp.base.json](mcp.base.json) connects four web MCP servers through Pi's native Model Context Protocol (MCP) support.
Use `/mcp` to inspect or reconnect a server. Server tools are available through codemode.
FFF remains a Pi extension; it is not an external MCP server.

| Server | Purpose |
| --- | --- |
| Exa | Web search, page fetch, research agent |
| Parallel | Web search, URL fetch |
| Jina | Page reading, web search, screenshots, paper search |
| Firecrawl | Search, scrape, crawl, extract, research tools |

API keys never enter configuration files.
Each server reads its key in this order: environment variable, macOS keychain, Linux libsecret.
Copy [.env.example](.env.example) to `.env` and set `PI_AGENT_EXA`, `PI_AGENT_PARALLEL`, and `PI_AGENT_JINA`.
Or store each key once in the system keychain:

```bash
# macOS (prompts for the value, so it never enters shell history)
security add-generic-password -s pi-agent-exa -a exa -w
security add-generic-password -s pi-agent-parallel -a parallel -w
security add-generic-password -s pi-agent-jina -a jina -w
# Linux (libsecret)
secret-tool store --label 'exa MCP key' service pi-agent-exa account exa
secret-tool store --label 'parallel MCP key' service pi-agent-parallel account parallel
secret-tool store --label 'jina MCP key' service pi-agent-jina account jina
```

Firecrawl uses browser sign-in instead of a stored key. Run `pi mcp login firecrawl` to connect the account.
Restart Pi after storing keys so every server picks them up.

### Visual explanations

The [`visual-explainer`](https://github.com/nicobailon/visual-explainer) package adds a skill, prompt commands such as `/diff-review`, `/plan-review`, `/generate-web-diagram`, and `/generate-slides`, plus the `visual_explainer` tool. Use them for diagrams, visual reviews, slide decks, and other visual explanations.

The tool's render actions write HTML pages to `~/.agent/diagrams/` and open them in the browser by default. PPTX export is optional and best-effort. See [technical context](docs/tech-context.md#installed-capabilities) for its current dependency note.

## Synchronize configuration

To replace tracked configuration with the current branch's upstream, run:

```bash
node ~/.pi/agent/scripts/sync.mjs
```

Sync updates configuration only. It does not install, update, or remove Pi or extensions.
It generates `settings.json` and `mcp.json` from the synchronized templates and selected profile.
Installed package versions can differ between accounts.

After sync, the command prints the path to a private text report under `~/.pi/reports/`.
The report compares this account's pre-sync package declarations with the remote shared profile.
It lists additions, removals, changed declarations, missing remote npm packages, and locally installed npm versions.
Personal overrides are excluded from the remote list.
The report does not query npm for latest releases or change installed packages.
Each sync replaces the previous report for that checkout.

**Caution:** sync replaces tracked local changes and local commits with upstream.
It first saves tracked configuration, Git patches, and repository history under `~/.pi/backups/`.
Do not publish backups: local changes can contain private values.

Sync preserves untracked and ignored content, including installed packages, credentials, and sessions.
It stops during an unfinished Git operation or when incoming files conflict with untracked content.
Append `--dry-run` to preview incoming changes without applying them.
If configuration generation fails, fix the reported error and retry; the fetched revision remains applied.
Restart Pi after synchronization to load the configuration.

To regenerate configuration from the current local templates without fetching upstream, run:

```bash
node ~/.pi/agent/scripts/sync.mjs --generate
```

## Update software

Use Pi's native command to update extensions in the current account:

```bash
pi update --extensions
```

Configuration sync and the installer never invoke this command.
Pi can install a missing declared package during startup; this is separate from updating installed extensions.
Restart Pi after an extension update.

To update Pi itself, run `pi update`.

### Check sync behavior

```bash
node --test tests/sync.test.mjs
```

These checks use temporary Git repositories and simulated npm and Pi commands.
They do not contact model providers.

## Configuration

[Technical context](docs/tech-context.md) describes the intended architecture and engineering decisions.

- [settings.base.json](settings.base.json): shared defaults. The installer merges this file with a [profile](profiles/) package list and the untracked `settings.local.json` to generate [settings.json](settings.json).
- [mcp.base.json](mcp.base.json): native MCP connections, without embedded credentials. Keys resolve through environment variables or [scripts/mcp-auth.sh](scripts/mcp-auth.sh).
- [profiles/](profiles/): `workstation` (full), `server` (no telemetry or visual packages), `minimal` (core only). Select with `--profile`.
- [AGENTS.md](AGENTS.md): agent instructions.
- [Permission rules](extensions/pi-permission-system/config.json): local access policy.
- [skills/](skills/) and [prompts/](prompts/): reusable workflows, including the `test-audit` authoring gate and audit workflow, and the `skill-doctor` conversation grader.

Do not edit `settings.json` or `mcp.json` directly: the installer regenerates both on every install.
Put personal overrides in `settings.local.json` (copy [settings.local.json.example](settings.local.json.example)) and extra servers in `mcp.local.json`.
Before installing, review `defaultProjectTrust` and the permission rules: extensions run with local permissions.
Keep authentication, sessions, logs, and generated installation records out of Git.
Machine-local `deviceId` and `lastChangelogVersion` stay in the generated files and never enter shared commits.
See [.gitignore](.gitignore) for exclusions.
