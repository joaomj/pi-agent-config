#!/usr/bin/env bash
# Check extensions/permission-policy.ts on scratch agent directories: a new
# account gets the shipped policy, a second start changes nothing, an account
# policy made by hand keeps its own rules, and a later edit of config.json
# survives the next start.
#
#   scripts/check-permission-policy.sh
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
shipped="${repo_root}/permissions/pi-permission-system.json"
jiti="${repo_root}/node_modules/.bin/jiti"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

failures=0
fail() { printf 'FAIL: %s\n' "$*" >&2; failures=$((failures + 1)); }
start() {
  printf 'export { default } from "%s/extensions/permission-policy.ts";\n' "${repo_root}" > "${work}/load.ts"
  printf 'import run from "./load.ts"; run();\n' > "${work}/run.ts"
  PI_CODING_AGENT_DIR="$1" "${jiti}" "${work}/run.ts"
}
rule() { jq -c --arg s "$2" --arg p "$3" '.permission[$s][$p]' "$1"; }

# A new account gets the shipped policy.
fresh="${work}/fresh"
start "${fresh}"
config="${fresh}/extensions/pi-permission-system/config.json"
jq -e --slurpfile s "${shipped}" '. == $s[0]' "${config}" > /dev/null || fail "a new account did not get the shipped policy"
[[ ! -e "${config%config.json}local.json" ]] || fail "a new account got a local.json"

# A second start writes nothing.
before="$(stat -c %Y.%N "${config}" 2> /dev/null || stat -f %m "${config}")"
sleep 1
start "${fresh}"
after="$(stat -c %Y.%N "${config}" 2> /dev/null || stat -f %m "${config}")"
[[ "${before}" == "${after}" ]] || fail "a second start rewrote config.json"

# An account policy made by hand: its own rules stay, shipped rules arrive.
hand="${work}/hand"
dir="${hand}/extensions/pi-permission-system"
mkdir -p "${dir}"
jq '.permission.bash["git commit*"] = "ask"
  | .permission.bash["my-deploy *"] = "deny"
  | .yoloMode = true
  | del(.permission.mcp["*slack*send*"])' "${shipped}" > "${dir}/config.json"
start "${hand}"
[[ "$(rule "${dir}/config.json" bash 'git commit*')" == '"ask"' ]] || fail "the account's git commit rule was lost"
[[ "$(rule "${dir}/config.json" bash 'my-deploy *')" == '"deny"' ]] || fail "the account's own rule was lost"
[[ "$(jq -c .yoloMode "${dir}/config.json")" == 'true' ]] || fail "the account's setting was lost"
[[ "$(rule "${dir}/config.json" mcp '*slack*send*')" == '"ask"' ]] || fail "a shipped rule did not arrive"
[[ "$(jq -r '.permission.bash | keys_unsorted | last' "${dir}/config.json")" == 'my-deploy *' ]] \
  || fail "the account's new rule is not last, so a shipped catch-all could win over it"
[[ -e "${dir}/config.json.bak" ]] || fail "no backup of the hand-made config.json"
jq -e '.permission.bash["my-deploy *"] == "deny"' "${dir}/local.json" > /dev/null || fail "local.json lacks the account's rule"

# A later edit of config.json survives the next start.
jq '.permission.bash["git push*"] = "allow"' "${dir}/config.json" > "${dir}/edit.json"
mv "${dir}/edit.json" "${dir}/config.json"
start "${hand}"
[[ "$(rule "${dir}/config.json" bash 'git push*')" == '"allow"' ]] || fail "an edit of config.json was lost"
[[ "$(rule "${dir}/local.json" bash 'git push*')" == '"allow"' ]] || fail "the edit did not move into local.json"

if ((failures > 0)); then
  exit 1
fi
echo "OK: new account, second start, hand-made policy, and later edit"
