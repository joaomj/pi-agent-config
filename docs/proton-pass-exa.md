# Exa authentication through Proton Pass on Ubuntu

Use Proton Pass to resolve an Exa API key when Pi connects to Exa MCP.
The key stays out of shared configuration and command arguments.
GNOME Keyring preserves the CLI session encryption key across reboots.
The desktop keyring must be unlocked before authentication can succeed.

## Requirements

- Proton Pass CLI. This setup was verified with version 2.4.2 (`ef5f645`).
- A GNOME desktop session with an available Secret Service provider.
- `secret-tool` from Ubuntu's `libsecret-tools` package for the skill's bootstrap helper.
- An Exa API key stored in a Proton Pass item accessible to the signed-in user.
- Pi's native MCP support and a trusted configuration checkout.

The [bundled skill](../skills/tooling/proton-pass/SKILL.md) covers secret references
and scoped agent credentials. Installing the skill does not install the CLI,
create tokens, or grant access to vaults.

## Configure persistent key storage

Create `~/.config/proton-pass/environment.sh` with mode 0600:

```sh
export PROTON_PASS_KEY_PROVIDER=keyring
export PROTON_PASS_LINUX_KEYRING=dbus
export PROTON_PASS_SESSION_DIR="$HOME/.local/share/proton-pass-cli/.session"
```

Source it from `~/.bashrc` and from authentication helpers:

```sh
. "$HOME/.config/proton-pass/environment.sh"
```

For future desktop processes, create
`~/.config/environment.d/60-proton-pass.conf`:

```text
PROTON_PASS_KEY_PROVIDER=keyring
PROTON_PASS_LINUX_KEYRING=dbus
PROTON_PASS_SESSION_DIR=${HOME}/.local/share/proton-pass-cli/.session
```

The explicit directory above preserves the existing authenticated session.
CLI 2.4.2 appends `.session` to `PROTON_PASS_SESSION_DIR`, so this account's
session metadata is under `~/.local/share/proton-pass-cli/.session/.session/`.
Do not move the files or change the directory after login without planning a
migration: the keyring credential is associated with the session location.
For a new installation, a base directory such as
`~/.local/share/proton-pass-cli` avoids the nested `.session` path. All consumers
must use the same setting: the login shell, Exa helper and SSH service.

These settings contain no secrets. They select key storage, not vault access.
Existing shells do not inherit changes retroactively; source the environment
file in the shell used for login.

Linux's default kernel keyring loses its encryption key at reboot. An enabled
service alone does not preserve CLI authentication. Do not silently switch to
`PROTON_PASS_KEY_PROVIDER=fs`: it stores the encryption key in plaintext beside
the encrypted session and requires an explicit security decision.

## Sign in without replacing another session

Source the environment file, then run `pass-cli info` without printing account
metadata:

```sh
pass-cli info >/dev/null
```

If no saved session exists, run `pass-cli login` and complete the browser flow.
If an existing session fails, inspect the error first. A locked keyring or a
network failure does not justify logging out. Do not force logout as a generic
recovery step.

This desktop integration uses the user's normal CLI session. It is not an
isolated, audited agent session: the CLI can access the user's granted vaults.
For unattended automation, obtain approval for a scoped agent token and set a
separate durable `PROTON_PASS_SESSION_DIR`. Do not overwrite the human session.

## Create the local Exa header helper

Store the helper at `~/.pi/local/exa-mcp-auth.sh` with mode 0700. Resolve only
one field through a `pass://` reference. Adapt the example vault, item and field
to the owner's existing item; no secret value belongs in this script.

```sh
#!/bin/sh
set -eu
. "$HOME/.config/proton-pass/environment.sh"
export PROTON_PASS_SESSION_DIR="$HOME/.local/share/proton-pass-cli/.session"
export PROTON_PASS_AGENT_REASON='Authenticate Exa MCP for this Pi session.'
export PASS_LOG_LEVEL=warn
cli="$HOME/.local/bin/pass-cli"
reference='pass://Machine Secrets/Exa/API Key'
if [ ! -x "$cli" ]; then
  echo "Proton Pass CLI is missing at $cli." >&2
  exit 1
fi
if ! key="$("$cli" item view "$reference")"; then
  echo 'Exa authentication failed. Check the CLI session and unlock GNOME Keyring.' >&2
  exit 1
fi
if [ -z "$key" ]; then
  echo 'The Exa API key field is empty.' >&2
  exit 1
fi
case "$key" in
  *"$(printf '\r')"*|*'
'*)
    echo 'The Exa API key contains a line break.' >&2
    exit 1 ;;
esac
printf 'Bearer %s\n' "$key"
```

The helper's stdout is a credential. Never run it directly in a recorded
terminal or capture its output in logs. Pi consumes it as an HTTP header.
Errors go to stderr and return a nonzero exit status.

## Preserve the configuration across sync

The installer generates `mcp.json`. Put the complete Exa server entry in the
ignored `mcp.local.json`; sync replaces each server entry as a whole.

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": {
        "Authorization": "!sh ~/.pi/local/exa-mcp-auth.sh"
      },
      "timeout": 300,
      "exposure": "codemode",
      "description": "Exa search and fetch, authenticated through Proton Pass and GNOME Keyring."
    }
  }
}
```

Keep this file local. Preserve unrelated personal server entries when editing
it. Regenerate configuration with `node scripts/sync.mjs --generate` when
needed; do not run upstream sync merely to change a local header.

## Use the same keyring for the SSH agent

If `proton-pass-ssh-agent.service` is already installed, create its local drop-in
at `~/.config/systemd/user/proton-pass-ssh-agent.service.d/keyring.conf`:

```ini
[Service]
Environment=PROTON_PASS_KEY_PROVIDER=keyring
Environment=PROTON_PASS_LINUX_KEYRING=dbus
Environment=PROTON_PASS_SESSION_DIR=%h/.local/share/proton-pass-cli/.session
```

Run `systemctl --user daemon-reload`. After CLI login succeeds, restart the
service. Do not change its vault scope or disable other SSH agents as part of
Exa setup. GNOME Keyring must be unlocked; user-service linger does not unlock
it or make this a before-login service.

## Verify without exposing the key

Run `pi mcp list`, then `/mcp reconnect exa` in an existing Pi session.
Request a web search through `mcp__exa__web_search_exa`.

The Ubuntu setup completed an authenticated search for official Proton Pass
CLI documentation. Exa returned three results, including the official
configuration page, in 2.6 seconds. This verifies authentication, connectivity
and search in that session. It does not verify every Exa tool or persistence
after another reboot.

After a reboot, unlock the desktop keyring and repeat the connection and search
checks. If Pi reports a header-command failure, check the helper's stderr and
CLI authentication. Do not print the header or the secret field to diagnose it.

## References

- [Proton Pass configuration](https://protonpass.github.io/pass-cli/get-started/configuration/)
- [Proton Pass SSH agent](https://protonpass.github.io/pass-cli/commands/ssh-agent/)
- [Official Exa MCP server](https://github.com/exa-labs/exa-mcp-server)
- [Upstream community skill](https://github.com/tohuw/proton-pass-skill)
