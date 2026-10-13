# Ubuntu and Pi integration

## Sources and current CLI

Upstream skill commit: `b7c5da50f528eb24929b3cc85379acb50cfc2044`.
This installation adds local Ubuntu/Pi updates. CLI 2.4.2 (`ef5f645`) matches
the latest GitHub release checked during installation.

- Configuration: <https://protonpass.github.io/pass-cli/get-started/configuration/>
- SSH agent: <https://protonpass.github.io/pass-cli/commands/ssh-agent/>
- Releases: <https://github.com/protonpass/pass-cli/releases>
- Skill: <https://github.com/tohuw/proton-pass-skill>

CLI help takes precedence over conflicting documentation examples.
CLI 2.4.2 accepts `login --pat`, not `--personal-access-token`.
Its SSH refresh interval defaults to 30 seconds, not one hour.
`test` and `completions` are absent from top-level command help.

## Isolate agent credentials

Use a separate, durable `PROTON_PASS_SESSION_DIR` with mode 0700 for token login.
Never log out the human session to recover an agent session.
Creating tokens, granting access, and bulk secret reads require owner approval.
This installation creates no tokens and changes no vault permissions.

## Reboot persistence

Linux defaults to the kernel keyring, whose encryption key is lost on reboot.
An enabled systemd service alone does not provide reboot persistence.

Recommended desktop settings:

```sh
export PROTON_PASS_KEY_PROVIDER=keyring
export PROTON_PASS_LINUX_KEYRING=dbus
```

GNOME Keyring must be unlocked before authentication. Start the agent after
desktop login. Changing providers may require a fresh login; do not assume
that the encryption key migrates. Ask before replacing the human session.

For unattended startup before login, Proton supports
`PROTON_PASS_KEY_PROVIDER=fs`. Warning: this stores the encryption key in
plaintext beside the encrypted session. Obtain approval for this weaker storage.
Never silently fall back from keyring to filesystem storage.
User-service startup before login also requires `loginctl enable-linger minipc`.
Linger does not unlock GNOME Keyring or preserve the kernel keyring.

## SSH service and clients

Use the same `PROTON_PASS_SESSION_DIR` in the login shell, Exa helper and SSH
service. CLI 2.4.2 appends `.session` to this directory. The existing account
uses `~/.local/share/proton-pass-cli/.session` as its base, so the authenticated
metadata is in `.session/.session`. Preserve the path until an intentional
migration; do not silently move encrypted files between keyring identities.


Service: `proton-pass-ssh-agent.service`.
Vault: `Personal`. Socket: `~/.ssh/proton-pass-agent.sock`.
GitHub SSH already selects that socket. Do not disable other agents globally
or change vault scope without approval.

For clients that use the environment:

```sh
export SSH_AUTH_SOCK="$HOME/.ssh/proton-pass-agent.sock"
```

Check without reading secrets:

```sh
systemctl --user is-enabled proton-pass-ssh-agent.service
systemctl --user is-active proton-pass-ssh-agent.service
SSH_AUTH_SOCK="$HOME/.ssh/proton-pass-agent.sock" ssh-add -l
```

Do not claim reboot verification until the user reboots and repeats these checks.

## Helper and optional tools

The shell bootstrap helper uses `secret-tool` from `libsecret-tools` on Ubuntu.
GNOME Keyring must be available and unlocked. Use absolute helper paths relative
to this skill. Never create or read a real token merely to check installation.

The PowerShell helper, deduplication tool, and Claude Code hooks are bundled
but not configured or verified for Ubuntu/Pi. Do not run deduplication without
separate approval for a live vault operation. Do not add bundled `bin/pass-cli`
to PATH: it contains an upstream machine-specific path.
Hooks cannot constrain callers of the real binary. Prefer least-privilege grants.

Reload Pi with `/reload` to discover `/skill:proton-pass`.
