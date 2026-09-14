---
description: Write a blameless Google SRE-style incident postmortem
argument-hint: "<incident or change>"
---

Write a blameless Google SRE-style postmortem for `$ARGUMENTS`.

Use the repository's incident template and location when they exist. Build the
record from available evidence and ask for material facts that cannot be
recovered. Mark uncertainty; never invent times, impact, causes, or owners.

Include the applicable sections:

- Summary
- Impact
- Detection
- Response
- Timeline in a consistent timezone
- Root cause
- Contributing factors
- What went well
- What went poorly
- Where the response was fortunate
- Corrective and preventive actions with priority, owner, and status
- Lessons learned
- Related incidents, issues, changes, and dashboards

Focus on system conditions and decision context rather than individual blame.
Separate the trigger from the root cause and contributing factors. Make action
items specific, measurable, and tied to an identified failure mode. Exclude
secrets, credentials, and personal user data.

Do not impose a new issue database, ID scheme, severity taxonomy, or mandatory
regression test unless repository policy requires it.
