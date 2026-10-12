# Concrete startup improvement: compile the permission entry

## Recommendation and limits

Build the current permission extension once, then load the generated CommonJS bundle through Node's native loader.
Keep the original policy, eager initialization, lifecycle hooks, and all other extensions.
No Pi fork or feature removal is required.

The confirmed gain applies to **cache-cold startup**, not routine warm launches.
Ten paired cache-cold launches all improve readiness. Their median paired saving is **1060.7 ms**.
Warm startup has no reliable change: five wins in ten pairs, with a 3.3 ms paired median saving.
Do not promise a one-second saving on every launch.

Working settings and installed package source remain unchanged. Adoption requires approval.

## Confirmed measurements

The comparison measures process launch to interactive editor input acceptance.
Both profiles retain the active package list. Only the permission package implementation differs.
The runner uses an offline provider and checks a denied first protected tool after an ordinary first prompt.

| Metric | Unchanged median (ms) | Compiled median (ms) | Paired saving (ms) | Compiled wins |
| --- | ---: | ---: | ---: | ---: |
| Warm readiness | 1319.4 | 1276.5 | 3.3 | 5/10 |
| Cache-cold readiness | 3720.6 | 2566.5 | 1060.7 | 10/10 |
| Warm first prompt | 160.0 | 164.1 | -5.5 | 4/10 |
| Cache-cold first prompt | 177.6 | 173.1 | 6.0 | 6/10 |
| Warm first protected-tool denial | 98.5 | 95.9 | 1.0 | 5/10 |
| Cache-cold first protected-tool denial | 85.9 | 91.8 | -1.3 | 5/10 |

Paired savings are not differences between group medians.
The comparison contains 40 measured launches and two excluded warm-ups.
All 42 launches verify denial and expose identical active tool lists.
Independent checks confirm the counts, medians, paired savings, empty isolated auth stores, and bundle checksum.
Filesystem caches were not cleared. Cache-cold means fresh Node and jiti compilation caches.

An earlier five-pair direct-helper screening also improves all five cache-cold pairs, with a 1133.4 ms paired median saving.
Earlier compiled variants load the full SDK entry and regress warm startup. Do not adopt those variants.

## Implementation

Recipe: [`scripts/startup-experiment/permission/compile.mjs`](../../scripts/startup-experiment/permission/compile.mjs).
Reviewed environment: Pi 1.1.0, Node.js 22, permission package 40.1.4, and Pi's installed esbuild.

- Compile the existing TypeScript graph to one CommonJS entry. Do not redesign gates or defer protection.
- Keep 167 internal source files and the license unchanged in the generated overlay.
- Preserve original `import.meta.url` values for asset lookup and infrastructure scope discovery.
- Load the three used SDK helpers from their existing modules rather than the full SDK barrel.
- Retain Pi's compatibility mapping for the Pi-AI root import.
- Use `createRequire` so jiti does not transform the generated bundle again.
- Clear the generated module's require-cache entry when initializing a new extension generation.
- Reject a changed bundle or a different Pi/permission package version at startup.
- Retain visible error reporting, tool blocking, and consumed input if compiled initialization fails.

The final cache-clear addition affects extension reload, not an already-cached bundle during a fresh process launch.
Its focused lifecycle checks pass. The readiness table precedes that addition.
Runtime version and checksum guards do not detect every dependency or same-version source change.
Rebuild after source/dependency changes or an installation move.

## Concrete adoption steps

1. Build to a private persistent directory outside Git. Keep the installed source and policy unchanged during preparation.
2. After approval, copy only `src/compiled.cjs` and the generated `src/index.ts` into the installed permission package.
3. Keep the original `packages` entry and every other extension entry unchanged. Restart Pi.
4. Keep the generated `upstream-index.ts` as the exact entry backup outside Git.
5. After an upstream update, rebuild for the reviewed versions. A normal package reinstall can restore upstream code and remove the optimization.

This deployment preserves npm package management instead of replacing the permission package with an unmanaged local source.
Before copying the entry, verify that the installed entry still matches the reviewed hash.
Do not overwrite a changed installed entry or an existing unrelated `compiled.cjs`.
To reverse adoption, restore the saved upstream entry, remove only the generated bundle, and restart Pi.
Do not restore unrelated files or policy configuration.

## Verification and remaining risk

Two existing real-Pi scenarios pass against the compiled engine:

- First-turn protected and allowed direct, shell, nested, and registered custom reads.
- Denied/allowed skills, reload, fresh sessions, changed trusted-project/global policy, synchronous startup service, and extractor registration.

The checks execute the real engine and tools. No paid model request is made.
Passing these checks is not complete security-equivalence certification.
Interactive approvals, untrusted-project behavior, forwarding/subagents, authorizer-chain execution, and damaged-artifact guards remain unverified.
Obtain approval before new tests or a full/slow suite. The damaged deferred-gate test belongs to the rejected lazy prototype, not this bundle.

## Evidence and rejected alternatives

Private evidence lives below `$HOME/.local/state/pi-startup-experiments/`:

- `confirmed-permission-paired-20261012-005912/`: final ten-pair comparison.
- `direct-host-permission-paired-20261012-005347/`: successful five-pair screening.
- `native-cjs-permission-paired-20261012-004748/`: full-barrel CommonJS variant; warm regression.
- `compiled-permission-paired-20261012-004014/`: transformed ESM variant; warm regression.
- `fff-paired-20261012-003515/`: no consistent cold readiness gain; first file search slows in every pair.

The earlier lazy permission overlay also has a location confound: its `/tmp` source triggers synchronous `npm root -g` discovery.
Its recorded timing remains valid for that setup, but does not isolate the lazy boundary from relocation.
The compiled recipe preserves original module locations to retain lookup behavior and infrastructure coverage.
See the [roadmap](../ROADMAP.md), [FFF record](fff-prototype.md), and [build usage](../../scripts/startup-experiment/permission/compiled-README.md).
