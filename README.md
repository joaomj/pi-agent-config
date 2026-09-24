# pi-agent-config

Public personal-workstation configuration for the
[pi coding agent](https://pi.dev). It is the reproducible source for the Pi
installation on the repository owner's Mac.

## Scope

This repository contains generic personal instructions, models, skills,
prompts, extensions, and permission policy for one workstation. Authentication,
sessions, caches, logs, and other runtime state remain local and untracked.

## Requirements

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

Start pi and confirm that the startup header reports the global `AGENTS.md`, four
skills, eleven prompt templates, and the configured extensions. Run `/reload` after
a resource edit or restart pi after a permission-policy edit.

## Configuration

- `AGENTS.md` contains global safety, tooling, collaboration, and writing rules.
- `settings.json` selects the startup model, thinking level, transport, and pi
  packages.
- `models.json` overrides context and output limits for selected models.
- `extensions/pi-permission-system/config.json` contains deterministic
  `allow`, `ask`, and `deny` policy.
- `skills/` contains standards and specialized output contracts that pi loads
  on demand.
- `prompts/` contains explicit slash commands for planning, review, release,
  and other repeatable deliverables.
- `CHANGELOG.md` is generated from version tags and commit history.
- `scripts/update-changelog.sh` generates the changelog locally, and
  `.github/workflows/update-changelog.yml` updates it after every `v*` tag.

The configuration loads five extension packages:

- `npm:@gotgenes/pi-permission-system` enforces deterministic `allow`, `ask`,
  and `deny` rules.
- `npm:@kiranpg/pi-sentry` redacts secrets from model input, tool output, and
  session history.
- `npm:pi-web-access` provides web search and content retrieval.
- `npm:pine-of-glass` provides observability tools. This configuration enables
  its Pi Meantime extension through `extensions/pi-meantime/config.json`.
- `npm:pi-rewind-unwind` adds file-aware `/undo` and `/tree` restoration.

The permission policy allows ordinary local work by default. Path rules block
sensitive files across file tools and recognized shell paths. Command rules
block destructive operations and require confirmation for external access,
package changes, Git writes, deployment operations, and other high-impact
commands. Permission review logs remain local and ignored because
they can contain unredacted commands.

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

Keep changes generic and suitable for a public personal-workstation
configuration. Review each change for private information before committing it.

- Edit a skill under `skills/<group>/<name>/SKILL.md`.
- Add a prompt as `prompts/<command>.md`.
- Edit permission rules in `extensions/pi-permission-system/config.json`.
- Ask the agent to check package updates before installing them. It should compare the published code and dependencies with the installed versions, check for new install scripts, and report the risk and rollback version. Approve each update before installation. Extensions run with full local access; automated checks cannot guarantee that an update is safe.
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
state/
web-search.json
config.public.json
extensions/*/logs/
npm/* except npm/package.json and npm/.gitignore
git/
```

Copy `web-search.example.json` to `web-search.json` (gitignored) and provide
keys via environment references such as `$EXA_API_KEY`, or via Keychain
`!security` resolvers on macOS. Never commit the real file.
