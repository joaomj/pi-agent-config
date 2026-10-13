# Gating agent access to the vault

`pass-cli`'s own controls are excellent and almost entirely opt-in at the
caller. This is what closes that gap: a Claude Code hook plus a PATH shim, both
logging to one file.

Load this when setting up agent access, when auditing what an agent has actually
read, or when a Proton Pass command is unexpectedly prompting.

## The failure this exists to prevent

An agent token is scoped to specific vaults and logs every read with a stated
reason. None of that binds an agent unless the agent chooses to use the token.

Agents inherit the **human** session at `%APPDATA%\proton-pass-cli\.session`,
because `PROTON_PASS_SESSION_DIR` is unset by default. That session has full
access and permits `--show-secrets`, which agent sessions forbid.

The result, observed in the wild: a deduplication run read **1,880 plaintext
passwords and trashed 661 items**, and `pass-cli agent monitor` recorded
**nothing** - because `agent monitor` only reports agent-token activity. The
largest privileged operation ever performed on that vault was invisible to the
mechanism built to catch it.

**Check for this second failure too.** A `permissions.allow` entry like
`Bash(pass-cli *)` in `~/.claude/settings.json` auto-approves every invocation
before it runs. Where one exists, no prompt will ever appear no matter what the
hook decides. Remove it and let the hook decide per-flag - an allowlist matches
command prefixes and cannot see `--show-secrets` at the end of a line.

## Two layers

| Layer | Covers | Enforcement |
|---|---|---|
| `hooks/proton-pass-guard.py` (PreToolUse) | Claude Code sessions | Real - the harness runs it before the tool, so the model cannot skip it |
| `hooks/pass-cli-shim.py` via `bin/pass-cli{,.cmd}` | Codex, cron, scripts, interactive shells | Supervisory - first on PATH, but the real binary is still reachable by absolute path |

Policy is identical in both: ordinary reads pass through and are logged;
`--show-secrets`, mutating operations, and reads of raw session material are put
in front of a human. The hook additionally gates *edits to the policy files
themselves*, including via shell redirection - an agent quietly rewriting its
own restrictions is the case most worth surfacing.

Both append to `~/.claude/proton-pass-audit.log`, which is the only record of
human-session use that exists anywhere.

## Install

```bash
cp hooks/proton-pass-guard.py ~/.claude/hooks/
cp bin/pass-cli bin/pass-cli.cmd ~/bin/            # ~/bin must precede the real binary on PATH
```

Then add to `~/.claude/settings.json`, **appending** to any existing
`PreToolUse` array rather than replacing it:

```json
{ "matcher": "Bash|PowerShell|Edit|Write|MultiEdit|NotebookEdit",
  "hooks": [ { "type": "command",
               "command": "python \"C:\\Users\\<you>\\.claude\\hooks\\proton-pass-guard.py\"",
               "timeout": 10 } ] }
```

**Install by copy, not by pointing at this repo.** Pointing `settings.json` at a
working tree means a rename, a `git clean`, or a half-finished refactor takes out
every Claude Code session on the machine at once. Copy in, and re-copy after
`git pull`.

On Windows, `~/bin` is often on Git Bash's PATH via profile but **absent from the
Windows PATH entirely**, so PowerShell and cmd resolve straight past the shim to
the real binary. Check with `(Get-Command pass-cli).Source` and prepend
`C:\Users\<you>\bin` to the User PATH if needed. Already-open shells keep the old
PATH.

## Recovering from a lockout

**A PreToolUse hook that fails to start blocks the tool.** If the guard is
missing or unparseable, every `Bash`, `PowerShell`, `Edit` and `Write` call is
refused **in every session on the machine**, including the ones you would use to
repair it. `Read` still works, which is enough to diagnose it.

That is the correct direction to fail for a secrets guard - no access beats
unguarded access - but it means the repair path must come from outside. In
Claude Code, prefix a shell command with `!` to run it directly:

```
! cp ~/repos/proton-pass-skill/hooks/proton-pass-guard.py ~/.claude/hooks/
```

Restore the guard rather than deleting the hook from `settings.json`. Stubbing
out a security control to unblock yourself is how it stays stubbed out.

**Never delete the installed guard before repointing `settings.json`.** Change
the setting first, verify a trivial command still runs, and only then remove the
old copy.

## Escalating deliberately

Bulk work genuinely needs `--show-secrets` - deduplication cannot compare
passwords without it, and no agent token will ever permit it. That is by design.

- **Claude Code**: approve the prompt. You see the exact command first.
- **Headless callers**: the shim refuses, because nothing there could ask a
  human. Re-run with `PROTON_PASS_APPROVED=1` to make the escalation explicit in
  the command, the log, and the transcript.

Never set `PROTON_PASS_APPROVED=1` in a profile or a CI environment. Its entire
value is that it has to be typed on purpose.

## Reading the audit log

```
2026-08-22 11:46:39  allow           shim  cwd=...  pass-cli info
2026-08-22 11:46:39  DENY-headless   shim  cwd=...  pass-cli item list Personal --show-secrets
2026-08-22 11:44:13  ASK-self-edit         cwd=...  EDIT .../settings.json
```

Verdicts: `allow`, `ASK-bulk`, `ASK-mutate`, `ASK-session-peek`, `ASK-self-edit`,
`ASK-policy-file`, `ALLOW-confirmed`, `ALLOW-preapproved`, `DENY-declined`,
`DENY-headless`. Tokens are redacted before writing.

An `ASK-*` line means a human was shown the command - not that it ran. Pair it
with what followed to know the outcome.

## What this does not do

It is supervision, not containment. The real binary remains callable by absolute
path; the hook catches that because it matches command text, the shim cannot.
Only an OS boundary - a separate user account, or denying agent processes access
to the session directory - would truly contain it.

What the two layers guarantee is that **the easy path is the observed path**,
which is what defeats prompt injection and ordinary carelessness. A determined
process on the same account can still get around them.

One more caveat: if Claude Code runs with permissions bypassed, an `ask`
decision may not produce a prompt. Where that matters, change the `--show-secrets`
branch from `ask` to `deny` and escalate through the shim's
`PROTON_PASS_APPROVED=1` instead.

## Tests

`tests/test_guard.py` feeds real PreToolUse payloads to the guard and asserts
each decision, including the false-positive cases (`pass-clip`, `cp` inside
another token) and the shell-rewrite bypass.

`tests/test_shim.py` asserts the shim's classification, then runs it end to end
against a **fake** `pass-cli` binary - so argv, exit codes and the audit log are
all exercised without the real vault being touched.

Run both after any change to the patterns:

```bash
python tests/test_guard.py    # 14 decision checks
python tests/test_shim.py     # 25 checks, classification + end-to-end
```

Both were mutation-checked when written: deliberately neutering `--show-secrets`
detection, absolute-path matching, policy-file protection, or the headless
refusal each makes the relevant suite fail. A test that stays green through those
is not testing anything - re-verify that way after editing the patterns.
