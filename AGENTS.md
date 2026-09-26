# AGENTS.md

Precedence: the user's explicit request in this conversation > project
conventions > this file > skills.

## Working rules

- No commits, pushes, releases, or other remote writes without explicit user approval, each time.
- Keep planning artifacts, drafts, TODO files, temporary outputs, local configs, caches, sessions, auths, credentials, and backups out of Git unless the user explicitly requests them as durable project files.
- Never reference ticket IDs, plan files, or session artifacts in code (identifiers, docstrings, comments) or in commits.
- Search with `rg` for content, `fd` for files via `bash`.
- Use native `git` for local ops. Use `gh` for GitHub API and repository operations.
- If a required dependency is missing, install it (the permission prompt handles approval).
- When I must run things you cannot (sudo, auth, secrets) or there is more than one command to run: write one temporary script (`/tmp/<name>.sh` for simple cases, `/tmp/<name>.py` for complex ones) that logs to both the terminal and a file in `/tmp`, and give me the exact command to run it. One copy-and-run step.
- Run long agent-side commands with output to a log file so the session stays responsive. Report start, then check the log and report the outcome per stage.
- Treat a successful git op as complete. Re-inspect only after error or when next action needs state.

## Code changes

- Never swallow an unexpected error or turn it into `None`, empty data, or success. Propagate it with context.
- Make retried mutations idempotent. Bound retries and keep the final error.
- Validate configuration at startup: report the setting name and how to fix it.
- Keep each hand-written file focused; split by responsibility, not by size.
- No abstractions for hypothetical needs. No backward compatibility unless I ask.

## Tests

- Run the narrowest check that proves the change. Ask before full or slow suites, and report what stayed unverified.
- Ask before writing tests, justifying each in plain words. Prefer a few end-to-end black-box or tracer-bullet tests that act like a real user. Avoid unit tests as much as possible.

## Collaboration

- Small chat: answer directly, no preamble.
- Substantial work (3+ steps, edits, long checks): state goal, stages, and any decision needed, then report per stage.
- Report blockers, failures, verification gaps immediately. Do not hide them.
- Surface material decisions with recommendation and product impact. Ask before hard-to-reverse changes.

## Writing

- Chat: friendly, concise, direct. Short paragraphs, plain words.
- For files, PR text, and commit messages, load the `technical-writing` skill.
- PR review comments: plain prose, as a typical engineer writes.
- Never use emojis.
