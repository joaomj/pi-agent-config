# pi-agent-config

Personal configuration for the [Pi coding agent](https://pi.dev).

## Install

You need Bash, Git, and Node.js with npm. See the
[Pi quickstart](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md)
for current Node.js requirements.

Review [install.sh](install.sh) and the packages in [settings.json](settings.json)
before installation. Extensions run with your local permissions.

```bash
tmp_dir="$(mktemp -d)" && \
  git clone --depth 1 https://github.com/joaomj/pi-agent-config.git "$tmp_dir/config" && \
  bash "$tmp_dir/config/install.sh" && \
  rm -rf "$tmp_dir"
```

The installer installs Pi if needed, clones this configuration into `~/.pi/agent`,
and installs its configured packages. It verifies the installation and reports
missing optional workflow tools.

If `~/.pi/agent` already exists, back it up and move it before installation.
The installer does not overwrite another checkout.

For a different location, export `PI_CODING_AGENT_DIR` before installation.
Keep that variable set when you run Pi.

## Start

From your project directory, run:

```bash
pi
```

Run `/login` to connect a model provider, then `/model` to select a model
you can access. See the [Pi quickstart](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md)
for authentication and usage instructions.

For optional web search, copy [web-search.example.json](web-search.example.json)
to `web-search.json` in the configuration directory. Set the environment variables
referenced by the file. Keep credentials local; `web-search.json` is ignored by Git.

## Update

From the configuration checkout, run:

```bash
node scripts/sync.mjs
```

The [sync script](scripts/sync.mjs) pulls from the branch's upstream with
`--ff-only --autostash`. It restores tracked local changes, then replaces
`settings.json`'s `enabledModels` with the upstream value, or removes it if absent
upstream. Other local settings remain unchanged. Untracked files are not stashed.

If conflicts occur, resolve them before syncing again. Keep any failed autostash
until you recover your changes. Restart Pi after syncing.

Sync does not install packages. To reinstall configured packages, review any
package changes first, then run `bash install.sh` from the configuration checkout.

## Configuration

Use the files themselves as the reference:

- [settings.json](settings.json): defaults and installed packages.
- [AGENTS.md](AGENTS.md): agent instructions.
- [Permission rules](extensions/pi-permission-system/config.json): local access policy.
- [skills/](skills/) and [prompts/](prompts/): reusable workflows.

Keep authentication, sessions, logs, and other private runtime data out of Git.
See [.gitignore](.gitignore) for exclusions.
