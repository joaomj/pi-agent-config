# Extensions in use

This catalog records packages configured in the maintainer's local Pi settings.
It is a reference, not an automatically installed bundle or a guarantee of identical behavior.
Provider settings, MCP connections, credentials, and permission policies are not shared.

## Installable packages

Install only the packages you want, one at a time. Review their source and requirements first.
Run these commands under the account that runs Pi:

### Indexed file search

[`@ff-labs/pi-fff`](https://www.npmjs.com/package/@ff-labs/pi-fff) provides `fffind` and `ffgrep`.

```bash
pi install npm:@ff-labs/pi-fff
```

### Permission checks

[`@gotgenes/pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system) provides tool permission checks.
Configure your own access rules; the maintainer's policy is not included.

```bash
pi install npm:@gotgenes/pi-permission-system
```

### Durable background commands

[Background bash](https://github.com/joaomj/pi-extensions/tree/package/background-bash)
lets commands continue in the background and exposes job inspection and cancellation.
Use the package branch, not the repository's default branch:

```bash
pi install git:github.com/joaomj/pi-extensions@package/background-bash
```

### Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) is an optional provider extension.
Read its current requirements for Claude Code, authentication, and account access before installing.
Installing the package alone does not configure or authenticate a provider.

```bash
pi install git:github.com/joaomj/pi-claude-directsdk
```

### Interactive questions

[`pi-ask-user`](https://www.npmjs.com/package/pi-ask-user) provides interactive questions.
The current local declaration pins version `0.16.0` and disables its bundled skills:

```bash
pi install npm:pi-ask-user@0.16.0
```

To match that resource selection, use this entry in your own `settings.json` package list:

```json
{
  "source": "npm:pi-ask-user@0.16.0",
  "skills": []
}
```

This entry replaces the package's string declaration; do not add a duplicate.

## Local-only helpers

The maintainer also uses these individual extension files. They are not distributed
by this repository and have no separate installation command:

- `exit.ts`: adds `/exit` as a shutdown alias.
- `plan-file-guard.ts`: blocks detected Git commits that include temporary `PLAN-*.md` files.
- `startup-time.ts`: shows an approximate startup duration in the TUI status area.
- `ask-user-defaults.ts`: defaults interactive questions to inline display.

The packages above do not install these helpers. An exact reproduction of the
maintainer's setup requires separately implementing or sourcing equivalent behavior.

## Check your setup

Use `pi list` to inspect your package declarations. Restart Pi after installing extensions.
Choose your own versions and review upstream changes before updating.
Shared prompts and instructions can refer to optional tools; adapt them when you omit a package.
