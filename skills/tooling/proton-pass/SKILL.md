---
name: proton-pass
description: Read secrets from Proton Pass with the pass-cli command-line tool, and set up the agent/PAT credential that lets an automated process do it unattended. Use whenever a task needs an API key, token, password, or TOTP code that lives in Proton Pass; when pass-cli returns an auth error or an expired session; or when someone asks how to give an agent scoped, audited access to a vault. Also use when a plaintext secret turns up somewhere it should not be, when a vault needs deduplicating after a migration left near-copies behind; or when setting up, auditing, or troubleshooting what an agent is allowed to read from the vault.
---

# Proton Pass from the command line

`pass-cli` is Proton's official CLI for Proton Pass. This skill covers reading
secrets from it safely, and the one-time setup that lets an unattended process
keep reading them after its session expires.

This installation was checked against CLI 2.4.2 and the official documentation.
Read `references/ubuntu-pi.md` before setup or troubleshooting on this machine.
Resolve bundled paths relative to this skill directory, not the working directory.
Use the existing `~/.local/bin/pass-cli`. Do not add this skill's `bin` directory
to PATH or install its Claude Code hooks in Pi.

Official documentation: <https://protonpass.github.io/pass-cli/>.
When documentation and the installed CLI disagree, use the CLI's `--help`.
Historical observations below are not guarantees for later versions.

## The one rule

**A secret read from the vault must never reach a command line, a log, or a
transcript.** Read it into a variable in the same command that consumes it, then
drop it. This is not ceremony: process arguments are world-readable on most
systems, shell history persists, and an agent transcript is often stored and
sometimes shared.

That rule is also why the setup below exists. The obvious way to log in —
pasting the token into a command — is the one way you must not.

## Object model

Four things, nested:

| Thing | What it is |
|---|---|
| **Share** | The link between you and a resource. Has a **Share ID**. A *vault share* covers a whole vault; an *item share* covers exactly one item. |
| **Vault** | A container of items. Addressed by name or Share ID. |
| **Item** | A login, note, card, SSH key, alias, identity. Addressed by title or Item ID. |
| **Field** | `username`, `password`, `email`, `url`, `note`, `totp`, or any custom field by its own name. |

Roles on a share are `viewer`, `editor`, `manager`. Only the vault's creator can
delete it.

### `pass://` references

The addressing syntax, and the form to prefer:

```
pass://<vault-name-or-share-id>/<item-title-or-id>/<field-name>
```

All three segments are required. Names and IDs can be mixed freely
(`pass://Work/XyZ789/password` is valid). Spaces are allowed inside names — no
escaping syntax is documented, so quote the whole URI in your shell.

- **Name resolution is case-sensitive, and on a duplicate name the first match
  wins.** Use Share IDs and Item IDs when you need a guarantee.
- Fields inside a custom section are `SectionName.fieldname`. An unqualified
  name resolves to the first match across all sections. Identity items are the
  exception — their built-in personal/address/contact/work fields take no prefix.
- A TOTP field resolves to the live code. `?totp=code` is explicit;
  `?totp=uri` returns the stored `otpauth://` URI instead.

Invalid: `pass://vault/item`, `pass://vault/item/`, `pass://vault/`, `pass://`.

## Reading a secret

`item view` accepts either targeting flags or a URI. **Prefer the URI** — it
returns the bare value, where the flag form with `--output json` returns the
whole item.

```bash
PROTON_PASS_AGENT_REASON="Deploying the staging worker" \
  pass-cli item view "pass://Access Tokens/Stripe/secret_key"
```

`view` has aliases `get` and `show`. `run` and `inject` consume the same
references:

```bash
export DB_PASSWORD='[REDACTED]'
pass-cli run -- ./my-app                    # resolved into the child's env

# template.tpl contains: password = {{ pass://Production/Database/password }}
pass-cli inject -i template.tpl -o config.ini
```

### The reason is mandatory, and it is read by a human

Agent tokens log every access. `PROTON_PASS_AGENT_REASON` must be non-empty and
at most 300 characters, and it is stored end-to-end encrypted next to the log
entry. The vault owner reads these later with `agent monitor`. Write a real
sentence — "task" and "test" are how you lose an owner's trust in the grant.

Required for: `item view`, `item create` (all variants), `item update`,
`item trash`, `item untrash`, `item move`, `vault update`.

Not required for discovery: `info`, `vault list`, `share list`, `item list`.

### Two traps that leak secrets

- **Do not redact `--output json` by pattern.** A hidden custom field
  serializes as `"Hidden": "<the secret>"`. A regex written to catch
  `"value"` or `"content"` sails straight past it. Use the URI form, which
  returns only the field you asked for.
- **Do not echo to check.** If you need to confirm a read worked, test the
  length or the exit code, never the value.

## Sessions

A session persists on disk between commands, so most reads need no login at all.

- **PAT and agent sessions last 2 hours** and cannot carry a session lock.
- **Always set an isolated `PROTON_PASS_SESSION_DIR`** before authenticating with
  a token. Without it, a token login overwrites the human's own interactive
  session in the default location.
- Make that directory durable, not a temp path. The published example uses
  `/tmp/pass-agent-<name>`, which is fine for one CI job and wrong for a
  long-lived agent — a cleaned-up `/tmp` silently costs you the session.

Check the isolated session with `pass-cli info` before reading.
A failure can mean an expired session, a locked keyring, or a network problem.
Do not force logout on every failure. Identify the cause and recover only in
the intended isolated session. Do not log out the human session.

**`pass-cli test` does not exist** in 2.4.2, despite appearing in some
instructions. Use `info` for health.

## Setup: the bootstrap credential

This is the part people get wrong.

Every *read* works from the on-disk session unaided. The one command an
unattended process cannot run is the *login*, because that needs the token — and
the token is deliberately somewhere the process cannot see. Sound design, one
consequence: without help, a routine 2-hour expiry strands the job and needs a
human. And the token is displayed exactly once at creation, so a lost copy means
regenerating it.

The fix is **exactly one bootstrap secret in the OS keychain**, holding nothing
but the token. The blast radius does not change — that token still reaches only
the vaults it was granted, and the keychain is bound to this user on this
machine.

### 1. Create a vault for machine secrets

Not your personal vault. Grants are vault-scoped, so **the vault boundary is the
security control** — it is what stands between a prompt-injected agent and
everything you own.

Two structural facts worth internalizing:

- **A token stored only in the vault it unlocks cannot bootstrap a new session.** Machine secrets need their
  own vault, separate from the human one.
- The right response to "the agent can't reach credential X" is a new
  purpose-built vault with its own short-expiry token. It is never widening an
  existing grant to the personal vault.

### 2. Create an agent token, scoped

An agent token is a PAT with access logging switched on. Prefer it over a bare
PAT for anything non-human — the audit trail is the whole point.

```bash
pass-cli agent create my-agent --expiration 3m --vault "Machine Secrets"
```

`--expiration` takes `1h`, `1d`, `1w`, `1m`, `3m`, `6m`, `1y` — it is mandatory,
so this recurs. `--vault` repeats. Output is JSON containing the token, **shown
this once only**. Grant more later with `agent access grant`, review with
`agent monitor`, rotate with `agent renew` (grants survive; the old token dies
immediately).

Token shape is `pst_<token>::<key>`.

### 3. Store it in the OS keychain

Use the helper in `bin/` rather than reinventing it — it exists because two
specific mistakes each cost a one-time token (see `references/bootstrap.md`).

```powershell
# Windows — Credential Manager (DPAPI, user- and machine-bound)
. .\bin\ProtonPassAgent.ps1
Set-ProtonPassAgentToken            # masked box; never echoed, never an argument
Connect-ProtonPassAgent             # idempotent login
Get-ProtonPassSecret -Uri 'pass://Machine Secrets/Stripe/secret_key' -Reason 'deploy'
```

```bash
# macOS (Keychain) / Linux (libsecret)
./bin/proton-pass-agent.sh self-check   # prove it works here FIRST
./bin/proton-pass-agent.sh store        # prompts with echo off
./bin/proton-pass-agent.sh connect --force  # first login only
./bin/proton-pass-agent.sh get 'pass://Machine Secrets/Stripe/secret_key' 'deploy'
```

Both take the token by prompt with echo disabled, write it to the keychain,
**read it back and compare** before reporting success, and hand it to `pass-cli`
as a process environment variable — never as an argument.

**Run `self-check` before the token exists.** It exercises the shape validation
and a full store / read-back / delete cycle against a throwaway keychain entry
and an obviously fake value, so a broken keychain path surfaces while it costs
nothing. The token is displayed exactly once at creation, so the worst moment to
discover the store is broken is while holding the only copy — which is not
hypothetical, it is how two tokens were already lost (`references/bootstrap.md`).

Read the summary line, not just the exit code: anything reported as **SKIP** is
unproven on that machine, not passing.

The helper checks the isolated session before reading. It does not retry failed
reads automatically. A locked desktop keyring requires the user to unlock it.

### 4. Verify end to end

`pass-cli info` should name your token under `Personal Access Token:`. Only
perform a real secret read when the task requires it and the owner authorizes it. A login that "succeeds" but cannot read anything means the grant is
missing, not the auth.

## When you find a plaintext secret

Say so, once, and name the `pass://` reference that would replace it. `.env`
files, hardcoded keys in scripts, tokens in CI config, anything sitting in a
keychain that could move into a vault instead. One line is enough — this is a
note, not a lecture.

## Bulk edits and duplicates

Everything above is about reading. Writing in bulk — collapsing the near-copies
an import left behind — has its own rules, because the failure mode is silent
data loss rather than a failed read.

The short version: **do not export, dedupe, and re-import.** Passkeys, aliases
and file attachments do not survive that round trip, and every timestamp resets,
destroying the evidence needed to tell copies apart afterwards. Target the
duplicates with `item trash` instead; survivors are never touched, and trash is
reversible with `item untrash`, so no backup export is needed.

Two items are the same account only if they agree on share, registrable domain,
identity *and* byte-exact password. Anything less merges accounts that merely
look alike.

`references/dedupe.md` — the full method, the three cases that must be refused
rather than collapsed, and the invariants to check against the live vault.
`bin/pass-dedupe.py` — a four-phase implementation (`plan`, `verify`, `apply`,
`undo`) that refuses to write a plan if an invariant fails.

**One trap worth knowing even if you never dedupe:** roughly 1% of Proton item
IDs are base64 strings beginning with `-`, which `pass-cli` parses as a flag.
Always write `--item-id=$ID`, never `--item-id $ID`. A loop over many items hits
this on a handful and otherwise looks like it succeeded.

## Gating what an agent can reach

The bundled hooks target Claude Code, not Pi. Their machine-specific wrappers
are not activated by this installation. Do not invoke or install them without
a separate review. They are not a security boundary.
Pi agents must obtain explicit approval for bulk secret reads, vault mutations,
and token creation or grant changes. Never set `PROTON_PASS_APPROVED=1`
without approval for that specific operation.


Everything above assumes the caller is trustworthy. It usually is. The gap is
that **none of `pass-cli`'s controls bind a caller that does not opt into them.**

An agent token is vault-scoped and logs every read with a reason. But agents
inherit the *human* session at `%APPDATA%\proton-pass-cli\.session`, because
`PROTON_PASS_SESSION_DIR` is unset by default - and that session permits
`--show-secrets`, which agent sessions forbid. Nothing routes an agent through
the token. Observed consequence: a dedupe run read 1,880 plaintext passwords and
trashed 661 items while `agent monitor` recorded **nothing at all**.

Check for the second half of the trap too: a `permissions.allow` entry like
`Bash(pass-cli *)` in `~/.claude/settings.json` auto-approves every invocation
before it runs, so no prompt appears regardless of policy. An allowlist matches
command prefixes and cannot see a `--show-secrets` at the end of the line.

`hooks/proton-pass-guard.py` is a Claude Code PreToolUse hook that puts bulk
reads, mutations, and edits to its own policy files in front of a human.
`hooks/pass-cli-shim.py`, installed as `bin/pass-cli`, applies the same policy to
callers hooks cannot reach. Both log every invocation - which is the only record
that human-session use leaves anywhere.

**If a Proton Pass command is refusing or prompting unexpectedly, that is
probably this.** And if every `Bash`/`Edit`/`Write` call is suddenly blocked, the
guard is missing or unparseable: a failing PreToolUse hook fails closed, in every
session on the machine. Recover with `!` and a copy, never by deleting the hook.

`references/agent-guard.md` - install, the lockout recovery, the audit-log
format, and an honest account of what this does not protect against.

## Corrections to the published docs

Historical findings from CLI 2.3.2; check current 2.4.2 help before use:

- **`pass-cli test` does not exist.** Use `info`.
- **`item view` has no `--item-name`.** It is `--item-title` or `--item-id`, or
  the URI. The agent docs page shows `--item-name` in an example; it fails.
- The secret-reference page says field matching is case-insensitive in one
  section and case-sensitive in another. Treat it as case-sensitive.
- **Docker**: the kernel secret service is unavailable inside a container, so the
  CLI's key falls back to the filesystem. Plan for that before putting pass-cli
  in an image.
- Package-manager installs (Homebrew) disable `pass-cli update` and release-track
  switching. Only manual installs can change tracks.

## Full command reference

`references/commands.md` — command help captured from CLI 2.4.2.
`references/ubuntu-pi.md` — key storage, SSH startup, and Pi integration.
`references/bootstrap.md` — the keychain design, per-OS detail, and the rotation
ceremony.
`references/dedupe.md` — deduplicating a vault in place, and why the
export/import round trip loses passkeys.
`references/agent-guard.md` — gating agent access, and why pass-cli's own
controls do not bind a caller that ignores them.

`pass-cli agent instructions` prints Proton's own current usage doc as Markdown;
worth diffing against this file when the CLI updates.
