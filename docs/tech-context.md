# Workflow scope

## Shared resources

This repository is one Pi package. It distributes agent instructions, prompt
templates, skills, four extensions of its own, four pinned third-party
extensions, and the pinned `pi-chrome-cdp` browser client. See the [README](../README.md) for the full list.

[AGENTS.md](../AGENTS.md) defines collaboration and approval rules. The
`shared-rules` extension adds it to the system prompt, so no user file changes.
[Prompt templates](../prompts/) provide explicit commands for planning, review,
explanation, diagrams, and other project workflows.
[Skills](../skills/) provide reusable guidance and supporting tools.

## Personal resources

Keep provider and model settings, MCP servers, permission policies,
credentials, sessions, and caches outside Git. The package does not change
them. Permission checks and the Claude transport are opt-in add-ons described in the [extension catalog](extensions.md).

## Workflow outputs

Diagrams follow the [diagram output contract](workflows/diagram-output-contract.md).
These workflows generate artifacts directly rather than requiring a shared rendering extension.

## Updates

Update by installing a newer release tag with `pi install`, and roll back by
installing an older one. Read [CHANGELOG.md](../CHANGELOG.md) before you move.
Update Pi and the opt-in add-ons independently with their own commands.
