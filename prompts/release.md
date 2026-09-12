---
description: Create a user-approved GitHub release with GitHub-generated notes
argument-hint: "<version e.g. v4.0.0>"
---

Create a GitHub release for `$ARGUMENTS` with GitHub-generated release notes.

1. Require an explicit version argument such as `v4.0.0`. Ask for it if it is
   missing. Do not infer a version from the current tags.
2. Inspect the worktree, current branch, remote, existing tags, and releases.
   Stop if the worktree has uncommitted changes or the version already exists.
3. Identify the previous release and commits included in the new version.
4. Ask GitHub to generate the release notes for the proposed tag and target
   commit. Review the generated title and body.
5. Show the proposed version, target commit, tag, and complete GitHub-generated
   release notes. Ask the user to approve the exact release contents before any
   remote write.
6. After approval, create the tag and release with
   `gh release create --generate-notes`.
7. Verify that the remote branch and tag point to the target commit and that
   the release contains the generated notes.
8. Report the release URL, tag, commit, and any failed or skipped verification.

Do not create a release, tag, commit, or pull request before the user approves
the proposed release contents.
