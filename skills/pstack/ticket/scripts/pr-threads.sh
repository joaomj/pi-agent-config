#!/usr/bin/env bash
# Print a PR's review feedback that still needs an answer, as plain text:
# reviews with a body, conversation comments, and unresolved review threads.
# The script only reads. It sends one GraphQL query and writes nothing.
#
#   pr-threads.sh <pr-number> [--since <ISO-8601 time>]
#
# With --since, only feedback created after that time is printed, so a
# watcher can wait for new feedback with `until ... | grep -q .`.
# Run it inside the PR's repository.
set -euo pipefail

usage() { printf 'usage: pr-threads.sh <pr-number> [--since <ISO-8601 time>]\n' >&2; exit 2; }
[[ $# -eq 1 || ( $# -eq 3 && $2 == --since ) ]] || usage
[[ $1 =~ ^[0-9]+$ ]] || usage
pr=$1
since=${3:-1970-01-01T00:00:00Z}

repo=$(gh repo view --json owner,name --jq '.owner.login + " " + .name')
read -r owner name <<<"$repo"

gh api graphql \
  -F owner="$owner" -F name="$name" -F pr="$pr" \
  -f query='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      reviews(last: 50) { nodes { author { login } state body createdAt url } }
      comments(last: 50) { nodes { author { login } body createdAt url } }
      reviewThreads(first: 100) {
        nodes {
          isResolved isOutdated path line
          comments(first: 20) { nodes { author { login } body createdAt url } }
        }
      }
    }
  }
}' \
  | jq -r --arg since "$since" '
.data.repository.pullRequest as $p
| ([$p.reviews.nodes[] | select(.body != "" and .createdAt > $since)
    | "## review \(.state) by \(.author.login) at \(.createdAt)\n\(.url)\n\(.body)\n"]
  + [$p.comments.nodes[] | select(.createdAt > $since)
    | "## comment by \(.author.login) at \(.createdAt)\n\(.url)\n\(.body)\n"]
  + [$p.reviewThreads.nodes[] | select(.isResolved | not)
    | select(any(.comments.nodes[]; .createdAt > $since))
    | "## thread \(.path):\(.line // "?")\(if .isOutdated then " (outdated)" else "" end)\n"
      + ([.comments.nodes[] | "- \(.author.login) at \(.createdAt): \(.url)\n\(.body)"] | join("\n")) + "\n"])
| .[]'
