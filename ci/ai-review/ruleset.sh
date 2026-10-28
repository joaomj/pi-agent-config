#!/usr/bin/env bash
# Require the AI review check on the default branch of each repository.
#
# Usage: ci/ai-review/ruleset.sh [--context NAME] [--bypass always|pull_request|none] [--dry-run] owner/repo...
#
# Run this after the caller workflow is on the default branch. A required check
# that never runs blocks every pull request, so the workflow must land first.
# The default bypass lets a repository admin merge only through a pull request,
# which means direct pushes to the default branch stop working.

set -euo pipefail

context="ai-review / review"
bypass=pull_request
dry_run=0
repos=()

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --context) context=${2:?--context needs a value}; shift 2 ;;
    --bypass) bypass=${2:?--bypass needs a value}; shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) repos+=("$1"); shift ;;
  esac
done

[ ${#repos[@]} -gt 0 ] || { usage >&2; die "name at least one repository as owner/name"; }
command -v gh >/dev/null || die "gh is not installed"
command -v jq >/dev/null || die "jq is not installed"

case "$bypass" in
  always|pull_request) ;;
  none) ;;
  *) die "--bypass takes always, pull_request, or none" ;;
esac

payload=$(jq -n --arg context "$context" --arg bypass "$bypass" '
  {
    name: "ai-review",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: false,
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: $context }]
        }
      }
    ]
  }
  + (if $bypass == "none" then {} else
      { bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: $bypass }] }
    end)')

for repo in "${repos[@]}"; do
  printf '\n== %s\n' "$repo"
  if ! rulesets=$(gh api "repos/$repo/rulesets" 2>&1); then
    die "cannot read the rulesets of $repo: $rulesets"
  fi
  existing=$(printf '%s' "$rulesets" | jq -r '.[] | select(.name == "ai-review") | .id')

  if [ "$dry_run" -eq 1 ]; then
    printf 'would %s ruleset "ai-review" requiring "%s"\n' \
      "$([ -n "$existing" ] && echo update || echo create)" "$context"
    continue
  fi

  if [ -n "$existing" ]; then
    printf '%s\n' "$payload" | gh api --method PUT "repos/$repo/rulesets/$existing" --input - >/dev/null
    printf 'updated: ruleset "ai-review" requires "%s"\n' "$context"
  else
    printf '%s\n' "$payload" | gh api --method POST "repos/$repo/rulesets" --input - >/dev/null
    printf 'created: ruleset "ai-review" requires "%s"\n' "$context"
  fi
done
