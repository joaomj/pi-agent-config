# Isolated lazy permission experiment

Prepare a source overlay of `@gotgenes/pi-permission-system@40.1.4` without changing the installed package or working settings.
The overlay changes the entry point's load boundary, not the permission engine.

## Requirements

- Pi 1.1.0, Node.js 22, and Python 3.
- The reviewed installed permission package and its installed dependency tree.
- A new output directory outside Git.

The recipe rejects a different package version or entry SHA256.
It copies source and public declarations, retains the upstream license, and links the existing dependencies.
It does not install or publish a package.

## Prepare

From the repository root, choose a new temporary output path:

```bash
python3 scripts/startup-experiment/permission/prepare.py \
  --package "$HOME/.pi/agent/npm/node_modules/@gotgenes/pi-permission-system" \
  --output /tmp/pi-lazy-permission-prototype
```

The output includes `experiment.json` with entry hashes and the changed-file list.
Existing output directories are rejected so a previous measurement cannot silently change.
Keep generated source, dependency links, manifests, and profile snapshots outside Git.

## Focused verification

Use package paths from the same Pi installation and the overlay just prepared:

```bash
PI_STARTUP_PI_PACKAGE="$(npm root -g)/@earendil-works/pi-coding-agent" \
PI_STARTUP_PERMISSION_PACKAGE="$HOME/.pi/agent/npm/node_modules/@gotgenes/pi-permission-system" \
PI_STARTUP_LAZY_PERMISSION_PACKAGE=/tmp/pi-lazy-permission-prototype \
PI_TELEMETRY=0 \
node --test tests/startup/permission.test.mjs
```

The fixture creates and removes private temporary workspaces and agent directories.
It restores the prior `PI_CODING_AGENT_DIR` after each case.
The scripted provider requires `baseUrl` metadata but does not contact that URL.
The dummy credential remains in the isolated model runtime; no real authentication is required.

Three approved checks cover first-turn enforcement, skill/lifecycle behavior, and failure of a deferred gate module.
See the [results and limits](../../../docs/startup/permission-prototype.md) for exact coverage.
Do not run the full or a slow verification suite without approval.

## Limits and next work

Configuration, service publication, forwarding, shutdown, and approval UI remain eager.
Agent preparation and skill/tool gates load on first use.
The retained service has synchronous callers, so this is not a whole-factory lazy wrapper.

The [comparison is complete](../../../docs/startup/permission-measurements.md): warm readiness and cache-cold first-tool delay regress. Do not adopt this boundary. The run used five paired launches per condition and one excluded warm-up per case.

## Approved performance comparison

Run `compare.py` with the unchanged agent directory, prepared overlay, and a new evidence directory outside Git:

```bash
python3 scripts/startup-experiment/permission/compare.py \
  --agent-dir "$HOME/.pi/agent" \
  --lazy-package /tmp/pi-lazy-permission-prototype \
  --output "$HOME/.local/state/pi-startup-experiments/permission-comparison" \
  --pairs 5
```

Both profiles load the same `first-use.ts` measurement extension and select its offline provider.
The original active tools and package group remain loaded. The lazy profile replaces only the permission package source.
Profiles exclude the source `auth.json`; Pi later creates empty authentication stores. Working settings remain unchanged.

The driver first measures editor input acceptance. In the same interactive process, it then submits an ordinary prompt and a protected read.
Completion uses `agent_settled`, not merely the first model response.
The protected path contains a harmless marker outside the repository, not a real credential.
The run fails if the read does not produce a verified permission denial.

Cold runs isolate Node compilation and jiti caches through fresh directories. They do not clear filesystem caches.
Warm runs exclude one warm-up per case. Case order is randomized within each pair.
Readiness and first-use delays are separate metrics; the first prompt precedes the first protected tool.
The common measurement extension adds overhead, so compare only the paired profiles, not earlier uninstrumented medians.
Do not add the overlay to working settings or auto-discovery as part of verification.
Keep FFF and undo changes separate.
