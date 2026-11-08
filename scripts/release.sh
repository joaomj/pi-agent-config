#!/usr/bin/env bash
# Cut a release: set the version, update the changelog, commit, sign the tag,
# push, and publish.
#
#   scripts/release.sh v0.5.0
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

note "Writing ${tag} into the install commands"
install_docs=(README.md docs/install.md)
sed -E -i "s#(pi-agent-config@)v[0-9]+\.[0-9]+\.[0-9]+#\1${tag}#g" "${install_docs[@]}"

note "Updating CHANGELOG.md"
bash scripts/update-changelog.sh "${tag}"

note "Checking that the package installs and loads"
scripts/check-package.sh

git add package.json CHANGELOG.md "${install_docs[@]}"
git commit --quiet -m "release: ${tag}"
note "Tagging ${tag} (signed)"
git tag -s --annotate "${tag}" --message "${tag}"

note "Pushing ${default_branch} and ${tag}"
git push --quiet origin "${branch}"
git push --quiet origin "${tag}"

note "Publishing the GitHub release"
gh release create "${tag}" --title "${tag}" --generate-notes

note "Released ${tag}"
printf '  Users update with: pi install git:github.com/joaomj/pi-agent-config@%s\n' "${tag}"
