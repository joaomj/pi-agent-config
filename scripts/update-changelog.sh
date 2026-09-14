#!/usr/bin/env bash
set -euo pipefail

readonly requested_tag="${1:-}"
readonly changelog_file="${CHANGELOG_FILE:-CHANGELOG.md}"

if [[ -z "${requested_tag}" || ! "${requested_tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  printf 'Usage: %s vMAJOR.MINOR.PATCH\n' "$0" >&2
  exit 2
fi

if [[ -e "${changelog_file}" ]] && ! git ls-files --error-unmatch -- "${changelog_file}" >/dev/null 2>&1; then
  printf 'Error: %s exists but is not tracked. Review it before replacing it.\n' "${changelog_file}" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no -- "${changelog_file}" 2>/dev/null)" ]]; then
  printf 'Error: %s has uncommitted changes.\n' "${changelog_file}" >&2
  exit 1
fi

requested_is_tag=false
if git show-ref --tags --verify --quiet "refs/tags/${requested_tag}"; then
  requested_is_tag=true
fi

if [[ "${requested_is_tag}" == true ]]; then
  requested_target="refs/tags/${requested_tag}"
  requested_target_commit="$(git rev-parse "${requested_target}^{commit}")"
  requested_previous="$(git describe --tags --abbrev=0 "${requested_target_commit}^" 2>/dev/null || true)"
else
  requested_target="HEAD"
  requested_target_commit="$(git rev-parse 'HEAD^{commit}')"
  requested_previous="$(git describe --tags --abbrev=0 "${requested_target_commit}" 2>/dev/null || true)"
fi

tags="$(git tag --sort=-version:refname)"
if [[ "${requested_is_tag}" == false ]]; then
  tags="${requested_tag}
${tags}"
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

append_commits() {
  local bucket="$1"
  local target="$2"
  local previous="$3"
  local subject hash
  local added_file="${work_dir}/added"
  local fixed_file="${work_dir}/fixed"
  local changed_file="${work_dir}/changed"

  : > "${added_file}"
  : > "${fixed_file}"
  : > "${changed_file}"

  if [[ -n "${previous}" ]]; then
    while IFS=$'\t' read -r subject hash; do
      [[ -n "${subject}" ]] || continue
      case "${subject}" in
        release:*|chore:\ release\ *) continue ;;
        feat:*|feat\(*) printf -- '- %s\n' "${subject}" >> "${added_file}" ;;
        fix:*|fix\(*) printf -- '- %s\n' "${subject}" >> "${fixed_file}" ;;
        *) printf -- '- %s\n' "${subject}" >> "${changed_file}" ;;
      esac
    done < <(git log --no-merges --format='%s%x09%h' "${previous}..${target}")
  else
    while IFS=$'\t' read -r subject hash; do
      [[ -n "${subject}" ]] || continue
      case "${subject}" in
        release:*|chore:\ release\ *) continue ;;
        feat:*|feat\(*) printf -- '- %s\n' "${subject}" >> "${added_file}" ;;
        fix:*|fix\(*) printf -- '- %s\n' "${subject}" >> "${fixed_file}" ;;
        *) printf -- '- %s\n' "${subject}" >> "${changed_file}" ;;
      esac
    done < <(git log --no-merges --format='%s%x09%h' "${target}")
  fi

  local wrote_category=false
  for category_file in "${added_file}:Added" "${fixed_file}:Fixed" "${changed_file}:Changed"; do
    local file="${category_file%%:*}"
    local category="${category_file#*:}"
    if [[ -s "${file}" ]]; then
      printf '### %s\n\n' "${category}" >> "${bucket}"
      cat "${file}" >> "${bucket}"
      printf '\n' >> "${bucket}"
      wrote_category=true
    fi
  done

  if [[ "${wrote_category}" == false ]]; then
    printf 'No changes recorded.\n\n' >> "${bucket}"
  fi
}

output_file="${work_dir}/CHANGELOG.md"
{
  printf '# Changelog\n\n'
  printf 'All notable changes to this configuration are documented here. This file is generated from version tags and commit history.\n\n'

  while IFS= read -r tag; do
    [[ -n "${tag}" ]] || continue
    if [[ "${tag}" == "${requested_tag}" && "${requested_is_tag}" == false ]]; then
      target_commit="${requested_target_commit}"
      previous="${requested_previous}"
    else
      target_ref="refs/tags/${tag}"
      target_commit="$(git rev-parse "${target_ref}^{commit}")"
      previous="$(git describe --tags --abbrev=0 "${target_commit}^" 2>/dev/null || true)"
    fi

    release_date="$(git show -s --format=%cs "${target_commit}")"
    printf '## [%s] - %s\n\n' "${tag}" "${release_date}"
    section_file="${work_dir}/section"
    : > "${section_file}"
    append_commits "${section_file}" "${target_commit}" "${previous}"
    cat "${section_file}"
  done <<< "${tags}"
} > "${output_file}"

trimmed_file="${work_dir}/CHANGELOG.trimmed.md"
awk '
  { lines[NR] = $0 }
  END {
    last = NR
    while (last > 0 && lines[last] == "") last--
    for (line = 1; line <= last; line++) print lines[line]
  }
' "${output_file}" > "${trimmed_file}"

mv "${trimmed_file}" "${changelog_file}"
printf 'Updated %s for %s.\n' "${changelog_file}" "${requested_tag}"
