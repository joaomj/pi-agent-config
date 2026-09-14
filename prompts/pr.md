---
description: Prepare and create a user-approved GitHub pull request
argument-hint: "[base branch or instructions]"
---

Prepare a pull request for the current branch. Use `$ARGUMENTS` as additional
instructions.

1. Inspect repository guidance, worktree state, branch, remote, default branch,
   commits, changed files, verification evidence, and the repository PR
   template. Stop on unresolved worktree changes or an invalid source branch.
2. Determine the base branch from repository evidence. Ask only when it is
   ambiguous.
3. Check whether the source branch can merge cleanly without modifying the
   worktree. Report conflicts; do not merge or rebase automatically.
4. Draft the title and body in repository style. Include:
   - Summary and motivation
   - Before and after behavior
   - User or operational impact
   - Main changes
   - Verification evidence and how to test
   - Review focus
   - Related work
   - Deployment, migration, configuration, or compatibility notes when relevant
5. Follow the repository template. Remove irrelevant or empty sections and all
   placeholders.
6. Show the exact base, head, title, and complete body. Ask for approval of the
   push and PR creation.
7. After approval, push the source branch and create the PR with `gh pr create`.
8. Report the PR URL and any failed or skipped verification.

Do not push, create, edit, close, merge, or comment on a PR without explicit
user approval for that remote write.
