#!/usr/bin/env bash
# Show what changed upstream in the pstack files this repository ports, since
# the commit pinned in skills/pstack/UPSTREAM. Port the changes you want by
# hand, then set the pinned commit to the one this script reports.
#
#   scripts/pstack-upstream.sh          compare the pin with upstream main
#   scripts/pstack-upstream.sh <ref>    compare the pin with another ref
#
# Needs network access. Changes nothing in this repository.
set -euo pipefail

die() { printf 'pstack-upstream.sh: %s\n' "$*" >&2; exit 1; }

repo_root="$(git rev-parse --show-toplevel)"
manifest="${repo_root}/skills/pstack/UPSTREAM"
[[ -f "${manifest}" ]] || die "missing ${manifest}"
pin="$(awk '$1 == "commit" { print $2 }' "${manifest}")"
[[ -n "${pin}" ]] || die "no commit line in ${manifest}"
mapfile -t paths < <(awk '!/^#/ && $1 != "commit" && NF == 2 { print $1 }' "${manifest}" | sort -u)

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT
git clone --quiet --filter=blob:none --no-checkout https://github.com/cursor/plugins "${work}/plugins"
cd "${work}/plugins"
git cat-file -e "${pin}^{commit}" 2>/dev/null || die "pinned commit ${pin} not found upstream"
target="$(git rev-parse --verify "${1:-origin/HEAD}^{commit}")"

printf 'pinned %s, upstream %s\n' "${pin:0:7}" "${target:0:7}"
if git diff --quiet "${pin}" "${target}" -- "${paths[@]}"; then
  printf 'No ported file changed upstream.\n'
  exit 0
fi
git --no-pager log --oneline "${pin}..${target}" -- "${paths[@]}"
git --no-pager diff --stat "${pin}" "${target}" -- "${paths[@]}"
git --no-pager diff "${pin}" "${target}" -- "${paths[@]}"
