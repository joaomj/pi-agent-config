#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY_URL="https://github.com/joaomj/pi-agent-config.git"
readonly TARGET_DIR="${PI_CODING_AGENT_DIR:-${HOME}/.pi/agent}"
readonly SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required."
command -v npm >/dev/null 2>&1 || fail "npm is required."

if ! command -v pi >/dev/null 2>&1; then
  printf 'Installing pi...\n'
  npm install -g --ignore-scripts @earendil-works/pi-coding-agent
fi

if [[ -e "${TARGET_DIR}" ]]; then
  target_real="$(CDPATH= cd -- "${TARGET_DIR}" 2>/dev/null && pwd -P)" || \
    fail "${TARGET_DIR} exists but is not an accessible directory."
  if [[ "${target_real}" != "${SCRIPT_DIR}" ]]; then
    fail "${TARGET_DIR} already exists. Move or back it up, then run this installer again."
  fi
  printf 'Using existing checkout at %s\n' "${TARGET_DIR}"
else
  printf 'Cloning configuration into %s...\n' "${TARGET_DIR}"
  mkdir -p "$(dirname -- "${TARGET_DIR}")"
  git clone "${REPOSITORY_URL}" "${TARGET_DIR}"
fi

printf 'Installing configured pi packages...\n'
PI_CODING_AGENT_DIR="${TARGET_DIR}" pi update --extensions

missing=()
for command_name in uv rg fd fzf gh; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    missing+=("${command_name}")
  fi
done

printf '\nSetup complete.\n'
PI_CODING_AGENT_DIR="${TARGET_DIR}" pi --version
PI_CODING_AGENT_DIR="${TARGET_DIR}" pi list

if (( ${#missing[@]} > 0 )); then
  printf '\nInstall these optional workflow tools before full use: %s\n' "${missing[*]}"
fi

if [[ "${TARGET_DIR}" == "${HOME}/.pi/agent" ]]; then
  printf '\nStart pi with: pi\n'
else
  printf '\nStart pi with: PI_CODING_AGENT_DIR=%q pi\n' "${TARGET_DIR}"
fi
