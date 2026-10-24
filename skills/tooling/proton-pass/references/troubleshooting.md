# Troubleshooting pass-cli

Diagnose in this order: is the CLI installed, is there a usable session, and
which class of error is it? Authentication, session lock, key storage, and
network failures need different fixes.

Do not force logout, delete a session directory, change the key provider, or
retry a login in a loop until you know the cause. Each of those can destroy a
working session or weaken storage.

## Error messages

| Message | Cause | Action |
|---|---|---|
| `Agent sessions must set the PROTON_PASS_AGENT_REASON environment variable before running commands.` | An agent session ran an audited command without a reason. | Set a non-empty reason of at most 300 characters. Describe the task. |
| `PROTON_PASS_AGENT_REASON is set but empty.` | Empty value. | Write a real sentence. |
| `PROTON_PASS_AGENT_REASON is too long (N characters).` | More than 300 characters. | Shorten it. |
| `Field does not exist: <name>` | The field name is not on the item. | Confirm the exact name with the operator. Do not dump the item to find it. |
| `Field '<name>' not found in item '<id>'` | Same failure from `run` or `inject`. | Fix the field segment of the reference. |
| `Secret reference requires a field name.` | `run` or `inject` received `pass://vault/item`. | Add `/<field>`. |
| `Invalid reference format. Expected: pass://SHARE_ID/ITEM_ID[/FIELD]` | Empty reference, missing item segment, or a trailing slash. | Use three non-empty segments and quote the URI. |
| `Cannot extract item segment` | The vault segment parsed but the item segment is missing. | Add the item. |
| `Could not find vault <name>` | Wrong vault name, or the token has no grant for it. | List vaults, or use the share ID. Do not widen the grant yourself. |
| `No item found with title: <title>` | Wrong title, or no access to that item. | List items in the vault, or use the item ID. |
| `Client is already authenticated. Log out if you want to log in again` | A session already exists in the current session directory. | Use it. If you need a separate one, set `PROTON_PASS_SESSION_DIR` before logging in. Do not log out the human session. |
| `Personal access token token not found. Set PROTON_PASS_PERSONAL_ACCESS_TOKEN environment variable` | The login had no token. | The operator must put the token in the environment, or perform a web login. |
| `Error creating client features. It cannot get the encryption key for the database` | No reachable OS keyring for the session key. | Unlock the keyring, or ask before falling back to `PROTON_PASS_KEY_PROVIDER=fs`. The fallback stores the key in plaintext beside the encrypted data. |
| `NoStorageAccess` or a D-Bus error on Linux | `PROTON_PASS_LINUX_KEYRING=dbus` is set but the Secret Service is unavailable or locked. | Unlock the desktop keyring, or unset `PROTON_PASS_LINUX_KEYRING` to use the kernel keyring. |
| `unrecognized subcommand 'test'` | `pass-cli test` does not exist, despite some documentation. | Use `pass-cli info`. |
| Rejection of `--show-secrets` in an agent session | Agent sessions cannot dump item content. | Read one field with `item view`. |

## Sessions

- `pass-cli info` is the health check. A non-zero exit is not always an expired
  session.
- PAT and agent sessions last 2 hours. Re-login with the token into the same
  `PROTON_PASS_SESSION_DIR`. If the token is unavailable, stop and ask the
  operator.
- A user session persists until logout or expiry. Do not log out a session you
  did not create, and do not replace it with a token login in the default
  session directory.
- A locked session rejects API calls until it is unlocked with the lock code.
  The code is not stored. Ask the owner. Only user sessions can be locked.
- If the session files are lost, log in again. Do not copy session files from
  another machine or user.

## Key storage

The CLI encrypts its local session database with a key held by the OS keyring by
default: macOS Keychain, the Linux kernel keyring, or Windows Credential
Manager. On Linux with a desktop, `PROTON_PASS_LINUX_KEYRING=dbus` selects the
Secret Service instead; it persists across reboots and requires an unlocked
keyring.

`PROTON_PASS_KEY_PROVIDER` selects the backend:

- `keyring` (default) uses the OS store.
- `fs` writes `<session-dir>/local.key` in plaintext beside the encrypted data.
  It survives reboots and works in containers, but anyone who copies the
  directory can decrypt it.
- `env` derives the key from `PROTON_PASS_ENCRYPTION_KEY`.

Do not switch a working setup to `fs` to silence an error. A keyring failure
usually means the keyring is locked or unreachable, and that is recoverable
without weakening storage. Changing providers can require a fresh login; do not
assume the key migrates.

Containers cannot reach the kernel secret service, so the documented container
path is `fs`. Treat that as a security decision for the operator, not a default.

## Verify a fix

1. `pass-cli info` exits 0 and shows the expected account or token.
2. If the task needs a secret, read one field only, and do not print it.
3. For agent work, run `pass-cli agent monitor <name>` as the owner and confirm
   the access appears with the expected reason.

Documentation errors are listed in `SKILL.md`. When the documentation and the
installed CLI disagree, trust `pass-cli <command> --help`.
