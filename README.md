# pi-agent-config

Personal global configuration for the [pi coding agent](https://pi.dev).

## Requirements

- pi `0.85.1` or a compatible later version
- Git
- Node.js and npm for installed extensions
- `uv`, `rg`, `fd`, and `fzf` for configured agent workflows
- `gh` for GitHub operations

## Install

Run the bootstrap command:

```bash
tmp_dir="$(mktemp -d)" && \
  git clone --depth 1 https://github.com/joaomj/pi-agent-config.git "$tmp_dir/config" && \
  bash "$tmp_dir/config/install.sh" && \
  rm -rf "$tmp_dir"
```

The installer:

1. Installs pi through npm when `pi` is not available.
2. Refuses to overwrite an existing `~/.pi/agent` directory.
3. Clones this repository into `~/.pi/agent`.
4. Installs the configured pi packages.
5. Verifies pi and reports missing optional workflow tools.

Export `PI_CODING_AGENT_DIR` before the command to install in another directory.
Review the script and third-party extension code before installation because pi
extensions run with full local access.

## Verify

```bash
pi --version
pi list
```

Start pi and confirm that the startup header reports the global `AGENTS.md`, five
skills, eleven prompt templates, and three extensions. Run `/reload` after
a resource edit or restart pi after a permission-policy edit.

## Configuration

- `AGENTS.md` contains global safety, tooling, collaboration, and writing rules.
- `settings.json` selects the startup model, thinking level, transport, pi
  packages, and lazy-loader behavior.
- `models.json` overrides context and output limits for selected models.
- `extensions/lazy/README.md` defines the deferral policy for background
  extensions.
- `extensions/lazy/` holds deferred extensions. The directory is empty by
  default.
- `extensions/pi-permission-system/config.json` contains deterministic
  `allow`, `ask`, and `deny` policy.
- `skills/` contains standards and specialized output contracts that pi loads
  on demand.
- `prompts/` contains explicit slash commands for planning, review, release,
  and other repeatable deliverables.
- `CHANGELOG.md` is generated from version tags and commit history.
- `scripts/update-changelog.sh` generates the changelog locally, and
  `.github/workflows/update-changelog.yml` updates it after every `v*` tag.

The configuration installs three synchronous extensions. `npm:@gotgenes/pi-permission-system`
enforces the `allow`, `ask`, and `deny` policy. `npm:@liborw/pi-startup-time`
measures startup time, shows the result in the footer, and provides
`/startup-time`. `npm:beval-pi-lazy-loader` loads `extensions/lazy/` in the
background after the session starts. All three extensions stay synchronous
because permission gates and startup measurement require first-turn presence.

The permission policy has one universal `ask` fallback. It allows common local
inspection commands, denies sensitive paths and unsupported direct Python
commands, and lets skill content load without a prompt. External access,
writes, and unknown shell commands require approval.

## Use

```bash
pi
pi -p "summarize recent commits"
pi --thinking high -p "diagnose the failure in this log"
```

Common interactive commands:

```text
/plan <ticket>
/opportunities [focus]
/show-me [topic]
/code-review [scope]
/gitignore [focus]
/commit
/pr [instructions]
/release <version>
```

Use `/model` to change the model, `/thinking` to change reasoning effort, and
`Ctrl+S` in either selector to save the startup default.

## Maintain

- Edit a skill under `skills/<group>/<name>/SKILL.md`.
- Add a prompt as `prompts/<command>.md`.
- Edit permission rules in `extensions/pi-permission-system/config.json`.
- Place a deferred extension under `extensions/lazy/` per
  `extensions/lazy/README.md`.
- Run `pi update --extensions` to update installed packages.
- Run `bash install.sh` to repair package installation in the active checkout.
- Run `bash scripts/update-changelog.sh vMAJOR.MINOR.PATCH` before a release.
- Run `git diff --check` before committing configuration changes.

Do not commit authentication, trust, session, model-cache, package-install, or
permission-log data. `.gitignore` excludes these paths:

```text
auth.json
trust.json
sessions/
models-store.json
extensions/*/logs/
npm/* except npm/package.json and npm/.gitignore
git/
```
