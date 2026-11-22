# Extensions in use

This catalog describes the third-party packages that this package bundles and
the opt-in add-ons. [Install and upgrade](install.md) has the install steps. Review a
package's source before you install it: extensions run code with your local
permissions. Provider settings, MCP connections, and credentials are not shared.

## Bundled packages

`pi install git:github.com/joaomj/pi-agent-config@<tag>` installs these
packages as npm dependencies at the versions pinned in
[package.json](../package.json). Do not install them separately: two copies of
one extension register the same tool, and Pi then does not start. Turn one off
with a package filter, as [Turn off one part](install.md#turn-off-one-part) shows.

### Indexed file search

[`@ff-labs/pi-fff`](https://www.npmjs.com/package/@ff-labs/pi-fff) 0.11.0
provides `fffind` and `ffgrep`.

### Background commands

[`pi-bg-bash`](https://pi.dev/packages/pi-bg-bash) 0.4.1 replaces the `bash`
tool. A command that runs longer than the limit moves to the background as a
task, and a message wakes the session when it ends. It also adds
`background: true` and `waitFor` to `bash`, the `bash_output`, `bash_tasks`,
and `bash_kill` tools, the `/bg` command, and the `ctrl+shift+b` shortcut.

This package adds [`bg-bash-timer`](../extensions/bg-bash-timer.ts), which sets
the limit to 20 seconds instead of 120 and applies it also to calls that set
`timeout`. Change it with `PI_BG_BASH_PROMOTE_MS` (milliseconds) or
`/bgtimer <seconds>`. See [Background commands](background-commands.md).

Task logs live under `$XDG_STATE_HOME/pi-bg/`, outside the project.

### Permission checks

[`@gotgenes/pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system)
41.0.0 asks or denies before tool calls, MCP calls from `codemode` included.
It reads its policy from `~/.pi/agent/extensions/pi-permission-system/config.json`.

This package ships the policy in
[permissions/pi-permission-system.json](../permissions/pi-permission-system.json),
and [`permission-policy`](../extensions/permission-policy.ts) writes
`config.json` from it at every start, so an update brings the new rules. The
shipped policy:

- denies reads of credentials and `.env` files, and commands that print
  secrets;
- asks before pushes, merges, rebases, resets, deletes, installs, PR and issue
  writes, and cloud changes, also when a git option such as `-C <dir>` comes
  before the subcommand;
- asks before Atlassian writes (Jira, Confluence, Bitbucket) and Slack writes;
  their reads run without a prompt;
- lets local commits run without a prompt, except a commit of a `PLAN-*.md`
  file, which it denies.

Your own rules go in `local.json`, next to `config.json`. A rule there replaces
the shipped rule of the same pattern, and a new pattern goes last, so it wins
over the shipped catch-alls. You can also edit `config.json` directly: at the
next start, `permission-policy` moves your changes into `local.json` and keeps
the previous file as `config.json.bak`. On an account that already had a
policy, the first start moves its own rules into `local.json` the same way. A
shipped rule that you delete comes back; to turn one off, give its pattern
another action in `local.json`. `scripts/check-permission-policy.sh` tests
these cases.

Atlassian rules cover every tool of an MCP server whose name contains
"atlassian", except reads (`get*`, `list*`, `search*`, `lookup*`,
`download*`, `fetch`, `atlassianUserInfo`). Under another server name, only
tools with Jira, Confluence, or Bitbucket in their names ask.

Known gap: an option between `git commit` and its message, such as `--author`
or `--no-gpg-sign`, is not matched by any rule. The global `commit.gpgsign`
default is the backstop.

### Subagents

[`pi-subagents`](https://www.npmjs.com/package/pi-subagents) 0.89.2 adds the
`subagent` tool, which runs child agent sessions, and its usage skill. The
pstack commands `/how`, `/arena`, `/interrogate`, and `/swarm` use it, and the
package's read-only [`scout`](../agents/scout.md) replaces its built-in agent
of that name. A background child loads your extensions, so the permission
checks also apply in a writing child, and the child forwards an `ask` to your
interactive session. In print mode (`pi -p`) nothing serves the request, so it
is denied. The package does not load its prompt templates or its
`council-mode` skill.

### Claude usage footer

[Claude usage](https://github.com/joaomj/pi-extensions/tree/main/extensions/claude-usage)
0.2.0 shows remaining Claude subscription quota (5-hour and weekly windows) in
the footer, with a `/claude-account` picker when several Claude logins exist on
the machine.

It reads the login that Claude Code owns: `~/.claude/.credentials.json`, or the
macOS login keychain item `Claude Code-credentials`. The Claude DirectSDK transport
uses the same login. Packages that read Pi's `anthropic` OAuth login report no
Claude usage while DirectSDK is the active provider.

### User browser

[`pi-chrome-cdp`](https://github.com/pasky/chrome-cdp-skill) 1.1.0 provides
`cdp.mjs`, a Chrome DevTools Protocol client with no dependencies. The package
does not load its own skill. The
[`user-browser`](../skills/tooling/user-browser/SKILL.md) skill runs it
through `scripts/cdp`, which picks the browser, and adds the rules for using
the user's accounts, the desktop sharing script `cdp-share`, and a throwaway
headless browser. It needs Node.js 22 or later and a Chromium-based browser
with remote debugging turned on. It adds no tools, so it costs nothing until a
task loads the skill.

### Undo and redo

[`@ahm3tj4f/pi-undo`](https://github.com/ahm3tj4f/pi-undo) rolls back the last
agent run: the conversation and the files that the run changed. It provides
`/undo`, `/redo`, and `/diff`. `/diff` shows what `/undo` would restore.

It requires Git 2.31 or later. It takes a snapshot of the working folder when a
run starts and another when it ends. It stores the snapshots in a separate Git
repository under `~/.pi/agent/pi-undo/snapshots`, one per working folder. Your
own branches, stash, and index stay unchanged. Because the snapshot covers the
whole folder, `/undo` also restores changes from a `bash` command, a formatter,
or an extension that runs Git itself, for example `git clean`. `/undo` changes
only the files that the run changed. Before it overwrites a file that you edited
after the run, it shows the file and asks for confirmation.

Storage grows with the changed content, not with the size of the repository,
because Git stores an unchanged file only once. The package limits growth as
follows:

- It skips dependency, build, and cache directories (`node_modules`, `dist`,
  `.venv`, and about 50 more).
- It skips new files larger than 2 MB.
- It skips a snapshot that adds more than `maxFiles` files.
- It deletes snapshots older than `retentionDays`. A daily Git garbage
  collection then removes their data after a 7-day grace period.

Garbage collection runs only when Pi starts in that folder, so the store of a
folder that you no longer use stays on disk. Check the total size with
`du -sh ~/.pi/agent/pi-undo`.

The package also takes snapshots of files that `.gitignore` ignores, `.env`
included. Add your secret patterns to `excludeDirectories` so that no secret is
copied into the store. The cost is that `/undo` cannot restore an agent change
to those files. The maintainer uses a 14-day retention and these additions to the
default list in `~/.pi/agent/pi-undo.json`:

```json
{
  "retentionDays": 14,
  "excludeDirectories": [
    "...the defaults...",
    ".env", ".env.*", "*.pem", "*.key", "*.p12", "*.pfx",
    "id_rsa*", "id_ed25519*", "id_ecdsa*", ".ssh/", "secrets/", ".secrets/"
  ]
}
```

The file is the full configuration: an entry that you remove from
`excludeDirectories` is included again. Start from the file that the package
writes on its first run, or copy the default list from its `src/config.ts`.

`/undo` restores the folder after a run. It does not prevent damage during the
run, and it does not protect files outside the working folder. Two Pi sessions
in the same folder share one store.

## Opt-in add-ons

These need a decision or software from the user, so the package does not bundle
them. [Add-ons](add-ons.md) has the install steps.

### Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) is an
optional provider extension. It needs a paid Claude plan, a Claude Code CLI in
the qualified range (`>=2.1.263 <2.2.0`), and a Claude Code login. Installing
the package alone does not configure or authenticate a provider. It stays a
standalone repository (stars, issues, and tag-driven releases) and is not part
of the monorepo below.

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
Review upstream changes before you move a pinned version.
Shared prompts and instructions can refer to optional tools; adapt them when you omit a package.
