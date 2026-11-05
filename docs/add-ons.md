# Add-ons

These add-ons need a decision or extra software from you, so the package does
not bundle them. [Extensions in use](extensions.md#opt-in-add-ons) describes
what each one does and what it costs.

## Permission checks

[`@gotgenes/pi-permission-system`](https://www.npmjs.com/package/@gotgenes/pi-permission-system)
asks or denies before tool calls, according to a policy file. This repository
ships a reference policy in
[permissions/pi-permission-system.json](../permissions/pi-permission-system.json).
It denies reads of credentials and `.env` files and asks before commits, pushes,
deletes, installs, and remote writes.

To use it, install the extension:

```bash
pi install npm:@gotgenes/pi-permission-system@41.0.0
```

The policy lives at
`~/.pi/agent/extensions/pi-permission-system/config.json`. If that file does
not exist, copy the reference there:

```bash
mkdir -p ~/.pi/agent/extensions/pi-permission-system
cp ~/.pi/agent/git/github.com/joaomj/pi-agent-config/permissions/pi-permission-system.json \
   ~/.pi/agent/extensions/pi-permission-system/config.json
```

If the file exists, do not overwrite it. Instead, bring a later reference into
your policy by hand:

1. Compare your policy with the reference:
   `diff -u <your config.json> <the reference>`.
2. Pick the changes you want. The policy is a map of surface, pattern, and
   action. Within a surface, the last matching pattern wins, so keep the order
   of the patterns you copy.
3. Write the result to `config.json.proposed` next to `config.json`. The
   reference policy denies agents access to the policy file, so move the file
   into place yourself:

   ```bash
   mv ~/.pi/agent/extensions/pi-permission-system/config.json.proposed \
      ~/.pi/agent/extensions/pi-permission-system/config.json
   ```

## Claude subscription transport

[Pi Claude DirectSDK](https://github.com/joaomj/pi-claude-directsdk) lets Pi use
a paid Claude plan through the Claude Code login. It needs a paid Claude plan.

1. Check the Claude Code CLI. The transport is qualified for versions from
   2.1.263 up to, but not including, 2.2.0:

   ```bash
   claude --version
   ```

   If the CLI is missing or outside that range, install the qualified version:

   ```bash
   npm install -g --ignore-scripts=false @anthropic-ai/claude-code@2.1.281
   ```

2. Check the login with `claude auth status --json`. If `loggedIn` is not
   `true`, run `claude auth login`, which opens a browser.

3. Find the newest transport release, for example `v0.3.1`:

   ```bash
   git ls-remote --tags --sort=-v:refname https://github.com/joaomj/pi-claude-directsdk 'v*' | grep -v '\^{}' | head -1
   ```

4. Install the transport at that tag:

   ```bash
   pi install git:github.com/joaomj/pi-claude-directsdk@<transport tag>
   ```

5. Restart Pi, open `/model`, wait for the DirectSDK catalog, and choose a
   DirectSDK model.

