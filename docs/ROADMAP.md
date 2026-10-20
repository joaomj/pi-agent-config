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
| `prompts/` | All templates, including `/bootstrap`. |
| `skills/documentation/`, `skills/engineering/` | Included. |
| `skills/tooling/proton-pass/`, `skills/tooling/skill-doctor/` | Excluded. They expect host tools and local session history. |
| `extensions/` | Nothing. Extensions ship as third-party packages. |
| `AGENTS.md`, permission policy, MCP servers | Not shippable. `/bootstrap` adapts each one with the user. |

The `/bootstrap` prompt installs the third-party packages listed in
[Extensions in use](extensions.md), offers the Exa MCP server, and guides the
`AGENTS.md` and permission-policy merge. It inspects the machine first and reports
what it changed.

## Decisions

- **Third-party packages are installed by `/bootstrap`.** Pi documents package
  dependencies for npm tarballs. A git-installed package that depends on other Pi
  packages is fragile, and the user cannot choose what to install.
- **Pi itself is not shippable.** No package field pins the Pi version.
  `/bootstrap` reports the installed version and recommends `pi update`.
- **No registry.** The git source is enough. A user who needs a fixed version
  installs a tag.
- **Personal machines keep the full clone** at `~/.pi/agent` and load resources
  directly. They must not also install the package, or resources load twice.
- **Excluded from the package:** `proton-pass` and `skill-doctor`. A package
  filter cannot add them back, because it only narrows what the manifest
  declares. A user who wants one copies the skill into their own `skills/`
  directory, or reuses this repository as a plain clone.

## Risks

- **Name collisions.** Pi keeps the first discovered skill and prints a warning.
  The prompt-template and skill precedence between scopes is not documented.
  Users can disable a shared resource with `pi config`, or with a package filter
  such as `"prompts": ["!prompts/plan.md"]`.
- **The manifest lists resources explicitly.** A new skill category under
  `skills/` does not ship until it is added to the manifest.
- **Permission and instruction merges stay manual.** Automating them can widen
  access without the user noticing.

## Next steps

1. Install the package on a clean machine and run `/bootstrap`. Confirm that
   prompts and skills appear, and that no personal file changed.
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
