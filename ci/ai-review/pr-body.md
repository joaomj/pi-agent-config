Adds a pre-merge AI review for pull requests into the default branch.

The workflow calls the shared reusable workflow in `joaomj/pi-agent-config`. It
reviews the pull request with the shared `code-review` guidelines, posts the
report as a review comment, and fails when the report contains a P0 or P1
finding.

The job needs the `DEEPSEEK_API_KEY` repository secret. It runs only for pull
requests whose head branch lives in this repository, so fork pull requests are
skipped without a secret.

Until a branch rule requires the `ai-review / review` check, the review reports
and does not block a merge.
