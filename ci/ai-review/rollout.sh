#!/usr/bin/env bash
# Add the AI review caller workflow to repositories and open one pull request each.
#
# Usage: ci/ai-review/rollout.sh [--ref REF] [--branch NAME] [--no-secret] [--update] owner/repo...
#
# Each repository receives .github/workflows/ai-review.yml on a new branch, the
# DEEPSEEK_API_KEY secret, and a pull request against its default branch. The
# pull request itself runs the review, which also proves the wiring.
#
# REF names a pi-agent-config tag or branch. The script pins the caller to the
# commit that ref resolves to, for both the called workflow and the guidelines,
# so a moved tag cannot change what runs with the secret.

set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ref=v0.7.0
branch=ai-review
set_secret=1
update=0
repos=()

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) ref=${2:?--ref needs a value}; shift 2 ;;
    --branch) branch=${2:?--branch needs a value}; shift 2 ;;
    --no-secret) set_secret=0; shift ;;
    --update) update=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) repos+=("$1"); shift ;;
  esac
done

[ ${#repos[@]} -gt 0 ] || { usage >&2; die "name at least one repository as owner/name"; }
command -v gh >/dev/null || die "gh is not installed"
command -v git >/dev/null || die "git is not installed"
command -v jq >/dev/null || die "jq is not installed"

config_url=https://github.com/joaomj/pi-agent-config
workflow_sha=$(git ls-remote "$config_url" "refs/tags/$ref^{}" | cut -f1)
[ -n "$workflow_sha" ] || workflow_sha=$(git ls-remote "$config_url" "refs/tags/$ref" | cut -f1)
[ -n "$workflow_sha" ] || workflow_sha=$(git ls-remote "$config_url" "refs/heads/$ref" | cut -f1)
[ -n "$workflow_sha" ] || die "cannot resolve $ref in $config_url"

printf '== %s resolves to %s\n' "$ref" "$workflow_sha"

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
  [ "$(printf '%s' "$info" | jq -r .has_pull_requests)" = true ] \
    || die "$repo has pull requests disabled, so a review workflow cannot run"

  exists=0
  if gh api "repos/$repo/branches/$branch" >/dev/null 2>&1; then
    exists=1
    if [ "$update" -eq 0 ]; then
      printf 'skip: branch %s already exists; pass --update to rewrite it\n' "$branch"
      continue
    fi
  fi

  dir="$work/$name"
  start=${branch}
  if [ "$exists" -eq 0 ]; then
    start=${base}
  fi
  git clone --quiet --branch "$start" "git@github.com:$repo.git" "$dir" || die "cannot clone $repo"
  [ "$exists" -eq 1 ] || git -C "$dir" switch --quiet -c "$branch"

  mkdir -p "$dir/.github/workflows"
  sed -e "s|@@BASE_BRANCH@@|$base|g" \
    -e "s|@@WORKFLOW_SHA@@|@$workflow_sha|g" \
    -e "s|@@CONFIG_SHA@@|$workflow_sha|g" \
    "$here/caller.yml" > "$dir/.github/workflows/ai-review.yml"

  if git -C "$dir" diff --quiet -- .github/workflows/ai-review.yml && [ "$exists" -eq 1 ]; then
    printf 'up to date\n'
    continue
  fi

  git -C "$dir" add .github/workflows/ai-review.yml
  git -C "$dir" commit --quiet -m "Point the AI review at the pinned configuration"
  git -C "$dir" push --quiet origin "$branch" || die "cannot push to $repo"

  if [ -n "$secret" ]; then
    gh secret set DEEPSEEK_API_KEY --repo "$repo" --body "$secret" >/dev/null
    printf 'set: DEEPSEEK_API_KEY secret\n'
  fi

  if [ "$exists" -eq 0 ]; then
    gh pr create --repo "$repo" --base "$base" --head "$branch" \
      --title "Add the AI review workflow" --body-file "$here/pr-body.md" \
      || die "cannot open the pull request for $repo"
  else
    printf 'pushed to the existing pull request\n'
  fi
done

printf '\nDone. Review each pull request, then run:\n'
printf '  ci/ai-review/ruleset.sh %s\n' "${repos[*]}"
