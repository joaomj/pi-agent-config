---
name: technical-writing
description: Write file-based technical reports as arXiv-style scientific papers, plus README files, API docs, architecture explanations, and implementation summaries. Use ONLY for files. Do not use for chat, progress updates, or direct assistance.
license: MIT
---

# Technical Writing

Use this skill for file writing only: reports, READMEs, API docs, architecture explanations, issue records, issue writeups, and implementation summaries.

This skill owns report files. It does not own chat. For chat, progress updates, and direct assistance, follow the Communication Contract in `AGENTS.md`.

## Report Voice (arXiv Style)

Write reports as formal technical prose in the style of arXiv scientific papers.

- Use a precise academic tone with full sentences. Technical terms are allowed. Define each term on first use.
- Structure reports as: Title, Abstract, Introduction, Background or Related Work, Methodology, Results, Discussion, Conclusion and Future Work, References.
- Write the Abstract as one paragraph with problem, method, key finding, and conclusion.
- Write Methodology with enough detail to reproduce the work: tools, data, steps, and reason for the choice.
- Separate observation from interpretation in Results. Use numbered tables or figures with concrete values.
- Cover limits, surprises, and open questions in Discussion.
- Do not invent metrics, links, requirements, or outcomes. Mark unknowns as TBD.
- For How-to, Reference, and Safety instructions, follow the STE Compliance Rules below. For Reports, this arXiv structure takes priority and STE clarity applies second.

## STE Compliance Rules

### Words (Section 1)

- Use only words from the STE approved dictionary, technical nouns (Rule 1.5), or technical verbs (Rule 1.12). Do not use unapproved words.
- Use approved words only as the specified part of speech (Rule 1.2) and only with their approved meaning (Rule 1.3).
- Use American English spelling (Rule 1.14). Use British English only when quoting text that requires it.

### Multi-Word Nouns (Section 2)

- Write multi-word nouns of no more than three words (Rule 2.1). Use hyphens to join words that belong together (Rule 2.2).

### Verbs (Section 3)

- Use only the approved forms of verbs (Rules 3.1-3.2). Use simple present tense (Rule 3.3). Use active voice (Rule 3.4). Use imperative mood for instructions (Rule 5.3).

### Sentences (Sections 4-5)

- Write short sentences. In procedural writing, use a maximum of 20 words (Rule 5.1).
- Write one instruction per sentence unless two or more actions occur at the same time (Rule 5.2).
- Use vertical lists for sequences or parallel items (Rules 4.3, 8.4).
- Keep paragraphs short (Rule 6.1). Use one paragraph for each topic.

### Safety Instructions (Section 7)

- Use "warning" or "caution" to identify the level of risk (Rule 7.1).
- Start with a clear and accurate command or condition (Rule 7.2).
- Explain the risk or possible result (Rule 7.3).

### General Writing Principles (Section 9)

- Use the possessive form only when no simpler alternative is correct (GR-8).
- Use positive phrasing. Write what the reader must do, not what they must not do (GR-7).
- Do not use technical jargon or undefined abbreviations.
- Do not use noun clusters that combine more than three words.

## Principles

- Write for the reader's task and current knowledge level.
- For stakeholder and other non-engineering documents, lead with the user or
  business outcome. Use plain language and explain technical terms only when
  they are necessary.
- Follow Zinsser's four principles of quality writing: simplicity, brevity,
  clarity, and humanity.
- Prefer concrete paths, commands, examples, and decisions over generic prose.
- Preserve project terminology and naming.
- Do not invent facts, metrics, links, requirements, or outcomes.
- Separate evidence from interpretation.
- Keep writing concise unless the user asks for depth.

## Documentation Types

| Type | Use |
|------|-----|
| README | First-use overview, setup, core usage, and links |
| How-to | Task-oriented steps for a specific goal |
| Reference | Complete technical details, options, schemas, APIs |
| Explanation | Context, tradeoffs, architecture, and rationale |
| Report | arXiv-style scientific paper (see Report Structure) |
| Tech Context | Engineering source-of-truth and onboarding document (see Tech Context Structure) |
| Issue Record | Persistent knowledge base of resolved issues for future reference (see Issue Record Structure) |

## Report Structure

Use this structure for reports, postmortems, evaluation summaries, or any document that needs rigorous analysis. Write in formal technical prose like an arXiv paper.

1. **Title** — Clear, specific, and descriptive.
2. **Abstract** — One paragraph with problem, method, key finding, and conclusion. Assumes technical familiarity.
3. **Introduction** — Problem statement, prior context, what prompted the work, and scope boundaries.
4. **Background or Related Work** — Prior work, existing approaches, and how this work differs.
5. **Methodology** — What was done, how, with what tools and data, and why that approach was chosen. Include reproducibility notes.
6. **Results** — Evidence-backed findings with concrete numbers, numbered tables, or figures. Separate observation from interpretation.
7. **Discussion** — What the results mean. Limitations, surprises, caveats, and relation to the original question.
8. **Conclusion and Future Work** — Synthesis of findings into clear judgement, plus open questions and suggested next work. Do not invent dates or time estimates.
9. **References** — Links, prior reports, data sources, tools cited.

> Do not fabricate metrics, impact figures, or business outcomes. Use ranges or mark as TBD when the user has not provided exact numbers.

## Tech Context Structure

Use this for `tech-context.md` — a living document that serves as the engineering source of truth for a project and the primary onboarding artifact for new engineers.

1. **Overview** — One-paragraph summary: what the system does, who uses it, and why it exists.
2. **Architecture** — High-level system architecture: key services, components, data flow, and a link to architecture diagrams. Include a simple ASCII or mermaid diagram if helpful.
3. **Tech Stack** — Languages, frameworks, databases, queues, infrastructure, and key libraries. Include version constraints where relevant.
4. **Key Decisions (ADRs)** — Architectural decisions, the context that drove them, and the tradeoffs accepted. Summarise or link to `docs/adr/`.
5. **Repository Layout** — Map of the repo's top-level directories and what lives where.
6. **Local Development** — How to set up, run, test, and debug locally. Include env vars (with a link to a `.env.example`), dependency management, build commands, and IDE setup tips.
7. **Deployment** — How the system is deployed, environments (dev/staging/prod), CI/CD pipeline overview, release process, feature flags.
8. **Runbooks** — Common operational tasks: restarting services, scaling, rolling back, draining queues, querying production data safely, debugging crashes.
9. **Monitoring & Observability** — Where to find logs, metrics, traces, dashboards, and alerts. How to investigate an incident.
10. **Testing Strategy** — What is tested at each level (unit, integration, e2e), how to run test suites, and conventions for writing tests.
11. **Security & Compliance** — Auth model, secret management, data classification, PII handling, audit trails.
12. **Glossary** — Project-specific terms, abbreviations, and acronyms.
13. **Contributing** — PR workflow, code review expectations, linting, commit conventions, and coding standards.

## Issue Record Structure

Use this for individual markdown files in a `docs/issues/` folder — a searchable knowledge base of major issues encountered. Each file covers one issue and acts as future reference so a solution is never reinvented.

Sections are optional — include only what is relevant:

1. **Title** — Clear, descriptive summary of the issue (same as the filename slug).
2. **Date** — When the issue occurred or was resolved.
3. **Context** — Project state, environment, relevant config, and surrounding circumstances.
4. **Issue** — What went wrong. Concise problem description.
5. **Steps to Reproduce** — Minimal, repeatable sequence to trigger the issue.
6. **Expected Behavior** — What should have happened.
7. **Actual Behavior** — What actually happened (logs, errors, screenshots, traces).
8. **Tried Solutions** — What was attempted that did not work, and why each failed.
9. **Working Solution** — What fixed it, with exact commands, code changes, config diffs, or rollback steps.
10. **Root Cause** — Why the issue happened in the first place (not always the same as the fix).
11. **Related** — Links to related issues, PRs, commits, or external references.

> Name files with a date prefix for chronological sorting, e.g. `2026-06-17-rds-connection-pool-exhaustion.md`.

## README Standard

A README should include:

- Project name and one-line purpose
- Key capabilities
- Quick start
- Minimal usage example
- Configuration basics
- Test/verification commands
- Links to deeper docs when available

Avoid dumping internal architecture into the README unless needed for first use.

## API Documentation Standard

For each endpoint or public API, include:

- Purpose
- Method and path, or function signature
- Authentication/authorization requirements
- Request parameters and body schema
- Response schema and status codes
- Error cases
- Minimal examples
- Compatibility or migration notes

## Editing Rules

These rules derive from STE. When they conflict with the STE Compliance Rules above, the standard prevails.

- Use active voice, present tense, and imperative mood for instructions.
- Use direct headings.
- Use vertical lists for sequences or parallel items (STE Rule 4.3).
- Use fenced code blocks for commands or multi-line examples.
- Use inline code for identifiers, paths, commands, and config keys.
- Remove stale claims instead of qualifying them vaguely.
- Write short sentences. Keep each sentence to a single topic.
- Do not use parentheses to express alternative values (e.g. "the LED(s)"). Use "the LED or LEDs" instead.

## Cross-Skill Use

- Load `doc-maintenance` for auditing existing documentation for staleness.
- Load `architecture-diagram` only when the user asks for a diagram file (supports general architecture, C4 model, and ASCII output).
- Use the `show-me` skill for inline visual explanations in chat. Do not create HTML or SVG files for chat.
- Use the `research` workflow before documenting unfamiliar external APIs.
