# pi-agent-config

Personal configuration for the [Pi coding agent](https://pi.dev).

## Install

Use Git, Node.js 22.19 or newer, and npm 9 or newer on Ubuntu or macOS.
Add `~/.local/bin` to your shell's `PATH`.
Review [sync.mjs](scripts/sync.mjs) and [settings.json](settings.json) before installation.
Extensions run with your local permissions.

Clone the repository once, then run sync:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/.pi/agent
node ~/.pi/agent/scripts/sync.mjs
```

If `~/.pi/agent` is already a checkout of this repository, run only the sync command.
For a different location, clone there and set `PI_CODING_AGENT_DIR` when you run Pi.

Sync first detects the operating system and Node.js architecture. It supports Linux and macOS on x64 or arm64.
On Linux, it also identifies glibc or musl. Unsupported systems stop before sync changes any files.
It selects the FFF native package for that platform; npm skips optional binaries for other platforms.

Sync installs the Pi version in [.pi-version](.pi-version) under `~/.local` if needed.
It installs dependencies from [npm/package-lock.json](npm/package-lock.json) in a temporary directory.
Only a successful installation replaces the active packages.
A verification failure restores the previous packages.

Sync disables npm lifecycle scripts and bypasses npm's release-age delay for this command only.
It explicitly checks the `donsetch` binary, which downloads its platform-specific release if absent.
The download uses the locked package version and verifies the release checksum.
Global npm settings remain unchanged.
Sync verifies the selected FFF native package, its Node.js library import, extension loading, and CLI startup without a model request.

## Start

From your project directory, run:

```bash
pi
```

Run `/login` to connect a model provider, then `/model` to select a model
you can access. See the [Pi quickstart](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md)
for authentication and usage instructions.

Web search, fetch, crawl, and screenshots come from the `donsetch` package:
keyless, no accounts. To add an Exa key on top of the keyless chain, run
`~/.pi/agent/npm/node_modules/.bin/donsetch keys add exa <key>`.

## Update

Run the same command on either machine:

```bash
node ~/.pi/agent/scripts/sync.mjs
```

The [sync script](scripts/sync.mjs) fetches the current branch's upstream.
It backs up tracked configuration, Git patches, and repository history under `~/.pi/backups/`.
It then replaces tracked configuration and local commits with the upstream revision and installs locked packages.
The backup contains the previous files under `files/` and Git history in `repository.bundle`.
Do not publish backups: tracked local changes can contain private values.

Sync leaves untracked and ignored content untouched, except for generated `npm/node_modules`.
This preserves `docs/`, credentials, sessions, and recovery data.
It stops if an incoming tracked file would overwrite untracked content.
Move the conflicting file outside the checkout, then retry.
On the first update to the tracked lockfile, this can include an existing `npm/package-lock.json`.

Sync also stops during an unfinished merge or rebase.
An installation failure returns a nonzero exit status; the previous packages remain available.
The tracked configuration stays at the fetched revision, so retry sync after fixing the reported error.
Restart Pi after a successful sync.

### Upgrade versions

Sync installs repository versions; it does not select the latest releases.
To upgrade packages, change the exact versions in `npm/package.json` and `settings.json` together.
Regenerate `npm/package-lock.json` with lifecycle scripts disabled and legacy peer resolution enabled.
Change `.pi-version` to upgrade Pi.
Review and verify these changes before publishing them.
Do not use `pi update --extensions` to align machines: it bypasses the repository lockfile.

### Check sync behavior

```bash
node --test tests/sync.test.mjs
```

These checks use temporary Git repositories and simulated npm and Pi commands.
They cover repeatable sync, backups, private-file preservation, collisions, and failure reporting.
They do not call model providers.

## Configuration

Use the files themselves as the reference:

- [settings.json](settings.json): defaults and installed packages.
- [AGENTS.md](AGENTS.md): agent instructions.
- [Permission rules](extensions/pi-permission-system/config.json): local access policy.
- [skills/](skills/) and [prompts/](prompts/): reusable workflows.

Keep authentication, sessions, logs, and other private runtime data out of Git.
See [.gitignore](.gitignore) for exclusions.
