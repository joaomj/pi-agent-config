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

The installer writes a backup of `~/.pi/agent` to
`~/pi-agent-backup-<UTC timestamp>.tar.gz` before it changes anything, prints
the restore command, and then installs the package. Session history, download
caches, and binaries stay out of the backup.

- `--reset` moves the existing configuration aside before installing. It keeps
  `sessions/`, `bin/`, and the provider login, and moves everything else to
  `~/pi-agent-aside-<timestamp>/`. Add `--drop-auth` to move the login too.
- `--backup-only` stops after the backup.

To install the package without the backup step:

```bash
pi install git:github.com/joaomj/pi-agent-config
```

The package adds the prompt templates in [prompts/](prompts/) and the skills in
`skills/documentation/`, `skills/engineering/`, and `skills/tooling/`. It contains
no extension code.
It does not change providers, models, MCP servers, permission rules, or `AGENTS.md`.

After the install, the same script walks the parts a package cannot ship:

- `packages` offers each third-party package with a yes/no question: fff,
  permission checks, background bash, the Claude usage footer, interactive
  questions, the context view, and browser automation. The package that needs a
  resource filter in `settings.json` gets it on install. Browser automation
  needs Node 24 or later and a Chrome or Chromium binary; when either is missing
  the installer offers to download the official Node build and Chrome for
  Testing, then records the browser path in your settings.
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
- `mcp` adds the Exa server only when `EXA_API_KEY` is set, and only after you
  agree.
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
append them again. An Exa server that is already configured is not added twice.

Prompt templates become explicit commands, such as `/explain`, `/code-review`,
`/plan`, and `/generate-slides`.

Maintain the installation with these commands:

- `pi update --extensions` updates this package and the third-party packages.
- `pi config` disables a single shared prompt or skill, for example after a name collision.
- `pi install git:github.com/joaomj/pi-agent-config@v0.4.0` stays on a released tag.

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

Configure providers through Pi's `/login` and `/model` commands.
Configure MCP connections separately for your own services and credentials.
This repository supplies no provider credentials and no MCP keys. `install.sh`
adds the Exa server only from your own `EXA_API_KEY` environment variable.

## Shared resources

- [AGENTS.md](AGENTS.md): collaboration, approval, Git, and testing instructions.
- [prompts/](prompts/): planning, review, explanation, diagrams, slide decks, and other explicit workflows.
- [install.sh](install.sh): the backup-first installer and setup steps.
- [skills/](skills/): technical writing, research, test auditing, Proton Pass tooling, skill assessment, and `improve-me`, which turns fixes that repeat across sessions into guards, checks, and scripts.
- [Workflow scope](docs/tech-context.md): sharing boundaries and optional tool dependencies.
- [Model setup reference](docs/model-setup.md): default and cycling models, shared limits, and cache behavior.
- [Diagram output contract](docs/workflows/diagram-output-contract.md).
- [HTML slide deck contract](docs/workflows/html-slide-decks.md).

Retain the license notices when copying resources, including [prompts/LICENSE](prompts/LICENSE).

## Existing checkouts

Personal configuration and extension files are now ignored, rather than shared.
The former installer and sync machinery are no longer maintained by this repository.
Do not run an old local copy of those scripts to update this setup.

Before updating an existing checkout, back up your active configuration and local extensions outside the repository.
Git can remove previously tracked files when applying their removal from the repository.
Restore your personal files from that backup afterward; keep them untracked.

These boundaries apply to the current repository tree. Earlier configuration and
extension files remain accessible in Git history. This change does not erase history.
