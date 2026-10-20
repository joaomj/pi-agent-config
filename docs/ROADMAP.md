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

`install.sh` installs the third-party packages listed in
[Extensions in use](extensions.md) one at a time, asks about each MCP server,
and handles `AGENTS.md` and the permission policy. It backs up first, inspects
before it writes, and reports what it changed.

## Decisions

- **The installer backs up first.** `install.sh` writes a tarball of the Pi
  configuration before it installs anything, prints the restore command, and
  stops if the backup fails. `--reset` moves the old configuration aside instead
  of deleting it. Nothing writes to a user's configuration before a backup
  exists.

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
   that the backup restores, and that no personal file changed.
2. Confirm that `pi update --extensions` updates the package.
3. Confirm the collision behavior on a machine that already has `/plan` or
   `/code-review`.
4. Tag a release after the first successful clean install.

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
