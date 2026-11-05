# Remote browser with chrome-cdp

This setup lets a Pi agent on a headless server drive the browser on your
desktop: your real tabs and logins, through one reverse SSH tunnel. It uses
[chrome-cdp](https://github.com/pasky/chrome-cdp-skill) v1.1.0 instead of
`pi-browser-use`.

Tested in November 2026 with Brave (Chromium 156) on macOS 27, and an agent
account on an Ubuntu 26.04 server, over Tailscale SSH.

## What the tests showed

- `cdp.mjs` is one file. It needs Node.js 22 or later on the server and
  nothing on the desktop. It needs no `npm install`.
- `cdp.mjs` connects to the address in a `DevToolsActivePort` file: the port
  on line 1 and a WebSocket path on line 2. `CDP_PORT_FILE` selects the file.
- **Brave does not check the browser ID in that path.** `/devtools/browser`,
  an invented ID, and the real ID all connect. You can therefore write the
  port file on the server, and you never need to read it from the browser
  profile.
- macOS denies SSH sessions access to the Brave profile folder ("Operation not
  permitted"). This also happens with `launchctl asuser` and with
  `open -a Terminal`. Because of the previous point, this does not matter.
- Brave's remote-debugging switch (`brave://inspect/#remote-debugging`)
  listens on `127.0.0.1:9222`. It does not answer the HTTP endpoints, such as
  `/json/version`.
- Brave asks "Allow debugging?" when a new client connects. Until you click
  Allow, every command waits and then times out. A per-tab helper process keeps
  the session open, so after that each tab asks only once. Helpers exit after
  20 minutes idle, or when you run `cdp.mjs stop`.
- With no `XDG_RUNTIME_DIR`, `cdp.mjs` keeps its sockets in `~/.cache/cdp`
  (mode 700), so each server account is separate.
- On the server, `node` may be on the `PATH` only in login shells. Commands
  run over plain `ssh` must set the `PATH`.

## Set it up

### 1. Desktop (Mac): turn on remote debugging

In Brave, open `brave://inspect/#remote-debugging` and turn the switch on.
Check it from Terminal:

```bash
nc -z 127.0.0.1 9222 && echo listening
```

### 2. Desktop: install `cdp-share`

On the desktop, save this as `~/.local/bin/cdp-share` and run `chmod +x` on it:

```bash
#!/bin/bash
# cdp-share: let a Pi session on another machine drive this Mac's Brave.
#
#   cdp-share [ssh-target] [port]   defaults: $CDP_SHARE_TARGET 9222
#
# Needs brave://inspect/#remote-debugging switched on. Brave accepts any
# /devtools/browser path, so the remote port file is written here instead of
# copied from the Brave profile, which macOS hides from ssh sessions. Runs
# until Ctrl-C or until the ssh connection drops.
set -euo pipefail
R=${1:-${CDP_SHARE_TARGET:?set CDP_SHARE_TARGET or pass user@host}}
port=${2:-9222}
nc -z 127.0.0.1 "$port" >/dev/null 2>&1 || { echo "cdp-share: nothing on 127.0.0.1:$port. Enable brave://inspect/#remote-debugging" >&2; exit 1; }
ssh "$R" "mkdir -p -m 700 ~/.cache/cdp-share && printf '%s\n/devtools/browser\n' $port > ~/.cache/cdp-share/DevToolsActivePort"
echo "cdp-share: Brave port $port shared with $R. Ctrl-C to stop."
exec ssh -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -N -R "$port:127.0.0.1:$port" "$R"
```

Pass the server account as the first argument, or set `CDP_SHARE_TARGET`,
for example `export CDP_SHARE_TARGET=agent@server` in `~/.zprofile`.

The desktop must reach the server account over SSH without a prompt. With
Tailscale SSH in "check" mode, run `ssh <account>@<server> true` once and
approve the link that it prints.

### 3. Share the browser

On the desktop:

```bash
cdp-share agent@server
```

From another machine, for example a laptop, start it on the desktop over
SSH:

```bash
ssh you@desktop '~/.local/bin/cdp-share agent@server'
```

Ctrl-C, or closing that SSH connection, stops the tunnel.

### 4. Server: use it from the agent account

```bash
export CDP_PORT_FILE=~/.cache/cdp-share/DevToolsActivePort
scripts/cdp.mjs list                       # your open tabs
scripts/cdp.mjs open https://example.com   # click Allow in Brave
scripts/cdp.mjs eval <target> document.title
scripts/cdp.mjs stop                       # end the helper processes
```

`ss -ltn | grep 127.0.0.1:9222` shows whether the tunnel is up.

## Risks

- The agent acts with your real logins. Share the browser only for a task
  that needs it, and stop the tunnel afterward.
- While the tunnel is open, every account on the server can connect to
  `127.0.0.1:9222`. Brave's Allow prompt is the only gate.

## Next steps

1. Bundle chrome-cdp v1.1.0 in this package as a pinned dependency, and add
   its skill with `CDP_PORT_FILE` set for the shared browser.
2. Add `cdp-share` to the repository, with the browser and port as settings,
   and link this document from the README.
3. Remove `pi-browser-use`: run `pi remove npm:pi-browser-use`, and delete its
   `pi-browser-use` block in `~/.pi/agent/settings.json`.
4. Delete the `chrome-lifecycle` skill in `~/.pi/agent/skills/`. It exists only
   to stop pi-browser-use's Chrome.
5. Clean up the managed browser: quit the pi-browser-use Chrome on the Mac,
   delete `~/.pi/browser-profile` on the Mac, and on Linux delete
   `~/.local/share/chrome-for-testing/` when nothing else uses it.
6. Replace the "Browser automation" section in [Add-ons](add-ons.md) and
   [Extensions in use](extensions.md#browser-automation) with this setup.
7. For an anonymous browser, start headless Chromium on the server with
   `--remote-debugging-port=0 --user-data-dir=<temp dir>`, and point
   `CDP_PORT_FILE` at `<temp dir>/DevToolsActivePort`.
