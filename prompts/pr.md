---
description: Prepare and create a user-approved GitHub pull request
argument-hint: "[base branch or instructions]"
---

Prepare a pull request for the current branch. Use `$ARGUMENTS` as additional
instructions.

1. Inspect repository guidance, worktree state, branch, remote, default branch,
   commits, changed files, verification evidence, and the repository PR
   template. Stop on unrelated unresolved worktree changes or an invalid source
   branch.
2. Identify untracked, unstaged, or staged planning, temporary, draft, backup,
   local-config, and secret-looking files. Stop and ask what to do with any such
   file; do not delete or silently include it.
3. Determine the base branch from repository evidence. Ask only when it is
   ambiguous.
4. Check whether the source branch can merge cleanly without modifying the
   worktree. Report conflicts; do not merge or rebase automatically.
5. Detect the repository's lint and format-check commands. Run only their
   check-only variants. Never enable autofix or run a command that writes source
   files. If no check-only command exists, report that gap instead of inventing
   one.
6. Draft the title and body in repository style. Include:
   - Summary and motivation
   - Before and after behavior
   - User or operational impact
   - Main changes
   - Verification evidence and exact test commands
   - Review focus
   - Related work
   - Deployment, migration, configuration, or compatibility notes when relevant
7. Follow the repository template. Remove irrelevant or empty sections and all
   placeholders.
8. Assign the pull request to `@me`. Show the exact base, head, title,
   assignee, and complete body. Ask for approval of the push and PR creation.
9. After approval, push the source branch and create the PR with `gh pr create`
   and `--assignee @me`.
10. Report the PR URL and every failed, skipped, or unavailable verification.

Do not push, create, edit, close, merge, or comment on a PR without explicit
user approval for that remote write.
