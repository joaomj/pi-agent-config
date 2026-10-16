# Proton Pass skill for Pi

Read selected secrets from Proton Pass without exposing them in command
arguments, logs, or transcripts. Use scoped agent credentials for unattended
work rather than granting automation access to personal vaults.

This directory adapts [tohuw/proton-pass-skill](https://github.com/tohuw/proton-pass-skill),
commit `b7c5da50f528eb24929b3cc85379acb50cfc2044`. The upstream MIT license is
retained in [LICENSE](LICENSE). This community skill is not affiliated with Proton.

## Use in Pi

The skill is bundled at `skills/tooling/proton-pass`. Run `/reload` after updating
it, then use `/skill:proton-pass` when explicit invocation is useful.
Install [Proton Pass CLI](https://protonpass.github.io/pass-cli/get-started/installation/)
separately. This adaptation was checked against CLI 2.4.2.

Read [Ubuntu/Pi notes](references/ubuntu-pi.md) before changing key storage.

## Included resources

- [SKILL.md](SKILL.md): secret references, session isolation and access approval.
- [Command reference](references/commands.md): help captured from CLI 2.4.2.
- [Bootstrap reference](references/bootstrap.md): upstream credential-store design.
- `bin/proton-pass-agent.sh`: shell helper for owner-supplied scoped tokens.
- Upstream PowerShell, deduplication and Claude Code guard tools: bundled but
  not configured or verified for Ubuntu/Pi.

Resolve helper paths relative to this directory. Do not put its `bin` directory
on PATH: the upstream `pass-cli` wrappers contain machine-specific paths.
Do not activate the Claude Code hooks in Pi. They are not a security boundary.

## Shell helper behavior

The shell helper keeps token sessions in a separate durable directory with
mode 0700. It accepts tokens through a masked prompt and stores them in the OS
credential store. First login requires an explicit `connect --force`.

Ordinary `connect` checks an existing session. It reports failures rather than
logging out on every error. `get` checks the session before reading and does
not retry a failed read automatically. Identify authentication errors before
requesting a new login. Token creation and grant changes require owner approval.

GNOME Keyring must be available and unlocked on Ubuntu. The skill's optional
`self-check` exercises a fake credential, not a real vault secret. Those checks,
PowerShell behavior, deduplication and hook installation were not part of the
verified Exa setup. Upstream historical references may describe older helper
behavior; this README and Ubuntu/Pi notes describe the local adaptation.
