---
name: architecture-diagram
description: Generate professional software diagram files for system structure, runtime flows, integrations, data, deployment, or security boundaries. Use only when the user asks for a diagram artifact.
---

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
7. Read and follow `references/output-contract.md` before creating files.

For an inline visual response, use the `/show-me` command instead. Do not create
files unless the user requested a diagram artifact.
