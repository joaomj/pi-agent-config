---
description: Fan independent slices of work out to parallel subagents and aggregate one report
argument-hint: "<task>"
---

Run a swarm for this task: $ARGUMENTS

A swarm costs one run per worker. Use it only for slices that do not share
state.

## Frame

1. State the done check and the artifact or report the swarm returns.
2. Choose the shape: partition into slices, race N workers on identical
   briefs, or both. For a race, declare the rule before you launch: first
   pass, rank all, or best of.
3. Use the `scout` agent for slices that only read, and the `worker` agent for
   slices that write. Use this session's model unless the request names
   another.
4. Give each writing worker its own managed Git worktree. When workers verify
   or measure commits, each brief names the exact SHAs and, for a
   measurement, the method: sample count, what one sample is, and the order.

## Fan out

Launch all workers at once with the `subagent` tool, as one parallel
workflow. Every brief stands alone: the goal, the scope, the exact slice or
race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or
`BLOCKED` with evidence. A worker that can prove a defect lists every issue
it can prove, not only the first. Workers push nothing and post nothing.

## Aggregate

Read the results. Drop a result that does not record the SHAs and method its
brief names, and relaunch that worker once. After a second miss, record a
gap; a gap is not a pass. Every required slice needs a result. For a race,
apply the rule you declared.

## Report

One consolidated report: a result table, one line per issue, gaps or
dropouts, and the race rule when used. Do not paste raw worker output.
