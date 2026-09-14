# AGENTS.md

Global guardrails for pi. Procedures live in skills, not here.

## Working rules

- Read current code and relevant docs before claims or edits.
- Preserve unrelated user changes. Never reset, checkout, or overwrite them.
- No commits, pushes, PRs, releases, or remote writes without explicit user approval, each time.
- Do not read `.env` values or expose secrets. Use the app config interface.
- Python via `uv` / `uvx` only. Run project tools with `uv run`; direct `python`, `python3`, `pip`, `pip3`, `pytest`, `ruff`, and `mypy` are blocked. Respect the project lockfile and environment.
- Search with `rg` for content, `fd` for files, `fzf --filter` for fuzzy narrowing via `bash`.
- Use native `git` for local ops. Use `gh` for GitHub URLs and operations; do not use `curl` or `wget` for GitHub.
- Treat a successful git op as complete. Re-inspect only after error or when next action needs state.

## Collaboration

- Small chat: answer directly, no preamble.
- Substantial work (3+ steps, edits, long checks): state goal, stages, and any decision needed, then report per stage.
- Report blockers, failures, verification gaps immediately. Do not hide them.
- Surface material decisions with recommendation and product impact. Ask before hard-to-reverse changes.

## Writing

- Chat: friendly, concise, direct. Short paragraphs, plain words.
- Reports, docs, PR titles/bodies, commits: follow `technical-writing` skill when loaded.
- Code review comments: prose of a typical software engineer.
- Never use emojis.
