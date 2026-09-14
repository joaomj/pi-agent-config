---
description: Create a user-approved GitHub release with generated notes and changelog
argument-hint: "<version e.g. v1.0.0>"
---

Create a GitHub release for `$ARGUMENTS`.

1. Require an explicit semantic version such as `v1.0.0`. Do not infer one.
2. Inspect the worktree, current branch, remote, existing tags, releases, and
   repository guidance. Stop if unrelated uncommitted changes exist or the
   version already exists.
3. Identify the previous release and commits included in the new version.
4. Run `bash scripts/update-changelog.sh <version>` and review the generated
   `CHANGELOG.md` diff. Include this release change in the release commit.
5. Ask GitHub to generate release notes for the proposed tag and target commit.
   Review the generated title and body.
6. Show the proposed version, target commit, tag, changelog diff, and complete
   GitHub-generated release notes. Ask the user to approve the exact release
   contents before any commit or remote write.
7. After approval, commit the release changes, create the annotated tag, and
   create the release with `gh release create --generate-notes`.
8. Verify that the remote branch and tag point to the target commit and that the
   release contains the generated notes.
9. Report the release URL, tag, commit, changelog status, and any failed or
   skipped verification.

A tag-push workflow also regenerates `CHANGELOG.md` as a safety net for tags
created outside this prompt.

Do not create a release or tag, or commit release changes, before the user
approves the proposed release contents.
