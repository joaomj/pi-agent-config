---
name: user-browser
description: Read and operate the user's own Chromium browser (Chrome, Brave, Edge) with its real tabs and logins, on this machine or shared from their desktop to a headless server over SSH. Use when a task needs a page the user is logged into, a tab they have open, or a site that blocks fresh browsers; also to set up desktop sharing (cdp-share) or a throwaway headless browser. Not for public pages that curl, an API, or a CLI can fetch.
---

# User browser

`scripts/cdp` runs [chrome-cdp](https://github.com/pasky/chrome-cdp-skill)
1.1.0, bundled with this package, against the user's browser over the Chrome
DevTools Protocol. It needs Node.js 22 or later and nothing else. Paths below
are relative to this skill's directory.

## Rules

- **Use the browser only when the task needs it.** Prefer `curl`, an API, or
  a CLI for public data. The browser acts with the user's real accounts.
- **Ask before any action that changes something for the user**: sending a
  message or email, posting, buying, deleting, accepting terms, changing
  account settings, or submitting a form. Reading is fine within the task.
- **Never type passwords, codes, or card numbers.** When a page asks for a
  login or a second factor, ask the user to complete it in the browser, then
  continue.
- **Never read cookies, local storage, saved passwords, or tokens** with
  `eval` or `evalraw`, even if the page allows it.
- **Touch only the tabs the task needs.** Prefer a tab you open with `open`
  over the user's tabs. Do not navigate away from a user's tab without asking.
- **Clean up** when the task ends: close the tabs you opened, run
  `scripts/cdp stop`, and tell the user they can stop `cdp-share`.

## 1. Check the connection

```bash
scripts/cdp check
```

It prints which browser it uses, then lists the open tabs. The wrapper picks
the first that applies:

1. `CDP_PORT_FILE`, when set.
2. A browser shared from the user's desktop with `cdp-share`, when
   `~/.cache/cdp-share/DevToolsActivePort` exists.
3. A Chromium browser on this machine, which `cdp.mjs` finds by itself.

| Result | Meaning | Do this |
|---|---|---|
| A tab list | Connected | Continue |
| Exit code 3, "the shared browser is not connected" | The desktop tunnel is down | Ask the user to run `cdp-share` on their desktop, or start it as in [Share a desktop browser](#share-a-desktop-browser), then retry |
| `No DevToolsActivePort found` | No shared browser, and remote debugging is off here | Ask the user to turn on remote debugging, see [Set up](#set-up) |
| The command waits, then times out | The browser shows "Allow debugging?" | Ask the user to click Allow, then retry |

## 2. The approval prompt

The browser asks "Allow debugging?" when a new client connects and when you
first access a tab. Until the user clicks Allow, commands wait and time out.
A helper process per tab keeps the session open, so each tab asks once. The
helpers exit after 20 minutes idle or with `stop`.

**Before the first command on a tab, tell the user to watch for the prompt.**
`open` creates a new tab, so each `open` asks again.

## 3. Commands

`<target>` is a unique prefix of the target ID that `list` prints, for example
`6BE827FA`. The wrapper takes the same commands as `cdp.mjs`.

```bash
scripts/cdp list                         # open tabs: target ID, title, URL
scripts/cdp open [url]                   # new tab (asks for Allow)
scripts/cdp snap    <target>             # accessibility tree, compact
scripts/cdp html    <target> [selector]  # HTML of the page or of one element
scripts/cdp eval    <target> <expr>      # JavaScript in the page
scripts/cdp shot    <target> [file]      # viewport screenshot, prints the DPR
scripts/cdp nav     <target> <url>       # navigate and wait for load
scripts/cdp click   <target> <selector>  # click by CSS selector
scripts/cdp clickxy <target> <x> <y>     # click at CSS pixels
scripts/cdp type    <target> <text>      # type at the focused element
scripts/cdp loadall <target> <selector> [ms]  # click "load more" until gone
scripts/cdp net     <target>             # resource timing entries
scripts/cdp evalraw <target> <method> [json]  # raw CDP command
scripts/cdp stop [target]                # stop helper processes
```

## 4. Work with a page

**Read.** Start with `snap`: it is compact and shows roles, names, and links.
Use `html <target> "<selector>"` for one element, and `eval` to extract data
in one call:

```bash
scripts/cdp eval <target> 'JSON.stringify([...document.querySelectorAll("table tr")].map(r => r.innerText))'
```

Collect everything you need in one `eval`. Indexes such as
`querySelectorAll(...)[3]` shift when the page changes between calls.

**Act.** Prefer `click` with a stable selector. To enter text, focus the field
with `click`, then `type`; `type` also works inside cross-origin iframes, where
`eval` cannot reach. After an action, check the result with `snap` or `eval`.

**See.** `shot` saves a PNG of the viewport only; scroll first with
`eval <target> 'scrollBy(0, innerHeight)'`. Open the file with the `read`
tool. The image is in device pixels; `clickxy` takes CSS pixels:
`CSS px = image px / DPR`, with the DPR that `shot` prints.

**Long lists.** `loadall <target> "button.load-more"` clicks until the button
is gone.

**Close a tab you opened** with `open`:

```bash
scripts/cdp eval <target> 'window.close()'
```

`Target.closeTarget` also works, but it needs the full target ID, not the
prefix: take it from `scripts/cdp evalraw <target> Target.getTargets '{}'`.

## Set up

Do the browser steps with the user. They need their screen.

### Turn on remote debugging

In the browser, open `chrome://inspect/#remote-debugging`
(`brave://inspect/#remote-debugging` in Brave) and turn the switch on. The
browser then listens on `127.0.0.1:9222`. Check it on that machine:

```bash
nc -z 127.0.0.1 9222 && echo listening
```

This switch does not answer HTTP endpoints such as `/json/version`. That is
expected.

If the agent runs on the same machine as the browser, setup ends here.

### Share a desktop browser

When the agent runs on a headless server and the browser on the user's
desktop, `scripts/cdp-share` on the desktop opens one reverse SSH tunnel to
the server account and writes `~/.cache/cdp-share/DevToolsActivePort` there.
Chromium accepts any `/devtools/browser` path, so it does not need the
browser profile, which macOS hides from SSH sessions.

1. Copy the script to the desktop. From the desktop:

   ```bash
   mkdir -p ~/.local/bin
   scp <agent>@<server>:.pi/agent/git/github.com/joaomj/pi-agent-config/skills/tooling/user-browser/scripts/cdp-share ~/.local/bin/
   chmod +x ~/.local/bin/cdp-share
   ```

2. Set the default server account in `~/.zshenv` on macOS, or `~/.profile` on
   Linux. Use `.zshenv`, not `.zprofile`: a `.zprofile` often returns early in
   non-interactive shells, and then a `cdp-share` started over SSH does not
   see the setting.

   ```bash
   echo 'export CDP_SHARE_TARGET=<agent>@<server>' >> ~/.zshenv
   ```

3. The desktop must reach the server account over SSH without a prompt.
   Check it with `ssh <agent>@<server> true`. With Tailscale SSH in "check"
   mode, open the link it prints.

4. Share the browser. On the desktop:

   ```bash
   cdp-share            # Ctrl-C stops the tunnel
   ```

   Or start it from another machine, for example from the server itself when
   it can reach the desktop:

   ```bash
   ssh <user>@<desktop> '~/.local/bin/cdp-share' &
   ```

   Stopping that `ssh` stops the tunnel.

5. On the server, `scripts/cdp check` lists the desktop tabs.

While the tunnel is open, every account on the server can connect to
`127.0.0.1:9222`. The Allow prompt is the only gate, so ask the user to stop
the tunnel when the task ends.

### A throwaway browser

For anonymous browsing, or when no user browser is available, start a
headless Chromium with a temporary profile:

```bash
prof=$(mktemp -d)
chromium --headless=new --user-data-dir="$prof" --remote-debugging-port=0 about:blank >/dev/null 2>&1 &
until [ -s "$prof/DevToolsActivePort" ]; do sleep 0.5; done
export CDP_PORT_FILE="$prof/DevToolsActivePort"
scripts/cdp open https://example.com
```

Replace `chromium` with the binary the machine has (on macOS, for example,
`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`); add `--no-sandbox` only
if it does not start without it. Headless browsers do not show the Allow
prompt. When done, run `scripts/cdp stop`, stop the browser with
`pkill -f "user-data-dir=$prof"`, and delete `$prof`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every command times out | Allow prompt not clicked | Ask the user to click Allow |
| `No target matching prefix` | Tab closed, or prefix from an old list | Run `list` again |
| `ambiguous` prefix | Prefix too short | Use more characters |
| `cdp-share: nothing on 127.0.0.1:9222` | Remote debugging off on the desktop | Turn the switch on |
| `remote port forwarding failed` | An old tunnel still holds the port on the server | Stop the old `cdp-share`, or wait for its connection to time out |
| `cdp-share` started over SSH ignores `CDP_SHARE_TARGET` | Set in a file that non-interactive shells skip | Move it to `~/.zshenv` |
| `Operation not permitted` reading the browser profile on macOS | macOS privacy protection for SSH sessions | Not needed: `cdp-share` writes the port file itself |
| `cdp: Node.js ... not found` | `node` only on the login-shell `PATH` | The wrapper also tries `~/.local/bin/node`; otherwise set `PATH` |
