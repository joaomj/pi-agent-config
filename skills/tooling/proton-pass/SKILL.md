---
name: proton-pass
description: Load secrets, passwords, TOTP codes, and SSH keys from Proton Pass at runtime with pass-cli, so they never appear in arguments, logs, or transcripts. Use when a command, script, service, git push, or ssh connection needs a credential from the vault; when ssh reports "Permission denied (publickey)" or the agent has no usable key; when a value must stay off the command line; or when an unattended process needs a scoped, audited token.
---

# Proton Pass at runtime

`pass-cli` is Proton's CLI for Proton Pass. This skill is the runtime playbook:
put a secret into the process that needs it, and get an SSH key into use without
writing the private key anywhere.

Checked against CLI 2.5.1. Run `pass-cli --version` before you rely on a flag.
When documentation and the installed CLI disagree, `pass-cli <command> --help`
wins. Machine setup on this laptop is in `references/ubuntu-pi.md`.

Official documentation: <https://protonpass.github.io/pass-cli/>.

## The one rule

**A secret must never reach a command line, a log, or a transcript.** Process
arguments are readable by other users on most systems, shell history persists,
and an agent transcript is often stored and sometimes shared. Deliver the value
through the environment or a file of the process that consumes it, and nowhere
else.

That rule picks the tool:

| Need | Use | Why not the obvious alternative |
|---|---|---|
| A value the program reads from its environment | `run` | `export X=$(pass-cli item view ...)` leaves the value in the shell, its history, and any `set -x` trace |
| A config file the program reads | `inject` | A hand-edited file keeps the secret on disk and in editor history |
| One field, right now | `item view` with a URI | `--output json` returns the whole item, secrets included |
| A live TOTP code | `item view .../totp` | `totp generate` takes the TOTP secret as an argument |
| SSH or git authentication | the SSH agent | `ssh-agent load` copies private keys into another agent |

## Address a secret

```
pass://<vault-name-or-share-id>/<item-title-or-id>/<field-name>
```

All three segments are required. Names and IDs mix freely. Names are
case-sensitive, and the first match wins on a duplicate name, so use Share IDs
and Item IDs when the read must be exact. Quote the whole URI: names may contain
spaces, and no escaping syntax is documented.

Fields: `username`, `password`, `email`, `url`, `note`, `totp`, or a custom field
by name. A field inside a custom section is `SectionName.fieldname`. Identity
items are the exception: their built-in fields take no prefix.

Discovery needs no reason field: `info`, `vault list`, `share list`,
`item list`.

## Give a process its secrets: `run`

`run` scans the environment it is given for `pass://` references and replaces
each one before it starts the command:

```bash
DB_PASSWORD='pass://Production/Database/password' \
  pass-cli run -- ./my-app
```

The child sees `DB_PASSWORD` with the resolved value. Values may mix references
and plain text, and one value may hold several references.

A dotenv file keeps the references in version control:

```bash
# .env.production — the reference, never the value
DB_HOST=localhost
DB_PASSWORD=pass://Production/Database/password

pass-cli run --env-file .env.production -- ./my-app
```

`--env-file` repeats, and later files override earlier ones. `run` forwards
stdin, stdout, stderr, and termination signals to the child.

**Masking is on by default.** Resolved values are replaced by
`<concealed by Proton Pass>` in the child's output. It matches the literal
value only: a program that re-encodes the secret (base64, hash, URL-escape)
prints it in the clear. Do not add `--no-masking` to "see what happens".

## Write a config file: `inject`

Templates use double braces. Bare `pass://` URIs outside braces are ignored.

```bash
# config.yaml.template
database:
  password: {{ pass://Production/Database/password }}

pass-cli inject -i config.yaml.template -o config.yaml
```

The output file is created with mode `0600` by default; `--file-mode` overrides
it. `-f` overwrites an existing file without a prompt. Without `-i` the template
comes from stdin, and without `-o` the result goes to stdout.

## Read one value: `item view`

```bash
PROTON_PASS_AGENT_REASON="Deploying the staging worker" \
  pass-cli item view "pass://Access Tokens/Stripe/secret_key"
```

The URI form returns the bare field value. The flag form plus `--output json`
returns the whole item, and a hidden custom field serializes as plain text:
never redact that JSON by pattern. Do not echo a value to prove it worked; test
the exit code or the length.

`item list --show-secrets` requires `--output json` and is refused in agent
sessions. It is for owner-approved exports, not for lookups.

## TOTP and passwords

```bash
pass-cli item view "pass://Work/GitHub/totp"            # current code
pass-cli item view "pass://Work/GitHub/totp?totp=uri"   # stored otpauth:// URI
```

`pass-cli totp generate "<secret-or-uri>"` accepts the secret only as an
argument, so it leaks through the process table. Prefer the `item view` URI,
which reads the secret from the vault.

```bash
pass-cli password generate random --length 24
pass-cli password generate passphrase --count 6
```

`pass-cli password score <password>` also takes the value as an argument. Score
candidate passwords, never a vault password. Generating is not storing: writing
the new password into the vault is a mutation and needs explicit approval.

## SSH keys at runtime

The private key stays in the vault. The agent signs on request over a socket,
and ssh, git, and ssh-keygen ask that socket.

Two modes:

- **Native agent.** `pass-cli ssh-agent start --socket-path <path>` serves keys
  from the vault over its own socket. On this laptop a systemd user service runs
  it at login.
- **Load into the running agent.** `pass-cli ssh-agent load [--vault-name X]`
  pushes keys into whatever `$SSH_AUTH_SOCK` already points at. Convenient, and
  weaker: anything that can reach that socket can ask it to sign.

Check what the agent is serving:

```bash
SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/proton-pass-ssh-agent/agent.sock" ssh-add -l
ssh -o BatchMode=yes -T git@github.com    # GitHub names the account in its greeting
```

A vault holds many keys, so name the one each host may use:

```sshconfig
Host github.com
    IdentityAgent /run/user/1000/proton-pass-ssh-agent/agent.sock
    IdentityFile ~/.ssh/github.pub
    IdentitiesOnly yes
```

The file in `IdentityFile` is a **public-key selector**, not a private key:
create it from the matching line of `ssh-add -L`. `IdentitiesOnly yes` stops ssh
from offering every vault key, and servers count each offer as a failed attempt.

**Keep the selector file at mode `0600`.** At `0644` ssh refuses to read it,
prints `WARNING: UNPROTECTED PRIVATE KEY FILE`, and the connection ends in
`Permission denied (publickey)`.

Commit signing uses the same selector:

```bash
git config --global gpg.format ssh
git config --global user.signingkey "$HOME/.ssh/github.pub"
git config --global gpg.ssh.program "$HOME/.local/libexec/proton-pass-ssh-agent/proton-pass-sign.sh"
```

The signing wrapper sets the socket itself, so signing also works from a
terminal that has a different agent.

`references/ssh-agent.md` covers modes, sockets, refresh, and failure diagnosis.

## When a read fails

Start with `pass-cli info`. It reports the account, the release track, and
whether a lock is held. Then separate the three causes:

| Symptom | Cause | Action |
|---|---|---|
| `info` fails, or names no account | Expired or logged-out session | Log in with the documented method for that session; never `logout` someone else's session to recover |
| Keyring or D-Bus error | Desktop keyring locked | Unlock the keyring, then retry |
| Resolve or connect error | No network, or DNS not ready | Fix the network, then retry |

A session persists on disk between commands, so most reads need no login.

- Agent and PAT sessions last **2 hours** and cannot hold a session lock.
- Set `PROTON_PASS_SESSION_DIR` to a durable 0700 directory before a token
  login. Without it, a token login overwrites the human's interactive session.
- `pass-cli test` does not exist. Use `info`.

The one credential an unattended process cannot fetch itself is the login
token. `references/bootstrap.md` covers the keychain bootstrap, rotation, and
the two mistakes that each cost a one-time token.

## Approval and audit

- `PROTON_PASS_AGENT_REASON` is required on agent-token sessions for reads and
  writes (`item view`, `item create`, `item update`, `item trash`, `item
  untrash`, `item move`, `vault update`). It must be a real sentence: the vault
  owner reads it in `agent monitor`.
- Bulk reads, vault mutations, and token or grant changes need explicit owner
  approval for that operation. Never set `PROTON_PASS_APPROVED=1` yourself.
- Grant the smallest vault. Widening a personal vault is never the answer to
  "the agent cannot reach credential X"; create a scoped vault and token.

## When you find a plaintext secret

Say so once, and name the `pass://` reference that would replace it: a `.env`
entry, a key in a script, a token in CI config. One line, not a lecture.

## References

- `references/ssh-agent.md`: agent modes, sockets, selector setup, diagnosis.
- `references/commands.md`: help captured from CLI 2.4.2; check `--help` first.
- `references/ubuntu-pi.md`: this laptop's session storage, keyring, and service.
- `references/bootstrap.md`: the keychain token bootstrap and rotation.
- `references/dedupe.md`: deduplicating a vault in place, and why an export and
  re-import round trip loses passkeys.
- `references/agent-guard.md`: gating agent access, and why pass-cli's own
  controls do not bind a caller that ignores them.

`pass-cli agent instructions` prints Proton's own usage doc as Markdown; diff it
against this file after a CLI update.
