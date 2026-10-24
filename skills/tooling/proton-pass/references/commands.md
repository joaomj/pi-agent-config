# pass-cli command reference

Captured from pass-cli 2.5.0 with `pass-cli <command> --help`. The installed CLI
is authoritative: run `pass-cli <command> --help` after an upgrade. No vault
data is included.

## Global

```text
pass-cli --version
pass-cli --help
```

Top-level commands: `agent`, `login`, `logout`, `info`, `inject`, `run`, `vault`,
`item`, `folder`, `export`, `invite`, `password`, `personal-access-token`,
`totp`, `share`, `user`, `session`, `ssh-agent`, `settings`, `update`, `support`.

## Session

### info

```text
pass-cli info [-o|--output human|json]
```

Shows the account, release track, and whether the session has a lock. Use the
exit code to test whether the session is usable.

### login

```text
pass-cli login [--pat <PAT>]
```

Without `--pat`, starts a web login. With `--pat`, logs in with a personal
access token or agent token. Prefer `PROTON_PASS_PERSONAL_ACCESS_TOKEN` in the
process environment over the flag, which exposes the token in the process table.

### logout

```text
pass-cli logout [--force]
```

`--force` logs out locally when the remote logout fails. Use it only for a
session you created.

### session

```text
pass-cli session create-lock [--idle-timeout <SECONDS>]
pass-cli session lock
pass-cli session unlock
pass-cli session remove-lock
```

`--idle-timeout` accepts 30 to 900 seconds and defaults to 300. A lock applies
only to user sessions. PAT and agent sessions cannot have a lock. The lock code
is not stored; a forgotten code requires a new login after the lock expires.

## Discovery

### vault list

```text
pass-cli vault list [--output human|json]
```

JSON shape: `{"vaults": [{"name": "...", "vault_id": "...", "share_id": "..."}]}`.

### share list

```text
pass-cli share list [--only-items true|false] [--only-vaults true|false]
                    [--output human|json]
```

Shows vault shares and item-level shares. Use it to find a share ID for an item
that is not part of a whole vault grant.

### item list

```text
pass-cli item list [VAULT_NAME] [OPTIONS]
```

```text
--share-id <SHARE_ID>          Vault share ID
--vault-name <VAULT_NAME>      Vault name
--filter-type <TYPE>           note, login, alias, credit-card, identity,
                               ssh-key, wifi, custom
--filter-state <STATE>         active, trashed
--sort-by <ORDER>              alphabetic-asc, alphabetic-desc, created-asc,
                               created-desc
--output <FORMAT>              human, json
--show-secrets                 Include item content in JSON. Requires --output
                               json. Rejected for agent sessions.
```

Use the metadata form only. `--show-secrets` prints every field of every listed
item.

## Reading

### item view

Aliases: `item get`, `item show`.

```text
pass-cli item view [OPTIONS] [URI]
```

```text
--share-id <SHARE_ID>          Vault share ID
--vault-name <VAULT_NAME>      Vault name
--item-id <ITEM_ID>            Item ID
--item-title <ITEM_TITLE>      Item title
--field <FIELD>                Field to read
--output <FORMAT>              human, json
```

Use either the URI or the flags, not both. With a field, the command prints the
bare value and ignores `--output`. Without a field, it prints the whole item:
human format shows every field, and JSON includes hidden custom fields.

```bash
PROTON_PASS_AGENT_REASON="..." \
  pass-cli item view "pass://Vault/Item/password"
```

### item totp

```text
pass-cli item totp [OPTIONS] [URI]
```

Same targeting options as `item view`, plus `--field` for a specific TOTP field,
and `--output human|json`. Generates current codes for an item.

### run

```text
pass-cli run [--env-file <FILE>]... [--no-masking] -- <COMMAND>...
```

Resolves `pass://` references in environment values and passes the results to
the child process. `--env-file` is repeatable; later files override earlier
ones. Child stdout and stderr are masked with `<concealed by Proton Pass>` by
default. `--no-masking` disables that.

```bash
DB_PASSWORD='pass://Production/Database/password' pass-cli run -- ./deploy.sh
pass-cli run --env-file .env -- ./app
```

### inject

```text
pass-cli inject [-i|--in-file <FILE>] [-o|--out-file <FILE>] [-f|--force]
                [--file-mode <MODE>]
```

Replaces references wrapped in `{{ }}` in a template. Reads stdin when
`--in-file` is omitted and writes stdout when `--out-file` is omitted. The
output file defaults to mode 0600 on Unix; `--file-mode` accepts an octal value
up to 777. `--force` overwrites an existing output file without prompting.

```bash
pass-cli inject --in-file config.tpl --out-file config.ini
```

## Writing

Ask the operator before any write.

### item create

```text
pass-cli item create login|note|credit-card|wifi|custom|identity|ssh-key
```

Most variants support:

```text
--get-template                   Print a JSON template
--from-template <FILE|->         Read the item from a file or stdin
--share-id <SHARE_ID>            Target vault share ID
--vault-name <VAULT_NAME>        Target vault name
```

Login and note also accept direct flags such as `--title`, `--username`,
`--password`, `--url`, and `--note`. Those flags put the value on the command
line; prefer `--get-template` and `--from-template -`.

```bash
pass-cli item create login --get-template > item.json
# Fill item.json outside the repository, then:
pass-cli item create login --vault-name "Vault" --from-template - < item.json
```

SSH keys have their own subcommands: `item create ssh-key import` and
`item create ssh-key generate`.

### item update

```text
pass-cli item update [OPTIONS]
```

```text
--share-id / --vault-name      Target vault
--item-id / --item-title       Target item
--field <name=value>           Field to update; repeatable
```

The value is part of the argument. There is no template or stdin path for
updates.

### item trash, untrash, delete, move

```text
pass-cli item trash   [--share-id|--vault-name] [--item-id|--item-title]
pass-cli item untrash [--share-id|--vault-name] [--item-id|--item-title]
pass-cli item delete  --share-id <SHARE_ID> --item-id <ITEM_ID>
pass-cli item move    [--from-share-id|--from-vault-name]
                      [--item-id|--item-title]
                      [--to-share-id|--to-vault-name]
```

Trash is reversible. Delete is permanent and requires both IDs. Item IDs are
only unique together with the share ID. Some base64 item IDs start with `-`;
write `--item-id="$ID"` so the CLI does not parse the value as a flag.

### vault create, update, delete

```text
pass-cli vault create --name <NAME>
pass-cli vault update [--share-id|--vault-name] --name <NEW_NAME>
pass-cli vault delete [--share-id|--vault-name]
```

Vault sharing, member management, transfer, and deletion have additional
subcommands under `vault`. Run `pass-cli vault --help`.

## Agents and personal access tokens

An agent token is a personal access token with audit logging enabled. The
`pat` namespace is an alias for `personal-access-token`.

### agent

```text
pass-cli agent create <NAME> --expiration <1h|1d|1w|1m|3m|6m|1y>
                        [--vault <VAULT_NAME>]...
pass-cli agent list [--output human|json]
pass-cli agent renew <NAME> --expiration <EXPIRATION> [--output human|json]
pass-cli agent delete <NAME>
pass-cli agent monitor [NAME] [--limit <N>] [--output human|json]
pass-cli agent instructions
```

`create` prints JSON containing the token. That is the only time the token is
shown. `renew` issues a new token; grants survive and the old token stops
immediately. `monitor` requires the agent name when logged in as a user.
`instructions` prints Proton's Markdown guide; it contains the documentation
errors listed in `SKILL.md`.

### agent access

```text
pass-cli agent access grant <NAME> [--share-id|--vault-name]
                            [--item-id|--item-title]
                            [--role viewer|editor|manager]
pass-cli agent access revoke <NAME> --share-id <SHARE_ID>
```

Without `--item-id` or `--item-title`, the grant covers the whole vault. The
default role is `viewer`.

### personal-access-token

```text
pass-cli pat create --name <NAME> --expiration <EXPIRATION>
                    [--output human|json]
pass-cli pat list [--output human|json]
pass-cli pat renew (--personal-access-token-id <ID> |
                    --personal-access-token-name <NAME>)
                   --expiration <EXPIRATION> [--output human|json]
pass-cli pat delete --personal-access-token-id <ID>
pass-cli pat access grant [--personal-access-token-id|--personal-access-token-name]
                          [--share-id|--vault-name]
                          [--item-id|--item-title]
                          [--role viewer|editor|manager]
pass-cli pat access revoke [--personal-access-token-id|--personal-access-token-name]
                           --share-id <SHARE_ID>
pass-cli pat access list-access [--personal-access-token-id|--personal-access-token-name]
                                [--output human|json]
```

## Other commands

- `pass-cli settings view` shows `default_share_id` and `default_format`.
  `settings set default-vault` and `settings set default-format` change them.
- `pass-cli export archive [-o <PATH>] [--vault-name <NAME>]...
  [--include-attachments] [--encrypt] [--password-env <VAR>]` writes an offline
  HTML archive. It contains decrypted data and is plaintext unless `--encrypt`
  is used. Do not run it without an explicit request.
- `pass-cli folder list|create|update|delete|move` manages folders inside a
  vault.
- `pass-cli ssh-agent start|load|debug|daemon` serves SSH keys from the vault.
  Run `pass-cli ssh-agent --help`; this skill does not cover SSH agent setup.
- `pass-cli invite`, `password`, `user`, `update`, and `support` cover account
  and maintenance operations outside credential retrieval.
