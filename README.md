# pi-agent-config

Reusable instructions, prompt templates, and skills for the [Pi coding agent](https://pi.dev).

This repository shares workflows, not a ready-made personal installation. It
installs as a Pi package, so your own prompt templates, skills, providers, MCP
connections, permission rules, and `AGENTS.md` stay local and unchanged.

## Install

Install Pi using its official instructions, then run the installer:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/pi-agent-config
~/pi-agent-config/install.sh
```

Before it changes anything, the installer records the files it edits in a private
git history at `~/.pi/agent/.install-history`: `settings.json`, `AGENTS.md`, and
the permission policy. It installs only a release tag whose signature verifies
against the maintainer's published keys, so a changed or compromised repository
cannot ship unreviewed code.

A later run updates instead of reinstalling: it moves the package to the newest
signed release, prints what changed, and offers only the packages and settings
still missing.

```bash
~/pi-agent-config/install.sh --dry-run     # list what a run would change
~/pi-agent-config/install.sh --rollback    # undo the last run
~/pi-agent-config/install.sh --ref v0.4.1  # stay on, or return to, a release
```

- `--rollback` restores the files above to their state before the last run. It
  does not remove packages. Reinstall the release you want with `--ref`.
- `--dry-run` changes nothing and prints the plan.
- `--only packages`, or any other step name, runs selected configure steps only.

The installer never downloads a browser. If Chrome or Chromium is missing, it
skips browser automation and says which requirement is missing.

The package pins the versions of the third-party packages it offers, so an
update installs a set that has been tested together. A package already installed
at a newer version is left alone and reported.

To install the package without the setup steps:

```bash
pi install git:github.com/joaomj/pi-agent-config@v0.4.1
```

The package adds the prompt templates in [prompts/](prompts/), the skills in
`skills/documentation/`, `skills/engineering/`, and `skills/tooling/`, and one
extension, [`bgrun-guard`](extensions/bgrun-guard.ts). It routes each `bash` call
to the foreground or to `bgrun` in [`pi-background-run`](https://pi.dev/packages/pi-background-run):
rules settle the obvious shapes, a classifier decides the rest, and what this
machine has measured about a command informs that decision. See
[Background routing](docs/background-routing.md). The extension does nothing
unless `pi-background-run` is installed.
It does not change providers, models, MCP servers, permission rules, or `AGENTS.md`.

After the install, the same script walks the parts a package cannot ship:

- `packages` offers each third-party package with a yes/no question: fff,
  permission checks, background commands, the Claude usage footer, interactive
  questions, the context view, and browser automation. A question appears only
  when the answer changes something: the installer names the version it moves a
  package to, and a package already at the pinned version is reported without a
  question. It also removes a package that a later release replaced, such as
  `pi-background-bash`, because the old copy keeps registering tools that now
  collide. The package that needs a resource filter in `settings.json` gets it
  on install. Browser automation needs Node 24 or later and a Chrome or Chromium
  binary. When Node is missing the installer offers an official Node build; when
  the browser is missing it prints what to install and skips the package.
- `claude` offers the Claude subscription transport. When you accept, it checks
  Node and the qualified Claude Code CLI range (`>=2.1.263 <2.2.0`) and offers
  the pinned CLI install. Only a qualified CLI leads to `claude auth login` and
  the transport package; when the CLI stays missing or out of range, the step
  prints the install command and installs nothing. Choosing a model stays
  interactive, in `/model`.
- `agents` copies `AGENTS.md` when you have none, or appends the shared rules
  once, between markers, when you do.
- `permissions` copies the reference policy when you have none. When you have
  your own, it writes `config.json.proposed` beside it and prints the diff.
  Nothing is overwritten.
- `verify` prints the installed packages and counts the shared prompts and skills.

Run a single step with `--only packages`, skip them all with `--no-configure`,
accept every default with `--yes`, and take the Claude transport without being
asked with `--claude`.

Every question shows `[y/n]`; Enter takes the default. A run without a terminal
and without `--yes` skips the steps that need an answer, so nothing installs
silently.

The installer does not create duplicates. A package you already declared is left
alone, even when your entry came from another source, such as git instead of npm.
When `AGENTS.md` already holds the shared rules without markers, it does not
append them again.

Prompt templates become explicit commands, such as `/explain`, `/code-review`,
`/plan`, and `/generate-slides`.

Maintain the installation with these commands:

- Rerun `install.sh` to update to the newest signed release, or `--dry-run` first to see what would change.
- `pi config` disables a single shared prompt or skill, for example after a name collision.
- `--ref <tag>` installs or returns to a named release.

Every skill in `skills/` is included, including `proton-pass`, `skill-doctor`,
and `improve-me`. Turn off any prompt or skill you do not want with `pi config`.
Skill collisions are matched on the declared `name` in `SKILL.md`, not on the
folder, so a separate folder does not avoid a clash.

## Or copy files by hand

To reuse a few files without the package, clone the repository outside your
active Pi configuration and copy what you want:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/pi-agent-config
```

Copy prompt templates and skills into `~/.pi/agent`, under `prompts/` and
`skills/`. Merge the instructions you want from [AGENTS.md](AGENTS.md) into your
own agent instructions; do not overwrite existing instructions without reviewing
them. Run `/reload` after copying. Some workflows expect optional tools; install
those separately or adapt the instructions.

## Choose extensions

[Extensions in use](docs/extensions.md) lists our configured packages, installation
commands, and local-only helpers. `install.sh` offers the installable ones one at
a time; nothing installs automatically. Review each package before you install
it: extensions execute code with your local permissions.

Configure providers through Pi's `/login` and `/model` commands. Configure MCP
connections with `pi mcp add`, then `pi mcp login` for servers that need OAuth.
The installer does not touch MCP servers: they carry credentials and endpoints
that belong to your machine, so setup stays manual.

## Shared resources

- [AGENTS.md](AGENTS.md): collaboration, approval, Git, and testing instructions.
- [prompts/](prompts/): planning, review, explanation, diagrams, slide decks, and other explicit workflows.
- [install.sh](install.sh): installs or updates the package, runs the setup steps, and rolls the last run back.
- [ci/ai-review/](ci/ai-review/): the pull-request review workflow used on GitHub, its CI prompt additions, and the scripts that add it to a repository.
- [skills/](skills/): technical writing, research, test auditing, Proton Pass tooling, skill assessment, and `improve-me`, which turns fixes that repeat across sessions into guards, checks, and scripts.
- [Workflow scope](docs/tech-context.md): sharing boundaries and optional tool dependencies.
- [Model setup reference](docs/model-setup.md): default and cycling models, shared limits, and cache behavior.
- [Background routing](docs/background-routing.md): when a `bash` call runs in the background, its threshold and classifier, and the measurements it keeps.
- [Diagram output contract](docs/workflows/diagram-output-contract.md).
- [HTML slide deck contract](docs/workflows/html-slide-decks.md).

Retain the license notices when copying resources, including [prompts/LICENSE](prompts/LICENSE).

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
ci/ai-review/rollout.sh --ref v0.7.0 joaomj/example-repo
```

The script adds `.github/workflows/ai-review.yml` on the `ai-review` branch, sets
the `DEEPSEEK_API_KEY` secret from `pi auth print-api-key --provider deepseek`,
and opens a pull request. That pull request runs the review, so the first review
also proves the wiring. Pass `--no-secret` to set the secret yourself.

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
- The guidelines come from the `config-ref` input, which defaults to the release
  the caller pins. Both must move together.
- A review that ends without a `REVIEW-VERDICT` line fails the job. Re-run it
  rather than merging past an inconclusive report.

## Existing checkouts

Personal configuration and extension files are now ignored, rather than shared.
The former installer and sync machinery are no longer maintained by this repository.
Do not run an old local copy of those scripts to update this setup.

An older checkout of this repository keeps its own files, so updating it is a
plain `git pull` in that checkout. Commit or stash local changes first: Git can
remove previously tracked files when applying their removal from the repository,
and it stops the pull when a local change would be lost.

These boundaries apply to the current repository tree. Earlier configuration and
extension files remain accessible in Git history. This change does not erase history.
