# pi-agent-config

Reusable instructions, prompt templates, and skills for the [Pi coding agent](https://pi.dev).

This repository shares workflows, not a ready-made personal installation. It
installs as a Pi package, so your own prompt templates, skills, providers, MCP
connections, permission rules, and `AGENTS.md` stay local and unchanged.

## Install

Install Pi using its official instructions, then add this repository as a Pi package:

```bash
pi install git:github.com/joaomj/pi-agent-config
```

The package adds the prompt templates in [prompts/](prompts/) and the skills in
`skills/documentation/` and `skills/engineering/`. It contains no extension code.
It does not change providers, models, MCP servers, permission rules, or `AGENTS.md`.

Start Pi and run `/bootstrap`. That guided session installs the third-party
packages you pick, offers the Exa MCP server, and helps you merge `AGENTS.md` and
your permission policy. It inspects the machine before it writes, and reports
each change.

Prompt templates become explicit commands, such as `/explain`, `/code-review`,
`/plan`, and `/generate-slides`.

Maintain the installation with these commands:

- `pi update --extensions` updates this package and the third-party packages.
- `pi config` disables a single shared prompt or skill, for example after a name collision.
- `pi install git:github.com/joaomj/pi-agent-config@v1` stays on a released tag.

The package leaves out the `proton-pass` and `skill-doctor` skills. They expect
host tools and local session history. Copy either one into your own `skills/`
directory if you need it.

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
commands, and local-only helpers. `/bootstrap` offers the installable ones one at a
time; nothing installs automatically. Review each package before you install it:
extensions execute code with your local permissions.

Configure providers through Pi's `/login` and `/model` commands.
Configure MCP connections separately for your own services and credentials.
This repository supplies no provider credentials and no MCP keys. `/bootstrap`
offers the Exa server so that you can add it with your own key.

## Shared resources

- [AGENTS.md](AGENTS.md): collaboration, approval, Git, and testing instructions.
- [prompts/](prompts/): planning, review, explanation, diagrams, slide decks, and other explicit workflows.
- [prompts/bootstrap.md](prompts/bootstrap.md): the `/bootstrap` session that adapts a machine to the shared setup.
- [skills/](skills/): technical writing, research, test auditing, Proton Pass tooling, and skill assessment.
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
