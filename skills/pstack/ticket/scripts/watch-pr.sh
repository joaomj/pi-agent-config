#!/usr/bin/env bash
# Wait until a PR needs attention, then print one verdict and what it is about.
# The script only reads. Run it inside the PR's repository.
#
#   watch-pr.sh <pr-number> [--since <ISO-8601 time>] [--interval <seconds>] [--grace <seconds>] [--status-only]
#
# Verdicts, first match wins:
#   merged, closed     the PR is no longer open
#   merge-conflicts    the branch conflicts with its base
#   review-feedback    feedback from someone else, newer than --since
#   failing-checks     a check failed; names and links follow
#   ready              every check passed and no new feedback; the count of
#                      unresolved review threads follows
#   waiting            checks still run (printed only with --status-only)
#
# Without --status-only it polls every --interval seconds (default 60) until a
# verdict other than waiting. CI can take a moment to register checks after a
# push, so a ready PR with no checks counts as waiting for the first --grace
# seconds (default 180). Your own comments never count as feedback, so a
# round reply does not wake the watcher.
set -euo pipefail

usage() { printf 'usage: watch-pr.sh <pr-number> [--since <ISO-8601 time>] [--interval <seconds>] [--grace <seconds>] [--status-only]\n' >&2; exit 2; }
[[ $# -ge 1 && $1 =~ ^[0-9]+$ ]] || usage
pr=$1; shift
since=1970-01-01T00:00:00Z
interval=60
grace=180
status_only=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --since) [[ $# -ge 2 ]] || usage; since=$2; shift 2 ;;
    --interval) [[ $# -ge 2 && $2 =~ ^[1-9][0-9]*$ ]] || usage; interval=$2; shift 2 ;;
    --grace) [[ $# -ge 2 && $2 =~ ^[0-9]+$ ]] || usage; grace=$2; shift 2 ;;
    --status-only) status_only=true; shift ;;
    *) usage ;;
  esac
done

read -r owner name < <(gh repo view --json owner,name --jq '.owner.login + " " + .name')
me=$(gh api user --jq .login)

verdict() {
  gh api graphql -F owner="$owner" -F name="$name" -F pr="$pr" -f query='
query($owner: String!, $name: String!, $pr: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $pr) {
      state mergeable reviewDecision url
      reviews(last: 50) { nodes { author { login } state body createdAt url } }
      comments(last: 50) { nodes { author { login } body createdAt url } }
      reviewThreads(first: 100) {
        nodes { isResolved path line comments(first: 20) { nodes { author { login } body createdAt url } } }
      }
      commits(last: 1) { nodes { commit { statusCheckRollup { contexts(first: 100) { nodes {
        __typename
        ... on CheckRun { name status conclusion detailsUrl }
        ... on StatusContext { context state targetUrl }
      } } } } } }
    }
  }
}' | jq -r --arg since "$since" --arg me "$me" '
.data.repository.pullRequest as $p
| ([$p.commits.nodes[0].commit.statusCheckRollup.contexts.nodes[]?
    | if .__typename == "CheckRun"
      then {name, url: .detailsUrl,
            failed: (.conclusion // "" | IN("FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE")),
            pending: (.status != "COMPLETED")}
      else {name: .context, url: .targetUrl,
            failed: (.state | IN("FAILURE", "ERROR")), pending: (.state | IN("PENDING", "EXPECTED"))}
      end]) as $checks
| ([$p.reviews.nodes[] | select(.author.login != $me and .body != "" and .createdAt > $since)
    | "review \(.state) by \(.author.login) at \(.createdAt): \(.url)"]
  + [$p.comments.nodes[] | select(.author.login != $me and .createdAt > $since)
    | "comment by \(.author.login) at \(.createdAt): \(.url)"]
  + [$p.reviewThreads.nodes[] | select(.isResolved | not)
    | select(any(.comments.nodes[]; .author.login != $me and .createdAt > $since))
    | "thread \(.path):\(.line // "?"): \(.comments.nodes[0].url)"]) as $feedback
| ([$p.reviewThreads.nodes[] | select(.isResolved | not)] | length) as $open
| if $p.state != "OPEN" then "\($p.state | ascii_downcase)\n\($p.url)"
  elif $p.mergeable == "CONFLICTING" then "merge-conflicts\n\($p.url)"
  elif ($feedback | length) > 0 then "review-feedback\n" + ($feedback | join("\n"))
  elif any($checks[]; .failed) then "failing-checks\n" + ([$checks[] | select(.failed) | "\(.name): \(.url)"] | join("\n"))
  elif any($checks[]; .pending) then "waiting\n\([$checks[] | select(.pending)] | length) checks pending"
  elif $p.mergeable == "UNKNOWN" then "waiting\nGitHub is still computing mergeability"
  else "ready\nreview decision: \($p.reviewDecision // "none"), \($checks | length) checks passed, \($open) review threads unresolved\n\($p.url)"
  end'
}

start=$SECONDS
while :; do
  out=$(verdict)
  if [[ ${out%%$'\n'*} == ready && $out == *", 0 checks passed,"* && $status_only == false ]] \
    && (( SECONDS - start < grace )); then
    out=waiting
  fi
  if [[ $status_only == true || ${out%%$'\n'*} != waiting ]]; then
    printf 'VERDICT: %s\n' "$out"
    exit 0
  fi
  sleep "$interval"
done
