---
description: Build a deliverables-focused implementation plan
argument-hint: "<ticket or change>"
---

Create an implementation plan for `${@:-the requested change}`. Do not implement the change.

Write for a product manager with no deep technical knowledge. Focus on deliverables, not technicalities.

1. Read the ticket or request and the current behavior.
2. State what the user will be able to do afterwards, and the acceptance criteria in observable terms.
3. List the deliverables in order, each a user-visible outcome or concrete artifact.
4. Name dependencies, risks, and open decisions in plain words, plus what is out of scope.
5. Keep technical detail to the minimum needed for scoping. Avoid file names, symbols, and commands unless they change the scope or risk.

Return the plan in chat by default. Write a file only when explicitly requested. Keep it local and untracked unless the user requests a durable project file. Do not stage or commit it without approval. Do not create a branch, edit application code, commit, or push while planning.
