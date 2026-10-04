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

The installer pins packages to [versions.lock](versions.lock) so every machine gets the same set.
Pass `--latest` to take latest releases instead.
To use a local permission-system checkout, pass `--local-permissions <path>` or set `PI_PERMISSIONS_SRC`.
Without that flag, the installer uses `~/projects/pi-packages/packages/pi-permission-system` when that directory exists, else the published package.
Forks can point `PI_AGENT_REPO_URL` at their own repository.

Generated npm manifests, lockfiles, and installed packages stay local and outside Git.

The installer supports Linux and macOS on x64 or arm64.
On Linux, it identifies glibc or musl for the FFF native package.
It disables npm lifecycle scripts and bypasses npm's release-age delay for this command only.
Global npm settings remain unchanged.

The installer backs up managed npm files before a package update.
It then replaces generated npm manifests and packages with a fresh installation.
If installation or verification fails, it restores those files and reports the error.
Pi's own update is separate and is not rolled back.
Verification checks FFF, extension loading, and CLI startup without a model request.

## Start

From your project directory, run:

```bash
pi
```

Run `/login` to connect a model provider, then `/model` to select a model.
OpenTUI remains the interactive interface.

### Tools and web access

Pi's default tools (`read`, `bash`, `edit`, and `write`) remain directly available alongside `codemode`.
Use direct tools for simple actions and codemode to batch calls or filter large results.
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

## Update

To update software without replacing your configuration, run:

```bash
node ~/.pi/agent/scripts/sync.mjs --install
```

Updates happen when you run this command, not on every Pi launch.
By default every machine installs the pinned versions from [versions.lock](versions.lock).
Pass `--latest` to move to latest releases.
Restart Pi after a successful update.

To replace configuration with the current branch's upstream and update software, run:

```bash
node ~/.pi/agent/scripts/sync.mjs
```

**Caution:** sync replaces tracked local changes and local commits with upstream.
It first saves tracked configuration, Git patches, and repository history under `~/.pi/backups/`.
Do not publish backups: local changes can contain private values.

Sync preserves untracked and ignored content, except for managed npm files updated during installation.
This preserves credentials, sessions, and other runtime data.
It stops during an unfinished Git operation or when incoming files conflict with untracked content.
Append `--dry-run` to preview incoming changes without applying them.
An installation failure reports a nonzero exit status.
The configuration remains at the fetched revision; fix the reported error and retry.

### Troubleshooting

The updater removes inherited `PI_OFFLINE` from online update commands.
Pi's version lookup treats any nonempty value, including `0`, as offline.
An offline verification check does not refresh software.

### Check sync behavior

```bash
node --test tests/sync.test.mjs
```

These checks use temporary Git repositories and simulated npm and Pi commands.
They cover updates, backups, private-file preservation, collisions, and failure recovery.
They do not contact model providers.

## Configuration

[Technical context](docs/tech-context.md) describes the intended architecture and engineering decisions.

- [settings.base.json](settings.base.json): shared defaults. The installer merges this file with a [profile](profiles/) package list and the untracked `settings.local.json` to generate [settings.json](settings.json).
- [mcp.base.json](mcp.base.json): native MCP connections, without embedded credentials. Keys resolve through environment variables or [scripts/mcp-auth.sh](scripts/mcp-auth.sh).
- [profiles/](profiles/): `workstation` (full), `server` (no telemetry or visual packages), `minimal` (core only). Select with `--profile`.
- [versions.lock](versions.lock): pinned package versions for reproducible installs.
- [AGENTS.md](AGENTS.md): agent instructions.
- [Permission rules](extensions/pi-permission-system/config.json): local access policy.
- [skills/](skills/) and [prompts/](prompts/): reusable workflows, including the `test-audit` authoring gate and audit workflow, and the `skill-doctor` conversation grader.

Do not edit `settings.json` or `mcp.json` directly: the installer regenerates both on every install.
Put personal overrides in `settings.local.json` (copy [settings.local.json.example](settings.local.json.example)) and extra servers in `mcp.local.json`.
Before installing, review `defaultProjectTrust` and the permission rules: extensions run with local permissions.
Keep authentication, sessions, logs, and generated installation records out of Git.
Machine-local `deviceId` and `lastChangelogVersion` stay in the generated files and never enter shared commits.
See [.gitignore](.gitignore) for exclusions.
