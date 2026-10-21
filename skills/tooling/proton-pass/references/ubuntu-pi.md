# This laptop

Concrete paths and services for the Ubuntu desktop account `marcos`, so a read or
an SSH connection can be diagnosed without rediscovering the setup. Everything
here was checked against CLI 2.5.1 on 2026-10-21.

## Installed pieces

| Piece | Location |
|---|---|
| CLI | `~/.local/bin/pass-cli`, stable track |
| Session data | `~/.local/share/proton-pass-cli/.session/`, mode 0700 |
| Agent start-up script | `~/.local/libexec/proton-pass-ssh-agent/proton_pass_agent.py` |
| Agent signing wrapper | `~/.local/libexec/proton-pass-ssh-agent/proton-pass-sign.sh` |
| Shell hook | `~/.local/libexec/proton-pass-ssh-agent/proton-pass-init.sh`, sourced from `.profile` and `.bashrc` |
| SSH agent unit | `~/.config/systemd/user/proton-pass-ssh-agent.service` |
| Host block | `~/.ssh/proton-pass-github.conf`, included from `~/.ssh/config` |
| Key selector | `~/.ssh/vivobook-personal-github.pub`, mode 0600 |
| Allowed signers | `~/.config/git/allowed_signers` |

The unit, the start-up script, and the shell hook are installed by
`scripts/install-proton-pass` in `joaomj/computer-cleanup-services`. Change them
there and rerun the installer; editing only the copies under
`~/.local/libexec` lasts until the next install.

## Shell environment

The hook exports three values into interactive shells:

```bash
PROTON_PASS_KEY_PROVIDER=keyring
PROTON_PASS_LINUX_KEYRING=dbus
SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/proton-pass-ssh-agent/agent.sock"
```

The keyring backend stores the session-encryption key in the GNOME keyring over
D-Bus, so the session survives a reboot without a plaintext key on disk. Do not
switch to the `fs` backend or move session files between keyring identities
without approval: the encryption key does not follow them.

## SSH agent service

`proton-pass-ssh-agent.service` runs at graphical login and:

1. waits up to 120 s for the default Secret Service collection to unlock, then
2. waits up to 120 s for `pass-api.proton.me:443` to answer, then
3. replaces itself with
   `pass-cli ssh-agent start --socket-path $XDG_RUNTIME_DIR/proton-pass-ssh-agent/agent.sock`.

It exits with status 78 when either wait expires, which systemd does not retry.
Other failures retry every 15 s, up to three times in five minutes. On this
laptop, a login with no network can therefore leave the agent stopped: reconnect
and restart the service.

The socket directory is a runtime directory with mode 0700, so it disappears at
logout and cannot be reached by another user.

## Verify

```bash
pass-cli info
systemctl --user is-active proton-pass-ssh-agent.service
SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/proton-pass-ssh-agent/agent.sock" ssh-add -l
ssh -o BatchMode=yes -T git@github.com
```

`ssh -T` must greet the account `joaomj`. The selector in
`~/.ssh/proton-pass-github.conf` offers only the `vivobook-personal-github` key,
so a different greeting means the host block is being skipped or the selector
does not match the key in the vault.

## Recover

```bash
systemctl --user reset-failed proton-pass-ssh-agent.service
systemctl --user restart proton-pass-ssh-agent.service
journalctl --user -u proton-pass-ssh-agent.service -n 30 --no-pager
```

Read the journal lines before acting. `Waiting for desktop keyring` means the
GNOME keyring is locked, not that Proton Pass is broken. `Proton API is
unreachable` means the network, not the session. An authentication error means a
login, and the account session belongs to the user: ask before touching it.

Do not run `pass-cli ssh-agent daemon start` alongside this service. Two agents
serving the same vault produce confusing `ssh-add` results.

## Tokens and remote machines

This laptop has no agent token, no separate `PROTON_PASS_SESSION_DIR`, and no
vault grants created for automation. Creating a token, widening a grant, or
pointing another machine at this vault all need owner approval first.

## Other machines

Earlier versions of this file described a Pi host. None of it was rechecked
during this revision, so treat these notes as unverified: that host used
`~/.ssh/proton-pass-agent.sock` and `~/.ssh/proton-pass-agent.pid`, a `Personal`
vault, and an Exa helper that read a token through `secret-tool` from
`libsecret-tools`. Starting a user service before login there also needed
`loginctl enable-linger`, which does not unlock the GNOME keyring.

Do not claim the service survives a reboot until the machine has rebooted and the
verify commands above have been repeated.
