---
name: research
description: Investigate external facts, unfamiliar tools, APIs, libraries, or deployed behavior with primary sources and explicit evidence. Use only when the answer depends on information outside the current codebase.
---

# Research

Research only the facts needed to answer a specific question or support a
current decision.

- Prefer deployed behavior, official documentation, official source and release
  notes, then reputable secondary sources.
- Use the smallest authoritative source set that can answer the question.
- Preserve identifiers, commands, versions, dates, and error messages exactly.
- Separate observed facts from interpretation and recommendation.
- Report conflicts between sources instead of silently choosing one.
- State failed requests, inaccessible sources, stale documentation, and
  remaining uncertainty.
- Do not present assumptions, ticket claims, or model memory as verified facts.
- Do not change project files unless the user requested a research artifact.
- Stop when the evidence answers the question. Do not turn research into a
  specification, plan, or implementation without a separate request.
