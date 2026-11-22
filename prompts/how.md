---
description: Explain how a part of the codebase works, through a read-only scout
argument-hint: "<question>"
---

Answer this "how does it work" question: $ARGUMENTS

If the scope is ambiguous, state your interpretation and explore. The user can
redirect.

Send one `scout` subagent with the question and this brief:

> You are writing an architectural explanation for a senior engineer who does
> not know this area. Explore the codebase and explain it so that they walk
> away with a mental model good enough to start working in it confidently.
> Lift the 300-word limit; use what the explanation needs.

Present the scout's explanation. Light edits for clarity or for context from
this conversation are fine. Do not substantially rewrite it.
