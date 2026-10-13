#!/usr/bin/env bash
# proton-pass-agent.sh -- bootstrap credential for a Proton Pass agent token.
#
#   ./proton-pass-agent.sh store                       # prompt (echo off), store in the OS keychain
#   ./proton-pass-agent.sh connect                     # log pass-cli in; idempotent
#   ./proton-pass-agent.sh get <pass-uri> <reason>     # read a secret, re-logging in if needed
#   ./proton-pass-agent.sh forget                      # delete the local copy (does NOT revoke)
#   ./proton-pass-agent.sh self-check                  # prove this script works on this machine
#
# WHY THIS EXISTS
#
# Every pass-cli READ works from the session on disk, so an automated process can
# fetch secrets unaided - right up until the session expires, which for a token
# session is every two hours. Then the one command it cannot run is the login,
# because that needs the token and the token is deliberately nowhere the process
# can reach. Without help, a routine expiry strands the job and needs a human.
#
# So: exactly one bootstrap secret in the OS keychain, holding nothing but the
# token. The blast radius is unchanged - that token still reaches only the vaults
# it was granted.
#
# THE SECRET NEVER TOUCHES A COMMAND LINE. It is read with echo disabled, written
# to the keychain over stdin, read back and compared, and handed to pass-cli as a
# process environment variable. Never an argument, never echoed.
#
# RUN `self-check` BEFORE TRUSTING THIS WITH A REAL TOKEN. An agent token is
# displayed exactly once at creation, so the worst possible time to discover the
# keychain path is broken on your platform is while holding the only copy.

set -euo pipefail

CRED_NAME="${PROTON_PASS_CRED_TARGET:-proton-pass:agent-pat}"
TOKEN_NAME="${PROTON_PASS_TOKEN_NAME:-pass-cli agent}"
# Deliberately durable, not /tmp. A cleaned-up temp directory silently costs the
# session, which then surfaces as a mysterious auth failure.
SESSION_DIR="${PROTON_PASS_SESSION_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/pass-agent-session}"
PASS_CLI="${PROTON_PASS_CLI:-pass-cli}"

die()  { printf '%s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# pass-cli is only needed by connect/get. Checking it at load time meant
# `self-check` and `forget` refused to run on a machine that has not installed it
# yet, which is exactly the machine most likely to be running self-check.
require_pass_cli() {
  have "$PASS_CLI" || die \
    "pass-cli not found. Install it (https://protonpass.github.io/pass-cli/get-started/installation/) or set PROTON_PASS_CLI."
}

# --- keychain backends -------------------------------------------------------
# macOS: the login Keychain. Linux: the Secret Service (GNOME Keyring, KWallet)
# via secret-tool. A headless Linux box has neither; use the platform's own
# secret store there and export PROTON_PASS_PERSONAL_ACCESS_TOKEN at start.
#
# Detected lazily rather than at load, so self-check can run its
# platform-independent half anywhere - including Git Bash on Windows, where the
# right answer is "use ProtonPassAgent.ps1" but the shape checks are still worth
# running.

BACKEND=""

backend_available() {
  case "$(uname -s)" in
    Darwin) have security ;;
    Linux)  have secret-tool ;;
    *)      return 1 ;;
  esac
}

detect_backend() {
  [ -n "$BACKEND" ] && return 0
  case "$(uname -s)" in
    Darwin)
      have security || die "the 'security' command is missing; this is not a usable macOS install"
      BACKEND=security ;;
    Linux)
      have secret-tool \
        || die "secret-tool not found (install libsecret-tools). On a headless host, inject PROTON_PASS_PERSONAL_ACCESS_TOKEN from your platform's secret store instead."
      BACKEND=secret-tool ;;
    *)
      die "unsupported platform $(uname -s); on Windows use ProtonPassAgent.ps1" ;;
  esac
}

cred_write() {  # reads the secret on stdin
  detect_backend
  case "$BACKEND" in
    # `security add-generic-password -w "$secret"` would put the token in this
    # process's argv, where any user on the box can read it out of `ps` - which
    # is precisely the thing this script claims not to do. Interactive mode
    # takes the same command on stdin instead, so it never becomes an argument.
    security)
      printf 'add-generic-password -U -a "%s" -s "%s" -w "%s"\n' \
        "$TOKEN_NAME" "$CRED_NAME" "$(cat)" | security -i >/dev/null ;;
    secret-tool)
      secret-tool store --label="$TOKEN_NAME" service "$CRED_NAME" account "$TOKEN_NAME" ;;
  esac
}

cred_read() {
  detect_backend
  case "$BACKEND" in
    security)    security find-generic-password -a "$TOKEN_NAME" -s "$CRED_NAME" -w ;;
    secret-tool) secret-tool lookup service "$CRED_NAME" account "$TOKEN_NAME" ;;
  esac
}

cred_delete() {
  detect_backend
  case "$BACKEND" in
    security)    security delete-generic-password -a "$TOKEN_NAME" -s "$CRED_NAME" >/dev/null 2>&1 ;;
    secret-tool) secret-tool clear service "$CRED_NAME" account "$TOKEN_NAME" >/dev/null 2>&1 ;;
  esac
}

# --- validation --------------------------------------------------------------
# Pure, so self-check can exercise it without touching a keychain or a token.

# VALIDATE THE SHAPE BEFORE STORING. A value that is not a token fails much
# later, at a login, with an error that says nothing about where the bad value
# came from. One real run stored a fragment of an error message that happened to
# be on the clipboard; the mistake surfaced two commands later.
#
# The character allowlist is deliberately narrow. Real tokens are base64url-ish,
# and refusing quotes and backslashes also keeps the value safe to hand to
# `security -i`, which parses its stdin as a command line.
validate_token_shape() {
  _t="${1-}"
  [ -n "$_t" ]                      || { printf 'empty - nothing to store\n' >&2; return 1; }
  case "$_t" in
    *[[:space:]]*) printf 'token contains whitespace\n' >&2; return 1 ;;
  esac
  case "$_t" in
    pst_*::*) : ;;
    *) printf 'expected pst_<token>::<key>, got %s characters that do not match\n' "${#_t}" >&2
       return 1 ;;
  esac
  case "$_t" in
    *[!A-Za-z0-9_:.+/=-]*)
       printf 'token contains characters no Proton Pass token uses\n' >&2; return 1 ;;
  esac
  return 0
}

validate_reason() {
  _r="${1-}"
  [ -n "$_r" ] || { printf 'a reason is mandatory and is logged for the vault owner to read\n' >&2; return 1; }
  [ "${#_r}" -le 300 ] || { printf 'reason must be 300 characters or fewer\n' >&2; return 1; }
  return 0
}

# --- commands ----------------------------------------------------------------

cmd_store() {
  [ -t 0 ] || die "store needs an interactive terminal - it prompts with echo off"
  detect_backend

  printf 'Paste the %s token (pst_...::...), then Enter.\n' "$TOKEN_NAME" >&2
  printf 'It is not echoed and never reaches a command line.\n' >&2
  printf 'token: ' >&2
  IFS= read -rs token
  printf '\n' >&2

  if ! validate_token_shape "$token"; then
    token=
    die "nothing stored."
  fi

  printf '%s' "$token" | cred_write

  # VERIFY BY READING IT BACK. A credential store that lies about storing is
  # worse than one that fails: the failure surfaces later as an auth error with
  # no cause, and by then the one-time token is gone.
  check=$(cred_read) || die "keychain read-back failed; unlock the keyring and retry"
  if [ "$check" != "$token" ]; then
    token=; check=
    die "stored value did not read back - nothing usable is in the keychain"
  fi
  token=; check=
  printf "stored '%s' in the keychain, and read it back\n" "$CRED_NAME" >&2
}

cmd_connect() {
  require_pass_cli
  export PROTON_PASS_SESSION_DIR="$SESSION_DIR"
  mkdir -p "$SESSION_DIR"
  chmod 700 "$SESSION_DIR"

  if [ "${1:-}" != "--force" ]; then
    if "$PASS_CLI" info >/dev/null; then
      return 0
    fi
    die "Session check failed. Resolve the reported error; use connect --force only for an intended new login in $SESSION_DIR."
  fi

  token=$(cred_read) || die "Cannot read bootstrap credential; check secret-tool and unlock the keyring."
  [ -n "$token" ] || die "No bootstrap credential '$CRED_NAME'. Run: $0 store"
  validate_token_shape "$token" || die "Stored bootstrap credential has an invalid shape; replace it with store."
  if ! "$PASS_CLI" logout --force >/dev/null; then
    token=
    die "Could not clear the isolated session; no login attempted."
  fi
  if ! PROTON_PASS_PERSONAL_ACCESS_TOKEN="$token" "$PASS_CLI" login >/dev/null; then
    token=
    die "Token login failed in $SESSION_DIR; inspect the reported error. No retry attempted."
  fi
  token=
  "$PASS_CLI" info >/dev/null || die "Login completed but isolated session verification failed."
}

cmd_get() {
  require_pass_cli
  uri="${1:-}"; reason="${2:-}"
  [ -n "$uri" ] || die "usage: $0 get <pass://vault/item/field> <reason>"
  validate_reason "$reason" || die "refusing to read without one."

  export PROTON_PASS_SESSION_DIR="$SESSION_DIR"
  export PROTON_PASS_AGENT_REASON="$reason"

  # Capture stdout in the consuming process, not a recorded terminal.
  cmd_connect
  "$PASS_CLI" item view "$uri" || die "Secret read failed; no retry attempted."

}

cmd_forget() {
  if cred_delete; then
    printf "removed '%s' - now revoke it too: pass-cli agent delete <name>\n" "$CRED_NAME" >&2
  else
    die "no stored credential named '$CRED_NAME'"
  fi
}

# --- self-check --------------------------------------------------------------

cmd_selfcheck() {
  _pass=0; _fail=0; _skip=0

  _ok()   { _pass=$((_pass+1)); printf '  PASS  %s\n' "$1"; }
  _bad()  { _fail=$((_fail+1)); printf '  FAIL  %s\n' "$1"; }
  _skipd(){ _skip=$((_skip+1)); printf '  SKIP  %s\n        reason: %s\n' "$1" "$2"; }

  _accepts() { if validate_token_shape "$2" 2>/dev/null; then _ok "$1"; else _bad "$1"; fi; }
  _rejects() { if validate_token_shape "$2" 2>/dev/null; then _bad "$1"; else _ok "$1"; fi; }

  printf 'token shape validation\n'
  _accepts "accepts a well-formed token"        'pst_AbCd1234::EfGh5678'
  _accepts "accepts base64url punctuation"      'pst_a-b_c.d+e/f=::x-y_z'
  _rejects "rejects an empty value"             ''
  _rejects "rejects a missing pst_ prefix"      'AbCd1234::EfGh5678'
  _rejects "rejects a missing :: separator"     'pst_AbCd1234EfGh5678'
  _rejects "rejects embedded whitespace"        'pst_AbCd 1234::EfGh'
  _rejects "rejects a quote (security -i safe)" 'pst_AbCd"1234::EfGh'
  _rejects "rejects a backslash"                'pst_AbCd\1234::EfGh'
  # The real failure this guards: a clipboard fragment pasted by mistake.
  _rejects "rejects a stray clipboard fragment" 'Add-Type -Namespace ProtonPass'

  printf 'reason validation\n'
  if validate_reason 'Deploying the staging worker' 2>/dev/null; then
    _ok "accepts a normal reason"; else _bad "accepts a normal reason"; fi
  if validate_reason '' 2>/dev/null; then
    _bad "rejects an empty reason"; else _ok "rejects an empty reason"; fi
  _long=$(printf 'x%.0s' $(seq 1 301))
  if validate_reason "$_long" 2>/dev/null; then
    _bad "rejects a reason over 300 characters"; else _ok "rejects a reason over 300 characters"; fi
  _max=$(printf 'x%.0s' $(seq 1 300))
  if validate_reason "$_max" 2>/dev/null; then
    _ok "accepts a reason of exactly 300"; else _bad "accepts a reason of exactly 300"; fi

  printf 'keychain round trip\n'
  if backend_available; then
    # A throwaway target and an obviously fake value. Never the real credential.
    CRED_NAME="proton-pass:self-check-$$"
    TOKEN_NAME="proton-pass self-check"
    _fake='pst_selfcheck0000::selfcheck0000'
    # shellcheck disable=SC2064
    trap "CRED_NAME='proton-pass:self-check-$$'; cred_delete || true" EXIT

    if printf '%s' "$_fake" | cred_write 2>/dev/null; then
      _ok "writes to the $(uname -s) keychain"
      _back=$(cred_read || true)
      if [ "$_back" = "$_fake" ]; then
        _ok "reads back the identical value"
      else
        _bad "reads back the identical value (got ${#_back} chars, expected ${#_fake})"
      fi
      if cred_delete; then _ok "deletes the entry"; else _bad "deletes the entry"; fi
      _gone=$(cred_read || true)
      if [ -z "$_gone" ]; then _ok "entry is gone after delete"; else _bad "entry is gone after delete"; fi
    else
      _bad "writes to the $(uname -s) keychain"
    fi
    trap - EXIT
  else
    _skipd "store / read-back / delete against the OS keychain" \
           "no keychain backend on $(uname -s) - macOS needs 'security', Linux needs 'secret-tool'; on Windows use ProtonPassAgent.ps1"
  fi

  printf 'pass-cli\n'
  if have "$PASS_CLI"; then
    _ok "pass-cli is on PATH ($("$PASS_CLI" --version 2>/dev/null | head -1))"
  else
    _skipd "pass-cli presence" "not installed; store and self-check still work, connect and get do not"
  fi

  printf '\n%d passed, %d failed, %d skipped\n' "$_pass" "$_fail" "$_skip"
  # An `[ ... ] && printf` one-liner here is a trap: with nothing skipped the
  # test is false, the statement's status is 1, and `set -e` aborts the script
  # right after printing a clean summary. That fails only on the platforms where
  # everything runs - which is to say, only where it matters.
  if [ "$_skip" -gt 0 ]; then
    printf 'Skipped checks are unproven on this machine, not passing.\n'
  fi
  if [ "$_fail" -ne 0 ]; then
    return 1
  fi
  return 0
}

case "${1:-}" in
  store)      shift; cmd_store "$@" ;;
  connect)    shift; cmd_connect "$@" ;;
  get)        shift; cmd_get "$@" ;;
  forget)     shift; cmd_forget "$@" ;;
  self-check) shift; cmd_selfcheck "$@" ;;
  *) die "usage: $0 {store|connect|get <uri> <reason>|forget|self-check}" ;;
esac
