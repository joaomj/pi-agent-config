---
description: Design an auditable workflow for a large task that no playbook fits, then run it
argument-hint: "<task>"
---

Figure out how to do this task, then do it: $ARGUMENTS

The first deliverable is the workflow itself: phases that scale rigor to the
task, run as experiments, and leave a decision trail the operator can audit.

## Frame

Ground first. Before the run, state:

- Done, as a check that can pass or fail on the real artifact.
- Scope, quantified: rough units and effort, and the blockers you found.
- The rigor level. One-way doors and a wide blast radius get more gates;
  reversible, low-stakes steps get fewer. Rigor is gates and artifacts.

Present the frame and its tradeoffs, then end the turn. A multi-hour run earns
this one checkpoint.

## Design the workflow

Split the work into small units that can each land on their own. Sequence the
riskiest unknown first, and scaffolding and verification before features.

- Build the verification harness before the work, with a baseline from the
  state before the change, so each check reads "old value against new value".
- For a one-way-door design decision, recommend `/arena`. Skip it for
  mechanical work whose shape is already clear.
- Parallelize only across seams that share no state, each writer in its own
  worktree. Prefer one loop.
- Write the phase list down; the operator reviews it.

## Run the loop

Each unit is an experiment: state the hypothesis, make the smallest change,
check it against the done check on the real artifact, keep it if it advanced,
revert it if it did not. Verify each unit before the next.

- Inspect the artifact, never a self-report. When something passes too
  easily, suspect the check before the system.
- A verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a
  pass.

Log every decision with `/skill:show-me-your-work` rules, at
`~/.pi/agent/pstack/logs/<task-slug>.tsv`, a row as each step lands.

## Hand back

Check the whole against the done check on the real product, not only the
harness. Turn any correction that recurred into a check, a lint, or a script.

Reply with the workflow you designed, the rigor level and why, the log path,
what is verified against the done check, and what is still open.
