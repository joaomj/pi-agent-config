---
description: Send adversaries on several models to break a change; keep only findings a run proves
argument-hint: "[scope] [seats: provider/model, provider/model, ...]"
---

Interrogate this change: ${@:-the branch diff from its merge base with the base branch, through the working tree}

Adversaries try to break the change or design. A finding survives only when a
run proves it. Report the findings; do not apply fixes. This costs one full
run per seat.

## Frame

State the intent of the change in your own words, from the user's message,
the commits, and the PR description. Ask the user only when the intent is
unclear.

Seats: the `seats:` list in the request. Without one, use two seats: this
session's model and one enabled model from another vendor
(`subagent({ action: "models" })` lists them). Name them before you launch.

## Fan out

Launch all adversaries at once with the `subagent` tool, as one parallel
workflow, each with the `worker` agent, its seat's `model`, and its own
managed Git worktree. Copy the scope's uncommitted changes into each
worktree. Give each adversary the scope, the intent, and this brief:

> Break this change. Prove each finding with a run against the real code,
> such as a failing test, a repro script, or command output that shows the
> wrong behavior. For a design or plan, run a prototype or probe the current
> tree. Keep repros in your own worktree. Push nothing and post nothing.
> Report each finding with a title, the exact command, the output it printed,
> and the output the intent requires. Leave out anything you did not run:
> style, naming, structure, and risks that need a future change to matter.
> No findings is a valid result.

## Verify

Rerun each finding's command yourself. Keep a finding when the output shows
the failure and the failure breaks the intent. Drop the rest. Merge findings
that share a root cause. Keep every verified finding from every adversary.

## Output

- **Intent**: your restatement.
- **Findings**: for each verified finding, the command, its output, how it
  breaks the intent, and the seats that found it. Say "no verified findings"
  when none survive.
- **Dropped**: for each seat, the count of dropped findings and why.

Remove the adversaries' worktrees when you are done.
