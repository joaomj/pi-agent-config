# Proton Pass skill for Pi

Use `pass-cli` to move credentials from Proton Pass into the process that needs
them without printing the value, pasting it into a command, or asking the
operator for a copy.

This is a prompt-only skill. It ships no executables, hooks, or machine-specific
paths. It was verified against pass-cli 2.5.0 and the official documentation.

## Use in Pi

The skill is bundled at `skills/tooling/proton-pass`. Run `/reload` after
updating it, then use `/skill:proton-pass` when explicit invocation is useful.
Install the [Proton Pass CLI](https://protonpass.github.io/pass-cli/get-started/installation/)
separately and confirm it with `pass-cli --version`.

The skill targets the operator's own `pass-cli` installation. It does not
install the CLI, create tokens, or grant access to vaults.

## What it covers

- Check the CLI and the current session before reading.
- Discover vaults, shares, items, and fields with metadata-only commands.
- Build `pass://vault/item/field` references, including sections and TOTP.
- Use `run` and `inject` so the secret reaches the consumer without entering
  the conversation. `run` masks values in child output by default.
- Read a single field only when the agent itself must hold the value.
- Write, move, trash, and delete items with the operator's approval.
- Use scoped agent tokens, isolated session directories, and `agent monitor`.
- Diagnose authentication, lock, keyring, and network failures.

Out of scope: SSH agent setup, vault deduplication, bulk export, and Claude Code
hook integration.

## Files

- [SKILL.md](SKILL.md): the agent instructions.
- [Command reference](references/commands.md): options captured from CLI 2.5.0.
- [Troubleshooting](references/troubleshooting.md): error messages and recovery.

## Sources

- [Official documentation](https://protonpass.github.io/pass-cli/)
- [Official source](https://github.com/protonpass/pass-cli)
- CLI 2.5.0 `--help` output, and source at tag `2.5.0` for behavior the
  documentation contradicts

Where the documentation and the installed CLI disagree, the CLI wins. The known
differences are listed in `SKILL.md`.

## License

The skill was originally adapted from
[tohuw/proton-pass-skill](https://github.com/tohuw/proton-pass-skill), whose MIT
license is retained in [LICENSE](LICENSE). It is not affiliated with Proton.
