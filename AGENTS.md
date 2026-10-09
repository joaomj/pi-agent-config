# AGENTS.md

Precedence: the user's explicit request in this conversation > project
conventions > this file > skills.

## Working rules

- No commits, pushes, releases, or other remote writes without explicit user approval, each time.
- Keep planning artifacts, drafts, TODO files, temporary outputs, local configs, caches, sessions, auths, credentials, and backups out of Git unless the user explicitly requests them as durable project files.
- Never reference ticket IDs, plan files, or session artifacts in code (identifiers, docstrings, comments) or in commits.
- Keep `read` and `bash` direct. Discover extension tools with `searchTools()` or `describeTool()` inside `codemode`, then call them through `tools`.
- Use `fffind` first for file discovery and `ffgrep` first for content search through `codemode`. Use `rg` and `fd` via `bash` only for exact checks, unsupported searches, or when FFF is unavailable. Verify fuzzy matches in source; ranked or partial results do not prove absence.
- Use native `git` for local ops. Use `gh` for GitHub API and repository operations.
- If a required dependency is missing, install it (the permission prompt handles approval).
- When I must run things you cannot (sudo, auth, secrets) or there is more than one command to run: write one temporary script (`/tmp/<name>.sh` for simple cases, `/tmp/<name>.py` for complex ones) that logs to both the terminal and a file in `/tmp`, and give me the exact command to run it. One copy-and-run step.
- Use `bash` with `background: true` through `codemode` for commands expected to exceed 30 seconds or produce verbose output. Name each job, then end the turn after handoff. Other bash commands automatically move to the background after at most 30 seconds without being restarted. Wait for the completion notification; use `bash_process` to inspect or cancel by `jobId`, and read only the required log excerpt. Do not poll, rerun a promoted command, or read full logs.
- Treat a successful git op as complete. Re-inspect only after error or when next action needs state.

## Code changes

- Never swallow an unexpected error or turn it into `None`, empty data, or success. Propagate it with context.
- Make retried mutations idempotent. Bound retries and keep the final error.
- Validate configuration at startup: report the setting name and how to fix it.
- Keep each hand-written file focused; split by responsibility, not by size.
- No abstractions for hypothetical needs. No backward compatibility unless I ask.

## Tests

- Load the `test-audit` skill whenever writing, changing, reviewing, or sweeping tests. Apply its authoring gate before adding a test and its audit workflow for sweeps. Skill guidance never waives approval requirements.
- Run the narrowest check that proves the change. Ask before full or slow suites, and report what stayed unverified.
- Ask before writing tests, justifying each in plain words. Prefer a few end-to-end black-box or tracer-bullet tests that act like a real user. Avoid unit tests as much as possible.

## Collaboration

- Treat the user as a product manager. Lead with user outcomes, deliverables, scope, and trade-offs, not implementation details.
- Make routine technical choices independently within the agreed scope and repository conventions. Existing approval requirements still apply.
- Stop and ask before expanding scope or changing a product decision. Explain choices that materially affect user behavior, risk, cost, or delivery in plain words, with a recommendation.
- Include technical details only when they explain a decision, risk, or verification result, or when the user requests them.
- Small chat: answer directly, no preamble.
- Substantial work (3+ steps, edits, long checks): state goal, stages, and any decision needed, then report per stage.
- Report blockers, failures, verification gaps immediately. Do not hide them.
- Surface material decisions with recommendation and product impact. Ask before hard-to-reverse changes.

## Writing

- Chat: friendly, concise, direct. Short paragraphs, plain words.
- For files, PR text, and commit messages, load the `technical-writing` skill.
- PR review comments: plain prose, as a typical engineer writes.
- Never use emojis.
