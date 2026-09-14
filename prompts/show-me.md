---
description: Explain the current topic with a concise visual
argument-hint: "[topic]"
---

Explain `${ARGUMENTS:-the current topic}` visually.

The response must contain a useful visual. Do not use pseudocode and do not
answer with prose alone. Choose the smallest effective form:

- ASCII flow, boundary, state, or before-and-after diagram
- Call, component, dependency, or file tree
- Mermaid flowchart, sequence, state, or entity diagram
- Focused diff when the visual point is a structural change

Include only the participants, files, states, transitions, and boundaries needed
to explain the point. Preserve exact identifiers and paths. Put no more than a
short explanation next to the visual.

Do not create diagram files. Use the `architecture-diagram` skill when the user
requests a diagram artifact.
