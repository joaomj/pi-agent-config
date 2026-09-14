---
description: Create or improve a repository-specific gitignore
argument-hint: "[focus]"
---

Create or improve the repository's `.gitignore`. Use `$ARGUMENTS` as an optional
focus.

1. Inspect the repository type, package manifests, build tools, test tools,
   operating system files, generated outputs, local configuration, and existing
   ignore rules.
2. Check tracked files before adding a rule. Never ignore a tracked source file,
   required configuration file, lockfile, or documented artifact without
   explaining the impact.
3. Preserve useful existing rules. Remove a rule only when it is incorrect,
   redundant, or unsafe.
4. Include rules for secrets, credentials, local state, caches, build outputs,
   test artifacts, editor files, and OS files only when the repository uses
   those categories.
5. Avoid broad patterns that hide source files or make debugging difficult.
6. Show the proposed diff and explain each non-obvious rule before editing.
7. Verify the result with `git check-ignore -v` for representative paths and
   `git status --short` for the worktree.

Do not add generated files to Git while creating the ignore rules. Do not read
secret values.
