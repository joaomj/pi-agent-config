# SSH keys at runtime

How Proton Pass serves SSH keys, how ssh and git reach them, and what each
failure message means. The private key stays encrypted in the vault; the agent
holds it in memory and signs on request.

Verified against CLI 2.5.1 and the SSH agent documentation at
<https://protonpass.github.io/pass-cli/commands/ssh-agent/>. Both modes are also
documented by `pass-cli ssh-agent --help`.

## Pick one mode

| Mode | Command | Use when |
|---|---|---|
| **Native agent** | `pass-cli ssh-agent start --socket-path PATH` | You want an agent socket dedicated to Proton Pass. Keys are read from the vault on start and refreshed on a timer. |
| **Load into an existing agent** | `pass-cli ssh-agent load` | A desktop session, container, or CI job already has an agent, and adding one more socket is impractical. |

Do not run both against the same client configuration, and do not run
`ssh-agent start` twice on one socket path.

`load` copies keys into whatever `$SSH_AUTH_SOCK` already points at. That agent
may serve other keys and is not scoped to Proton Pass, so anything that can
reach the socket can ask it to sign. Prefer the native agent when the choice
exists.

## Native agent

```bash
pass-cli ssh-agent start
```

- Default socket: `$HOME/.ssh/proton-pass-agent.sock`. Use `--socket-path` to
  change it. A runtime directory (`$XDG_RUNTIME_DIR/...`) is a better location
  than the home directory: it is private to the user and disappears at logout.
- `--vault-name NAME` or `--share-id ID` restricts which vault supplies keys.
  Without a filter, every vault the session can read is scanned.
- `--refresh-interval SECONDS` sets how often the agent rescans for keys. Help
  reports a default of 30 seconds; older documentation says one hour. Confirm
  with `--help` on the installed version.
- `--create-new-identities VAULT` makes `ssh-add` create new SSH key items in
  that vault. That is a **write to the vault**: use it only with approval.
- The agent prints the `SSH_AUTH_SOCK` line to use. It does not modify the
  shell environment.

As a background daemon, without a service manager:

```bash
pass-cli ssh-agent daemon start --socket-path "$HOME/.ssh/proton-pass-agent.sock"
pass-cli ssh-agent daemon status
pass-cli ssh-agent daemon stop
```

The daemon writes a PID file at `~/.ssh/proton-pass-agent.pid` unless
`--pid-file` says otherwise, and discards its output unless you pass
`--log-file`.

### Start it at login with systemd

Proton's documentation ships an example unit. The integration installed on this
laptop adds two things a bare unit lacks: it waits for the desktop keyring to
unlock, and it waits for the Proton API to answer before listing vault keys.
Without that second wait, a login where DNS is not ready yet kills the agent and
systemd stops retrying.

```ini
[Unit]
Description=Proton Pass SSH agent
After=graphical-session-pre.target
PartOf=graphical-session.target

[Service]
ExecStart=%h/.local/bin/pass-cli ssh-agent start --socket-path %t/proton-pass-ssh-agent/agent.sock
RuntimeDirectory=proton-pass-ssh-agent
RuntimeDirectoryMode=0700
Restart=on-failure
RestartSec=15

[Install]
WantedBy=graphical-session.target
```

`%t` is the user runtime directory. Keep `RuntimeDirectoryMode=0700`: the socket
inside it is a signing oracle for every key the vault holds.

## Put clients on the socket

Any tool that reads `SSH_AUTH_SOCK`:

```bash
export SSH_AUTH_SOCK="$XDG_RUNTIME_DIR/proton-pass-ssh-agent/agent.sock"
```

Per host, in `~/.ssh/config`, so other hosts keep their own settings:

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityAgent /run/user/1000/proton-pass-ssh-agent/agent.sock
    IdentityFile ~/.ssh/github.pub
    IdentitiesOnly yes
```

`IdentityAgent` points ssh at the socket. The socket path must be absolute:
`~` is not expanded there.

### The selector file

`IdentityFile` names a **public key**, not a private key. `ssh` reads it to learn
which key the agent should offer, and `IdentitiesOnly yes` limits the offer to
that key. Everything else in the agent stays unused, which matters because every
offered key counts as an authentication attempt on the server.

```bash
ssh-add -l                                  # fingerprints and comments
ssh-add -L | grep '<key-comment>' > ~/.ssh/github.pub
chmod 600 ~/.ssh/github.pub
```

Set the mode explicitly. At `0644` ssh refuses the file, prints
`WARNING: UNPROTECTED PRIVATE KEY FILE!`, and the connection fails with
`Permission denied (publickey)` — a message that points at the server, not at
the real cause.

Register the same public key with GitHub. An account key covers every repository
the account can reach; a repository deploy key covers one repository.

## Commit signing

```bash
git config --global gpg.format ssh
git config --global user.signingkey "$HOME/.ssh/github.pub"
git config --global gpg.ssh.program "$HOME/.local/libexec/proton-pass-ssh-agent/proton-pass-sign.sh"
git config --global commit.gpgsign true
```

The wrapper script sets `SSH_AUTH_SOCK` to the Proton socket before it runs
`ssh-keygen -Y sign`, so signing works from a terminal whose own agent is
something else. Register the public key as a **signing** key on GitHub;
authentication and signing registrations are separate.

To verify signatures locally, build an allowed-signers file from the same key and
set `gpg.ssh.allowedSignersFile`.

## Verify

```bash
SSH_AUTH_SOCK=<socket> ssh-add -l             # one line per served key
ssh -o BatchMode=yes -T git@github.com        # greeting names the account
git ls-remote git@github.com:OWNER/REPO.git   # proves repository access
printf 'test\n' | ssh-keygen -Y sign -f ~/.ssh/github.pub -n git  # proves signing
```

GitHub exits 1 after a successful `ssh -T` because it provides no shell. Read the
greeting, not the exit code.

## Diagnose

**`Error connecting to agent: No such file or directory`.** The socket does not
exist, so nothing is listening. Check the service, not ssh:

```bash
systemctl --user status proton-pass-ssh-agent.service
journalctl --user -u proton-pass-ssh-agent.service -n 30 --no-pager
```

A dead service is the usual cause of a sudden `Permission denied (publickey)` on
a machine that worked earlier. The journal names the reason: locked keyring,
unresolvable API host, expired session, or exhausted restart limit.

**The agent runs but serves no keys.** Either the vault holds no SSH key items,
the `--vault-name` filter points elsewhere, or the session expired.
`pass-cli ssh-agent debug [--vault-name X] [--output json]` reports each key item
and why it is or is not usable. That output names items and reasons, not private
material, so it is safe to read.

**The wrong key is offered, or too many are.** Set `IdentityFile` and
`IdentitiesOnly yes` for that host. Without a selector, ssh offers every key in
the vault, and servers with an attempt limit refuse the login before a working
key is reached.

**`ssh-copy-id` never prompts for a password.** Same cause. Force password
authentication for that one call:

```bash
ssh-copy-id -o PreferredAuthentications=password -o PubkeyAuthentication=no user@host
```

**Identities removed with `ssh-add -D` come back.** The native agent rescans the
vault on its refresh interval and reloads what it finds. Control which keys are
offered with the `--vault-name` filter and per-host selectors, or switch to
`ssh-agent load` and manage the keys in the system agent.

**An imported key asks for a passphrase.** Store the passphrase as a hidden
custom field on the SSH key item, named `Password` or `Passphrase`. The CLI
falls back to trying every hidden field when the name differs.

**Keys stay locked.** The agent unlocks items through the desktop keyring. An
unlocked keyring is a precondition; `proton_pass_agent.py` on this machine waits
for it and exits with status 78 if it never unlocks.
