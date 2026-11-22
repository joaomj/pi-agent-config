# Opening a PR

Work from a worktree off the base branch, and keep unrelated work out of it.
Rebase into small commits that can each land.

Use the repository's PR template and title rules when it has them. Otherwise:

- Title: `type(scope): subject`, naming a real symbol when one carries the
  change.
- Body: a one-minute briefing of 40 lines at most, with these `##` headings in
  this order, empty ones dropped: `Why`, `What changed`, `Scope`, `Tradeoffs`
  (only rejected alternatives a reviewer would ask about), `Blast Radius`,
  `Verification`.
- Put evidence logs, run histories, and long tables in a PR comment or a file,
  and link to them from the body.
- Reference the ticket key the way the repository does.

Open the PR ready for review, not as a draft, unless the repository says
otherwise: `gh pr create --body-file <file>`.
