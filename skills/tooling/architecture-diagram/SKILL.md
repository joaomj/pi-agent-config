---
name: architecture-diagram
description: Generate professional software diagrams as paired self-contained HTML and SVG files. Use ONLY when the user asks for a diagram file about system structure, workflows, integrations, data, deployment, or security boundaries. Do not use for inline chat explanations.
license: MIT
---

# Software Diagrams

Use this skill only for diagram files. For inline chat explanations, use the `show-me` skill instead. Do not create HTML or SVG files for chat unless the user asks for a diagram file.

Generate the smallest diagram that answers the user's question. Read
`references/output-contract.md` before producing HTML, SVG, or Mermaid output.

## Choose the View

Choose the diagram type from the question, not from a fixed preference:

| User needs to understand | Prefer | Include |
|---|---|---|
| What surrounds the system? | System Context | Users, the system, and external systems |
| What are the main building blocks? | Container or Component | Applications, services, queues, stores, and logical components |
| What happens during one scenario? | Sequence | Participants, messages, order, responses, and failure paths |
| What is the process or decision flow? | Activity or Flow | Actions, decisions, loops, and outcomes |
| How does an entity change over time? | State | States, events, guards, and transitions |
| What data exists and how is it related? | Data Model | Entities, attributes, keys, and relationships |
| Where does the software run? | Deployment | Runtime nodes, networks, stores, and trust boundaries |

When the request describes a user journey, API call, event, job, queue, or
integration, prefer a sequence diagram. When it describes system structure,
prefer the smallest useful C4 view. Use multiple focused views only when one
diagram cannot answer the question clearly.

## Output

Use paired HTML and SVG output by default:

- HTML: self-contained dark-themed HTML with inline SVG and CSS.
- SVG: static, self-contained SVG with the same content and visual structure as
  the HTML diagram.
- Mermaid: produce only when the user explicitly requests Mermaid or native
  GitHub Mermaid rendering.

When the target is GitHub Markdown, embed the SVG and provide the HTML as a
separate link. Do not embed the full HTML document in Markdown.

## GitHub Markdown

When the user requests GitHub-compatible documentation:

- Produce the normal HTML and SVG pair.
- Provide a Markdown image reference to the SVG, using a repository-relative
  path when possible.
- Provide a link to the HTML only when a GitHub Pages or other hosted URL is
  available. A normal GitHub link to an `.html` file shows its source rather
  than rendering the page.
- Keep the SVG free of scripts, external stylesheets, external images,
  external fonts, and `foreignObject`. Use basic SVG shapes, text, paths, and
  inline presentation attributes or styles.
- Produce Mermaid only when explicitly requested. If requested, keep it
  semantically equivalent to the HTML and SVG versions.

## Analysis

1. Identify the question, scenario, scope, and intended audience.
2. Read build manifests, deployment files, API definitions, event schemas, and
   runtime configuration that can answer that question.
3. Identify only the participants and relationships needed for the selected
   view. Include users, systems, services, components, data stores, queues,
   security boundaries, and external systems when relevant.
4. Map each relationship with direction, behavior, and protocol or technology.
5. Choose the smallest useful diagram type and abstraction level.
6. Ask only questions that are not discoverable from the repository.
7. State assumptions and unknowns in the output.

## Sequence Diagrams

Use one sequence diagram for one meaningful scenario. Prefer them for request
flows, asynchronous jobs, event handling, integrations, and failure analysis.

- Put participants in a logical left-to-right order, usually caller, entry
  point, application services, asynchronous infrastructure, stores, and
  external systems.
- Show the triggering action, important intermediate messages, and the result.
- Distinguish a response from a new asynchronous message. Label queues,
  events, callbacks, and polling explicitly.
- Include relevant authentication, authorization, validation, transaction,
  timeout, retry, idempotency, and error behavior when the evidence supports
  it.
- Use `alt` or equivalent branches for meaningful success and failure paths;
  use `loop` only for behavior that matters to the explanation.
- Do not invent message names, protocols, retries, or participants. Mark
  inferred behavior as an assumption.
- Split a crowded flow into separate diagrams such as happy path, failure
  path, or asynchronous processing.

## C4 Mapping

| Type | Identify |
|---|---|
| Person | Users and roles |
| Software system | Main project and external integrations |
| Container | Deployable applications, databases, queues, caches, and stores |
| Component | Logical groups inside a container |
| External system | Services outside the team's control |

If a small project has one deployable unit, skip the Container level when the
Component level gives a clearer result.

## Relationship Rules

Every arrow must state what happens, not only that two elements are connected.
Prefer labels such as `HTTPS/REST`, `JDBC`, `AMQP`, or `gRPC` when the code
supports them. Distinguish trust boundaries and external systems clearly.

## Quality Checklist

- The diagram answers one explicit question for a named audience.
- The repository was scanned for relevant configuration and deployment files.
- Every important element has a name and a useful description.
- Every relationship has direction and a meaningful label.
- Sequence diagrams show temporal order and distinguish synchronous from
  asynchronous behavior.
- Behavioral diagrams include relevant outcomes and failure paths.
- The selected C4 level matches the requested scope.
- The diagram is not too sparse or too crowded.
- The legend is outside system boundaries.
- HTML has no external dependency except optional fonts.
- SVG is self-contained and has a useful `viewBox`, readable text, and
  accessible title or description text.
- Assumptions and undiscovered information are explicit.

Always produce one HTML file and one equivalent SVG file for each focused view,
unless the user explicitly requests Mermaid only or another output scope.
