# pi-agent-config

Personal configuration for the [Pi coding agent](https://pi.dev).

## Install

Use Git, Node.js 22.19 or newer, and npm 9 or newer on Ubuntu or macOS.
Add `~/.local/bin` to your shell's `PATH`.
Review [sync.mjs](scripts/sync.mjs) and [settings.json](settings.json) before installation.
Extensions run with your local permissions.

Clone the repository once, then install the current configuration:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/.pi/agent
node ~/.pi/agent/scripts/sync.mjs --install
```

For a different location, set `PI_CODING_AGENT_DIR` when you run Pi.
Check the local package path in `settings.json` before installation.
Change that path when your development checkout is in a different location.
Installation stops if a local package is missing; it does not substitute an npm release.

`settings.json` is the package list. Published packages have no version pins.
Installation updates Pi and published packages to the latest releases through Pi's package manager.
Local packages load from their existing source directories without an update or reset.
Generated npm manifests, lockfiles, and installed packages stay local and outside Git.

The installer supports Linux and macOS on x64 or arm64.
On Linux, it identifies glibc or musl for the FFF native package.
It disables npm lifecycle scripts and bypasses npm's release-age delay for this command only.
It explicitly checks DonSeTch's binary, which downloads its release if missing.
Global npm settings remain unchanged.

The installer backs up managed npm files before a package update.
It then replaces generated npm manifests and packages with a fresh installation from `settings.json`.
If installation or verification fails, it restores those files and reports the error.
Pi's own update is separate and is not rolled back.
Verification checks FFF, DonSeTch, extension loading, and CLI startup without a model request.

## Start

From your project directory, run:

```bash
pi
```

Run `/login` to connect a model provider, then `/model` to select a model.
Keep Claude DirectSDK for Claude Code subscription transport.
Native Anthropic sign-in warns that third-party use is billed from extra usage, not the plan allowance.
[Claude compatibility](extensions/claude-codemode.ts) sends native codemode through its JSON schema for Claude DirectSDK.
Claude uses best-effort JSON input instead of the OpenAI-only raw-code grammar.
Other providers and strict requirements on other tools remain unchanged.
OpenTUI remains the interactive interface.

### Tools and web access

Pi's default tools (`read`, `bash`, `edit`, and `write`) remain directly available alongside `codemode`.
Use direct tools for simple actions and codemode to batch calls or filter large results.
Tool visibility is not a security boundary; permission checks and secret redaction remain enabled.
Codemode can batch calls and filter results, but does not guarantee lower token use.

[mcp.json](mcp.json) connects DonSeTch through Pi's native Model Context Protocol (MCP) support.
The DonSeTch package supplies the binary; its Pi extension is disabled to prevent duplicate connections.
Use `/mcp` to inspect or reconnect the server. Its tools are available through codemode.
FFF remains a Pi extension; it is not an external MCP server.

Web search, fetch, crawl, and screenshots need no account or API key.
To add an Exa key, run `~/.pi/agent/npm/node_modules/.bin/donsetch keys add exa <key>`.

## Update

To update software without replacing your configuration, run:

```bash
node ~/.pi/agent/scripts/sync.mjs --install
```

Updates happen when you run this command, not on every Pi launch.
Latest releases can differ between computers updated on different days.
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

- [settings.json](settings.json): defaults, tool presentation, and the package list.
- [mcp.json](mcp.json): native MCP connections, without embedded credentials.
- [AGENTS.md](AGENTS.md): agent instructions.
- [Permission rules](extensions/pi-permission-system/config.json): local access policy.
- [skills/](skills/) and [prompts/](prompts/): reusable workflows.

Keep authentication, sessions, logs, and generated installation records out of Git.
Do not commit the machine-local `deviceId` or `lastChangelogVersion` from Pi settings.
See [.gitignore](.gitignore) for exclusions.
