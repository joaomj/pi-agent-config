#!/usr/bin/env bash
# Gate B in one step: push the current branch and open its PR, or update the
# PR that already exists for the branch. The permission policy asks once for
# this script, so the operator answers one prompt for the gate.
#
#   open-pr.sh <base> <title> <body-file>
#
# It never force-pushes and never pushes the base branch. A second run pushes
# new commits and prints the same PR.
set -euo pipefail

die() { printf 'open-pr.sh: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || die "usage: open-pr.sh <base> <title> <body-file>"
base=$1 title=$2 body=$3
[[ -s $body ]] || die "body file $body is missing or empty"

branch=$(git symbolic-ref --short HEAD) || die "HEAD is detached; check out the PR branch"
[[ $branch != "$base" ]] || die "the current branch is the base branch $base"
[[ -z $(git status --porcelain --untracked-files=no) ]] || die "tracked files have uncommitted changes; commit or restore them first"
git fetch --quiet origin "$base"
git merge-base --is-ancestor "origin/$base" HEAD \
  || die "$branch does not contain origin/$base; rebase it at the operator's gate first"
[[ -n $(git rev-list "origin/$base..HEAD") ]] || die "$branch has no commits on top of origin/$base"

git push --quiet --set-upstream origin "HEAD:refs/heads/$branch"

existing=$(gh pr list --head "$branch" --state open --json url --jq '.[0].url // ""')
if [[ -n $existing ]]; then
  printf 'pushed %s; PR already open: %s\n' "$(git rev-parse --short HEAD)" "$existing"
else
  gh pr create --base "$base" --head "$branch" --title "$title" --body-file "$body"
fi
