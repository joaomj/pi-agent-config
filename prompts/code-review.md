---
description: Review P0–P2 defects with traced, proven findings
argument-hint: "[diff, branch, commit, PR, prior review, or focus]"
---

Review `${@:-the current change}`. Do not edit files or implement fixes.
Repository approval and verification rules still apply.

Every claim in the report must trace to its source. A reader must be able to
follow each finding from a changed line, through a failure path, to its
evidence, and rerun that evidence. A claim without a trace is not a finding.

## Establish scope and intent

Identify the requested diff and comparison base. For the current change, start
with staged and unstaged tracked changes against HEAD, plus relevant new files.
For a branch or PR, establish its actual base rather than assuming main/master.
Do not expand into an unrelated repository audit.

State the change's intent in one or two sentences. Derive it from the user's
request, the commit messages, and the PR description, and name the source. A
finding must break this intent or a contract the change touches. If the intent
stays unclear, ask one focused question.

Read the project rules in `AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, and
`CONTRIBUTING.md` where they exist. Cite a rule by file and line when a finding
depends on it.

If a prior review of this change is available, use re-review mode (below).

## Find the safety fact

Most changes that look risky are safe because of one or two facts, for example
"this function is only reached after the permission check in `api/auth.ts:40`".
Find those facts first and prove them. A proven safety fact clears many
candidate risks at once. An unproven one is the first thing to report.

## Lenses

Apply the lenses below to the changed code. They are a checklist, not a quota:
a lens with no finding produces no output.

- **Correctness.** Wrong behavior, broken callers, swallowed errors, cache or
  state mismatches. A new guard, retry, clamp, or fallback is a fix only when
  the state it handles is legitimate. Otherwise it hides the defect, and the
  finding is the code that produced the state.
- **Adversarial.** Try to disprove the change's assumptions. Trace boundary
  inputs, invalid or missing state, partial failures, timeouts, duplicate
  operations, concurrency, cancellation, and resource exhaustion. For each
  mutation, ask what happens if it runs twice and if the previous run stopped
  at any point.
- **Security.** Identify assets, attacker capabilities, entry points, and trust
  boundaries in the changed paths. Trace untrusted input to privileged actions,
  storage, interpreters, outbound requests, and rendered output. Check
  authorization bypass, cross-user or cross-tenant access, injection, unsafe
  paths or deserialization, server-side request forgery, unsafe rendering,
  secrets or personal data in logs, insecure defaults, and unbounded work.
  Name the attacker prerequisites, the reachable path, existing protections,
  and the impact. Do not infer exploitability from a dangerous-looking API.
- **Overengineering.** Wrappers with one caller, pass-through layers,
  adapters with no second implementation, duplicate helpers, and options no
  caller uses. Measure reader load: can a new reader find where a value comes
  from and what can change it? A new structure that removes branches,
  duplicated rules, or invalid states is not overengineering.
- **AI slop.** Comments that restate the code, and validation or error handling
  inside internal code that a boundary already guarantees. Ask whether the data
  crosses a system boundary at that point. If it does not, the check is
  redundant.
- **Standards and tests.** Broken project rules, cited by file and line. Load
  `test-audit` before reviewing tests. A test fails review when it still passes
  after the behavior breaks, or fails when only the internals change.

For each candidate, look for guards, caller guarantees, language semantics, or
existing checks that disprove it. Move disproved candidates to the cleared
list. Trace across the repository when the code is available: never report a
risk that depends on code you could have read but did not.

## Evidence levels

Record the highest level each finding reached:

1. **Cited**: a real `file:line` in the change, a caller, or a pinned
   dependency's source.
2. **Traced**: the failure path walked step by step, each step with its
   `file:line`, from the trigger to the impact.
3. **Run**: a command, script, or narrow test that exercises the real code and
   shows the failure. Include the exact command and the relevant output.

P0 and P1 findings need level 2 or higher. Attempt level 3 when a narrow,
non-destructive local run is cheap. Do not run slow suites, create committed
tests, mutate shared data, or probe live services without approval. P2
findings need level 1 and a named concrete cost.

## Severity

- **P0, blocks merge**: data loss, a permission hole, secrets or personal data
  exposed, an outage, or a broken deploy or public contract.
- **P1, fix before merge**: wrong behavior in a core flow, a hidden failure, an
  unsafe retry, or a regression in an unchanged caller.
- **P2, should fix**: overengineering, slop, a broken project rule, or a narrow
  defect, each with a concrete cost to readers, operators, or users.

Assign severity from impact, reachability, and likelihood. A misreported
severity costs the reviewer's credibility; do not inflate it. Report at most
five P2 findings, ranked by cost, and give the count of any others in one line.

Do not report:

- Formatting, naming taste, or anything a configured linter or type checker
  already catches.
- Pre-existing defects in unchanged code, unless the change makes them worse
  or newly reachable.
- Risks that need a future change to matter.
- Deliberate breakage that matches the stated intent and has a contained scope,
  unless the author appears unaware of a material impact.

## Re-review mode

When a prior review is available, trace every prior finding by its ID and mark
it `fixed`, `not fixed`, or `disputed`, with the evidence for the status. Then
review only the code that changed since that review. Do not raise new P2
findings on code that did not change. Do not reopen a disputed finding without
new evidence.

## Report

Write the sections below in this order. Omit a section only when it says so.

**Intent.** The restatement and its source.

**Safety facts.** Each fact the change depends on, its evidence level, and its
evidence. Write "unproven" when the fact could not be proven.

**Findings.** Order by severity, then impact. Merge symptoms of one cause.
Number findings `CR-1`, `CR-2`, and so on. In re-review mode, keep prior IDs
and continue the numbering. For each finding:

- `[P0/P1/P2] CR-n`: a short title that names the defect.
- **Location**: the changed `file:line` range or symbol that introduces it.
- **Trace**: trigger, then each step of the path with its `file:line`, then
  the user or operational impact.
- **Evidence**: the level reached, and the command and output for level 3.
- **Rule**: the project rule and its `file:line`, when one applies.
- **Fix**: the correction in one or two sentences, not an implementation plan.
- **Prevent**: for a P2 defect class that can recur, the lint, type, or test
  that would catch it. Omit when none applies.

If no finding qualifies, write: No actionable P0–P2 findings identified.

**Prior findings.** Re-review mode only: each prior ID, its status, and the
evidence.

**Questions.** Only questions about intent or facts outside the repository that
change a finding's status. Never ask what you can find out by reading the code.
Omit the section when there are none.

**Cleared.** The candidate risks you checked and disproved, each with the
`file:line` or fact that disproves it.

**Coverage.** The scope reviewed, the checks run, and the specific gaps. Do not
claim exhaustive coverage, security certification, or absence of risk.

**Verdict.** "Merge-ready: yes" when there is no P0 or P1 finding, otherwise
"Merge-ready: no", followed by the blocking IDs.
