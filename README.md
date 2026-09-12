# pi-agent-config

Personal config for [pi](https://pi.dev), my sole AI coding agent. Ported from OpenCode for fast startup and lazy-loaded workflows.

## Layout

```
AGENTS.md            Global guardrails (~35 lines, always loaded)
skills/              Capability packages, loaded on demand
prompts/             Slash-expandable snippets (/commit, /explain, /release)
extensions/          pi-permission-system config only (no custom code)
settings.json        Startup, thinking, models, packages
models.json          Provider model overrides (context / max tokens)
```

## Principles

- Keep pi fast: default system prompt, `quietStartup`, no async fetch in extensions, no model judge, no MCP.
- Lazy load procedures. Protection stays always on.
- Deterministic only where it matters: secrets deny, remote writes ask. Everything else stays out of the way.
- Storage stays bounded: one JSONL file per session, one append per completed message. Permission review log off (it was the only unbounded log).

## Skills

15 advertised (name + description in system prompt, full body loaded on use):

| Skill | When |
|---|---|
| `codebase-investigation` | Explain how current code works, read-only (includes option-compare note) |
| `direct-assistance` | Small question or safe one-command task |
| `bug-resolution` | Reproduce, diagnose, fix, regression-test |
| `software-delivery` | Deliver approved change end to end |
| `implementation-planning` | Repo-backed delivery steps before editing |
| `code-review` | P0/P1 correctness, security, regression risks |
| `codebase-design` | Module seams, refactor boundaries, test seams |
| `coding-standards` | Style and conventions |
| `error-handling` | Failure paths and guards |
| `python-tooling` | `uv`/`uvx` workflows |
| `testing-best-practices` | Test selection and verification |
| `research` | External or unfamiliar facts |
| `technical-writing` | Reports, docs, PR/commit prose |
| `show-me` | Small visual when prose stays abstract |
| `architecture-diagram` | Architecture visuals |

5 explicit-only (`disable-model-invocation: true`, invoke via `/skill:name`):

| Skill | When |
|---|---|
| `create-pull-request` | User explicitly asks for a PR |
| `project-opportunities` | What to do next in a project |
| `write-postmortem` | Record fixed bug / incident |
| `architecture-decision` | Hard-to-reverse choice with alternatives |
| `google-personal-cli` | Read-only Gmail / Drive via `gpersonal` |

Dropped from the OpenCode port: `product-definition`, `improve-agent`, `doc-maintenance`, workflow router, `focused-exploration` (merged), `opencode_lint`.

Invoke: `/skill:code-review`, `/skill:create-pull-request extra args`.

## Prompts

| Prompt | Expands to |
|---|---|
| `/commit` | Categorize, confirm, stage, commit with repo conventions |
| `/explain` | Explain last message, concise chat voice |
| `/release` | User-approved GitHub release with generated notes |

Workflow wrappers (`Select and follow X`) were dropped on purpose — `/skill:name` already does that.

## Permissions

Enforced by `npm:@gotgenes/pi-permission-system`, no custom extension:

- `path`: deny secrets (`*.env`, `*.pem`, `*.key`, `*credentials*`, `*secret*`, `*.npmrc`, `*.pypirc`, `*.git-credentials`, `*.netrc`, `*.authinfo`, `.docker/config.json`, `gh/hosts.yml`, `~/.ssh/*`, `~/.aws/*`, `~/.gnupg/*`). `*.env.example` allowed.
- `bash`: `allow` by default. Destructive commands (`rm -rf`, `rm -r`, `sudo`, `chmod -R`, `chown -R`, `mkfs`, `dd`, fork bomb) and remote writes (`git push`, `gh pr create`, `gh release create`) prompt.
- `git push`, `gh pr create`, `gh release create` prompt (covered by `bash *: ask`).
- `write`/`edit`: ask, except plain docs (`*.md`, `*.mdx`, `*.rst`, `*.txt`) which allow. `read`/`ls`/`grep`/`find`: allow. Skills, MCP, outside-cwd: ask.
- `yoloMode: false`, `permissionReviewLog: false`, `authorizerChain: []`.

## Settings

- `quietStartup: true`, `enableSkillCommands: true`, `showCacheMissNotices: false`
- `defaultThinkingLevel: medium` (per-model medium, `gpt-6-astra` low). Raise per task with `/thinking` or `--thinking high`.
- `enabledModels`: 5 pinned patterns for Ctrl+P cycling. Catalog overrides in `models.json`.
- `transport: websocket-cached`.

## Use

```bash
pi                        # interactive, this repo as global config
pi -p "summarize recent commits"
pi --thinking high -p "diagnose flaky test in X"
```

In-session: `/skill:bug-resolution`, `/commit`, `/model` (Ctrl+S saves startup default), `/thinking`, `/resume`, `/fork`, `/tree`.

## Maintain

- Add a skill: copy `SKILL.md` with `name` + `description` frontmatter under `skills/<group>/<name>/`. Add `disable-model-invocation: true` for rare or consequential ones.
- Add a prompt: single `prompts/<name>.md` with optional `description` frontmatter. Supports `$1`, `$@` / `$ARGUMENTS`.
- Change policy: edit `extensions/pi-permission-system/config.json`. Restart pi.
- Never commit: `auth.json`, `trust.json`, `sessions/`, `models-store.json`, `extensions/*/logs/`, `npm/*` (except `npm/package.json`).

## History

Ported 2026-09 from `~/.config/opencode` (kept as backup). Deliberately not ported: mandatory `select_workflow` gate, handoff ceremony, auto-lint hook, product-definition waterfall.
