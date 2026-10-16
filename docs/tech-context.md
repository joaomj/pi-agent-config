# Workflow scope

## Shared resources

This repository distributes agent instructions, prompt templates, skills, and workflow documentation.
It does not manage a Pi installation or synchronize personal runtime configuration.

[AGENTS.md](../AGENTS.md) defines collaboration and approval rules.
[Prompt templates](../prompts/) provide explicit commands for planning, review,
explanation, diagrams, slide decks, and other project workflows.
[Skills](../skills/) provide reusable guidance and supporting tools.

## Personal resources

Keep provider and model settings, MCP servers, extension code, package declarations,
permission policies, credentials, sessions, and caches outside Git.
Install and configure optional packages yourself using the [extension catalog](extensions.md).
No profile or installer selects them for you.

Some instructions assume indexed search, interactive questions, or durable background commands.
Those capabilities depend on separately installed extensions. Adapt the instructions
if your setup does not provide them. Permission checks require your own policy;
installing an extension does not reproduce the maintainer's access rules.

## Workflow outputs

Diagrams follow the [diagram output contract](workflows/diagram-output-contract.md).
Slide decks follow the [HTML slide deck contract](workflows/html-slide-decks.md).
These workflows generate artifacts directly rather than requiring a shared rendering extension.

## Updates

Review upstream workflow changes before copying them into an active configuration.
Update Pi and optional extensions independently using their supported commands.
The former repository installer, profiles, and configuration sync scripts are no longer shared or maintained here.
