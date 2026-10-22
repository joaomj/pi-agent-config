---
name: improve-me
description: Turn repeated fixes into structure. Mines the last N days of Pi session logs for recurring corrections, policy denials, errors, and manual procedures, then proposes the strongest durable fix for each (guard hook, linter or CI check, script, permission rule, skill, or rule text as a last resort) and removes prose a structural fix makes redundant. Use when the user asks to improve me, automate fixes, find repeatable processes, encode lessons, or reduce repeated corrections.
---

# Improve me

Fixes become structure. When the same lesson shows up twice, encode it where the
harness or toolchain enforces it, not as more instructions.

- **The instruction is the symptom.** If a structural fix exists, ship only the
  structural fix and delete the prose it replaces.
- If the lesson needs judgment and cannot be encoded, make the existing rule
  more prominent and add one concrete example of the failure. Do not add a
  second rule.

This skill applies the "Encode Lessons in Structure" principle from poteto's
[pstack](https://github.com/cursor/plugins/tree/main/pstack) to Pi session logs.

Let `SKILL_ROOT` be the directory containing this file. Everything runs
locally. Never upload transcripts or excerpts.

## 1. Mine the sessions

Use the window the user gave (default 14 days). Scope to a project with
`--cwd PATH` when the user names one.

```bash
OUT="$(mktemp -d "${TMPDIR:-/tmp}/improve-me-XXXXXXXX")"
python3 "$SKILL_ROOT/scripts/mine_sessions.py" --days 14 --out "$OUT"
```

Read the printed summary, then `"$OUT/signals.json"`. Signals:

- `corrections`: the user pushing back on the previous assistant turn. Highest
  value, and the noisiest. Read each one with its `after` text.
- `denials`: tool calls a policy or guard blocked. Each one is a wasted turn the
  agent could have avoided.
- `errors`: tool failures grouped across sessions.
- `commands`: shell command shapes repeated across sessions.
- `phrases`: sentences the user typed in several sessions.

The miner filters prompt templates and repeated harness nudges, but some
injected text still gets through. Drop it. For any signal you keep, open the
cited `file` at `line` and read the surrounding turns before you trust it.

## 2. Find the lessons

Group signals by the underlying lesson, not by wording. Keep a lesson only if
it recurs: at least 2 sessions, or 1 session with a costly failure (a secret
exposed, wrong credentials, a destructive command, a forbidden commit).

For each lesson, record:

- What went wrong or what was repeated, in one sentence.
- The evidence: session ids, file and line references, a short quote.
- What already covers it. Search `~/.pi/agent/AGENTS.md`, project `AGENTS.md`,
  skills, prompts, `~/.pi/agent/extensions/`, and the project's linters, CI,
  and git hooks. A lesson that recurs **despite** a written rule is the
  strongest candidate. The prose already failed.

## 3. Choose the strongest fix

Pick the first level that can enforce the lesson. Go down only when the level
above cannot express it.

1. **Remove the cause.** Delete the step, file, or option that invites the
   mistake. Fix the tool that fails.
2. **Guard hook**: a Pi extension `tool_call` handler that blocks or rewrites
   the call. Model it on `~/.pi/agent/extensions/plan-file-guard.ts`: parse the
   command, never match on raw text, and fail closed with a reason that says
   what to do instead.
3. **Permission rule** in pi-permission-system. The agent cannot read or edit
   that policy file. Give the user the exact rule and reason text to add.
4. **Project check**: a linter rule, type, test, pre-commit hook, or CI step
   in the affected repository, so it fails for every contributor and agent.
5. **Script or command**: a repeated multi-step procedure becomes one script
   that is idempotent and validates its inputs. Write it once and reference it.
6. **Skill or prompt template**: a repeatable process that needs judgment.
   Prefer extending an existing skill. Write a new one only when no skill fits.
7. **Rule text** in `AGENTS.md`: last resort, for judgment calls only. Edit the
   existing rule rather than adding one, and include the failure example.

For every structural fix, list the prose it makes redundant and propose
deleting it. Exception: keep a short rule where a guard only blocks and the
agent still needs to know the right alternative.

Discard candidates that would fire on legitimate work, need constant
exceptions, or cost more to maintain than the mistake costs.

## 4. Report

Lead with the top 3 to 5 lessons ranked by cost times frequency. For each:

- **Lesson**: one sentence, with the evidence count (sessions, hits).
- **Fix**: the level from step 3 and where it lives.
- **Removes**: the prose to delete, or "nothing".
- **Why not stronger**: one line, only when the fix is below level 3.

Then list weaker candidates in one line each, and the signals you dismissed as
noise with a reason.

Draft each proposed artifact (extension, script, rule edit, skill diff) under
`"$OUT/proposed/"` and give the paths. Ask which ones to apply.

## Boundaries

- Do not edit real configs, extensions, skills, `AGENTS.md`, or repositories
  until the user approves each change.
- Tests for a new guard or check need the approval and authoring gate in the
  `test-audit` skill.
- Never commit or push without explicit approval.
- When quoting sessions, redact secrets, tokens, and credentials.
