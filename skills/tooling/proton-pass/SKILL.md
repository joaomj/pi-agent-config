---
name: proton-pass
description: Retrieve and use credentials stored in Proton Pass with the pass-cli command-line tool. Use when a task needs an API key, password, token, SSH key, note, or TOTP code that lives in Proton Pass; when discovering which vault or item holds a credential; when a pass-cli command reports an expired session, a missing access reason, or a keyring error; or when setting up scoped, audited agent access to a vault or item.
---

# Proton Pass credentials from the command line

`pass-cli` is Proton's official command-line client for Proton Pass. Use it when
a task needs a credential that is stored in Proton Pass. The goal is to get the
value into the process that needs it, not into the conversation.

`references/commands.md` lists verified options. The installed CLI is the source
of truth: run `pass-cli <command> --help` when an option matters. This skill was
verified against pass-cli 2.5.0 and the official documentation at
<https://protonpass.github.io/pass-cli/>.

A *user session* comes from a web login and has the account owner's access. An
*agent session* comes from a personal access token (PAT) or an agent token. Only
the agent session writes an audit log, and only if it logged in with a token.

## Protect the secret

- Do not put a secret in a command argument, a log, a repository file, or your
  reply.
- Do not echo or print a value to check that a read worked. Check the exit code,
  or use the value directly.
- Do not fetch a whole item when one field is enough.
- Do not ask the operator to paste a secret that `pass-cli` can retrieve.
- If a secret appears in the conversation, treat it as exposed. Finish the task
  and tell the operator to rotate it.

## 1. Confirm the tool and the session

```bash
command -v pass-cli
pass-cli --version
pass-cli info
```

`info` exits 0 when the session is usable. It shows the account, the release
track, and whether the session has a lock. If `pass-cli` is missing, install it
from the official installation page and check again. Do not guess a package name
or a binary path.

If `info` fails, identify the cause before changing anything. An expired
session, a locked session, an unavailable keyring, and a network failure need
different fixes. `pass-cli test` does not exist, although some documentation
mentions it.

## 2. Find the credential

Start with metadata. These commands do not print field values:

```bash
pass-cli vault list --output json
pass-cli share list --output json
pass-cli item list --vault-name "Vault" --output json
```

`item list` also accepts `--share-id`, `--filter-type`, `--filter-state`, and
`--sort-by`. Use `share list` to see item-level shares that are not part of a
whole vault. Do not use `--show-secrets`: agent sessions reject it, and you do
not need it to locate an item.

## 3. Build the reference

The addressing syntax is:

```text
pass://<vault>/<item>/<field>
```

Each segment can be a name or an ID. Names are resolved case-sensitively, and
the first match wins when names collide. Use Share IDs and Item IDs when
precision matters. Quote the whole URI in the shell; spaces are allowed.

- **Always include the field.** `item view` accepts `pass://<vault>/<item>` and
  prints the entire item, including its secrets. `run` and `inject` reject a
  reference without a field.
- Common fields are `username`, `password`, `email`, `url`, `note`, and `totp`.
  Custom fields use their own names.
- A field in a custom section is `Section.field`. An unqualified name resolves
  to the first match across sections.
- Field matching is case-insensitive in the CLI, but write the stored spelling.
  Duplicate names across sections make the first match win.
- A TOTP field returns the current code. Add `?totp=uri` only when you need the
  stored `otpauth://` seed.

When a name is ambiguous or a read fails, ask the operator for the field name.
Do not dump the item to discover it. There is no "list fields" command that
avoids printing secret values.

## 4. Use the secret without reading it

Prefer `run` and `inject`. The value goes to the child process or the output
file, so it never enters your context.

```bash
# The child reads DB_PASSWORD from its environment.
DB_PASSWORD='pass://Production/Database/password' pass-cli run -- ./deploy.sh

# References live in a dotenv file.
pass-cli run --env-file .env -- ./app

# Template file. References use {{ pass://... }}.
pass-cli inject --in-file config.tpl --out-file config.ini
```

`run` replaces `pass://` references inside environment values and masks resolved
values in the child's stdout and stderr as `<concealed by Proton Pass>` by
default. Leave masking on. `inject` replaces only double-brace references and
writes the output file with mode 0600 by default on Unix.

If the consumer accepts only command-line arguments, the secret becomes visible
to other processes. Prefer a consumer that reads an environment variable or a
file, and say why when no such option exists.

## 5. Read one field when you must

```bash
PROTON_PASS_AGENT_REASON="Deploying the staging worker" \
  pass-cli item view "pass://Production/Database/password"
```

This prints only the value. Aliases are `item get` and `item show`. Do not add
`--output json`; JSON is for whole items.

Set `PROTON_PASS_AGENT_REASON` on every call in an agent session. It must be
non-empty and at most 300 characters. The owner reads it in `agent monitor`, so
name the task and why it needs this secret. The CLI enforces it for `item view`,
`item create`, `item update`, `item trash`, `item untrash`, `item move`,
`item delete`, `item totp`, `vault update`, `run`, and `inject`; the published
list omits some of these. A user session ignores the variable, and setting it is
harmless.

## 6. TOTP codes

```bash
PROTON_PASS_AGENT_REASON="Signing in to the build service" \
  pass-cli item view "pass://Work/Build Service/totp"
```

The reference returns the current code. Use it once and do not store it. Add
`?totp=uri` only when the seed itself is the thing that must move.

## 7. Writing to the vault

Ask the operator before you create, update, move, trash, delete, or share a
vault or item. A write changes what every member of that vault sees.

- **Create with a template, not with secret flags.** `item create` has
  `--get-template` and `--from-template <path|->`. Write the template outside the
  repository, feed it on stdin, then remove it. `--password` and `--note` put
  the secret on the command line.
- **Update has no template path.** `item update --field password=...` puts the
  value in the process table. Use it only when no other route exists, and say
  so.
- **Trash is reversible.** `item trash` moves an item; `item untrash` restores
  it. `item delete` is permanent and requires both the share ID and the item ID.
- **Never widen a grant to reach a secret.** The vault boundary is the security
  control. Ask for a purpose-built vault with its own scoped token instead of
  adding the personal vault to an existing grant.
- **Do not export.** `export archive` writes all selected secrets to an HTML
  file that is plaintext unless `--encrypt` is used. Export only when the
  operator asks for it.

## 8. Sessions and agent tokens

Reuse an existing session first. Log in only when `info` shows there is none or
it has expired.

To isolate an agent from the human session, set `PROTON_PASS_SESSION_DIR` in the
environment of every call. Use a durable directory owned by the agent's user
with mode 0700, not the shared default and not `/tmp`. The CLI appends
`.session` to this directory.

```bash
export PROTON_PASS_SESSION_DIR="<durable-agent-directory>"
pass-cli info
```

Log in with a token from the environment, never as a literal on the command
line:

```bash
# The operator puts the token in the process environment first.
pass-cli login
```

`login --pat` exists but exposes the token in the process table. The token is
shown once at creation. If it is not already in the environment, ask the
operator for a login; do not ask for the token in chat.

- **PAT and agent sessions last 2 hours** and cannot have a session lock. When
  one expires, log in again if the token is still available; otherwise stop and
  ask the operator.
- **An agent token is a PAT with access logging.** Create it as the operator,
  with a short expiration and only the vaults or items it needs:
  `pass-cli agent create <name> --expiration 3m --vault "Vault"`.
- **Grant narrowly.** `pass-cli agent access grant <name> --vault-name "Vault"
  --role viewer`, or add `--item-title` to limit it to one item.
- **Renew before expiry.** `pass-cli agent renew <name> --expiration 3m` issues a
  new token; grants survive and the old token stops immediately.
- **Revoke with `agent delete <name>`**, then remove the local copy. Deleting a
  local copy does not revoke the token.
- **Review with `agent monitor <name>`.** A session that logged in with the
  human account writes no audit entries.
- **Do not log out a session you did not create.** Use `logout --force` only for
  your own isolated session, and only when a remote logout fails.

Key storage is the OS keyring by default. `PROTON_PASS_KEY_PROVIDER=fs` writes
the encryption key in plaintext beside the session data; `env` derives it from
`PROTON_PASS_ENCRYPTION_KEY`. Do not switch providers to make an error disappear.
Ask the operator first, and explain the weaker protection.

## 9. When something fails

Read `references/troubleshooting.md`. Separate authentication, session lock,
keyring, and network errors before you act. Do not force logout on a generic
failure, do not delete a session directory, and do not retry a failed login in a
loop.

## Documentation drift

The official documentation and `pass-cli agent instructions` disagree with the
2.5.0 CLI in these places:

- `pass-cli test` does not exist. Use `info`.
- `login` accepts `--pat`, not `--personal-access-token`.
- `item view` aliases are `get` and `show`, not `read`.
- `item view` takes `--item-title`, not `--item-name`.
- There is no `pass-cli agent item ...`. Use the normal `item` commands.
- `pass://<vault>/<item>` without a field is valid for `item view` and prints the
  whole item. The documentation calls it invalid.
- Field matching is case-insensitive in the code; the documentation says both.
- `run` and `inject` require `PROTON_PASS_AGENT_REASON` under an agent session,
  although the documentation lists only item and vault commands.

## Files

- `references/commands.md`: verified options for the commands above.
- `references/troubleshooting.md`: error messages and recovery.
