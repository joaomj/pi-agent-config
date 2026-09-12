---
name: write-postmortem
description: Record medium or high complexity bug fixes and significant incidents as blameless, searchable Markdown postmortems following Google SRE format. Use when a bug is fixed, a regression test passes, root cause is understood, and prevention measures are identified.
disable-model-invocation: true
---

# Write Postmortem

Record medium or high complexity bug fixes and significant incidents as
blameless, searchable Markdown postmortems. Use the repository's established
postmortem directory. If none exists, use `docs/issues/`.

## When to Use

- After a medium or high complexity bug fix is complete: root cause understood,
  regression test written, and fix verified.
- After any outage, data loss, security incident, repeated regression, or user-visible degradation.
- User says: "write postmortem", "record this bug", "create postmortem", "document this fix".

## Two Tiers

| Tier | Trigger | Depth |
|------|---------|-------|
| **Standard record** | Medium complexity bug fix | Concise: summary, root cause, resolution, regression test, prevention actions |
| **Full postmortem** | High complexity bug fix, outage, data loss, security incident, repeated regression, user-visible degradation, or lengthy diagnosis | Complete: all sections with timeline, contributing factors, lessons learned |

The skill determines the tier by asking the user. If unclear, default to standard record and offer to expand.

## File Location and Naming

The default directory is:

```
docs/issues/
  README.md
  2026-07-27-short-description.md
```

Use an existing repository convention instead of creating a second directory.
Ask before choosing a different location when more than one convention exists.

Filenames: `YYYY-MM-DD-short-description.md`. Use lowercase, hyphens for spaces, keep under 60 characters.

## Stable ID

Assign a unique ID on creation: `ISSUE-YYYY-NNN`. Increment the sequence number by scanning existing files in the directory. Include the ID in the frontmatter and in the filename preamble if the user prefers.

## Workflow

### Step 1: Create the directory

Ensure `docs/issues/` exists. Create it if missing.

### Step 2: Determine tier

Ask the user:
- Is this a standard bug fix or a significant incident (outage, data loss, security, repeated regression, user-visible degradation)?
- If standard: use the standard record template.
- If significant incident: use the full postmortem template.

### Step 3: Gather information

Ask the user for each missing field. Do not invent facts. Sources to check:
- Git log and `git diff` for commits and PRs.
- Issue tracker for related issues (use `gh` CLI, not curl/web).
- Regression test name and location.
- Timeline (for full postmortem): ask the user for approximate times.

### Step 4: Assign ID and filename

Scan existing files:
```bash
ls docs/issues/*.md 2>/dev/null
```

Determine next sequence number. Propose filename and ID. Confirm with user.

### Step 5: Write the record

Load the `technical-writing` skill for ASD-STE100 Simplified Technical English compliance on all prose sections.

Populate the template with confirmed information. Use the template that matches the tier. Remove any sections marked optional that the user cannot fill.

### Step 6: Create or update README.md

If `docs/issues/README.md` does not exist, create it from the template below. If it exists, append the new entry to the index table.

### Step 7: Confirm

Show the completed file to the user. Ask: "Recorded as [ID]. Add or correct anything?"

## Standard Record Template

```markdown
---
id: ISSUE-YYYY-NNN
title: <short title>
date: YYYY-MM-DD
severity: low | medium | high | critical
status: resolved
component: <component or module name>
tags:
  - <tag1>
  - <tag2>
related_pr: "#NNN"
related_issue: "#NNN"
---

# <title>

## Summary

<One paragraph describing what happened, from the user's perspective.>

## Impact

<Who was affected, for how long, and to what degree.>

## Root Cause

<The underlying reason the bug existed. Not the fix, but why the system allowed it.>

## Resolution

<What change was made to fix the bug. Link to PR and commit.>

## Regression Test

<Test name, file path, and what it validates. Confirm the test fails before the fix and passes after.>

## Corrective and Preventive Actions

| Action | Type | Owner | Status |
|--------|------|-------|--------|
| <action> | preventive | @owner | pending |

## Related

- PR: <link>
- Issue: <link>
- Commit: <link>
```

## Full Postmortem Template

```markdown
---
id: ISSUE-YYYY-NNN
title: <short title>
date: YYYY-MM-DD
severity: low | medium | high | critical
status: resolved
component: <component or module name>
tags:
  - <tag1>
  - <tag2>
related_pr: "#NNN"
related_issue: "#NNN"
---

# <title>

## Summary

<One paragraph describing what happened, from the user's perspective.>

## Impact

<Who was affected, for how long, and to what degree. Quantify: users affected, duration, data loss, revenue impact.>

## Detection

<How the incident was discovered: monitoring alert, user report, manual check. If monitoring failed, state that explicitly.>

## Timeline

| Time (UTC) | Event |
|------------|-------|
| YYYY-MM-DD HH:MM | <event> |
| YYYY-MM-DD HH:MM | <event> |

## Root Cause

<The underlying reason the bug existed. Go deeper than the immediate trigger: what in the system, design, process, or assumptions allowed this.>

## Contributing Factors

<Conditions that made the incident possible or worse, without being the direct cause. Examples: missing tests, insufficient monitoring, unclear ownership, skipped code review.>

## Resolution

<What change was made to fix the bug. Link to PR and commit.>

## Regression Test

<Test name, file path, and what it validates. Confirm the test fails before the fix and passes after.>

## Corrective and Preventive Actions

| Action | Type | Priority | Owner | Status |
|--------|------|----------|-------|--------|
| <action> | corrective | P0 | @owner | pending |
| <action> | preventive | P1 | @owner | pending |

## What Went Well

- <Point>

## What Did Not Go Well

- <Point>

## Lessons Learned

- <Lesson>

## Follow-Up Status

<Summary of which corrective and preventive actions are complete, in progress, or blocked. Update this section as actions progress.>

## Related

- PR: <link>
- Issue: <link>
- Commit: <link>
```

## README.md Template

```markdown
# Issues Database

Blameless postmortems for completed bug fixes and incidents. Two tiers:
- **Standard record**: every fixed bug (concise).
- **Full postmortem**: outages, data loss, security incidents, repeated regressions, user-visible degradation.

## Search

Use metadata tags, component, and severity to find records:
```bash
rg "^component:|^severity:|tags:" docs/issues/
```

## Index

| ID | Date | Title | Severity | Component | Tier |
|----|------|-------|----------|-----------|------|
```

## Delegation

| When | Action |
|------|--------|
| Prose sections (Summary, Impact, Root Cause, Lessons Learned) | Load `technical-writing` skill for ASD-STE100 compliance |
| Root cause not yet known | Return to `bug-resolution` before writing the record |

## Blameless Language Rules

- Focus on system causes, not individual actions.
- Use passive voice for human actions when individual blame is irrelevant: "the config was deployed" not "Alice deployed the config".
- Use active voice for system behavior: "the cache returned stale data".
- Never name individuals unless praising a specific intervention that reduced impact.
- Frame gaps as system gaps: "no alert existed for this condition" not "the on-call missed the alert".
- Never speculate without marking it: "Possible contributing factor (unconfirmed): ..."

## Non-Negotiable Rules

| Rule | Violation = STOP |
|------|------------------|
| No secrets, credentials, or tokens in the record | Block if detected |
| No personally identifiable information (PII) or user data | Block if detected |
| Root cause must be identified | Block if missing or speculative without marking |
| Regression test must exist and be named | Block if missing |
| At least one preventive action must be listed | Block if missing |
| Blameless language throughout | Block if blaming individuals |
| Evidence over speculation | Block if unmarked speculation presented as fact |

## Integration with Bug Resolution

Use the reproduction, root cause, regression test, and verification evidence
from `bug-resolution`. Do not repeat questions that the workflow already answered.
