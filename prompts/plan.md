---
description: Propose a short, code-grounded plan; add --detailed for technical discussion
argument-hint: "<ticket or change> [--detailed | --extended]"
---

Plan `${@:-the requested change}`. Do not implement anything until the user approves the plan.

`--detailed` (alias `--extended`), anywhere in the arguments, is a mode flag, not part of the request. It adds a technical discussion after the plan. A later request for more depth expands the same plan. Neither a mode nor a follow-up answer approves implementation.

## Phase 1: Propose

### Ground it in current code

1. Read the ticket or request and its relevant discussion.
2. Identify every repository the change touches. For each one, fetch the latest remote default branch, whatever it is named (do not assume `main`), and read the current behavior there, not a local checkout that may be behind. Note the commit you read. If you cannot reach a remote, say so and name the commit you used instead.
3. Where the ticket, docs, or discussion disagree with the code, trust the code and report the conflict.
4. Look up facts yourself. Ask only for choices or information you cannot obtain. Verify as deeply as accuracy needs in either mode; the mode controls what you show, not what you check.

### Write the plan

Describe what changes, not how. Write for a product manager: user-visible behavior and scope. No implementation steps, file names, functions, classes, or commands. Mention a technical constraint only through its effect on users, cost, or risk.

Use exactly these three sections, each with one to three short bullets:

- **Current state**: what users can do today, as the code shows it, and the problem or limitation.
- **End state**: what users can do when the change is done, including any scope boundary (what is out).
- **Repos involved**: each repository, the default-branch commit you verified, and one line on what changes there in user terms. Mark repositories you could not verify.

Keep the plan, including the closing question, to a one-minute read: at most 150 words. Mark anything you inferred rather than verified as an assumption.

### Technical discussion (detailed mode only)

After the plan, add short bullets. Scale to the work; write "Not applicable" for an irrelevant section rather than inventing complexity.

- **Evidence**: the current behavior and constraints that support the plan, with source paths per repository. Separate observations from assumptions.
- **Design**: the interfaces, data, or API changes that matter, and why the recommended approach beats a credible alternative.
- **Delivery steps**: small end-to-end steps, each independently demonstrable, with what blocks each one.
- **Validation**: observable acceptance criteria and the narrowest checks that prove them. New tests still need separate approval.
- **Risks and open decisions**: failure cases, data or release risks, and unresolved choices with your recommendation.

### Close and wait

If a decision blocks approval, use `ask_user` to ask one question naming the choice, your recommendation, and its impact. Update the plan after the answer; answering does not approve it.

Otherwise, request approval with `ask_user`: approve and start, request changes, or stop. Call it standalone, inline, with a freeform option, and refer to the plan above instead of repeating it.

Cancellation, timeout, or an unclear answer is not approval. If `ask_user` cannot render, ask in chat and wait.

Do not create branches, write files, edit code, publish tickets, or commit in this phase.

## Phase 2: Formalize (after approval)

1. Write `PLAN-<ticket>.md` at the root of the current working directory. Without a ticket ID, use a short kebab-case slug and state it.
2. Add a short header: goal, repositories and verified commits, scope, out of scope, and resolved decisions. In detailed mode, keep the agreed technical discussion in a separate section.
3. Write the delivery as a checklist of behaviors, not code tasks.
   - Good: `- [ ] Step 2: Chat search returns matching files`
   - Bad: `- [ ] Step 2: Create class XYZ in abc.py`
4. Never stage or commit the plan file.

## Phase 3: Execute and track

1. Work through the steps in order.
2. After each main step, check it off in the plan file and note any scope change, blocker, or new decision in one line.
3. After each main step, commit that step's work in each affected repository with a message describing the delivered behavior. Stage files explicitly and exclude temporary files. Plan approval covers these local commits only; pushes, PRs, and other remote writes need separate approval.
4. If a step reveals a scope change or a new product decision, stop and ask.
5. When done, report what was delivered, what stayed unverified, and the commits created.
