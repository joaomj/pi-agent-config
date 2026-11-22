# Review triage

Use this reference for every review comment in the Babysit playbook, from an
AI reviewer or a person. The goal is not to ignore automated review by
default. The goal is to stop treating every comment as a required code change.

## Decision rubric

Classify each comment before you act:

- `fix`: the comment identifies a plausible correctness, security, privacy,
  data loss, auth, billing, migration, idempotency, race, or shipped-behavior
  issue. Fix it, then cite the commit in the round's answer.
- `dismiss`: the current code or context proves the concern needs no code
  change, or the comment matches a learned noise pattern. Cite the concrete
  disproof: a `file:line`, a test run, or a type that rules it out.
- `ask`: the comment is novel and high-severity, touches security, privacy,
  or data, or is ambiguous. Bring it to the operator at the round's gate.

When in doubt, ask. Skipping a noisy style comment is cheap; skipping a real
data or security bug is not.

A claim you can check with one command, such as "this test no longer matches
the doc", gets that command before you classify it. A red run confirms the
claim; a green run is the disproof.

## Ask by default

Never dismiss these on a pattern alone, even if a past PR dismissed something
similar:

- Security, privacy, auth, billing, data retention, and permission-boundary
  findings.
- High-severity findings.
- Migration, schema, idempotency, concurrency, and cross-system findings.
- Comments whose suggested fix is small and clearly reduces risk without
  changing product intent.

## Learned patterns

Patterns are specific to a repository and its reviewers, so they are client
data. Keep them at `~/.pi/agent/pstack/review-patterns/<repo>.md` on the
account that works on that repository, never in a repository. Read that file
before a triage round, and add a pattern when the operator confirms a
dismissal that will recur. Use this shape:

```markdown
### <short pattern name>

- Confidence: candidate | recurring | strong
- Skip when: <conditions that must be true>
- Do not skip when: <risk boundaries>
- Example signal: <phrases or code context that identify the pattern>
- Source: <PR number and a short note>
```

Use `candidate` for one or two examples, `recurring` after several confirmed
dismissals, and `strong` only when the pattern is narrow, repeatedly verified,
and low-risk.
