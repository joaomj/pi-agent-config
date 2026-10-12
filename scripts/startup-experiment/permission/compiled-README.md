# Compile the current permission entry

Reduce cache-cold startup without disabling extensions or delaying enforcement.
The confirmed paired median saving is 1060.7 ms; routine warm startup has no reliable improvement.

## Requirements

Use the reviewed Pi 1.1.0 and permission package 40.1.4 with Node.js 22.
The recipe uses Pi's installed esbuild. It does not install a replacement package.
Keep generated output outside Git and retain the original package and dependencies.

## Build

```bash
node scripts/startup-experiment/permission/compile.mjs \
  "$HOME/.pi/agent/npm/node_modules/@gotgenes/pi-permission-system" \
  "$(npm root -g)/@earendil-works/pi-coding-agent" \
  "$HOME/.local/share/pi-precompiled-permissions/permission-40.1.4-pi-1.1.0"
```

Create the output parent directory first. The final output directory must be new.
The recipe checks the upstream entry hash and both reviewed package versions.
It writes a private overlay, compiled bundle, manifest, guarded entry, and `upstream-index.ts` backup.
It does not change installed source, working settings, policy files, or auth stores.

## Adoption

Adoption requires approval. Copy only the compiled bundle and guarded entry into the original package, then restart Pi.
Keep every `packages` entry unchanged. Retain the upstream entry backup outside Git.
Do not overwrite unrelated local source changes or an existing unrelated bundle.
An upstream reinstall can restore the original entry; rebuild after an update.

See the [measurement and adoption record](../../../docs/startup/compiled-permissions.md) for exact steps, source-path handling, and verification gaps.
