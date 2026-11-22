---
description: Run competing candidates on several models, judge them, and graft the best into one result
argument-hint: "<task> [seats: provider/model, provider/model, ...]"
---

Run an arena for this task: $ARGUMENTS

An arena costs one full run per seat, plus a judge. Use it for one-way-door
decisions, not routine work.

## Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate produces.
2. Derive a rubric of 3 to 6 concrete, gradeable criteria for success on this
   task. You use it to pick; candidates see only the task.
3. Seats: the `seats:` list in the request. Without one, use two seats: this
   session's model and one enabled model from another vendor
   (`subagent({ action: "models" })` lists them). Name the seats before you
   launch. Keep at least two; if a model is rejected, drop the seat and say so.
4. Give each candidate its own output: a managed Git worktree when the
   artifact is code, otherwise `/tmp/arena-<slug>/candidate-<n>/`.

## Fan out

Launch all candidates at once with the `subagent` tool, as one parallel
workflow, each with the `worker` agent, its seat's `model`, and its own
worktree or output path. Each brief holds the task, pointers to the grounding
files, the output path, and an instruction to write the artifact and a short
rationale that names the alternatives it considered and rejected. If a
candidate produces nothing, continue with the rest and note the dropout.

## Judge

When all candidates finish, send one judge with the `scout` agent on a model
from another vendor than this session's, when one is enabled. It scores each
candidate, by path label, against each rubric criterion and recommends a
base. If no other vendor is enabled, skip the judge and say so.

## Pick and graft

Read every candidate end to end. Score each against the rubric, criterion by
criterion, and compare with the judge. Disagreement means a bias or an
ambiguous rubric: read both rationales before you decide. Pick the base a
future maintainer can extend most easily without breaking invariants; when
two tie, prefer the cleaner boundary or the smaller API.

Walk each losing candidate once more for what is worth porting, usually one or
two things. Fold each graft in by hand so the result keeps one mental model.
If the candidates converge, ship the consensus shape. If they diverge wildly,
the frame was under-specified: reframe and rerun instead of averaging.

## Verify

Verify the result on the real artifact. If verification finds a problem the
arena missed, the frame was wrong or a graft was missed. Go back; do not paper
over it.

## Output

The synthesized artifact, and a short note: the seats, the base and why, the
judge's verdict or that it was skipped, each graft and its source, what was
rejected and why, any dropouts, and the verification result.
