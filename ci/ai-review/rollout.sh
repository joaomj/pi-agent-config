#!/usr/bin/env bash
# Add the AI review caller workflow to repositories and open one pull request each.
#
# Usage: ci/ai-review/rollout.sh [--ref REF] [--branch NAME] [--no-secret] owner/repo...
#
# Each repository receives .github/workflows/ai-review.yml on a new branch, the
# DEEPSEEK_API_KEY secret, and a pull request against its default branch. The
# pull request itself runs the review, which also proves the wiring.

set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ref=v0.7.0
branch=ai-review
set_secret=1
repos=()

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) ref=${2:?--ref needs a value}; shift 2 ;;
    --branch) branch=${2:?--branch needs a value}; shift 2 ;;
    --no-secret) set_secret=0; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) repos+=("$1"); shift ;;
  esac
done

[ ${#repos[@]} -gt 0 ] || { usage >&2; die "name at least one repository as owner/name"; }
command -v gh >/dev/null || die "gh is not installed"
command -v git >/dev/null || die "git is not installed"
command -v jq >/dev/null || die "jq is not installed"

secret=
if [ "$set_secret" -eq 1 ]; then
  command -v pi >/dev/null || die "pi is not installed; pass --no-secret to set the secret yourself"
  secret=$(pi auth print-api-key --provider deepseek) || die "could not read the DeepSeek API key from pi"
  [ -n "$secret" ] || die "pi returned an empty DeepSeek API key"
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

for repo in "${repos[@]}"; do
  name=${repo##*/}
  printf '\n== %s\n' "$repo"
  if ! info=$(gh api "repos/$repo" 2>&1); then
    die "cannot read $repo: $info"
  fi
  base=$(printf '%s' "$info" | jq -r .default_branch)
  [ -n "$base" ] && [ "$base" != null ] || die "cannot read the default branch of $repo"

  if gh api "repos/$repo/branches/$branch" >/dev/null 2>&1; then
    printf 'skip: branch %s already exists\n' "$branch"
    continue
  fi

  dir="$work/$name"
  git clone --quiet "git@github.com:$repo.git" "$dir" || die "cannot clone $repo"
  git -C "$dir" switch --quiet -c "$branch"

  mkdir -p "$dir/.github/workflows"
  sed -e "s|@@BASE_BRANCH@@|$base|g" -e "s|@@REF@@|@$ref|g" \
    "$here/caller.yml" > "$dir/.github/workflows/ai-review.yml"

  git -C "$dir" add .github/workflows/ai-review.yml
  git -C "$dir" commit --quiet -m "Add the AI review workflow"
  git -C "$dir" push --quiet origin "$branch" || die "cannot push to $repo"

  if [ -n "$secret" ]; then
    gh secret set DEEPSEEK_API_KEY --repo "$repo" --body "$secret" >/dev/null
    printf 'set: DEEPSEEK_API_KEY secret\n'
  fi

  gh pr create --repo "$repo" --base "$base" --head "$branch" \
    --title "Add the AI review workflow" --body-file "$here/pr-body.md" \
    || die "cannot open the pull request for $repo"
done

printf '\nDone. Review each pull request, then run:\n'
printf '  ci/ai-review/ruleset.sh %s\n' "${repos[*]}"
