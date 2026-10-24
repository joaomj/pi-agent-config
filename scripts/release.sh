#!/usr/bin/env bash
# Cut a release: set the version, commit, sign the tag, push, and publish.
#
#   scripts/release.sh v0.5.0
#
# The changelog is generated from tags by .github/workflows/update-changelog.yml,
# so this script does not edit CHANGELOG.md.
set -euo pipefail

usage() { printf 'Usage: %s vMAJOR.MINOR.PATCH\n' "$0" >&2; exit 2; }
tag="${1:-}"
[[ "${tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || usage
version="${tag#v}"

die() { printf 'release.sh: %s\n' "$*" >&2; exit 1; }
note() { printf '==> %s\n' "$*"; }

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

[[ -z "$(git status --porcelain --untracked-files=no)" ]] || die "commit or stash your changes first"
git show-ref --tags --verify --quiet "refs/tags/${tag}" && die "tag ${tag} already exists"
git fetch --quiet origin

branch="$(git rev-parse --abbrev-ref HEAD)"
default_branch="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)"
default_branch="${default_branch:-main}"
[[ "${branch}" == "${default_branch}" ]] || die "you are on ${branch}; release from ${default_branch}"

git merge-base --is-ancestor "origin/${default_branch}" HEAD \
  || die "origin/${default_branch} has commits you do not have; pull first"

note "Setting package.json to ${version}"
python3 - "${version}" <<'VERSION'
import json, sys
path = "package.json"
with open(path) as handle:
    data = json.load(handle)
data["version"] = sys.argv[1]
with open(path, "w") as handle:
    json.dump(data, handle, indent=2, ensure_ascii=False)
    handle.write("\n")
VERSION

note "Checking the installer still parses"
bash -n install.sh

git add package.json
git commit --quiet -m "release: ${tag}"
note "Tagging ${tag} (signed)"
git tag -s --annotate "${tag}" --message "${tag}"

note "Pushing ${default_branch} and ${tag}"
git push --quiet origin "${branch}"
git push --quiet origin "${tag}"

note "Publishing the GitHub release"
gh release create "${tag}" --title "${tag}" --generate-notes

note "Released ${tag}"
printf '  The changelog workflow commits CHANGELOG.md to %s within a minute or two.\n' "${default_branch}"
printf '  Installs pick up the newest tag automatically; no version is pinned in install.sh.\n'
