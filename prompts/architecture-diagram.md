---
description: Create an evidence-based software diagram artifact
argument-hint: "<question or view>"
---

Create a diagram for `$@`. If the question or audience is unclear, ask before drawing.
Read `docs/workflows/diagram-output-contract.md` under the Pi agent configuration
directory (`PI_CODING_AGENT_DIR`, or `~/.pi/agent` when unset), not the current project.


# Architecture Diagram

Create the smallest diagram that answers one explicit question for a known
audience.

1. Inspect the repository evidence that defines participants, relationships,
   protocols, state, and deployment.
2. Choose the view from the question:
   - Context for users, the system, and external systems.
   - Container or component for major runtime or logical boundaries.
   - Sequence for one request, event, job, or integration scenario.
   - Flow for a process or decision.
   - State for lifecycle transitions.
   - Data model for entities and relationships.
   - Deployment for runtime nodes, networks, and trust boundaries.
3. Include only elements needed to answer the question.
4. Label every relationship with direction and behavior. Include protocol or
   technology only when repository evidence supports it.
5. Show meaningful failure, retry, authorization, or asynchronous behavior when
   it is part of the question.
6. Mark assumptions and unknowns. Do not invent participants or behavior.
7. Read and follow the diagram output contract named below before creating files.

For an inline visual response, answer directly in chat with a diagram. Do not create
files unless the user requested a diagram artifact.
