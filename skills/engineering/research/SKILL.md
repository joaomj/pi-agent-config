---
name: research
description: Investigate external facts, unfamiliar tools, APIs, libraries, or deployed behavior with primary sources and explicit evidence. Use ONLY when the user asks for external research or a decision depends on information outside the current codebase.
---

# Research Workflow

Use this workflow to answer a specific question about external facts,
unfamiliar tools, APIs, libraries, or deployed behavior. Do not collect
information without a decision that the information will support.

## Boundary

State the user-visible goal, deliverable, work stages, and reason for the chosen
path before research. Use `codebase-investigation` for questions about current local code
without an external-facts component. Use `focused-exploration` for option
generation without a specific factual question.

## Source order

Prefer these sources in order:

1. Deployed or remote behavior
2. Official product or API documentation
3. Official source code and release notes
4. Local code and updated project documentation
5. Reputable secondary sources
6. Jira tickets as context only

For GitHub operations, use `gh`. Do not use `curl`, `wget`, or `WebFetch` for
GitHub URLs.

## Method

1. State the question and why it matters.
2. List the facts needed to answer it.
3. Read the smallest set of authoritative sources.
4. Preserve identifiers, commands, and error messages verbatim.
5. Separate observed facts from interpretation.
6. Record conflicts between sources.
7. State the decision the evidence supports.
8. State what remains unknown.

## Output

Use this structure:

```markdown
## Question

...

## Findings

- Fact: ...
- Fact: ...

## Interpretation

...

## Recommendation

...

## Open uncertainty

...

## Sources

- URL or repository reference: what it confirms
```

Do not present an assumption as a fact. Surface failed requests, missing
access, stale documentation, and inconclusive results.

Do not change project files unless the user requests a research note or the
current workflow has approved that artifact.

## Completion

Stop after the findings, interpretation, recommendation, uncertainty, and
sources answer the question. Do not create a specification, plan, ADR, or code
change unless the user explicitly requests that handoff.
