---
name: show-me-your-work
description: "Keep a reviewable decision trail for long or multi-step work: a TSV log with one row per decision (what, why, evidence, result). Use for /skill:show-me-your-work, ticket runs, or work the operator reviews after stepping away."
disable-model-invocation: true
---

# Show me your work

Keep one canonical log. Adapted from pstack by Lauren Tan (`../LICENSE`).

## The format

A single TSV file, one row per decision. Cells stay single-line. Evidence is a
pointer, not prose. Columns:

- **ts.** ISO 8601 timestamp.
- **phase.** The phase or workstream.
- **decision.** What was chosen or done, one line.
- **why.** The reason in plain words. If a principle drove it, say it plainly,
  not as a jargon tag.
- **evidence.** A pointer that proves it: commit SHA, PR number, `file:line`,
  or an artifact path. Never a paragraph.
- **result.** The outcome or the state of the done check: `tests green`,
  `reverted`, `INCONCLUSIVE`, `open`.

Example:

```
ts	phase	decision	why	evidence	result
2026-05-24T09:02:00Z	contract	took the export button as the only scope	the ticket names one screen	ticket text	approved at gate A
2026-05-24T09:40:00Z	repro	reproduced the empty export with a 0-row filter	need a failing case before any fix	test/export.test.ts:41	fails as reported
2026-05-24T11:15:00Z	fix	returned the header row for an empty result	the old code skipped the writer when no rows came back	commit 7c21e0a	repro passes
2026-05-24T12:30:00Z	review	dismissed the "unused import" comment	the import is used in the type check	src/export.ts:3	dismissed
```

## Logging a row

Write each entry the way you would tell a teammate what you did: plain words,
concrete actions, no jargon.

Use `scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>`.
It stamps `ts`, writes the header on first use, strips stray tabs and
newlines, and prefixes any cell that starts with `=`, `+`, `-`, or `@` with a
single quote.

Log decision points and checkpoints, not every action: a fork chosen, a unit
completed with its check result, a pivot or revert with its trigger, a blocker
surfaced, a gate and its outcome. Skip the trivial and self-evident.

A run is one pi session. When a run adds to a log that already has rows, its
first row has phase `start`, and its evidence names the session. Use phase
`start` for nothing else. A run that returns to a log reads its last rows
first, to see whether another run wrote since.

## Where it lives

The log is a working artifact. Keep it outside every repository, at the path
the calling skill names, or at `~/.pi/agent/pstack/logs/<task-slug>.tsv`.
Commit it only when the operator asks.

## Rules

- Append-only. A wrong call gets a new row that supersedes it. Never edit or
  delete history.
- Prefer evidence that committed scripts produce over hand-made one-offs.

## Audit the log before you hand back

At the end of the run, check that the log told the truth against what this
session actually did:

- Every row maps to a real decision or action.
- Each row's evidence resolves and shows what the row claims.
- A fork, pivot, or abandoned approach that shaped the work but is not logged
  is a gap. Add it.

Correct the log, not the story. Never edit or remove a row. Supersede a wrong
row with a new one.

## Reviewing the trail

`column -s$'\t' -t <log>` renders it in a terminal. Read top to bottom, follow
the evidence pointers, spot-check.

Other skills route their audit trail here and reference this skill by name.
They do not restate the columns.
