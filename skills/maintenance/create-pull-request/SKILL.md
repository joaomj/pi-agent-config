---
name: create-pull-request
description: End-to-end pull request creation with merge conflict detection and professional descriptions via GitHub CLI. Use ONLY when the user explicitly asks to create a pull request.
disable-model-invocation: true
license: MIT
---

# Create Pull Request

End-to-end workflow to create a high-quality pull request.

## When to Use

- User says: "create PR", "open pull request", "make a PR", "/pr"
- User wants to submit current branch changes for review

## Workflow

### Phase 1: Pre-flight Checks

Run before anything else. Stop if any check fails.

```bash
gh --version && gh auth status
git rev-parse --is-inside-work-tree
git remote get-url origin
gh repo view --json url
git status --porcelain
```

- If `gh` not installed: guide user to install
- If not authenticated: ask user to run `gh auth login`
- If uncommitted changes: ask user to commit or stash first

### Phase 2: Branch Confirmation

**MANDATORY: Always confirm branches with user.**

```bash
git branch --show-current
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
git ls-remote --heads origin
```

Present detected branches. **Ask user which remote branch to compare against:**
- If `main` exists, suggest as default
- If `master` exists, offer as alternative
- Allow custom branch input
- Default: compare current branch against `origin/main` (or `origin/master` if main doesn't exist)

Validate destination branch exists:

```bash
git ls-remote --heads origin <destination-branch>
```

### Phase 3: Conflict Check

```bash
git fetch origin <destination-branch>
git merge-tree $(git merge-base HEAD origin/<destination-branch>) HEAD origin/<destination-branch> | rg -c "changed in both" || echo "0"
```

If conflicts found, present files and ask user how to proceed:
1. Resolve now (guide through each file)
2. Abort and resolve manually
3. Continue with PR creation

Do not rebase or merge automatically as part of PR creation. The conflict
check is informational; push the source branch after the user confirms how to
proceed.

### Phase 4: PR Description

PR title and body use ASD-STE100 per `AGENTS.md` field table and `skills/documentation/technical-writing/SKILL.md`. Do not use humanized prose for PR artifacts.

Collect git data and check for repo PR template:

```bash
ls .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE/*.md 2>/dev/null
```

**Auto-populate from git:**
- What: commit messages
- Changes: categorized by type (feat/fix/refactor/docs/chore)
- Related Work: parse `Fixes #`, `Closes #`, `Relates to #` from commits
- Files changed: from `--name-status`

**Ask user for:**
- Impact
- How to test
- Review focus
- Deployment notes

Present preview. Validate no placeholder text remains (`[TODO]`, empty sections).

### Phase 5: Create the PR

```bash
git push -u origin <source-branch>
gh api user --jq '.login'
```

Generate the title and branch names from repository naming conventions. If the
repository has no documented convention, use an imperative title in the
repository's established commit style.

Ask user if draft PR, then:

```bash
gh pr create \
  --base <destination-branch> \
  --head <source-branch> \
  --title "<title>" \
  --body "<description>" \
  --assignee "@me"
```

The `--assignee "@me"` automatically assigns the PR to the current authenticated user.

Post-creation:

```bash
gh pr view <PR-NUMBER> --json url,title,state,mergeable
```

Display PR URL and any immediate issues.

## PR Description Template

Use when no repository-specific template exists. Remove unused sections before creating the PR.

```markdown
## Summary

**What:**
<!-- Auto-populated: List of changes from commits -->

**Why:**
<!-- Auto-populated from commit messages or asked from user -->

**Impact:**
<!-- Asked from user -->

**Jira Issue:**
<!-- Asked from user, e.g.: [ML-123](https://company.atlassian.net/browse/ML-123) -->

## Related Work

<!-- Auto-populated from commit messages: Fixes #, Closes #, Relates to # -->

## Changes

<!-- Auto-populated and categorized from commit history -->

| Type | Description |
|------|-------------|
| Feature | |
| Fix | |
| Refactor | |
| Docs | |
| Config | |
| Chore | |

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases considered

**How to test:**
<!-- Asked from user -->

## Deployment Notes

<!-- Asked from user -->

- **Breaking changes:**
- **Database migrations:**
- **Config updates:**
- **Third-party API changes:**

## Review Focus

<!-- Asked from user: specific areas needing attention -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] No secrets or sensitive data in diff
- [ ] Documentation updated (if applicable)
- [ ] Backwards compatible (or breaking changes documented above)
```

## Anti-Patterns

- Never skip branch confirmation
- Never auto-fix without user permission
- Never leave placeholder text in description
- Never push to the default branch.
- Never use emojis in PR title or description
- Never include secrets in PR description
