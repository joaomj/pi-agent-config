---
name: technical-writing
description: Write and revise file-based technical artifacts with STE-inspired clarity rules, evidence, repository terminology, and artifact-specific references. Use for documentation, reports, READMEs, API docs, PR text, ADRs, postmortems, and commit prose; not for chat.
---

# Technical Writing

This skill governs documentation files and PR or commit prose, including those
artifacts drafted in chat. It does not govern conversational explanations or
progress updates. `AGENTS.md` governs those responses. Repository policies and
approval requirements remain in force for all work.

Use STE-inspired clarity by default, not strict ASD-STE100 compliance. Preserve
uncertainty and meaning even when a stricter language rule would reject them.
Use strict STE only when requested; do not claim certified compliance.

1. Read `references/asd-ste100.md` before writing prose.
2. Follow the repository's existing template and terminology before global
   preferences.
3. Identify the audience, task, artifact type, and required evidence. Separate
   descriptive prose from procedures and apply the matching clarity profile.
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

## Final clarity review

- Can the intended reader identify the result and understand why it matters?
- Do claims remain distinct from assumptions, recommendations, and uncertainty?
- Are numbers, units, conditions, caveats, and terminology preserved?
- For a procedure, are prerequisites, actions, and observable success clear?
- Do diagrams and text agree when the artifact includes figures?

Revise for understanding, not merely to shorten the text or satisfy word counts.
Do not apply these file-writing checks to ordinary chat or force chat brevity
and formatting onto a requested document.
