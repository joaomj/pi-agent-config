---
description: Adapt the shared Pi setup to this machine without overwriting personal configuration
argument-hint: "[skip: packages, agents, permissions, mcp]"
---

Prepare this machine to use the shared resources from `pi-agent-config`. The
shared prompt templates and skills are already installed when this template is
available; this session covers what a package cannot ship.

Work through the steps in order and report after each one. Inspect before you
write. Never replace a personal file without explicit approval, and never widen
an existing permission rule. Anything you stage goes in `/tmp` first.

Skip any step named in `$ARGUMENTS`.

1. Inspect the machine. Report the Pi version (`pi --version`), the installed
   packages (`pi list`), the config directory (`echo "$PI_CODING_AGENT_DIR"` and
   `ls ~/.pi/agent`), the MCP servers in `~/.pi/agent/mcp.json`, and any existing
   permission policy file with its path. Do not change anything yet. Confirm a
   backup exists (`ls ~/pi-agent-backup-*.tar.gz` or the path the user names).
   If none exists, stop and ask the user to run `install.sh --backup-only`.

2. Resolve the package directory. `pi list` prints the resolved path of each
   package. Use the path for `git:github.com/joaomj/pi-agent-config` as
   `PACKAGE_DIR`, and confirm `$PACKAGE_DIR/package.json` exists before you use
   it. All shared files below come from that directory, so they match the
   installed version.

3. Check the Pi version. Report what `pi --version` prints. If the user has not
   updated recently, offer to run `pi update`, which prints the version it
   installs. Do not run it without approval.

4. Install the third-party packages. Explain that extensions execute code with
   the user's permissions. Propose each one separately, skip what `pi list`
   already shows, and install only the ones the user accepts:

   - `npm:@ff-labs/pi-fff` — indexed file search (`fffind`, `ffgrep`).
   - `npm:@gotgenes/pi-permission-system` — tool permission checks.
   - `npm:@joaomj/pi-background-bash` — durable background commands.
   - `npm:pi-ask-user@0.16.0` — interactive questions. Its bundled skills stay
     off, as an entry with `"source": "npm:pi-ask-user@0.16.0", "skills": []`.
   - `git:github.com/joaomj/pi-claude-directsdk` — optional Claude subscription
     transport. Skip unless the user has a Claude Code subscription.

   Run `pi install` once per accepted package, then `pi list` again and report
   what loaded.

5. Handle `AGENTS.md`. Pi loads `AGENTS.md` and `CLAUDE.md` automatically;
   `--append-system-prompt` is a per-invocation flag, so there is no append file
   to install. Copy `$PACKAGE_DIR/AGENTS.md` to
   `/tmp/pi-agent-config-AGENTS.md`. If the user already has
   `~/.pi/agent/AGENTS.md`, show the rules it is missing and ask before you
   change it. Append only those missing rules, between
   `<!-- pi-agent-config: shared rules -->` and
   `<!-- pi-agent-config: end shared rules -->` markers, and only after the user
   agrees. Create the file only when it is absent. Leave project-level
   `AGENTS.md` files alone.

6. Recommend permission settings. Copy
   `$PACKAGE_DIR/extensions/pi-permission-system/config.json` to
   `/tmp/pi-agent-config-permissions.json`. Explain its `permission` entries in
   plain words, then diff it against the user's own policy file. Propose
   additions only: keep existing rules, narrow rather than widen, and show the
   resulting diff. If the policy denies agent access to its own file, print the
   rules and ask the user to apply them in their editor. Confirm the result by
   running one allowed and one denied command.

7. Offer MCP servers. Explain what each one does, then ask about each server
   separately. Add nothing without an explicit yes for that server. Example:

   ```bash
   pi mcp add exa --url https://mcp.exa.ai/mcp \
     --bearer-token-env-var EXA_API_KEY \
     --exposure codemode \
     --description "Web search, fetch, and research"
   ```

   Never ask the user to paste a key into this session. Verify each accepted
   server with `pi mcp list`. If a server rejects its credentials, report the
   error and leave the entry disabled rather than guessing.

8. Report the result. State what changed, what stayed, and what the user must do
   themselves: `/login` and `/model`, any skipped package or server, and any
   permission rule left for manual editing. Mention three habits: run
   `pi update --extensions` to update the shared package and its third-party
   packages, run `pi config` to disable one shared prompt or skill, and check
   which skill wins a name collision. Pi keeps the first discovered skill, warns,
   and compares the declared `name`, so a different folder does not avoid the
   clash.
