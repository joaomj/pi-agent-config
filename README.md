# pi-agent-config

My rules, prompt templates, skills, and extensions for the
[Pi coding agent](https://pi.dev), installed as one Pi package.

## How it makes the agent work

- **Shared rules in every session.** [AGENTS.md](AGENTS.md) tells the agent to
  verify before it claims, fix root causes, make the smallest change, and ask
  only questions that only you can answer. The `shared-rules` extension adds
  the rules to the system prompt, so none of your files change.
- **No stuck terminal.** [`bg-bash-timer`](extensions/bg-bash-timer.ts) moves a
  `bash` command to the background after 20 s, and
  [`pi-bg-bash`](https://pi.dev/packages/pi-bg-bash) reports when it ends. The
  agent keeps working instead of waiting.
- **No loops.** [`loop-breaker`](extensions/loop-breaker.ts) adds a note when the
  same check fails again after a fix, or when an identical call repeats. The
  note asks the agent to test its premise before a third try.
- **Questions with choices.** [`pi-ask-user`](https://www.npmjs.com/package/pi-ask-user)
  asks you one focused question with options and a recommended answer.
- **Fast search and undo.** [`@ff-labs/pi-fff`](https://www.npmjs.com/package/@ff-labs/pi-fff)
  adds indexed file and content search.
  [`@ahm3tj4f/pi-undo`](https://github.com/ahm3tj4f/pi-undo) adds `/undo`,
  `/redo`, and `/diff` for the last agent run.
- **Visibility.** [`pi-context-view`](https://pi.dev/packages/pi-context-view)
  shows what fills the context window, and
  [`@joaomj/pi-claude-usage`](https://www.npmjs.com/package/@joaomj/pi-claude-usage)
  shows the Claude subscription quota in the footer.
- **Your own browser.** The [`user-browser`](skills/tooling/user-browser/SKILL.md)
  skill lets the agent read and operate your Chrome or Brave, with your tabs
  and logins, through the bundled
  [`pi-chrome-cdp`](https://github.com/pasky/chrome-cdp-skill). When the agent
  runs on a headless server, `cdp-share` shares your desktop browser over one
  SSH tunnel.
- **Commands and skills.** [Prompt templates](prompts/) add `/plan`,
  `/code-review`, `/explain`, `/pr`, `/generate-slides`, and more.
  [Skills](skills/) cover technical writing, research, test audits,
  self-improvement from session logs, Proton Pass credentials, and skill
  grading.

The package does not change your providers, models, MCP servers, or permission
rules.

## Install

You need Pi 1.4.0 or later, Node.js 22.19 or later, and Git.

```bash
pi install git:github.com/joaomj/pi-agent-config@v0.9.0
```

Then restart Pi. Running sessions do not load the package.

If you installed an older version with `install.sh`, or any bundled package
on its own, follow [Install and upgrade](docs/install.md) instead. Two copies
of one extension stop Pi from starting.

You can also hand the job to your agent: *"Install
github.com/joaomj/pi-agent-config by following docs/install.md."* It checks
each step and asks you where a decision is needed.

## Opt-in add-ons

These need a decision or extra software from you, so the package does not
bundle them. [Add-ons](docs/add-ons.md) has the setup steps.

- **Permission checks**: ask or deny before tool calls, with a reference
  policy that blocks credential reads and asks before commits and pushes.
- **Claude subscription transport**: use a paid Claude plan through the Claude
  Code login.
- **Browser automation**: `browser_*` tools on a managed headless browser.

## Update and remove

- Update: run the install command with a newer tag. Read
  [CHANGELOG.md](CHANGELOG.md) first.
- Roll back: install an older tag the same way.
- Remove: `pi remove git:github.com/joaomj/pi-agent-config`. This also removes
  the bundled packages.
- Turn off one part: see [Turn off one part](docs/install.md#turn-off-one-part).

## More

- [Extensions in use](docs/extensions.md): what each bundled package does and
  what it costs.
- [Workflow scope](docs/tech-context.md) and [Model setup](docs/model-setup.md).
- [Contributing](CONTRIBUTING.md): checks and releases.

Retain the license notices when you copy resources, including
[prompts/LICENSE](prompts/LICENSE).
