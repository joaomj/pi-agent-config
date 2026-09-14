---
name: technical-writing
description: Write and revise file-based technical artifacts with ASD-STE100 controlled-English rules, evidence, repository terminology, and artifact-specific references. Use for documentation, reports, READMEs, API docs, PR text, ADRs, postmortems, and commit prose; not for chat.
license: MIT
---

# Technical Writing

This skill owns file-based technical prose, not chat or progress updates.

1. Read `references/asd-ste100.md` before writing prose.
2. Follow the repository's existing template and terminology before global
   preferences.
3. Identify the audience, task, artifact type, and required evidence.
4. Load only the relevant artifact reference:
   - README: `references/readme.md`
   - API documentation: `references/api-documentation.md`
   - PR, ADR, and postmortem: follow the invoked prompt template.
5. Preserve exact identifiers, paths, commands, versions, errors, and quoted
   material.
6. Separate observed facts from inference. Do not invent requirements, links,
   metrics, or outcomes.
7. Lead with the user or operational result. Keep background proportional to the
   reader's task.
8. Remove stale claims rather than qualifying them vaguely.
9. Use formal scientific-paper structure only when the user or repository asks
   for it. Do not force that structure on ordinary technical documents.
10. Return concise prose unless the artifact requires depth.
