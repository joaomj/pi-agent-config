# Install and upgrade

These steps are written for a coding agent. Tell your agent to follow them. It
checks the result of each step before it continues, and asks you where a
decision is needed.

Requirements: Pi 1.4.0 or later, Node.js 22.19 or later, Git, and network
access to GitHub and npm.

## Choose the path

```bash
pi list
```

- If the output names `pi-agent-config`, or any of `pi-bg-bash`,
  `@ff-labs/pi-fff`, `@ahm3tj4f/pi-undo`, or
  `@joaomj/pi-claude-usage` as a separate entry, follow
  [Upgrade from an older version](#upgrade-from-an-older-version).
- Otherwise, follow [New install](#new-install).

Use only one path. Pi does not start when two copies of one extension register
the same tool.

## New install

1. Install the package:

   ```bash
   pi install git:github.com/joaomj/pi-agent-config@v0.9.0
   ```

   The last line reads `Installed git:github.com/joaomj/pi-agent-config@v0.9.0`.

2. Check that every extension loads:

   ```bash
   pi --help 2>&1 | grep -E 'Failed to load|conflicts with|--fff-mode'
   ```

   The output is exactly one line: the one with `--fff-mode`. A
   `Failed to load` or `conflicts with` line names the extension to fix.

3. Ask the user which [add-ons](add-ons.md) they want: permission checks, the
   Claude subscription transport, and browser automation. Follow the section
   for each one they choose. None is required.

4. Restart Pi. Running sessions do not load the package.

## Upgrade from an older version

Older versions used `install.sh`, which installed each package separately,
edited `~/.pi/agent/AGENTS.md`, and kept backups in
`~/.pi/agent/.install-history`.

1. Back up the two files this procedure changes:

   ```bash
   mkdir -p ~/pi-agent-config-backup
   cp ~/.pi/agent/settings.json ~/.pi/agent/AGENTS.md ~/pi-agent-config-backup/ 2>/dev/null; ls ~/pi-agent-config-backup
   ```

   The listing shows `settings.json`, and `AGENTS.md` when it existed.

2. Run `pi list` and note the exact source of each entry. Remove the old
   `pi-agent-config` entry and every separate entry that the package now
   ships. Use the source exactly as `pi list` prints it, and skip lines whose
   package is not listed. With the sources that `install.sh` wrote:

   ```bash
   pi remove git:github.com/joaomj/pi-agent-config
   pi remove npm:pi-bg-bash@0.4.1
   pi remove npm:@ff-labs/pi-fff@0.11.0
   pi remove npm:@ahm3tj4f/pi-undo@0.5.0
   pi remove npm:@joaomj/pi-claude-usage@0.2.0
   ```

   Each command prints `Removed <source>`. Removing the old `pi-agent-config`
   entry also removes any filter such as `"extensions": []` that turned off
   its extensions.

   Keep `npm:@gotgenes/pi-permission-system` and `pi-claude-directsdk`. They
   are the opt-in add-ons and are not bundled. Remove `npm:pi-browser-use`:
   the bundled `user-browser` skill replaces it.

3. Run `pi list` again. None of the packages removed in step 2 appear.

4. Install the package as in [New install](#new-install) step 1.

5. Clean up `~/.pi/agent/AGENTS.md`. Look for the block that `install.sh`
   added:

   ```bash
   grep -n 'pi-agent-config: ' ~/.pi/agent/AGENTS.md
   ```

   - No output: nothing to do. Continue with step 6.
   - Two lines (`shared rules` and `end shared rules`): while this block
     exists, the package does not add its rules, so the user keeps the old
     text. Ask the user which option they want:
     - Remove the block, markers included, and keep the rest of the file. The
       package then adds the current rules.
     - If the file holds only that block, delete the file.

   Afterwards, `grep -c 'pi-agent-config: ' ~/.pi/agent/AGENTS.md` prints `0`,
   or the file no longer exists.

6. If `~/.pi/agent/.install-history` exists, ask the user whether to delete
   it. Nothing uses it any more.

7. Remove the user's copies of skills and prompts that the package now ships.
   Pi loads a skill or prompt from `~/.pi/agent` before the package copy with
   the same name, so an old copy hides the current version. List the copies:

   ```bash
   P=~/.pi/agent/git/github.com/joaomj/pi-agent-config
   cd ~/.pi/agent
   for d in $(find "$P/skills" -name SKILL.md -exec dirname {} \; | xargs -n1 basename); do find skills -type d -name "$d"; done 2>/dev/null
   for f in $(ls "$P/prompts"); do ls "prompts/$f"; done 2>/dev/null
   ```

   Ask the user which copies they changed on purpose, and keep those. Back up
   and remove the others, for example:

   ```bash
   tar czf ~/pi-agent-config-backup/user-copies.tgz <paths> && rm -r <paths>
   ```

   Run the listing again. It prints only the copies the user kept.

8. Verify as in [New install](#new-install) step 2.

9. Restart Pi.

To undo the upgrade, run `pi remove git:github.com/joaomj/pi-agent-config`,
copy the files in `~/pi-agent-config-backup/` back to `~/.pi/agent/`, extract
`user-copies.tgz` there with
`tar xzf ~/pi-agent-config-backup/user-copies.tgz -C ~/.pi/agent`, and run
`pi update --extensions`.

## Turn off one part

Replace the package entry in `~/.pi/agent/settings.json` with the object form
and exclude what you do not want. For example, to drop the undo extension and
the Claude quota footer:

```json
{
  "source": "git:github.com/joaomj/pi-agent-config@v0.9.0",
  "extensions": [
    "!node_modules/@ahm3tj4f/pi-undo/**",
    "!node_modules/@joaomj/pi-claude-usage/**"
  ]
}
```

`skills` and `prompts` take the same patterns. `pi config` turns single
resources on and off interactively. To turn off the shared rules, exclude
`extensions/shared-rules.ts`.
