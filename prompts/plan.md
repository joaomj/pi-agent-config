---
description: Propose a short product plan; add --detailed for technical discussion
argument-hint: "<ticket or change> [--detailed | --extended]"
---

Plan `${@:-the requested change}`. Do not implement anything until the user approves the plan.

## Choose the depth

- Default: a product-only proposal readable in under one minute.
- `--detailed`: the same short product summary, followed by a technical discussion. `--extended` is an alias, not a different depth.
- Recognize either flag anywhere in the arguments. Treat it as a mode selector, not part of the ticket reference or change description.
- An explicit request for a detailed or extended technical plan also selects detailed mode. If the user asks for more depth after a proposal, expand the existing plan using the context already gathered.
- Selecting a mode or asking follow-up questions never approves implementation. Keep planning until the user explicitly approves the plan.

## Phase 1: Propose

### Investigate first

1. Read the ticket or request, including relevant discussion and decisions. Verify the current behavior against the remote default branch and respect existing architecture decisions.
2. Distinguish verified behavior, settled decisions, proposed choices, assumptions, and unknowns. If evidence is unavailable, state the gap rather than inventing the current state.
3. Look up facts yourself. Ask the user only for choices or information you cannot obtain. Resolve prerequisite decisions before asking about choices that depend on them.
4. Do the technical investigation needed for accuracy in either mode. Depth controls what you present, not whether you verify it.

### Product summary (both modes)

Write for a product manager: user outcomes, scope, decisions, and trade-offs. Do not include implementation steps, file names, classes, functions, commands, or system inventories here. Explain technical constraints only through their effect on users, cost, delivery, or risk.

Use exactly these four sections, each with one or two short bullets:

- **Current state**: what users can do today and the problem or limitation this ticket addresses.
- **End state**: what users can do when the ticket is complete. Include any important scope boundary here.
- **Decisions made**: product choices already settled by the ticket or user, with a brief reason where known. Label any new recommendation as proposed, not agreed. Write "None yet" if no choices are settled.
- **Trade-offs**: the material benefit and cost of the chosen approach, including user impact, delivery cost, or risk. State when no material trade-off is identified; do not invent one.

In default mode, keep the entire proposal, including the closing question, to at most 180 words. Do not append a technical plan unless the user asks for it.

### Technical discussion (detailed mode only)

Keep the product summary to at most 180 words, then add the sections below. The technical discussion has no fixed word limit: scale it to the work, avoid repetition, and use short bullets. Mark irrelevant sections as not applicable in one line rather than inventing complexity.

- **Current architecture and evidence**: the relevant behavior, data flow, boundaries, and constraints. Cite the source paths or contracts that support the plan; separate observations from assumptions. Do not dump a file inventory.
- **Proposed design and alternatives**: the responsibilities, interfaces, data or API changes, and interactions that matter. Distinguish settled decisions from recommendations. Explain why the recommended approach fits and why a credible alternative was rejected; do not invent alternatives for trivial changes. Use snippets or diagrams only when they clarify a decision better than prose.
- **Delivery steps and dependencies**: small, end-to-end steps, each delivering independently demonstrable behavior. State what genuinely blocks each step. Avoid layer-by-layer task lists. For work that cannot be sliced safely, explain why and propose a sequence that keeps the system working; do not introduce compatibility machinery unless requested.
- **Validation**: observable acceptance criteria and the narrowest checks that prove them. Prefer existing user-facing entry points and black-box behavior over internal details. Explain any proposed new tests and obtain the required approval before writing them; plan approval alone does not waive test approval.
- **Risks and rollout**: relevant failure cases, security or data risks, migration needs, release constraints, and recovery options. Avoid unnecessary rollout machinery.
- **Open decisions**: unresolved choices, their impact, and your recommendation. Separate blocking decisions from facts still to verify. Write "None" when there are none.

### Close and wait

If a decision blocks approval, use `ask_user` to ask one question naming the choice, your recommendation, and its impact. Ask one blocking question at a time, with prerequisite choices first. Resolving a choice does not approve the plan; update the proposal before requesting approval.

Otherwise, request plan approval through `ask_user` with options to approve and start, request changes, or stop. Call it directly as a standalone action, use inline display, and allow a freeform answer. Keep the question short and refer to the proposal above instead of repeating it. In default mode, the proposal and approval prompt together must stay within 180 words.

Cancellation, timeout, or an unclear answer does not approve the plan. Stop dependent work. If the tool is unavailable or cannot render, ask in chat and wait for an explicit answer.

Do not create a branch, write files, edit code, publish tickets, or commit in this phase. Do not turn a request for discussion into implementation.

## Phase 2: Formalize (after approval)

1. Write `PLAN-<ticket>.md` at the root of the current working directory. Use the ticket ID from the request. If there is no ticket ID, use a short kebab-case slug of the change and state it.
2. Write the file as a checklist of to-do steps from the product point of view. Each step names a feature or behavior delivered, not a code task.
   - Good: `- [ ] Step 2: Chat search returns matching files`
   - Bad: `- [ ] Step 2: Create class XYZ in abc.py`
   Features delivered stay true as the code changes; code-level steps go stale.
3. Add a short header with the goal, the approved scope, the out-of-scope items, and the resolved decisions. In detailed mode, also preserve the agreed design, dependencies, acceptance criteria, risks, and remaining unknowns in a separate technical section. Keep the delivery checklist product-focused in both modes.
4. Keep the file temporary: never stage or commit it.

## Phase 3: Execute and track

1. Work through the steps in order.
2. After each main step, update `PLAN-<ticket>.md`: check off the step, and note any scope change, blocker, or new decision in one line.
3. After each main step, commit the work for that step with a message that describes the delivered behavior. Stage files explicitly; exclude the plan file and any other temporary files. Plan approval covers these local commits only; do not push, open a PR, or make other remote writes without separate approval.
4. If a step reveals a scope change or a new product decision, stop and ask before continuing.
5. When all steps are done, report what was delivered, what stayed unverified, and the commits created.
