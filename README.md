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

- Keep pi fast: default system prompt, no async fetch in extensions, no model judge, no MCP.
- Keep generic workflows manual-only; lazy-load capabilities when they add concrete knowledge.
- Keep protection always on: secrets and unsupported Python commands deny; unknown shell commands and consequential actions ask.
- Storage stays bounded: one JSONL file per session, one append per completed message. Permission review log off (it was the only unbounded log).

## Skills

10 advertised (name + description in system prompt, full body loaded on use):

| Skill | When |
|---|---|
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

10 explicit-only (`disable-model-invocation: true`, invoke via `/skill:name`):

| Skill | When |
|---|---|
| `direct-assistance` | Small question or safe one-command task |
| `codebase-investigation` | Explain current code or compare known options |
| `bug-resolution` | Reproduce, diagnose, fix, regression-test |
| `implementation-planning` | Repo-backed delivery steps before editing |
| `software-delivery` | Deliver approved change end to end |
| `project-opportunities` | What to do next in a project |
| `create-pull-request` | User explicitly asks for a PR |
| `write-postmortem` | Record fixed bug or incident |
| `architecture-decision` | Hard-to-reverse choice with alternatives |
| `google-personal-cli` | Read-only Gmail and Drive via `gpersonal` |

The generic workflow layer is manual-only so current models can choose their own reasoning process by default. `focused-exploration` was merged into the option-comparison section of `codebase-investigation`.

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

- One universal `ask` fallback covers every permission without a more specific `allow` or `deny`; surfaces do not repeat it.
- `read`/`ls`/`grep`/`find`: allow inside cwd. External reads and writes inherit the universal `ask`.
- Directional path rules deny secret reads and writes across all tools (`*.env`, `*.env.*`, `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*id_rsa*`, `*id_ed25519*`, `*credentials*`, `*secret*`, `*.npmrc`, `*.pypirc`, `*.git-credentials`, `*.netrc`, `*.authinfo`, `.docker/config.json`, `gh/hosts.yml`, `~/.ssh/*`, `~/.aws/*`, `~/.gnupg/*`, `*auth.json`, `*trust.json`). `*.env.example` is allowed.
- `bash`: inherits `ask`. Common local inspection commands and read-only Git forms allow. Direct `python`, `python3`, `pip`, `pip3`, `pytest`, `ruff`, and `mypy` deny; use `uv` or `uvx` instead.
- `write`/`edit`: inherit `ask`, including documentation and agent instruction files. Bash output redirects use the same write-path policy.
- `mcp`: discovery reads allow (`mcp_status`, `mcp_list`, `mcp_search`, `mcp_describe`); other operations inherit `ask`. Skill loading allows without prompting.
- `yoloMode: false`, `permissionReviewLog: false`, `authorizerChain: []`.

## Settings

- `quietStartup: false`, `enableSkillCommands: true`, `showCacheMissNotices: false`
- `defaultThinkingLevel: xhigh`; per-model defaults are recorded in `settings.json`.
- `enabledModels`: 6 pinned patterns for Ctrl+P cycling. Catalog overrides are in `models.json`.
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
