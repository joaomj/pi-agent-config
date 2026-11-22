# Add-ons

These add-ons need a decision or extra software from you, so the package does
not bundle them. [Extensions in use](extensions.md#opt-in-add-ons) describes
what each one does and what it costs.

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

