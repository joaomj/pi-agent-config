# pi-agent-config

Shared rules, prompt templates, skills, and extensions for the
[Pi coding agent](https://pi.dev), installed as one Pi package.

## Install

Requirements: Pi 1.4.0 or later, Node.js 22.19 or later, Git, and network
access to GitHub and npm.

The steps in this section are meant to be run by a coding agent. Tell your
agent to follow these instructions. It checks the result of each step before
moving on, and asks you where a decision is needed.

First, find out which case applies:

```bash
pi list
```

- If the output names `pi-agent-config`, or any of `pi-bg-bash`, `pi-ask-user`,
  `@ff-labs/pi-fff`, `pi-context-view`, `@ahm5tj4f/pi-undo`, or
  `@joaomj/pi-claude-usage` as a separate entry, you are upgrading: follow
  [Upgrading from an older version](#upgrading-from-an-older-version).
- Otherwise, follow [New install](#new-install).

Pick one path and stick with it. Pi does not start when two copies of one
extension register the same tool.

### New install

1. Find the newest release tag:

   ```bash
   git ls-remote --tags --sort=-v:refname https://github.com/joaomj/pi-agent-config 'v*' | grep -v '\^{}' | head -1
   ```

   Use the tag it prints, for example `v0.9.0`, as `<tag>` below.

2. Install the package:

   ```bash
   pi install git:github.com/joaomj/pi-agent-config@<tag>
   ```

   The last line should read `Installed git:github.com/joaomj/pi-agent-config@<tag>`.

3. Check that every extension loads:

   ```bash
   pi --help 2>&1 | grep -E 'Failed to load|conflicts with|--fff-mode'
   ```

   You want exactly one line: the one with `--fff-mode`. A `Failed to load`
   or `conflicts with` line names the extension to fix.

4. Decide on the opt-in add-ons — [permission checks](#permission-checks),
   the [Claude subscription transport](#claude-subscription-transport), and
   [browser automation](#browser-automation). Follow the section for each one
   you want; skipping all three is fine.

5. Restart Pi. Running sessions do not load the package.

### Upgrading from an older version

Older versions used `install.sh`, which installed each package separately,
edited `~/.pi/agent/AGENTS.md`, and kept backups in `~/.pi/agent/.install-history`.

1. Back up the two files this procedure changes:

   ```bash
   mkdir -p ~/pi-agent-config-backup
   cp ~/.pi/agent/settings.json ~/.pi/agent/AGENTS.md ~/pi-agent-config-backup/ 2>/dev/null; ls ~/pi-agent-config-backup
   ```

   The listing should show `settings.json`, and `AGENTS.md` when it existed.

2. Find the newest release tag, as in [New install](#new-install) step 1.

3. Run `pi list` and note the exact source of each entry. Remove the old
   `pi-agent-config` entry and every separate entry that the package now ships.
   Use the source exactly as `pi list` prints it, and skip lines whose package
   is not listed. With the sources that `install.sh` wrote:

   ```bash
   pi remove git:github.com/joaomj/pi-agent-config
   pi remove npm:pi-bg-bash@0.4.1
   pi remove npm:pi-ask-user@0.16.0
   pi remove npm:@ff-labs/pi-fff@0.11.0
   pi remove npm:pi-context-view
   pi remove npm:@ahm5tj4f/pi-undo@0.5.0
   pi remove npm:@joaomj/pi-claude-usage@0.2.0
   ```

   Each command prints `Removed <source>`. Removing the old `pi-agent-config`
   entry also removes any filter such as `"extensions": []` that turned off its
   extensions.

   Keep `npm:@gotgenes/pi-permission-system`, `npm:pi-browser-use`, and
   `pi-claude-directsdk`. They are the opt-in add-ons and are not bundled.

4. Run `pi list` again. None of the packages removed in step 3 should appear.

5. Install the package:

   ```bash
   pi install git:github.com/joaomj/pi-agent-config@<tag>
   ```

   The last line should read `Installed git:github.com/joaomj/pi-agent-config@<tag>`.

6. Clean up `~/.pi/agent/AGENTS.md`. Look for the block that `install.sh`
   added:

   ```bash
   grep -n 'pi-agent-config: ' ~/.pi/agent/AGENTS.md
   ```

   - No output: nothing to do, continue with step 7.
   - Two lines (`shared rules` and `end shared rules`): while this block
     exists, the package does not add its rules, so you keep the old text.
     You choose:
     - Remove the block, markers included, and keep the rest of the file. The
       package then adds the current rules.
     - If the file holds only that block, delete the file.

   Afterwards, `grep -c 'pi-agent-config: ' ~/.pi/agent/AGENTS.md` prints `0`,
   or the file no longer exists.

7. If `~/.pi/agent/.install-history` exists, decide whether to delete it.
   Nothing uses it any more.

8. Verify as in [New install](#new-install) step 3.

9. Restart Pi. Running sessions do not load the package.

To undo the upgrade, run `pi remove git:github.com/joaomj/pi-agent-config`,
copy the files in `~/pi-agent-config-backup/` back to `~/.pi/agent/`, and run
`pi update --extensions`.

## What the package adds

| Part | What it does |
|---|---|
| [AGENTS.md](AGENTS.md) | Shared working rules. The `shared-rules` extension adds them to the system prompt; no user file is edited. |
| [prompts/](prompts/) | Commands such as `/plan`, `/code-review`, `/explain`, `/pr`, and `/generate-slides`. |
| [skills/](skills/) | `technical-writing`, `research`, `test-audit`, `improve-me`, `proton-pass`, and `skill-doctor`. |
| [`bg-bash-timer`](extensions/bg-bash-timer.ts) | Moves a foreground `bash` command to the background after 20 s, also when the call sets `timeout`. See [Background commands](docs/background-commands.md). |
| [`loop-breaker`](extensions/loop-breaker.ts) | Adds a note when the same check fails again after changes, or when an identical call repeats three times. |
| [`pi-bg-bash`](https://pi.dev/packages/pi-bg-bash) 0.4.1 | Background `bash` tasks: `bash_output`, `bash_tasks`, `bash_kill`, `/bg`. |
| [`pi-ask-user`](https://www.npmjs.com/package/pi-ask-user) 0.16.0 | The `ask_user` tool. Its own skills are not loaded. |
| [`@ff-labs/pi-fff`](https://www.npmjs.com/package/@ff-labs/pi-fff) 0.11.0 | Indexed search: `fffind` and `ffgrep`. |
| [`pi-context-view`](https://pi.dev/packages/pi-context-view) 0.8.2 | Commands that show what fills the context window. |
| [`@ahm5tj4f/pi-undo`](https://github.com/ahm5tj4f/pi-undo) 0.5.0 | `/undo`, `/redo`, and `/diff` for the last agent run, files included. Needs Git 2.31 or later. |
| [`@joaomj/pi-claude-usage`](https://www.npmjs.com/package/@joaomj/pi-claude-usage) 0.2.0 | Claude subscription quota in the footer, when a Claude Code login exists. |

The six third-party packages are npm dependencies of this package, pinned to
versions tested together. Pi installs them with the package and removes them
with it. [Extensions in use](docs/extensions.md) describes each one.

Three add-ons stay opt-in because they need a decision or extra software from
you: [permission checks](#permission-checks), the
[Claude subscription transport](#claude-subscription-transport), and
[browser automation](#browser-automation).

The package does not change providers, models, MCP servers, or permission
rules.

## Update, roll back, and remove

- Update: find the newest tag as in [New install](#new-install) step 1, then
  run `pi install git:github.com/joaomj/pi-agent-config@<new tag>`. Read the
  release notes in [CHANGELOG.md](CHANGELOG.md) first.
- Roll back: install an older tag the same way.
- Remove: `pi remove git:github.com/joaomj/pi-agent-config`. This removes the
  rules, prompts, skills, and the bundled packages.

## Turn off one part

Replace the package entry in `~/.pi/agent/settings.json` with the object form
and exclude what you do not want. For example, to drop the undo extension and
the Claude quota footer:

```json
{
  "source": "git:github.com/joaomj/pi-agent-config@<tag>",
  "extensions": [
    "!node_modules/@ahm5tj4f/pi-undo/**",
    "!node_modules/@joaomj/pi-claude-usage/**"
  ]
}
```

`skills` and `prompts` take the same patterns. `pi config` turns single
resources on and off interactively. To turn off the shared rules, exclude
`extensions/shared-rules.ts`.

## Opt-in add-ons

### Permission checks

[`@gotgenes/pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system)
asks or denies before tool calls, according to a policy file. This repository
ships a reference policy in
[permissions/pi-permission-system.json](permissions/pi-permission-system.json).
It denies reads of credentials and `.env` files and asks before commits, pushes,
deletes, installs, and remote writes.

To use it, install the extension:

```bash
pi install npm:@gotgenes/pi-permission-system@41.0.0
```

The policy lives at
`~/.pi/agent/extensions/pi-permission-system/config.json`. If that file does
not exist, copy the reference there:

```bash
mkdir -p ~/.pi/agent/extensions/pi-permission-system
cp ~/.pi/agent/git/github.com/joaomj/pi-agent-config/permissions/pi-permission-system.json \
   ~/.pi/agent/extensions/pi-permission-system/config.json
```

If the file exists, do not overwrite it. Instead, bring a later reference into
your policy by hand:

1. Compare your policy with the reference:
   `diff -u <their config.json> <the reference>`.
2. Pick the changes you want. The policy is a map of surface, pattern, and
   action. Within a surface, the last matching pattern wins, so keep the order
   of the patterns you copy.
3. Write the result to `config.json.proposed` next to `config.json`. The
   reference policy denies agents access to the policy file, so move the file
   into place yourself:

   ```bash
   mv ~/.pi/agent/extensions/pi-permission-system/config.json.proposed \
      ~/.pi/agent/extensions/pi-permission-system/config.json
   ```

### Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) lets Pi use
a paid Claude plan through the Claude Code login. It needs a paid Claude plan.

Check the Claude Code CLI first. The transport is qualified for versions from
2.1.263 up to, but not including, 2.2.0:

```bash
claude --version
```

If the CLI is missing or outside that range, install the qualified version:

```bash
npm install -g --ignore-scripts=false @anthropic-ai/claude-code@2.1.281
```

Check the login with `claude auth status --json`. If `loggedIn` is not `true`,
run `claude auth login`, which opens a browser.

Find the newest transport release, for example `v0.3.1`:

```bash
git ls-remote --tags --sort=-v:refname https://github.com/joaomj/pi-claude-directsdk 'v*' | grep -v '\^{}' | head -1
```

Install the transport at that tag:

```bash
pi install git:github.com/joaomj/pi-claude-directsdk@<transport tag>
```

Restart Pi, open `/model`, wait for the DirectSDK catalog, and choose a
DirectSDK model.

### Browser automation

[`pi-browser-use`](https://pi.dev/packages/pi-browser-use) adds the `browser_*`
tools on a managed headless browser. It needs Node.js 24.18 or later
(`node -v`) and Google Chrome or Chromium.

Install it:

```bash
pi install npm:pi-browser-use@0.12.15
```

On Linux, a Chrome under the home directory may not start with its sandbox. See
[Extensions in use](docs/extensions.md#browser-automation) for the setting that
fixes it and what it costs.

## Maintain this repository

- `scripts/check-package.sh [commit]` installs a commit into a scratch Pi
  directory with `pi install git:...` and checks that every bundled tool
  registers, no extension fails to load, and the shared rules reach the model
  request once. It does not read or change your own Pi configuration. Run it
  after any change to `package.json` or `extensions/`.
- `scripts/release.sh vX.Y.Z` runs that check, sets the version, signs the tag,
  and publishes the release.
- To change a bundled package version, edit `dependencies` in `package.json`,
  confirm its entry file still matches the path in `pi.extensions`, and run the
  check.

More reference: [Workflow scope](docs/tech-context.md),
[Model setup](docs/model-setup.md),
[Diagram output contract](docs/workflows/diagram-output-contract.md), and
[HTML slide deck contract](docs/workflows/html-slide-decks.md).

Retain the license notices when you copy resources, including
[prompts/LICENSE](prompts/LICENSE).
