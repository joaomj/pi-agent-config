# Extensions in use

This catalog records packages configured in the maintainer's local Pi settings.
It is a reference, not an automatically installed bundle or a guarantee of identical
behavior. `install.sh` offers these installations one at a time.
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
Recommended guardrails from experience: deny `git -c user*`, `git -c *gpgsign*`,
and `git -c gpg*`, plus `GIT_AUTHOR_*` / `GIT_COMMITTER_*` / `GIT_CONFIG_*`
environment overrides, so no agent session can commit under a foreign identity
or unsigned. Deny agent access to the policy file itself; edit it in your own
editor. Known gap: `git commit` invocations (including `--no-gpg-sign` and
`--author`) do not match any bash-pattern gate in the permission extension, so
flag-level commit overrides cannot be blocked at that layer today; the global
`commit.gpgsign` default plus the `-c` denials above are the working backstop.

```bash
pi install npm:@gotgenes/pi-permission-system
```

### Durable background commands

[Background bash](https://github.com/joaomj/pi-extensions/tree/main/extensions/background-bash)
lets commands continue in the background and exposes job inspection and cancellation:

```bash
pi install npm:@joaomj/pi-background-bash
```

The former standalone package branch no longer exists. Setups still pointing at it
keep working from their local copy but cannot update; switch them to the npm package.

### Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) is an optional provider extension.
`install.sh --only claude` checks the qualified CLI range and offers the pinned
CLI install. It runs the CLI login and installs the package only when a qualified
CLI is present; otherwise it prints the install command and stops. Read its current
requirements for Claude Code, authentication, and account access first.
Installing the package alone does not configure or authenticate a provider.
It intentionally stays a standalone repository (stars, issues, and tag-driven
releases) and is not part of the monorepo below.

```bash
pi install git:github.com/joaomj/pi-claude-directsdk
```

The installer uses the npm source, `npm:pi-claude-directsdk`. Keep one source
only; remove the other with `pi remove` before switching.

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
`install.sh` writes it for you after the install.

### Context usage map

[`pi-context-view`](https://pi.dev/packages/pi-context-view) visualizes what fills
the context and inspects hidden parts (system prompt, tool definitions, extension
injections). On-demand commands only; it adds nothing to the model context.

```bash
pi install npm:pi-context-view
```

### Claude usage footer

[Claude usage](https://github.com/joaomj/pi-extensions/tree/main/extensions/claude-usage)
shows remaining Claude subscription quota (5-hour and weekly windows) in the footer,
with a `/claude-account` picker when several Claude logins exist on the machine:

```bash
pi install npm:@joaomj/pi-claude-usage
```

### Browser automation

[`pi-browser-use`](https://pi.dev/packages/pi-browser-use) provides the `browser_*`
tools on a managed headless browser:

```bash
pi install npm:pi-browser-use
```

It requires Node.js 24 or later and a Chrome or Chromium binary. Any Chromium-based
browser works through the `pi-browser-use.executablePath` setting or the `CHROME_PATH`
environment variable. When either requirement is missing, `install.sh` offers to
download the official Node build and Chrome for Testing and then sets
`executablePath`, so the package never installs into a startup failure.

## Evaluated and not installed

These were reviewed and deliberately left out. Reasons are recorded so the
evaluation is not repeated without new evidence:

- `@narumitw/pi-usage`: provider quota dashboard. Removed after review: its closed
  adapter list has no Anthropic provider, and Pi never holds the Claude OAuth
  credential it would need, so it cannot track a Claude subscription.
- `@open-plan-annotator/pi-extension`: visual plan annotation in the browser.
  Skipped: high interaction friction for a step the local plan workflow already covers.
- `pi-powerline-footer`: powerline status bar and editor chrome. Skipped: heaviest
  render and input overhead of the reviewed set, mostly cosmetic, and it competes
  for the same footer space as the task list and usage segments above.

## Local-only helpers

The maintainer also uses these individual extension files. They are not distributed
by this repository and have no separate installation command:

- `exit.ts`: adds `/exit` as a shutdown alias.
- `plan-file-guard.ts`: blocks detected Git commits that include temporary `PLAN-*.md` files.
- `startup-time.ts`: shows an approximate startup duration in the TUI status area (currently disabled by renaming it to `startup-time.ts.disabled`; rename it back to re-enable).
- `ask-user-defaults.ts`: defaults interactive questions to inline display.

The packages above do not install these helpers. An exact reproduction of the
maintainer's setup requires separately implementing or sourcing equivalent behavior.

## Maintaining the maintainer's extensions

`pi-background-bash` and `pi-claude-usage` live in one monorepo,
[`joaomj/pi-extensions`](https://github.com/joaomj/pi-extensions), and publish
independently to npm from it (pnpm workspaces plus changesets). Pi installs them
from npm; there are no git-subdirectory installs to maintain.

Releases are automated: push a changeset, merge the `chore: release` PR, and the
Release workflow publishes through npm trusted publishing (GitHub OIDC, no
tokens). Bootstrapping a new package still needs one manual first publish,
because npm can only attach a trusted publisher to a package that already
exists:

```bash
pnpm --filter <package> publish --access public --no-git-checks
```

then attach the repository as trusted publisher on the package's npm settings page.

## Check your setup

Use `pi list` to inspect your package declarations. Restart Pi after installing extensions.
Choose your own versions and review upstream changes before updating.
Shared prompts and instructions can refer to optional tools; adapt them when you omit a package.
