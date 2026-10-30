#!/usr/bin/env bash
# Fail when install.sh pins the Claude transport to a commit other than the
# newest release of pi-claude-directsdk, so a full install never downgrades it.
#
#   scripts/check-claude-pin.sh
set -euo pipefail

readonly repo_url="https://github.com/joaomj/pi-claude-directsdk"
cd "$(git rev-parse --show-toplevel)"

pinned="$(sed -nE 's|^ *CLAUDESDK_SOURCE="git:github.com/joaomj/pi-claude-directsdk@([0-9a-f]{40})"$|\1|p' install.sh)"
if [[ -z "${pinned}" ]]; then
  printf 'check-claude-pin: no CLAUDESDK_SOURCE commit pin found in install.sh\n' >&2
  exit 1
fi

# For an annotated tag, ls-remote lists the tag object and then the commit
# with a ^{} suffix; the commit line comes last, so it wins.
tags="$(git ls-remote --tags "${repo_url}")"
latest_tag="$(sed -nE 's|.*refs/tags/(v[0-9]+\.[0-9]+\.[0-9]+)(\^\{\})?$|\1|p' <<< "${tags}" | sort -uV | tail -1)"
if [[ -z "${latest_tag}" ]]; then
  printf 'check-claude-pin: no vMAJOR.MINOR.PATCH tag found at %s\n' "${repo_url}" >&2
  exit 1
fi
latest_commit="$(awk -v t="refs/tags/${latest_tag}" '$2 == t || $2 == t "^{}" { c = $1 } END { print c }' <<< "${tags}")"

if [[ "${pinned}" != "${latest_commit}" ]]; then
  printf 'check-claude-pin: install.sh pins %s, but the newest release %s is %s.\n' \
    "${pinned}" "${latest_tag}" "${latest_commit}" >&2
  printf 'Set CLAUDESDK_SOURCE in install.sh to that commit, and update the Claude Code range and CLI pin if the release changed them.\n' >&2
  exit 1
fi
printf 'install.sh pins the Claude transport to %s (%s)\n' "${latest_tag}" "${pinned}"
