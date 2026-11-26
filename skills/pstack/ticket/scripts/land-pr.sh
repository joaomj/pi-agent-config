#!/usr/bin/env bash
# Gate D in one step: merge a PR that watch-pr.sh reports ready, then delete
# its branch. The permission policy asks once for this script.
#
#   land-pr.sh <pr-number> <squash|merge|rebase>
#
# It refuses a PR that is not ready, so a stale approval cannot merge a PR
# whose checks or feedback changed. A second run on a merged PR prints the
# merge and changes nothing. Tracker updates stay a separate step.
set -euo pipefail

die() { printf 'land-pr.sh: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 2 && $1 =~ ^[0-9]+$ ]] || die "usage: land-pr.sh <pr-number> <squash|merge|rebase>"
pr=$1 method=$2
case $method in squash|merge|rebase) ;; *) die "merge method must be squash, merge, or rebase" ;; esac

status=$("$(dirname "$0")/watch-pr.sh" "$pr" --status-only)
case ${status%%$'\n'*} in
  "VERDICT: merged") printf 'already merged: %s\n' "$(gh pr view "$pr" --json url,mergeCommit --jq '"\(.url) at \(.mergeCommit.oid[0:7])"')"; exit 0 ;;
  "VERDICT: ready") ;;
  *) die "PR $pr is not ready to merge:"$'\n'"$status" ;;
esac

# --repo keeps gh away from the local checkout, which may be a worktree whose
# base branch is checked out elsewhere.
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh pr merge "$pr" --repo "$repo" "--$method" --delete-branch
gh pr view "$pr" --repo "$repo" --json state,url,mergeCommit --jq '"\(.state): \(.url) at \(.mergeCommit.oid[0:7])"'
