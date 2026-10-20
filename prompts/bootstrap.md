---
description: Adapt the shared Pi setup to this machine without overwriting personal configuration
argument-hint: "[skip: packages, agents, permissions, mcp]"
---

Prepare this machine to use the shared resources from `pi-agent-config`. The
shared prompt templates and skills are already installed when this template is
available; this session covers what a package cannot ship.

Work through the steps in order and report after each one. Inspect before you
write. Never replace a personal file without explicit approval, and never widen
an existing permission rule.

Skip any step named in `$ARGUMENTS`.

1. Inspect the machine. Report the Pi version (`pi --version`), the installed
   packages (`pi list`), the config directory (`echo "$PI_CODING_AGENT_DIR"` and
   `ls ~/.pi/agent`), the MCP servers in `~/.pi/agent/mcp.json`, and any existing
   permission policy file with its path. Do not change anything yet.

2. Check the Pi version. Report what `pi --version` prints. If the user has not
   updated recently, offer to run `pi update`, which prints the version it
   installs. Do not run it without approval. The shared resources assume a
   current 1.x release, but no package file can enforce that.

3. Install the third-party packages. Explain that extensions execute code with
   the user's permissions, then propose these, skipping any already in `pi list`:

   - `npm:@ff-labs/pi-fff` — indexed file search (`fffind`, `ffgrep`).
   - `npm:@gotgenes/pi-permission-system` — tool permission checks.
   - `npm:@joaomj/pi-background-bash` — durable background commands.
   - `git:github.com/joaomj/pi-claude-directsdk` — optional Claude subscription
     transport. Skip unless the user has a Claude Code subscription and wants it.

   Ask which ones to install before running `pi install` for each. Run
   `pi list` again afterward and report what loaded.

4. Adapt `AGENTS.md`. Read the canonical file from
   `https://raw.githubusercontent.com/joaomj/pi-agent-config/main/AGENTS.md`.
   If the user already has `~/.pi/agent/AGENTS.md`, list the rules it is missing
   and ask before you touch it. Append only those missing rules, between
   `<!-- pi-agent-config: shared rules -->` and
   `<!-- pi-agent-config: end shared rules -->` markers. Create the file only
   when it is absent. Leave project-level `AGENTS.md` files alone.

5. Recommend permission guardrails. Read the guardrails section of
   `docs/extensions.md` in `https://github.com/joaomj/pi-agent-config` and show
   the rules in plain words. The user's policy stays theirs: propose the
   additions, keep existing rules untouched, and show the resulting diff. If the
   policy denies agent access to its own file, print the rules and ask the user
   to apply them in their editor instead. Confirm the policy still works by
   running one allowed and one denied command.

6. Offer the Exa web search server. It needs the user's own key. Ask them to
   export the key in their shell or keychain, then run:

   ```bash
   pi mcp add exa --url https://mcp.exa.ai/mcp \
     --bearer-token-env-var EXA_API_KEY \
     --exposure codemode \
     --description "Web search, fetch, and research"
   ```

   Never ask the user to paste the key into this session. Verify with
   `pi mcp list`. If the server rejects the bearer token, report the error and
   leave the entry disabled rather than guessing at another header.

7. Report the result. State what changed, what stayed, and what the user must do
   themselves: `/login` and `/model`, any skipped package, and any permission
   rule left for manual editing. Mention two habits: run
   `pi update --extensions` to get updates to the shared package and its
   third-party packages, and run `pi config` to disable a single shared prompt or
   skill that collides with one of theirs. A collision keeps the first discovered
   resource and prints a warning.
