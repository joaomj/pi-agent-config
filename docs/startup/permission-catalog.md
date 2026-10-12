# Permission catalog review: startup readiness and undo

## Result

Keep the current protection policy while investigating a lazy entry point first. None of the 61 catalog packages has a measured readiness advantage or a demonstrated exact match for the installed policy.

The undo requirement is now limited to undoing the last turn's changes together. Arbitrary file-history undo and conversation rewind are not requested. `@pify/yolo@0.15.0` provides useful snapshot/checkpoint reference code, but its broader interface and best-effort recording do not establish a reliable last-turn solution. Do not replace the current gate solely to obtain undo.

The solution options are A: adopt a better extension; B: change current settings; C: create our own extension inspired by others. Code changes, including a lazy-loading adapter, belong to C. The agreed sequence is a supported-settings check, followed by a minimal policy-preserving C experiment if needed, with FFF measured separately afterward. Undo work is deferred. See the [roadmap](../ROADMAP.md). No implementation has started.

For the complete experiment history outside permissions, see [the investigation overview](overview.md).

## Scope and evidence

The official query returned 61 packages across two pages:

- <https://pi.dev/packages?name=permission&type=extension>
- <https://pi.dev/packages?name=permission&type=extension&page=2>

The collector downloaded all 61 catalog-listed versions and verified archive integrity. `manifest.json` reports 61 downloads and zero failures. No source file was omitted by the large-file limit. Native assets and excluded non-source files remain available in the saved archives.

No third-party package was installed or executed. Working settings were not changed. This report covers published metadata, purpose, extension entries, lifecycle registration, relevant enforcement paths, and selected helper implementations. It is not a full security audit of every transitive dependency, a runtime compatibility certification, or a benchmark of replacements.

Each catalog entry links to its exact reviewed npm version and published source archive.
Those public links preserve provenance without copying third-party package code into this repository.

The retained local evidence lives under `~/.local/state/pi-startup-experiments/20261011-permission-catalog-review/`, outside Git.
The following paths are relative to that local research root:

- `catalog.json`, saved catalog pages, and `collection.json`: package identity and catalog provenance.
- `packages/<name>/provenance.json`, `metadata.json`, and `published.tgz`: exact published version, integrity, and distribution.
- `packages/<name>/source/`: extracted published sources.
- `file-inventory.json` and `source-signals.json` within each package directory: source inventory and navigation aids.
- `entry-review-1.txt` through `entry-review-6.txt`: source-linked entry/lifecycle excerpts for all entries. These excerpts are navigation aids, not proof of complete enforcement coverage.
- `runtime-evidence.json`: direct runtime hook locations, excluding comment-only matches.
- `family-comparison.json`: same-path TypeScript comparisons with the current published package.
- `review.json`: one explicit classification and selection finding for every catalog entry.

## Existing measurements

Readiness means process launch to acceptance of a prompt through the interactive editor. Native diagnostic timing totals are not the readiness metric.

Ten-round confirmation medians were 1405.1 ms warm and 3765.1 ms cold for the baseline. Disabling FFF produced 1380.2 ms warm and 3571.9 ms cold. These measurements indicate a possible FFF opportunity, not the benefit of a lazy implementation.

The five-round cold diagnostic matrix measured 3874.7 ms baseline and 2419.6 ms with permissions removed. This is about 1455 ms of diagnostic difference, not a safe optimization or a prediction for lazy loading. It justifies examining the permission load boundary.

The current permission package already imports its Bash WASM parser dynamically. The remaining startup opportunity includes the static service/UI/config graph and eager lifecycle work. FFF also already imports its SDK dynamically, but session startup calls `ensureFinder()` and waits for the initial scan.

Measurement results and local evidence locations: [investigation overview](overview.md).

## Selection comparison

| Candidate | Observed loading behavior | Main selection risk | Undo |
| --- | --- | --- | --- |
| Current gotgenes with a lazy entry boundary | Large static graph; Bash parser already lazy | Must retain input, skill/resource, lifecycle, and fail-closed enforcement | No file undo established |
| `@pify/yolo` | Source entry; no declared runtime deps; history cleanup at session start; Git checkpoints on prompts/risky actions | Best-effort recovery and different policy/custom-tool interpretation | File pre-images, repeated undo, prompt/code/conversation rewind |
| `pi-permission-guardian` | Config/audit at session start; parser warmup before agent start | Different policy/reviewer semantics; static graph still loads | No file undo established |
| `@handy_wote/pi-permissions` | Compiled entry; rules at session start; lazy WASM initialization | Custom input extraction does not reproduce current path/command intent analysis | No file undo established |
| `@inobit/pi-permission` | Global config read at factory; cached first-use policy; no runtime deps | Build-mode unknown pathless tools allow; sensitive defaults ask; custom parser/policy differs | No file undo established |
| `@pi-kit/permissions` | Config at session start and ensureLoaded fallback | Explicit shell expansion/wrapper/symlink limitations | No file undo established |
| `pi-permission-modes` | Scratch/config work and sandbox initialization at session start | Broad policy migration; eager sandbox setup | No file undo established |
| `pi-verdict` | State/tamper/audit work at session start; classifier compatibility helper lazy | Prototype label and model adjudication change safety/cost | No file undo established |

Dependency counts and compiled entries are loading clues, not measured speed rankings.

## Undo review: @pify/yolo

### What the implementation provides

- `edit` and `write` calls save complete file pre-images in a per-project trail under the agent directory.
- `/yolo undo [n]` restores previous file contents. It deletes files that did not exist before the recorded call.
- Undo markers record consumed entries, so repeated undo normally walks further backward.
- The trail survives restarts. The default retention period is 30 days.
- Risky shell commands and mutating delegations can create Git checkpoints.
- Each prompt can record a Git tree checkpoint and a conversation entry.
- `/yolo rewind` offers code, conversation, or both when those checkpoints exist.
- The default permission mode is `approve`. The package name does not mean every action automatically runs by default.

Evidence: `packages/@pify__yolo/source/src/trail.ts` (`recordPreImage`, `pendingUndo`, `undo`, `pruneTrail`), `src/checkpoint.ts` (`decideCheckpoint`), and `extensions/yolo.ts` (`tool_call`, `agent_start`, `session_start`, and the undo/rewind command cases).

### Recovery limits and risks

1. **Recording failure does not stop mutation.** `recordPreImage` catches errors and returns null; the tool handler ignores that result. The trail and checkpoint writers also suppress errors. A full disk, unreadable file, or unwritable trail can leave no recovery copy.
2. **Shell effects are not file undo.** Bash entries are history records. The file undo implementation skips them. Git rewind can restore recorded tracked content, not arbitrary process, database, remote, or filesystem effects.
3. **Git snapshots exclude untracked files.** Checkpoints use `git stash create` and the clean-tree check uses `--untracked-files=no`. Shell/subagent-created untracked files are outside that tree snapshot. A new file recorded by the dedicated write tool can still be removed by file undo.
4. **Rewind restores the worktree, not the index or branch.** The command uses `git restore --source=<sha> --worktree -- .`. HEAD and staged changes are not restored. Rewind is not a transaction over repository state.
5. **Undo can overwrite later work.** Restore writes saved bytes directly to the target. The implementation has no post-change-content comparison before restoring. User edits since the recorded call can be replaced after confirmation.
6. **Recovery is not atomic.** Undo handles files individually and can report partial/skipped results. Code restore can succeed before conversation restore fails or proves unsupported.
7. **Snapshots can contain sensitive data.** Pre-images are whole-file copies. The writer does not set explicit private file/directory modes; effective permissions depend on the environment. Approved edits to sensitive files can create another local copy that must be protected.
8. **Retention removes recovery history.** The cleanup deletes old pre-images and releases pinned Git refs. Retention runs at session start and can contribute I/O as history grows.
9. **Checkpoint safety is better than assuming empty output means clean.** `decideCheckpoint` distinguishes failed snapshots from a verified clean tracked tree. A failed checkpoint does not offer HEAD as a safe restore source.

A co-installation with the existing gate is not established here. It could add duplicate prompts and history work while retaining the current load cost. The source has no separate undo-only install entry established by this review.

### Recommendation for the undo decision

Undo work is deferred. The agreed turn is one user prompt and all agent work until its response finishes. The future operation restores that turn's local file changes together, including shell-created changes rather than only edit/write calls. Preserve pre-existing changes and later user edits; remote effects are outside the recovery guarantee. Use pify's mechanisms as reference material, not its broader history/rewind interface or silent snapshot failures. Recovery details and future verification are recorded in the [roadmap](../ROADMAP.md). No last-turn recovery behavior has been implemented or verified.

## Lazy-loading findings

1. Retain the current permission package for the first experiment. A small eager entry boundary must register enforcement before the editor becomes usable. Heavy services can load through one shared initialization promise when an action first needs them.
2. Do not just import the package and invoke its factory inside `tool_call`. Handler dispatch uses a snapshot, so newly registered handlers can miss the triggering action. The first action must be checked directly, not released after registration.
3. Preserve resource/skill discovery, input checks, agent preparation, session changes, shutdown, and failure behavior. Loading only at the first shell call loses more than shell enforcement.
4. FFF can defer finder creation to its existing search/autocomplete boundary. Preserve one initialization promise, scan completion behavior, and explicit failures. The first file lookup will then bear part of the delay.
5. Measure readiness together with first prompt and first protected tool latency. For last-turn undo, also measure snapshot overhead, first mutation, and end-of-turn work. Do not add a long-term history requirement just to match a reference package.

These are experiment recommendations, not a completed design or implementation. No Pi fork is required by the proposed extension-boundary investigation.

## Compatibility exclusions

Installed Pi is 1.1.0 and current gotgenes permissions is 40.1.4. The following published ranges explicitly exclude one of those installed versions:

- `pi-permission-system`: Pi ranges end at 0.80.x.
- `@bryan2333/pi-permission-system`: Pi ranges end at 0.84.x.
- `pi-sandbox`: Pi peer is `^0.80.0`.
- `@geohar/pi-permissions-analyzer`: Pi peer is `^0.86.0`.
- `@xzzpig/pi-agent-role`: Pi peer is `>=0.83.0 <1`.
- `@valdo766hi/pi-yolo`: Pi ranges exclude 1.1.0 and permission ranges exclude 40.1.4.
- `@mzwing/pi-permission-auto-review`: permission peers accept major versions 37, 38, or 39, not 40.

Other broad peer ranges are not runtime compatibility proof. No migration patches or compatibility adapters were implemented.

## All 61 catalog entries

Categories distinguish replacements from add-ons and unrelated workflows. Each finding includes its loading behavior or the reason it does not replace the main gate. Source links lead to the reviewed version's published archive, not an unpinned repository branch.


### 1. `@adeildo/pi-ask-permission@5.5.0`

**Category:** gate

Loads configuration, saved grants, session rulings, and typing/UI state at session start. The tool gate describes custom and nested calls and supports a judge and headless policy. Static imports include its kit, question UI, previews, and judge pipeline. A policy-migration candidate, not a proven startup win.

**Evidence:** [@adeildo/pi-ask-permission@5.5.0](https://www.npmjs.com/package/@adeildo/pi-ask-permission/v/5.5.0) · [reviewed source archive](https://registry.npmjs.org/@adeildo/pi-ask-permission/-/pi-ask-permission-5.5.0.tgz). Local source: `packages/@adeildo__pi-ask-permission/source/`.

### 2. `@adeildo/pi-harness@5.5.0`

**Category:** bundle

Six extension entries delegate to the permission dialog and other adeildo packages. This is a bundle of permission, presentation, provider, question, skill, and goal features. Prefer evaluating its permission component alone; the bundle does not eliminate permission work.

**Evidence:** [@adeildo/pi-harness@5.5.0](https://www.npmjs.com/package/@adeildo/pi-harness/v/5.5.0) · [reviewed source archive](https://registry.npmjs.org/@adeildo/pi-harness/-/pi-harness-5.5.0.tgz). Local source: `packages/@adeildo__pi-harness/source/`.

### 3. `@bryan2333/pi-permission-system@0.10.0`

**Category:** gate

Refreshes runtime and permission state, awaits model-option compatibility, and manages forwarded permission polling. The gate blocks missing tool names and checks tool registration. Tree-sitter dependencies add shell parsing. Its declared host ranges stop at 0.84.x and exclude installed Pi 1.1.0.

**Evidence:** [@bryan2333/pi-permission-system@0.10.0](https://www.npmjs.com/package/@bryan2333/pi-permission-system/v/0.10.0) · [reviewed source archive](https://registry.npmjs.org/@bryan2333/pi-permission-system/-/pi-permission-system-0.10.0.tgz). Local source: `packages/@bryan2333__pi-permission-system/source/`.

### 4. `@ccask/pi-safety-gate@0.1.4`

**Category:** gate

Loads cached configuration, rules, and audit state during tool calls rather than through a session-start hook. Uses deterministic tiers and a model for remaining actions. An outer catch explicitly blocks internal failures. Its hard-deny floor is narrow; a replacement would change your policy and add classifier delay.

**Evidence:** [@ccask/pi-safety-gate@0.1.4](https://www.npmjs.com/package/@ccask/pi-safety-gate/v/0.1.4) · [reviewed source archive](https://registry.npmjs.org/@ccask/pi-safety-gate/-/pi-safety-gate-0.1.4.tgz). Local source: `packages/@ccask__pi-safety-gate/source/`.

### 5. `@counterposition/pi-auto-mode@0.4.0`

**Category:** addon

Requires gotgenes permissions and registers an automatic reviewer. Session start loads configuration, can begin classifier checks, and awaits git remote -v with a five-second timeout. The dynamic permission-service import is useful evidence for optional loading, but this add-on cannot replace the base gate.

**Evidence:** [@counterposition/pi-auto-mode@0.4.0](https://www.npmjs.com/package/@counterposition/pi-auto-mode/v/0.4.0) · [reviewed source archive](https://registry.npmjs.org/@counterposition/pi-auto-mode/-/pi-auto-mode-0.4.0.tgz). Local source: `packages/@counterposition__pi-auto-mode/source/`.

### 6. `@estebanforge/pi-ask-claude@1.0.5`

**Category:** workflow

Registers an AskClaude delegation tool backed by the Claude Code CLI. Permission modes apply to that child CLI, not to all host Pi tools. This is a delegation feature, not a replacement gate.

**Evidence:** [@estebanforge/pi-ask-claude@1.0.5](https://www.npmjs.com/package/@estebanforge/pi-ask-claude/v/1.0.5) · [reviewed source archive](https://registry.npmjs.org/@estebanforge/pi-ask-claude/-/pi-ask-claude-1.0.5.tgz). Local source: `packages/@estebanforge__pi-ask-claude/source/`.

### 7. `@geohar/pi-permissions-analyzer@0.3.1`

**Category:** addon

Probes the automatic reviewer and inspects classifier prompts. Starts delayed diagnostics at session start and expects the base permission system. Published peer ranges target Pi 0.86.x and an older auto-review package. It does not replace enforcement or reduce the base load.

**Evidence:** [@geohar/pi-permissions-analyzer@0.3.1](https://www.npmjs.com/package/@geohar/pi-permissions-analyzer/v/0.3.1) · [reviewed source archive](https://registry.npmjs.org/@geohar/pi-permissions-analyzer/-/pi-permissions-analyzer-0.3.1.tgz). Local source: `packages/@geohar__pi-permissions-analyzer/source/`.

### 8. `@gotgenes/pi-permission-model-judge@3.0.0`

**Category:** addon

Registers a model-judge authorizer for external-directory asks. Loads configuration and model registry at session start. Requires gotgenes permissions. Useful for typo-path decisions, not for removing the base permission startup cost.

**Evidence:** [@gotgenes/pi-permission-model-judge@3.0.0](https://www.npmjs.com/package/@gotgenes/pi-permission-model-judge/v/3.0.0) · [reviewed source archive](https://registry.npmjs.org/@gotgenes/pi-permission-model-judge/-/pi-permission-model-judge-3.0.0.tgz). Local source: `packages/@gotgenes__pi-permission-model-judge/source/`.

### 9. `@gotgenes/pi-permission-system@40.1.4`

**Category:** current

Current package. A large static module graph constructs permission services before registering lifecycle, resource, input, agent-preparation, and tool hooks. Its bash WASM parser already uses dynamic import. The tool gate has an explicit fail-closed wrapper. Optimize the entry boundary rather than treating the parser alone as the full startup cost.

**Evidence:** [@gotgenes/pi-permission-system@40.1.4](https://www.npmjs.com/package/@gotgenes/pi-permission-system/v/40.1.4) · [reviewed source archive](https://registry.npmjs.org/@gotgenes/pi-permission-system/-/pi-permission-system-40.1.4.tgz). Local source: `packages/@gotgenes__pi-permission-system/source/`.

### 10. `@handy_wote/pi-permissions@0.1.1`

**Category:** gate

Compiled JavaScript entry. Session start reloads trusted configuration and constructs the handler; missing handler state explicitly blocks. WASM parser initialization is lazy, although the parser module statically imports tree-sitter. Rule precedence and conservative parser fallback are useful. Custom input extraction lacks equivalent command/path interpretation. Worth isolated measurement only after policy mapping.

**Evidence:** [@handy_wote/pi-permissions@0.1.1](https://www.npmjs.com/package/@handy_wote/pi-permissions/v/0.1.1) · [reviewed source archive](https://registry.npmjs.org/@handy_wote/pi-permissions/-/pi-permissions-0.1.1.tgz). Local source: `packages/@handy_wote__pi-permissions/source/`.

### 11. `@hank-warren/pi-ask-user-question@0.6.1`

**Category:** workflow

Registers a structured question tool and reconciles tool availability before agent start. Shared permission-selector UI does not make it an enforcement package. No replacement benefit for the current gate.

**Evidence:** [@hank-warren/pi-ask-user-question@0.6.1](https://www.npmjs.com/package/@hank-warren/pi-ask-user-question/v/0.6.1) · [reviewed source archive](https://registry.npmjs.org/@hank-warren/pi-ask-user-question/-/pi-ask-user-question-0.6.1.tgz). Local source: `packages/@hank-warren__pi-ask-user-question/source/`.

### 12. `@hank-warren/pi-auto-permissions@0.21.0`

**Category:** narrow

Intercepts Bash tool calls only and applies context-aware guardian review. Invalid configuration explicitly blocks the Bash call. Other tools return without a decision. Useful Bash automation, but direct secret-file reads and general custom tools need another gate.

**Evidence:** [@hank-warren/pi-auto-permissions@0.21.0](https://www.npmjs.com/package/@hank-warren/pi-auto-permissions/v/0.21.0) · [reviewed source archive](https://registry.npmjs.org/@hank-warren/pi-auto-permissions/-/pi-auto-permissions-0.21.0.tgz). Local source: `packages/@hank-warren__pi-auto-permissions/source/`.

### 13. `@inobit/pi-permission@1.2.0`

**Category:** gate

No declared runtime dependencies. Factory reads global configuration to register mode shortcuts; other configuration is cached by cwd and trust. Provides sensitive-file checks and its own Bash/PowerShell effect analysis. Build mode allows unknown tools with no path, and path extraction uses input.path. Sensitive paths normally ask rather than preserve arbitrary hard-deny rules. Not an equivalent replacement.

**Evidence:** [@inobit/pi-permission@1.2.0](https://www.npmjs.com/package/@inobit/pi-permission/v/1.2.0) · [reviewed source archive](https://registry.npmjs.org/@inobit/pi-permission/-/pi-permission-1.2.0.tgz). Local source: `packages/@inobit__pi-permission/source/`.

### 14. `@komarspn/pi-permission-system@36.2.2`

**Category:** fork

Shares the gotgenes service architecture, lifecycle hooks, fail-closed wrapper, and dynamic Bash parser import. Source comparison finds 87 identical paths among 165 shared TypeScript paths. There is no evidence that changing to this older family member removes the heavy entry graph.

**Evidence:** [@komarspn/pi-permission-system@36.2.2](https://www.npmjs.com/package/@komarspn/pi-permission-system/v/36.2.2) · [reviewed source archive](https://registry.npmjs.org/@komarspn/pi-permission-system/-/pi-permission-system-36.2.2.tgz). Local source: `packages/@komarspn__pi-permission-system/source/`.

### 15. `@ladbabynpm/picc-claude-shim@0.1.10`

**Category:** workflow

A Claude Code protocol/CLI compatibility layer. Its executable has a dynamic slow-entry import, which is not evidence about host permission readiness. It changes how external clients drive Pi, not the host tool policy.

**Evidence:** [@ladbabynpm/picc-claude-shim@0.1.10](https://www.npmjs.com/package/@ladbabynpm/picc-claude-shim/v/0.1.10) · [reviewed source archive](https://registry.npmjs.org/@ladbabynpm/picc-claude-shim/-/picc-claude-shim-0.1.10.tgz). Local source: `packages/@ladbabynpm__picc-claude-shim/source/`.

### 16. `@ladbabynpm/picc-permission-modes@0.1.3`

**Category:** gate

Implements Claude-style modes and rules, including auto and plan workflows. The tool gate makes mode-dependent decisions and permits its plan file specially. Static imports include shell-quote and diff. The upstream package name does not establish identical behavior. Requires independent policy mapping and measurement.

**Evidence:** [@ladbabynpm/picc-permission-modes@0.1.3](https://www.npmjs.com/package/@ladbabynpm/picc-permission-modes/v/0.1.3) · [reviewed source archive](https://registry.npmjs.org/@ladbabynpm/picc-permission-modes/-/picc-permission-modes-0.1.3.tgz). Local source: `packages/@ladbabynpm__picc-permission-modes/source/`.

### 17. `@manuelstolze/pi-permission-gate@1.0.1`

**Category:** narrow

Compiled JavaScript and no declared runtime dependencies. Loads command patterns at session start. Guards only Bash; unreadable custom configuration falls back to built-in dangerous-command patterns with a warning. Its declared Pi 1.1 range matches this host, but it does not preserve secret-path enforcement.

**Evidence:** [@manuelstolze/pi-permission-gate@1.0.1](https://www.npmjs.com/package/@manuelstolze/pi-permission-gate/v/1.0.1) · [reviewed source archive](https://registry.npmjs.org/@manuelstolze/pi-permission-gate/-/pi-permission-gate-1.0.1.tgz). Local source: `packages/@manuelstolze__pi-permission-gate/source/`.

### 18. `@mattschoe/pi-plan@1.1.2`

**Category:** workflow

Adds plan and accept-edits workflows, approval explanations, and execution tracking. Plan mode blocks writes/edits and gates Bash as read-only. Protections depend on the selected workflow mode rather than matching your full permission policy.

**Evidence:** [@mattschoe/pi-plan@1.1.2](https://www.npmjs.com/package/@mattschoe/pi-plan/v/1.1.2) · [reviewed source archive](https://registry.npmjs.org/@mattschoe/pi-plan/-/pi-plan-1.1.2.tgz). Local source: `packages/@mattschoe__pi-plan/source/`.

### 19. `@mzwing/pi-permission-auto-review@0.8.0`

**Category:** addon

Registers automatic approval review for gotgenes asks. Session start loads trust-aware configuration and creates reviewer state. The published peer range accepts gotgenes 37, 38, or 39, not installed 40.1.4. It is an add-on, not a startup replacement.

**Evidence:** [@mzwing/pi-permission-auto-review@0.8.0](https://www.npmjs.com/package/@mzwing/pi-permission-auto-review/v/0.8.0) · [reviewed source archive](https://registry.npmjs.org/@mzwing/pi-permission-auto-review/-/pi-permission-auto-review-0.8.0.tgz). Local source: `packages/@mzwing__pi-permission-auto-review/source/`.

### 20. `@nilskluewer/pi-auto-permission-gate@0.8.0`

**Category:** narrow

Restores mode, command rules, and auto preferences in parallel at session start. Guards model-generated Bash only. Includes hard denies and optional classifier review; matching asks deny without UI. Its own README excludes direct user shell and file tools. Not sufficient alone.

**Evidence:** [@nilskluewer/pi-auto-permission-gate@0.8.0](https://www.npmjs.com/package/@nilskluewer/pi-auto-permission-gate/v/0.8.0) · [reviewed source archive](https://registry.npmjs.org/@nilskluewer/pi-auto-permission-gate/-/pi-auto-permission-gate-0.8.0.tgz). Local source: `packages/@nilskluewer__pi-auto-permission-gate/source/`.

### 21. `@nilskluewer/pi-subagent@0.8.0`

**Category:** workflow

Creates child Pi sessions and coordinates parent-side approvals with its gate package. Session hooks restore subagent UI/default state. This addresses child execution and forwarding, not the main session permission gate.

**Evidence:** [@nilskluewer/pi-subagent@0.8.0](https://www.npmjs.com/package/@nilskluewer/pi-subagent/v/0.8.0) · [reviewed source archive](https://registry.npmjs.org/@nilskluewer/pi-subagent/-/pi-subagent-0.8.0.tgz). Local source: `packages/@nilskluewer__pi-subagent/source/`.

### 22. `@pi-kit/permissions@0.3.0`

**Category:** gate

Small allow/ask/deny guardrail with shared helper dependency. Loads configuration at session start and also supports ensureLoaded during calls. Internal gate errors explicitly block, and untrusted project rules are excluded. Documentation explicitly excludes many shell evasions, expansion, and symlink semantics. Not equivalent to Bash intent parsing.

**Evidence:** [@pi-kit/permissions@0.3.0](https://www.npmjs.com/package/@pi-kit/permissions/v/0.3.0) · [reviewed source archive](https://registry.npmjs.org/@pi-kit/permissions/-/permissions-0.3.0.tgz). Local source: `packages/@pi-kit__permissions/source/`.

### 23. `@pify/yolo@0.15.0`

**Category:** undo-gate

Four modes; default approve, not automatic YOLO. Secret and catastrophic checks remain active across modes. Records edit/write pre-images, risky-command checkpoints, and prompt checkpoints. Session start loads rules, prunes history, releases old Git refs, and restores session state. Best undo candidate, but recording failures are silently ignored and policy coverage differs.

**Evidence:** [@pify/yolo@0.15.0](https://www.npmjs.com/package/@pify/yolo/v/0.15.0) · [reviewed source archive](https://registry.npmjs.org/@pify/yolo/-/yolo-0.15.0.tgz). Local source: `packages/@pify__yolo/source/`.

### 24. `@restranger/pi-permission-system@40.1.3`

**Category:** fork

Closest published source relative: 162 identical paths among 168 shared TypeScript paths. Retains the same lifecycle, fail-closed gate, and dynamic Bash parser architecture. No demonstrated startup advantage from substitution.

**Evidence:** [@restranger/pi-permission-system@40.1.3](https://www.npmjs.com/package/@restranger/pi-permission-system/v/40.1.3) · [reviewed source archive](https://registry.npmjs.org/@restranger/pi-permission-system/-/pi-permission-system-40.1.3.tgz). Local source: `packages/@restranger__pi-permission-system/source/`.

### 25. `@schuettc/pi-permission-system@35.0.3-schuettc.1`

**Category:** fork

Older gotgenes-family package. Shares 84 identical paths among 164 common TypeScript paths and retains the service composition and lifecycle hooks. No demonstrated loading advantage; behavior would need a migration review.

**Evidence:** [@schuettc/pi-permission-system@35.0.3-schuettc.1](https://www.npmjs.com/package/@schuettc/pi-permission-system/v/35.0.3-schuettc.1) · [reviewed source archive](https://registry.npmjs.org/@schuettc/pi-permission-system/-/pi-permission-system-35.0.3-schuettc.1.tgz). Local source: `packages/@schuettc__pi-permission-system/source/`.

### 26. `@sikongjueluo/pi-permission-ai-judge@0.0.1`

**Category:** addon

Judges pending Bash permission prompts in shadow or enforce mode. Session start prepares interactive judge state. Requires gotgenes permissions; enforce mode can auto-allow a model-approved ask. Not a replacement and introduces classifier risk/cost.

**Evidence:** [@sikongjueluo/pi-permission-ai-judge@0.0.1](https://www.npmjs.com/package/@sikongjueluo/pi-permission-ai-judge/v/0.0.1) · [reviewed source archive](https://registry.npmjs.org/@sikongjueluo/pi-permission-ai-judge/-/pi-permission-ai-judge-0.0.1.tgz). Local source: `packages/@sikongjueluo__pi-permission-ai-judge/source/`.

### 27. `@valdo766hi/pi-yolo@0.1.7`

**Category:** addon

A session-local approval overlay for gotgenes, not the same package as pify/yolo. Patches UI state at session start and blocks if it cannot verify a safe overlay state. Published ranges exclude both installed gotgenes 40.1.4 and Pi 1.1.0. No file-undo feature established.

**Evidence:** [@valdo766hi/pi-yolo@0.1.7](https://www.npmjs.com/package/@valdo766hi/pi-yolo/v/0.1.7) · [reviewed source archive](https://registry.npmjs.org/@valdo766hi/pi-yolo/-/pi-yolo-0.1.7.tgz). Local source: `packages/@valdo766hi__pi-yolo/source/`.

### 28. `@xynogen/pix-gate@0.4.1`

**Category:** narrow

Guards selected path tools and Bash/PowerShell/proc command tools with severity tiers and Pix UI/runtime dependencies. Some tiers use allow-first dialogs; headless command policy differs by severity. Other custom tools fall outside the named sets. Could supply selected guards, not equivalent general permission coverage.

**Evidence:** [@xynogen/pix-gate@0.4.1](https://www.npmjs.com/package/@xynogen/pix-gate/v/0.4.1) · [reviewed source archive](https://registry.npmjs.org/@xynogen/pix-gate/-/pix-gate-0.4.1.tgz). Local source: `packages/@xynogen__pix-gate/source/`.

### 29. `@xzzpig/pi-agent-role@0.1.0`

**Category:** addon

Selects agent, sandbox, and permission profiles. Session start clears stale role state; discovery and sandbox service loading use dynamic imports. Requires companion packages. Published host range is pre-1.0, so it is not a compatible replacement for this installed host.

**Evidence:** [@xzzpig/pi-agent-role@0.1.0](https://www.npmjs.com/package/@xzzpig/pi-agent-role/v/0.1.0) · [reviewed source archive](https://registry.npmjs.org/@xzzpig/pi-agent-role/-/pi-agent-role-0.1.0.tgz). Local source: `packages/@xzzpig__pi-agent-role/source/`.

### 30. `@xzzpig/pi-permission-system@1.7.0`

**Category:** fork

Retains gotgenes services and fail-closed gate, but changes wrapper-floor behavior and adds profile selection. Shares 146 identical paths among 168 common TypeScript paths. Wrapper re-parsing is a policy change, not an established startup optimization.

**Evidence:** [@xzzpig/pi-permission-system@1.7.0](https://www.npmjs.com/package/@xzzpig/pi-permission-system/v/1.7.0) · [reviewed source archive](https://registry.npmjs.org/@xzzpig/pi-permission-system/-/pi-permission-system-1.7.0.tgz). Local source: `packages/@xzzpig__pi-permission-system/source/`.

### 31. `@xzzpig/pi-sandbox@0.8.0`

**Category:** sandbox

Forked OS sandbox with profile/service integration. Session start publishes service state and enables the configured sandbox. Tool and user-shell paths check startup/profile state. Uses a sandbox-runtime dependency. Changes the enforcement model and does not provide a proven readiness gain.

**Evidence:** [@xzzpig/pi-sandbox@0.8.0](https://www.npmjs.com/package/@xzzpig/pi-sandbox/v/0.8.0) · [reviewed source archive](https://registry.npmjs.org/@xzzpig/pi-sandbox/-/pi-sandbox-0.8.0.tgz). Local source: `packages/@xzzpig__pi-sandbox/source/`.

### 32. `@yaosu/pi-path-guard@1.7.1`

**Category:** narrow

Loads saved configuration and restores the selected guard mode at session start. Tool handler guards write/edit and Bash, not read. Protected-path write checks therefore do not replace your secret-read checks. Permissive modes can persist and are reported by warnings.

**Evidence:** [@yaosu/pi-path-guard@1.7.1](https://www.npmjs.com/package/@yaosu/pi-path-guard/v/1.7.1) · [reviewed source archive](https://registry.npmjs.org/@yaosu/pi-path-guard/-/pi-path-guard-1.7.1.tgz). Local source: `packages/@yaosu__pi-path-guard/source/`.

### 33. `omp-auto-approval@0.1.0`

**Category:** other-host

An OMP-oriented automatic classifier gate. Registers similar refresh and tool-call handlers to pi-auto-approval and dynamically loads model helpers. OMP-specific packaging and behavior are not proof of compatibility with this Pi host. Prefer evaluating the Pi package if pursuing this design.

**Evidence:** [omp-auto-approval@0.1.0](https://www.npmjs.com/package/omp-auto-approval/v/0.1.0) · [reviewed source archive](https://registry.npmjs.org/omp-auto-approval/-/omp-auto-approval-0.1.0.tgz). Local source: `packages/omp-auto-approval/source/`.

### 34. `one-code-extension@0.4.1`

**Category:** bundle

Dozens of extension entry points implement a full Claude-style harness, permissions, hooks, MCP, tracking, workflow, and UI. File tracking can refuse blind or stale edits. Its recoverability check assesses Git state rather than establishing a general undo trail. Too broad to recommend as a startup-only substitution without isolating its permission component.

**Evidence:** [one-code-extension@0.4.1](https://www.npmjs.com/package/one-code-extension/v/0.4.1) · [reviewed source archive](https://registry.npmjs.org/one-code-extension/-/one-code-extension-0.4.1.tgz). Local source: `packages/one-code-extension/source/`.

### 35. `pi-allowlist-plugin@1.2.1`

**Category:** gate

Session start clears approvals; tool calls load effective configuration and gate edits, shell, and dispositive external/MCP actions. Unlisted gated actions ask or deny headlessly. Read-only tools are intentionally untouched. Your secret-read rules would need separate enforcement.

**Evidence:** [pi-allowlist-plugin@1.2.1](https://www.npmjs.com/package/pi-allowlist-plugin/v/1.2.1) · [reviewed source archive](https://registry.npmjs.org/pi-allowlist-plugin/-/pi-allowlist-plugin-1.2.1.tgz). Local source: `packages/pi-allowlist-plugin/source/`.

### 36. `pi-amplike@1.4.0`

**Category:** bundle

An Amp-style suite. Its permissions component guards Bash and bypasses that gate in YOLO mode. Other extensions add skills, handoff, web, and mode workflows. This is neither equivalent general tool enforcement nor a narrow startup replacement.

**Evidence:** [pi-amplike@1.4.0](https://www.npmjs.com/package/pi-amplike/v/1.4.0) · [reviewed source archive](https://registry.npmjs.org/pi-amplike/-/pi-amplike-1.4.0.tgz). Local source: `packages/pi-amplike/source/`.

### 37. `pi-auto-approval@0.1.1`

**Category:** gate

Standalone classifier gate. Session/resource hooks refresh configuration. Routing fast-paths read-only tools, workspace-safe writes, and exact approvals; remaining calls use classifier/fallback decisions. Classifier errors can ask or deny depending on mode. Secret policies must be mapped before those fast paths could be accepted.

**Evidence:** [pi-auto-approval@0.1.1](https://www.npmjs.com/package/pi-auto-approval/v/0.1.1) · [reviewed source archive](https://registry.npmjs.org/pi-auto-approval/-/pi-auto-approval-0.1.1.tgz). Local source: `packages/pi-auto-approval/source/`.

### 38. `pi-better-sandbox@0.12.0`

**Category:** sandbox

Supports main/subagent profiles and shell/file boundaries. Session start registers the project boundary and restores permission state. Main starts inactive by design, and tool gates return while inactive or disabled. A fast inactive profile would not be a fair safety-equivalent benchmark.

**Evidence:** [pi-better-sandbox@0.12.0](https://www.npmjs.com/package/pi-better-sandbox/v/0.12.0) · [reviewed source archive](https://registry.npmjs.org/pi-better-sandbox/-/pi-better-sandbox-0.12.0.tgz). Local source: `packages/pi-better-sandbox/source/`.

### 39. `pi-bouncer@0.3.1`

**Category:** narrow

Bash-only parser gate using unbash. Delegated session initialization and tool decisions cover wrappers, chains, and substitutions. Its README acknowledges unknown/evasive command limits. Suggests using an external trash command for recoverable deletion; this is not a built-in file/prompt undo history.

**Evidence:** [pi-bouncer@0.3.1](https://www.npmjs.com/package/pi-bouncer/v/0.3.1) · [reviewed source archive](https://registry.npmjs.org/pi-bouncer/-/pi-bouncer-0.3.1.tgz). Local source: `packages/pi-bouncer/source/`.

### 40. `pi-craft@0.1.18`

**Category:** bundle

Eight entries implement planning, questions, subagents, Git automation, initialization, publishing, and permissions. Permission session startup activates authority and a forwarding server; tool calls build/cache path policy. Rich workflow and forwarding, but replacing the whole setup expands product scope.

**Evidence:** [pi-craft@0.1.18](https://www.npmjs.com/package/pi-craft/v/0.1.18) · [reviewed source archive](https://registry.npmjs.org/pi-craft/-/pi-craft-0.1.18.tgz). Local source: `packages/pi-craft/source/`.

### 41. `pi-jev-auto-mode@0.5.0`

**Category:** narrow

Jev semantic gate for Bash, write, and edit. Session start refreshes state; calls can refresh on demand and fail closed when a decision is unavailable. Direct reads and general custom tools are outside the advertised protected set. Adds external reviewer cost/latency rather than preserving your deterministic policy alone.

**Evidence:** [pi-jev-auto-mode@0.5.0](https://www.npmjs.com/package/pi-jev-auto-mode/v/0.5.0) · [reviewed source archive](https://registry.npmjs.org/pi-jev-auto-mode/-/pi-jev-auto-mode-0.5.0.tgz). Local source: `packages/pi-jev-auto-mode/source/`.

### 42. `pi-jev-permit@0.3.0`

**Category:** narrow

Tool-call-only registration loads trust-aware configuration for each call. Judges Bash/write/edit behind rule floors and a read-only fast path. No session-start initialization found in its direct gate path. Useful loading pattern, but direct secret reads require other protection and reviewer decisions add first-use latency.

**Evidence:** [pi-jev-permit@0.3.0](https://www.npmjs.com/package/pi-jev-permit/v/0.3.0) · [reviewed source archive](https://registry.npmjs.org/pi-jev-permit/-/pi-jev-permit-0.3.0.tgz). Local source: `packages/pi-jev-permit/source/`.

### 43. `pi-minimal-permission-system@1.5.1`

**Category:** gate

Session start resolves YOLO/noninteractive state and loads policy unless bypassed. Handles read/edit/write/Bash and optional codemode syntax rules; other extension tools explicitly pass through. Bash matching is regex, not shell AST intent analysis. Acorn/esquery are statically imported. Smaller scope, not equivalent policy.

**Evidence:** [pi-minimal-permission-system@1.5.1](https://www.npmjs.com/package/pi-minimal-permission-system/v/1.5.1) · [reviewed source archive](https://registry.npmjs.org/pi-minimal-permission-system/-/pi-minimal-permission-system-1.5.1.tgz). Local source: `packages/pi-minimal-permission-system/source/`.

### 44. `pi-muselinn-harness@0.9.22`

**Category:** bundle

A broad Kimi-style harness with a multi-layer permission chain, hooks, swarm, goal, plan, and background workflows. Tool-call logic first waits for pause state and invokes pre-tool hooks. README compatibility evidence focuses on older Pi versions despite broad peer ranges. Not a narrow performance substitution.

**Evidence:** [pi-muselinn-harness@0.9.22](https://www.npmjs.com/package/pi-muselinn-harness/v/0.9.22) · [reviewed source archive](https://registry.npmjs.org/pi-muselinn-harness/-/pi-muselinn-harness-0.9.22.tgz). Local source: `packages/pi-muselinn-harness/source/`.

### 45. `pi-nono@3.0.2`

**Category:** sandbox

Uses Effect and platform-native nono sandbox support. Session start enables/registers approval state and initializes runtime; file calls block when runtime is not ready or failed. Alpha status and native/platform requirements matter. Provides containment rather than a drop-in match for current rules.

**Evidence:** [pi-nono@3.0.2](https://www.npmjs.com/package/pi-nono/v/3.0.2) · [reviewed source archive](https://registry.npmjs.org/pi-nono/-/pi-nono-3.0.2.tgz). Local source: `packages/pi-nono/source/`.

### 46. `pi-permission-ai-guard@0.14.1`

**Category:** addon

Registers a gotgenes authorizer for selected asks and uses stripped transcript review. Session start loads trust-aware config and restores overrides; branch navigation updates context. Requires the base gate and adds reviewer work, not base-load savings.

**Evidence:** [pi-permission-ai-guard@0.14.1](https://www.npmjs.com/package/pi-permission-ai-guard/v/0.14.1) · [reviewed source archive](https://registry.npmjs.org/pi-permission-ai-guard/-/pi-permission-ai-guard-0.14.1.tgz). Local source: `packages/pi-permission-ai-guard/source/`.

### 47. `pi-permission-bash-cmd-checker@0.2.0`

**Category:** addon

Enhances gotgenes permission dialogs with command explanations and optional classification. Interactive session lifecycle sets up its controller; permission service is dynamically imported. This is evidence for optional service loading, not a replacement gate.

**Evidence:** [pi-permission-bash-cmd-checker@0.2.0](https://www.npmjs.com/package/pi-permission-bash-cmd-checker/v/0.2.0) · [reviewed source archive](https://registry.npmjs.org/pi-permission-bash-cmd-checker/-/pi-permission-bash-cmd-checker-0.2.0.tgz). Local source: `packages/pi-permission-bash-cmd-checker/source/`.

### 48. `pi-permission-classifier@0.5.2`

**Category:** addon

Registers a classifier authorizer for gotgenes asks. Session start loads configuration, current model, registry, and UI context. Returns allow/deny/defer through the existing authorizer chain. Keeps the base gate dependency and does not remove its startup load.

**Evidence:** [pi-permission-classifier@0.5.2](https://www.npmjs.com/package/pi-permission-classifier/v/0.5.2) · [reviewed source archive](https://registry.npmjs.org/pi-permission-classifier/-/pi-permission-classifier-0.5.2.tgz). Local source: `packages/pi-permission-classifier/source/`.

### 49. `pi-permission-explain@0.1.1`

**Category:** addon

Adds an on-demand explanation key to existing permission prompts. Session start validates configuration and the key, and retains UI context. It changes dialog convenience, not enforcement or base startup architecture.

**Evidence:** [pi-permission-explain@0.1.1](https://www.npmjs.com/package/pi-permission-explain/v/0.1.1) · [reviewed source archive](https://registry.npmjs.org/pi-permission-explain/-/pi-permission-explain-0.1.1.tgz). Local source: `packages/pi-permission-explain/source/`.

### 50. `pi-permission-guardian@0.1.7`

**Category:** gate

Factory composes services without reading config. Session start loads trust-aware config and initializes audit; parser warmup is deferred to before_agent_start. Tool decision code explicitly blocks unexpected internal failures and handles unloaded config conservatively on gated surfaces. Promising lazy-boundary design, but static imports and policy/classifier semantics still need mapping and measurement.

**Evidence:** [pi-permission-guardian@0.1.7](https://www.npmjs.com/package/pi-permission-guardian/v/0.1.7) · [reviewed source archive](https://registry.npmjs.org/pi-permission-guardian/-/pi-permission-guardian-0.1.7.tgz). Local source: `packages/pi-permission-guardian/source/`.

### 51. `pi-permission-layers@1.4.0`

**Category:** gate

Session start selects UI or no-UI strategy. Gates Bash/write/edit and applies configured levels to other tools, including MCP. No-UI strategy blocks operations above the selected level. Shell-quote plus level classification is not equivalent to your path and Bash intent policy. Good scope to inspect, but not a verified replacement.

**Evidence:** [pi-permission-layers@1.4.0](https://www.npmjs.com/package/pi-permission-layers/v/1.4.0) · [reviewed source archive](https://registry.npmjs.org/pi-permission-layers/-/pi-permission-layers-1.4.0.tgz). Local source: `packages/pi-permission-layers/source/`.

### 52. `pi-permission-modes@2.4.1`

**Category:** gate

Declarative modes combine tool/skill/custom-tool policy with OS sandboxing. Session start loads configuration, restores mode/plan state, creates and sweeps scratch paths, changes temporary-directory environment, and awaits sandbox initialization. Tree-sitter import is lazy. Broad features, but eager sandbox setup makes it no established startup shortcut.

**Evidence:** [pi-permission-modes@2.4.1](https://www.npmjs.com/package/pi-permission-modes/v/2.4.1) · [reviewed source archive](https://registry.npmjs.org/pi-permission-modes/-/pi-permission-modes-2.4.1.tgz). Local source: `packages/pi-permission-modes/source/`.

### 53. `pi-permission-system@0.8.0`

**Category:** gate

MasuRii package, distinct from gotgenes. Session start awaits model-option compatibility, refreshes runtime/permission state, and starts forwarded polling. Its large main module and regex-oriented policy are not automatically equivalent to current intent analysis. Declared host ranges end at 0.80.x and exclude Pi 1.1.0.

**Evidence:** [pi-permission-system@0.8.0](https://www.npmjs.com/package/pi-permission-system/v/0.8.0) · [reviewed source archive](https://registry.npmjs.org/pi-permission-system/-/pi-permission-system-0.8.0.tgz). Local source: `packages/pi-permission-system/source/`.

### 54. `pi-run-mode@1.0.11`

**Category:** gate

Restores workflow/config/session state and activates plan tools at session start. Dedicated gate uses cross-mode hard denies, then mode policy for supported requests; unsupported requests return without gating. Ask/plan/auto workflows and model choices change behavior. No established general custom-tool or undo equivalence.

**Evidence:** [pi-run-mode@1.0.11](https://www.npmjs.com/package/pi-run-mode/v/1.0.11) · [reviewed source archive](https://registry.npmjs.org/pi-run-mode/-/pi-run-mode-1.0.11.tgz). Local source: `packages/pi-run-mode/source/`.

### 55. `pi-sandbox@0.7.1`

**Category:** sandbox

Initializes enabled sandbox during session_start. Shell runs through sandbox operations; selected file tools have explicit allow/deny checks and prompts. Disabled config bypasses interception. Declared host peer range is Pi 0.80.x, excluding installed 1.1.0. Not an unmodified compatible startup replacement.

**Evidence:** [pi-sandbox@0.7.1](https://www.npmjs.com/package/pi-sandbox/v/0.7.1) · [reviewed source archive](https://registry.npmjs.org/pi-sandbox/-/pi-sandbox-0.7.1.tgz). Local source: `packages/pi-sandbox/source/`.

### 56. `pi-sandbox-minimal@0.1.0`

**Category:** sandbox

Initializes a filesystem-only sandbox and replaces footer behavior at session start. Covers Bash plus read/write/edit/ls/grep/find; network is intentionally unrestricted. Uses sandbox-runtime. Removes network policy relative to richer sandboxes but does not eliminate sandbox startup initialization.

**Evidence:** [pi-sandbox-minimal@0.1.0](https://www.npmjs.com/package/pi-sandbox-minimal/v/0.1.0) · [reviewed source archive](https://registry.npmjs.org/pi-sandbox-minimal/-/pi-sandbox-minimal-0.1.0.tgz). Local source: `packages/pi-sandbox-minimal/source/`.

### 57. `pi-sandboxing@0.1.0`

**Category:** sandbox

No declared runtime dependencies, but requires bubblewrap or sandbox-exec. Session start discovers protected paths and a backend. Strict shell isolates host credentials and network; discovery/config/backend failures block strict execution. Installed custom tools/extensions remain trusted. No-runtime-dependency does not mean no OS work or equivalent workflow.

**Evidence:** [pi-sandboxing@0.1.0](https://www.npmjs.com/package/pi-sandboxing/v/0.1.0) · [reviewed source archive](https://registry.npmjs.org/pi-sandboxing/-/pi-sandboxing-0.1.0.tgz). Local source: `packages/pi-sandboxing/source/`.

### 58. `pi-subagent-permission-compat@0.1.0`

**Category:** addon

Publishes parent-session environment state and checks cwd fields in selected subagent tool inputs. Uses gotgenes as the permission system for forwarding. It patches child approval compatibility and project boundary checks, not the base tool policy.

**Evidence:** [pi-subagent-permission-compat@0.1.0](https://www.npmjs.com/package/pi-subagent-permission-compat/v/0.1.0) · [reviewed source archive](https://registry.npmjs.org/pi-subagent-permission-compat/-/pi-subagent-permission-compat-0.1.0.tgz). Local source: `packages/pi-subagent-permission-compat/source/`.

### 59. `pi-verdict@0.15.0`

**Category:** gate

Prototype-labeled source. Session start resets configuration/state, establishes tamper monitoring, and prunes audit history. Gate uses self-protection, deterministic rules/path checks, and model classification for gray areas. Compatibility helper is lazy. No direct undo implementation established; classifier design and startup work need measurement.

**Evidence:** [pi-verdict@0.15.0](https://www.npmjs.com/package/pi-verdict/v/0.15.0) · [reviewed source archive](https://registry.npmjs.org/pi-verdict/-/pi-verdict-0.15.0.tgz). Local source: `packages/pi-verdict/source/`.

### 60. `pi-workflows-claude@0.2.0`

**Category:** workflow

Registers a workflow tool and checks workflow-specific permission rules. Session start invalidates caches and starts a web control poller. These permissions cover workflow dispatch, not arbitrary host tools. A workflow feature, not a replacement gate.

**Evidence:** [pi-workflows-claude@0.2.0](https://www.npmjs.com/package/pi-workflows-claude/v/0.2.0) · [reviewed source archive](https://registry.npmjs.org/pi-workflows-claude/-/pi-workflows-claude-0.2.0.tgz). Local source: `packages/pi-workflows-claude/source/`.

### 61. `rolebox@1.10.0`

**Category:** bundle

Multi-host agent-role/harness plugin with memory, dispatch, LSP, web, and loop control. Published Pi entry is compiled, but the package has a broad dependency graph and platform adapters. Permission declarations apply to role/workflow operation, not an established drop-in match for current tool policy. No startup advantage or file-undo equivalence established.

**Evidence:** [rolebox@1.10.0](https://www.npmjs.com/package/rolebox/v/1.10.0) · [reviewed source archive](https://registry.npmjs.org/rolebox/-/rolebox-1.10.0.tgz). Local source: `packages/rolebox/source/`.

## Verification gaps

No replacement or lazy-entry implementation was run. No third-party tests were executed. No full dependency security audit was performed. Exact policy equivalence, installed-host runtime behavior, first-use latency, coexistence with current extensions, and recovery under failures remain unverified.

The catalog query is a snapshot, not a claim about every permission extension on npm. The 61 entries include add-ons, bundles, and workflows because that is what the official filtered catalog returned.
