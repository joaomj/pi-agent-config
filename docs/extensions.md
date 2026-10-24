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

[`pi-background-run`](https://www.npmjs.com/package/pi-background-run) runs a command
detached with `bgrun` and wakes the session when it finishes, so the agent reads a
short digest instead of a long log. It provides `bgrun`, `bgstatus`, `bgtail`,
`bggrep`, `bgkill`, and `bgclean`, and ships the `run-bg` and `digest-config` skills:

```bash
pi install npm:pi-background-run
```

The extension makes backgrounding explicit: `bash` commands run in the foreground
unless you start them with `bgrun`. Without it, hosts that support it fall back to
moving long commands to the background themselves, with no completion wake-up.

The jobs directory lives under the project (`.pi-bgrun/jobs`), so logs survive a
restart. Ignore that directory in version control.

#### Enforce bgrun with the guard

The `bgrun` instructions only ask the agent to use `bgrun`; they cannot stop a long
`bash` call. This package adds [`bgrun-guard`](../extensions/bgrun-guard.ts), which
blocks such a call before it runs and returns a message that tells the agent to
start the same command with `bgrun`. The agent then retries on its next step.

The guard blocks these commands, also inside `cd dir &&`, pipes, environment
assignments, and wrappers such as `uv run`, `npx`, `time`, and `timeout`:

- Full test runs: `pytest`, `go test ./...`, `npm test`, `cargo test`, `jest`,
  `vitest`, `tox`.
- Builds and checks: `make` with no target or with `test`, `build`, `check`,
  `lint`, `all`, `ci`, `install`, or `e2e`; `npm run build`, `cargo build`, `tsc`,
  `mvn`, `gradle`.
- Dependency installs: `npm install`, `pip install`, `uv sync`, `brew install`.
- Container builds and foreground `docker compose up`.
- `terraform plan`, `apply`, and `destroy`, and `ansible-playbook`.
- Development servers, such as `npm run dev` and `uvicorn`.
- `sleep` for 30 seconds or more.

The guard lets these through:

- Focused test runs: a single test file, a `::` test id, `-k`, `-run`, `-t`, or a
  single Go package.
- `--help` and `--version`.
- `docker compose up -d`.
- Commands that only mention a name, such as `echo make test`.

The guard does nothing when the `bgrun` tool is not registered, so it never
sends the agent to a tool that is missing. Commands that are not on the list
still run in `bash`. For those, the written instructions remain the only control.
To change the list, edit `RULES` in `extensions/bgrun-guard.ts` and restart Pi.

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

It reads the login that Claude Code owns: `~/.claude/.credentials.json`, or the
macOS login keychain item `Claude Code-credentials`. The Claude DirectSDK transport
uses the same login. Packages that read Pi's `anthropic` OAuth login report no
Claude usage while DirectSDK is the active provider.

### Browser automation

[`pi-browser-use`](https://pi.dev/packages/pi-browser-use) provides the `browser_*`
tools on a managed headless browser:

```bash
pi install npm:pi-browser-use
```

It requires Node.js 24 or later and a Chrome or Chromium binary. Any Chromium-based
browser works through the `pi-browser-use.executablePath` setting or the `CHROME_PATH`
environment variable. When Node is missing, `install.sh` offers an official Node
build. It never downloads a browser, because Google publishes no checksums for
one: when no browser is found, the step prints what to install and skips the
package, so it never installs into a startup failure.

On Linux the home-directory Chrome cannot keep the setuid sandbox helper, and
Ubuntu 24.04 and later also restrict unprivileged user namespaces. There the
installer adds `"chromeArgs": ["--no-sandbox"]`, which lets the browser start at
the cost of Chrome's own renderer sandbox. A system Chrome with a working sandbox
is the stronger choice when you have one.

## Evaluated and not installed

These were reviewed and deliberately left out. Reasons are recorded so the
evaluation is not repeated without new evidence:

- `@narumitw/pi-usage`: provider quota dashboard. Left out: version 0.68.1 has no
  Anthropic provider. Other packages with Anthropic support (`@sreetej510/pi-usage`,
  `@llblab/pi-claude-usage`, `@hk_net/pi-usage-bars`) read Pi's `anthropic` OAuth
  login. The Claude DirectSDK transport uses the Claude Code login instead, so
  those packages report no Claude usage in this setup. `@j3pf/piquota` reads the
  Claude Code credentials file but not the macOS keychain item that holds the login
  here.
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

`pi-claude-usage` lives in the
[`joaomj/pi-extensions`](https://github.com/joaomj/pi-extensions) monorepo and
publishes to npm from it (pnpm workspaces plus changesets). Pi installs it from npm;
there are no git-subdirectory installs to maintain.

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
