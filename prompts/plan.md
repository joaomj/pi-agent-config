---
description: Propose a short product-level plan, then track approved work in PLAN-<ticket>.md
argument-hint: "<ticket or change>"
---

Plan `${@:-the requested change}`. Do not implement anything until the user approves the plan.

The user is busy. Write for a product manager: outcomes and impact, not code. Avoid file names, classes, functions, and commands unless they change scope or risk.

## Phase 1: Propose

1. Read the ticket or request and inspect the current behavior.
2. Present the plan in chat with exactly these sections, each a few short bullets:
   - **Before / after**: what users can and cannot do today, and what they can do after the change.
   - **What will change**: the user-visible features or behaviors delivered.
   - **Where**: the repositories, services, systems, and teams affected.
   - **Out of scope**: what this work will not deliver.
   - **Open decisions**: product choices the user must make, each with a recommendation and its impact. Write "None" if there are none.
3. Keep the whole plan readable in under one minute. Show the detailed technical plan only if the user explicitly asks for it.
4. End by asking for approval. Do not create a branch, write files, edit code, or commit in this phase.

## Phase 2: Formalize (after approval)

1. Write `PLAN-<ticket>.md` at the root of the current working directory. Use the ticket ID from the request. If there is no ticket ID, use a short kebab-case slug of the change and state it.
2. Write the file as a checklist of to-do steps from the product point of view. Each step names a feature or behavior delivered, not a code task.
   - Good: `- [ ] Step 2: Chat search returns matching files`
   - Bad: `- [ ] Step 2: Create class XYZ in abc.py`
   Features delivered stay true as the code changes; code-level steps go stale.
3. Add a short header with the goal, the approved scope, the out-of-scope items, and the resolved decisions.
4. Keep the file temporary: never stage or commit it.

## Phase 3: Execute and track

1. Work through the steps in order.
2. After each main step, update `PLAN-<ticket>.md`: check off the step, and note any scope change, blocker, or new decision in one line.
3. After each main step, commit the work for that step with a message that describes the delivered behavior. Stage files explicitly; exclude the plan file and any other temporary files. Plan approval covers these local commits only; do not push, open a PR, or make other remote writes without separate approval.
4. If a step reveals a scope change or a new product decision, stop and ask before continuing.
5. When all steps are done, report what was delivered, what stayed unverified, and the commits created.
