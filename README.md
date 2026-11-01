# pi-agent-config

Shared rules, prompt templates, skills, and extensions for the
[Pi coding agent](https://pi.dev), installed as one Pi package.

This README is written so that a coding agent can follow it. If you are an
agent setting this up for a user, run the steps in order, check the result of
each step before the next, and ask the user where a step says so.

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
| [`@ahm3tj4f/pi-undo`](https://github.com/ahm3tj4f/pi-undo) 0.5.0 | `/undo`, `/redo`, and `/diff` for the last agent run, files included. Needs Git 2.31 or later. |
| [`@joaomj/pi-claude-usage`](https://www.npmjs.com/package/@joaomj/pi-claude-usage) 0.2.0 | Claude subscription quota in the footer, when a Claude Code login exists. |

The six third-party packages are npm dependencies of this package, pinned to
versions tested together. Pi installs them with the package and removes them
with it. [Extensions in use](docs/extensions.md) describes each one.

Three add-ons stay opt-in because they need a decision or software from the
user: [permission checks](#permission-checks), the
[Claude subscription transport](#claude-subscription-transport), and
[browser automation](#browser-automation).

The package does not change providers, models, MCP servers, or permission
rules.

## Install

Requirements: Pi 1.4.0 or later, Node.js 22.19 or later, Git, and network
access to GitHub and npm.

1. Find the newest release tag:

   ```bash
   git ls-remote --tags --sort=-v:refname https://github.com/joaomj/pi-agent-config 'v*' | grep -v '\^{}' | head -1
   ```

   Use the tag at the end of the line, for example `v0.9.0`, as `<tag>` below.

2. List the packages the user already has:

   ```bash
   pi list
   ```

   If the list has any package from the table above as a separate entry, or an
   earlier `pi-agent-config` setup, follow [Migrate from install.sh](#migrate-from-installsh)
   first. Pi does not start when two copies of the same extension register the
   same tool.

3. Install the package:

   ```bash
   pi install git:github.com/joaomj/pi-agent-config@<tag>
   ```

   The command ends with `Installed git:github.com/joaomj/pi-agent-config@<tag>`.

4. Verify that every extension loads:

   ```bash
   pi --help 2>&1 | grep -E 'Failed to load|conflicts with|--fff-mode'
   ```

   The output must be exactly one line, with `--fff-mode`. Any `Failed to load`
   or `conflicts with` line names the extension to fix.

5. Tell the user to restart Pi. Running sessions do not load the package.

## Migrate from install.sh

Earlier releases used `install.sh`, which installed each package separately and
edited `AGENTS.md`. Clean those up before step 3 of [Install](#install).

1. Remove each separate entry that the package now ships. Run only the lines
   whose package appears in `pi list`, with the source exactly as `pi list`
   shows it:

   ```bash
   pi remove npm:pi-bg-bash@0.4.1
   pi remove npm:pi-ask-user@0.16.0
   pi remove npm:@ff-labs/pi-fff@0.11.0
   pi remove npm:pi-context-view
   pi remove npm:@ahm3tj4f/pi-undo@0.5.0
   pi remove npm:@joaomj/pi-claude-usage@0.2.0
   ```

   Keep `npm:@gotgenes/pi-permission-system`, `npm:pi-browser-use`, and
   `pi-claude-directsdk`. They are the opt-in add-ons.

2. Check the existing `pi-agent-config` entry in `~/.pi/agent/settings.json`.
   A filter such as `"extensions": []` turns off every bundled extension. Ask
   the user before you remove a filter.

3. Check `~/.pi/agent/AGENTS.md` for a block between
   `<!-- pi-agent-config: shared rules -->` and
   `<!-- pi-agent-config: end shared rules -->`. While that block exists, the
   package does not add its rules, so the user keeps the old text. Ask the user
   before you delete the block, markers included.

4. `~/.pi/agent/.install-history` holds the old installer's backups. It is not
   used any more. Ask the user before you delete it.

Then continue with step 3 of [Install](#install).

## Update, roll back, and remove

- Update: run step 1 of [Install](#install), then
  `pi install git:github.com/joaomj/pi-agent-config@<new tag>`. Read the
  release notes in [CHANGELOG.md](CHANGELOG.md) first.
- Roll back: install an older tag the same way.
- Remove: `pi remove git:github.com/joaomj/pi-agent-config`. This removes the
  rules, prompts, skills, and the bundled packages.

## Turn off one part

Replace the package entry in `~/.pi/agent/settings.json` with the object form
and exclude what the user does not want. For example, to drop the undo
extension and the Claude quota footer:

```json
{
  "source": "git:github.com/joaomj/pi-agent-config@<tag>",
  "extensions": [
    "!node_modules/@ahm3tj4f/pi-undo/**",
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

1. Ask the user whether they want permission checks.
2. Install the extension:

   ```bash
   pi install npm:@gotgenes/pi-permission-system@41.0.0
   ```

3. The policy lives at
   `~/.pi/agent/extensions/pi-permission-system/config.json`. If that file
   does not exist, copy the reference there:

   ```bash
   mkdir -p ~/.pi/agent/extensions/pi-permission-system
   cp ~/.pi/agent/git/github.com/joaomj/pi-agent-config/permissions/pi-permission-system.json \
      ~/.pi/agent/extensions/pi-permission-system/config.json
   ```

   If the file exists, do not overwrite it. Follow the update steps below.

To bring a later reference into an existing policy:

1. Show the user `diff -u <their config.json> <the reference>`.
2. Ask which changes to take. The policy is a map of surface, pattern, and
   action. Within a surface, the last matching pattern wins, so keep the order
   of the patterns you copy.
3. Write the result to `config.json.proposed` next to `config.json`. The
   reference policy denies agents access to the policy file, so the user moves
   the file into place:

   ```bash
   mv ~/.pi/agent/extensions/pi-permission-system/config.json.proposed \
      ~/.pi/agent/extensions/pi-permission-system/config.json
   ```

### Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) lets Pi use
a paid Claude plan through the Claude Code login.

1. Ask the user whether they want it. It needs a paid Claude plan.
2. Check the Claude Code CLI. The transport is qualified for versions from
   2.1.263 up to, but not including, 2.2.0:

   ```bash
   claude --version
   ```

   If the CLI is missing or outside that range, ask the user before you
   install the qualified version:

   ```bash
   npm install -g --ignore-scripts=false @anthropic-ai/claude-code@2.1.281
   ```

3. Check the login with `claude auth status --json`. If `loggedIn` is not
   `true`, the user runs `claude auth login`, which opens a browser.
4. Install the transport:

   ```bash
   pi install git:github.com/joaomj/pi-claude-directsdk@6574117a2ce0b4e03df18e271f75f003411eeb6a
   ```

5. The user restarts Pi, opens `/model`, waits for the DirectSDK catalog, and
   chooses a DirectSDK model.

### Browser automation

[`pi-browser-use`](https://pi.dev/packages/pi-browser-use) adds the `browser_*`
tools on a managed headless browser.

1. Ask the user whether they want it.
2. Check the requirements. It needs Node.js 24.18 or later (`node -v`) and
   Google Chrome or Chromium. Do not download a browser for the user.
3. Install it:

   ```bash
   pi install npm:pi-browser-use@0.12.15
   ```

On Linux, a Chrome under the home directory may not start with its sandbox. See
[Extensions in use](docs/extensions.md#browser-automation) for the setting that
fixes it and what it costs.

## Review pull requests in GitHub

[.github/workflows/ai-review.yml](.github/workflows/ai-review.yml) runs one code
review before a pull request can merge, using
[prompts/code-review.md](prompts/code-review.md). The review runs as a GitHub
Actions job, so nothing runs outside the runner.

The job posts the report as a review comment and fails when the report contains
a P0 or P1 finding. That failure blocks a merge while the default branch requires
the `ai-review / review` check. Without that requirement the review reports and
does not block.

### Add it to a repository

```bash
ci/ai-review/rollout.sh --ref v0.7.2 joaomj/example-repo
```

The script adds `.github/workflows/ai-review.yml` on the `ai-review` branch, sets
the `DEEPSEEK_API_KEY` secret from `pi auth print-api-key --provider deepseek`,
and opens a pull request. That pull request runs the review, so the first review
also proves the wiring. Pass `--no-secret` to set the secret yourself, and
`--update` to rewrite a branch the script already created.

The caller pins the called workflow and the guidelines to the commit that `--ref`
resolves to, so moving a release tag cannot change what runs with the secret.

After the pull request merges, require the check:

```bash
ci/ai-review/ruleset.sh joaomj/example-repo
```

The ruleset lets a repository administrator bypass it only through a pull
request, so direct pushes to the default branch then fail. Preview the change
with `--dry-run`.

### Limits

- The job skips private repositories. GitHub requires a paid plan to enforce a
  status check on a private repository, so a private repository would post a
  review that blocks nothing.
- The job skips fork pull requests, which receive no secret.
- The default model is `deepseek/deepseek-flash` with `high` thinking. Pass the
  `model` and `thinking` inputs in the caller workflow to change it.
- Repositories with pull requests disabled cannot run the review; the rollout
  script refuses them.
- Updating the review means a new release and a re-run of `rollout.sh --update`,
  because callers pin a commit rather than a tag.
- A review that ends without a `REVIEW-VERDICT` line fails the job. Re-run it
  rather than merging past an inconclusive report.

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
