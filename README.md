# pi-agent-config

Reusable instructions, prompt templates, and skills for the [Pi coding agent](https://pi.dev).

This repository shares workflows, not a ready-made personal installation.
Provider choices, model settings, MCP connections, extension code, permission rules,
and package declarations stay local. There is no shared installer or configuration sync command.

## Use the workflows

Install Pi using its official instructions, then clone this repository outside your active Pi configuration:

```bash
git clone https://github.com/joaomj/pi-agent-config.git ~/pi-agent-config
```

Review the files before using them. Copy the prompt templates and skills you want
into your Pi agent directory (normally `~/.pi/agent`), under `prompts/` and `skills/`.
Merge the instructions you want from [AGENTS.md](AGENTS.md) into your own agent instructions;
do not overwrite existing instructions without reviewing them.

Run `/reload` after copying resources. Prompt templates become explicit commands,
such as `/explain`, `/code-review`, `/plan`, and `/generate-slides`.
Some workflows expect optional tools. Install those separately or adapt the instructions to your setup.

## Choose extensions

[Extensions in use](docs/extensions.md) lists our configured packages, installation
commands, and local-only helpers. Nothing in this repository installs them automatically.
Review each package before installing: extensions execute code with your local permissions.

Configure providers through Pi's `/login` and `/model` commands.
Configure MCP connections separately for your own services and credentials.
This repository does not supply provider or MCP configuration.

## Shared resources

- [AGENTS.md](AGENTS.md): collaboration, approval, Git, and testing instructions.
- [prompts/](prompts/): planning, review, explanation, diagrams, slide decks, and other explicit workflows.
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
