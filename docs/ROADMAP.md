# Roadmap

## Current priority

Ship the shared Pi resources as a Pi package. Other people then install and update
them with Pi's own package commands, and the install never touches their providers,
MCP servers, permission rules, or instructions.

## Goals

- Install with one command and update with one command.
- Keep the user's own configuration. Never overwrite it.
- Ship only portable resources: prompt templates and skills.
- Keep credentials, provider settings, MCP credentials, permission rules, and
  `AGENTS.md` local to each machine.

## What ships

The distribution channel is the repository itself,
`git:github.com/joaomj/pi-agent-config`. The manifest is [package.json](../package.json).

| Resource | Status |
| --- | --- |
| `prompts/` | All templates. |
| `skills/` | Every skill, including `tooling/proton-pass` and `tooling/skill-doctor`. The user decides what to keep. |
| `extensions/pi-permission-system/config.json` | Shipped as a reference policy. The installer copies it, or writes `config.json.proposed` and prints a diff. |
| `extensions/` runtime code | Nothing. Extensions ship as third-party packages. |
| `AGENTS.md` | Shipped as the canonical text. The installer copies it when absent, or appends it once between markers. |
| MCP servers | Not shippable. The installer asks about the Exa server and needs `EXA_API_KEY`; other servers stay per user. |
| Claude transport | Offered as a step. The installer checks Node and the qualified Claude Code CLI range and offers the pinned CLI install. It offers the CLI login and installs the package only when a qualified CLI is present; otherwise it prints the fix command and installs nothing. Model selection stays interactive in `/model`. |

`install.sh` installs the third-party packages listed in
[Extensions in use](extensions.md) at pinned versions, one at a time, asks about
each MCP server, and handles `AGENTS.md` and the permission policy. A later run
updates instead of reinstalling. It records what it edits, inspects before it
writes, and reports what it changed.

## Decisions

- **The installer records the files it edits.** Before a change, `install.sh`
  commits the current state of `settings.json`, `AGENTS.md`, `mcp.json`, and the
  permission policy into a private git history at `~/.pi/agent/.install-history`.
  `--rollback` restores the state before the last run, including removing files
  that run created. No tarball, no `--reset`, and no second repository in the
  user's configuration directory.
- **Updates reuse the installed package.** A run moves the package to a new
  release with `pi update --extension`, which keeps the checkout and the
  user's settings. A failed in-place update falls back to remove and install.
- **Only signed releases install.** Release tags are verified against the
  maintainer's published keys before anything is fetched from them. An unsigned
  tag never installs, even when it is the newest one.
- **Third-party packages are pinned.** The installer pins a version for each
  package it offers, so a release describes a tested set. An installed package
  newer than the pin stays where it is and is reported.

- **The installer, not an agent session, performs setup.** Setup is a checklist,
  so bash does it deterministically, cheaply, and over SSH. Pi documents package
  dependencies for npm tarballs only; a git-installed package that depends on
  other Pi packages is fragile, and the user cannot choose what to install.
- **Pi itself is not shippable.** No package field pins the Pi version.
  The installer reports the installed version and recommends `pi update`.
- **No registry.** The git source is enough. A user who needs a fixed version
  installs a tag.
- **Personal machines keep the full clone** at `~/.pi/agent` and load resources
  directly. They must not also install the package, or resources load twice.
- **Every skill ships.** The package does not judge which skills a user needs.
  `pi config` switches off any single shared prompt or skill.
- **Questions fail closed.** Every question shows `[y/n]` and the installer
  answers no when no terminal is available and `--yes` was not passed. Setup
  never installs or edits anything on a default that a user did not confirm.
  The script also treats an empty probe (missing binary, missing file) as a
  normal result instead of an error, so a missing optional tool cannot end the
  run early.
- **Repeated runs add nothing.** The installer compares packages by name rather
  than by source string, so an existing git entry blocks the npm install of the
  same package. It skips the `AGENTS.md` append when the rules are already there,
  and it does not add an Exa server twice.
- **The Claude transport is a first-class step, not a dependency.** It needs the
  qualified CLI range and a separate Claude Code login, so the installer checks
  both before it installs the package, and it never installs the CLI without
  asking.
- **No `APPEND.md`.** Pi loads only `AGENTS.md` and `CLAUDE.md` automatically;
  `--append-system-prompt` is a per-invocation flag. There is no append file to
  ship, and the package must not invent one.

## Risks

- **Name collisions.** Pi keeps the first discovered skill and prints a warning.
  The comparison uses the declared `name` in `SKILL.md`, not the folder, so
  moving the package skills into a subfolder changes nothing. Precedence between
  scopes is not documented. Users can disable a shared resource with `pi config`,
  or with a package filter such as `"prompts": ["!prompts/plan.md"]`.
- **The manifest lists resource roots explicitly.** `skills` covers the whole
  tree; a new top-level resource kind still needs a manifest entry.
- **Permission and instruction merges stay manual.** Automating them can widen
  access without the user noticing.

## Next steps

1. Run the installer on a clean machine. Confirm that prompts and skills appear,
   that no personal file changes, and that `--rollback` restores them.
2. Confirm an update from one release to the next reports the changes and keeps
   the user's settings.
3. Confirm the collision behavior on a machine that already has `/plan` or
   `/code-review`.
4. Move the full-clone installations onto the packaged install. A full clone
   loads the same resources twice, so it must go before the package is added.

## Deferred: container isolation

The earlier plan ran Pi in a rootless Podman container that saw only the selected
project. The prototype lives in a separate checkout, `~/Projects/pi-agent-config-container`,
at commit `390a948`. That commit is local only and was not on the machine used to
write this roadmap.

Verified at the time:

- The sandbox hid the host Pi directory, the container-control socket, the
  SSH-agent variable, and the Exa credential.
- The image filesystem is read-only, effective capabilities are zero, and new
  privileges are disabled.
- Cgroup limits: 4 GiB memory, four CPUs, 512 processes.

Known limits:

- Containers share the host kernel.
- Network access is unrestricted.
- The mounted project is writable, so its git hooks and tool configuration can
  run on the host later.
- Memory and CPU limits do not bound disk writes.
- A credential passed at launch is readable inside the container and appears in
  Podman metadata.

Container isolation is not on the critical path for sharing the setup. Revisit it
only if sessions must run against untrusted content, and close the git-hook gap
first.
