#!/usr/bin/env bash
# Install, update, or roll back the shared Pi package.
#
# A first run installs the package and walks the settings a package cannot
# ship. Later runs move the package to the newest signed release and offer only
# what is still missing.
#
#   install.sh                      install, or update what is already there
#   install.sh --dry-run            list what a run would change, change nothing
#   install.sh --rollback           undo the last run
#   install.sh --rollback v0.4.1    go back to a named release
#   install.sh --only packages      run selected configure steps only
#   install.sh --no-configure       install or update the package only
#
# Configure steps: packages, claude, agents, permissions, verify
#
# Options:
#   --ref <tag>         release to install (default: the newest signed release)
#   --source <source>   package source instead of the git release, for testing
#   --git-url <url>     repository to fetch releases from (testing only with --ref)
#   --signer <path>     allowed signers file for release signatures
#   --dry-run           show what would change and stop
#   --rollback [ref]    restore the files the installer edits, then stop
#   --claude            set up the Claude subscription transport without asking
#   --yes               accept the default answer for every question
#
# Before it edits anything, the installer records the files it touches
# (settings.json, AGENTS.md, and the permission policy) in a private
# history at ~/.pi/agent/.install-history. --rollback restores that history.
set -euo pipefail

REPO="git:github.com/joaomj/pi-agent-config"
GIT_URL="https://github.com/joaomj/pi-agent-config.git"
# The maintainer's published keys. A release installs only when its tag carries
# a signature these keys verify, so a compromised clone cannot ship a tag.
KEYS_URL="https://github.com/joaomj.keys"
SIGNER_FILE="${PI_AGENT_CONFIG_SIGNERS:-$HOME/.ssh/allowed_signers_github}"
REF=""
SOURCE_OVERRIDE=""
STEPS="packages,claude,agents,permissions,verify"
WITH_CLAUDE=0
ASSUME_YES=0
DRY_RUN=0
ROLLBACK=0
ROLLBACK_TARGET=""
RELEASE_TMP=""

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="${2:?--ref needs a value}"; shift 2 ;;
    --ref=*) REF="${1#--ref=}"; shift ;;
    --source) SOURCE_OVERRIDE="${2:?--source needs a value}"; shift 2 ;;
    --source=*) SOURCE_OVERRIDE="${1#--source=}"; shift ;;
    --git-url) GIT_URL="${2:?--git-url needs a value}"; shift 2 ;;
    --git-url=*) GIT_URL="${1#--git-url=}"; shift ;;
    --signer) SIGNER_FILE="${2:?--signer needs a value}"; shift 2 ;;
    --signer=*) SIGNER_FILE="${1#--signer=}"; shift ;;
    --only) STEPS="${2:?--only needs a value}"; shift 2 ;;
    --only=*) STEPS="${1#--only=}"; shift ;;
    --no-configure) STEPS=""; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --rollback) ROLLBACK=1; shift ;;
    --claude) WITH_CLAUDE=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) sed -n '2,29p' "$0"; exit 0 ;;
    --backup-only|--backup-dir|--reset|--drop-auth)
      printf 'install.sh: %s was removed. The installer records the files it edits\n' "$1" >&2
      printf '  in ~/.pi/agent/.install-history and restores them with --rollback.\n' >&2
      exit 2 ;;
    *) echo "install.sh: unknown option $1" >&2; exit 2 ;;
  esac
done

log() { printf '==> %s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. Install it, then retry."; }

# confirm <question> <default y|n>
# Asks only when stdin is a terminal. A failed or missing answer is a no, so
# nothing installs silently.
confirm() {
  local question="$1" default="${2:-n}" answer
  if [ "$ASSUME_YES" -eq 1 ]; then
    [ "$default" = "y" ]
    return
  fi
  [ -t 0 ] || return 1
  printf '%s [y/n] ' "$question"
  read -r answer || return 1
  case "${answer:-$default}" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

# version_ge A B -> true when A >= B
version_ge() {
  awk -v a="$1" -v b="$2" 'BEGIN{n=split(a,x,".");split(b,y,".");for(i=1;i<=3;i++){if(x[i]+0>y[i]+0)exit 0;if(x[i]+0<y[i]+0)exit 1}exit 0}'
}

has_step() {
  [ -n "$STEPS" ] || return 1
  case ",$STEPS," in *",$1,"*) return 0 ;; *) return 1 ;; esac
}

# source_parts prints a source as two lines: what it installs and its pinned
# ref, with the scheme and the git host removed. A scoped npm name starts with
# "@", so only an "@" after the first character separates a ref.
source_parts() {
  printf '%s' "$1" | awk '
    {
      s = $0
      sub(/^npm:/, "", s)
      sub(/^git:/, "", s)
      sub(/^[A-Za-z+]+:\/\//, "", s)
      sub(/^git@[^:]*:/, "", s)
      ref = ""
      for (i = length(s); i > 1; i--) {
        if (substr(s, i, 1) == "@") { ref = substr(s, i + 1); s = substr(s, 1, i - 1); break }
      }
      sub(/\/+$/, "", s)
      printf "%s\n%s\n", s, ref
    }'
}

# package_identity prints what a source installs, including its pinned ref, so
# npm, git, and local copies of the same package compare equal.
package_identity() {
  local path ref name
  { read -r path; read -r ref; } < <(source_parts "$1")
  name="$(printf '%s' "${path##*/}" | tr '[:upper:]' '[:lower:]')"
  name="${name%.git}"
  [ -n "$ref" ] || { printf '%s' "$name"; return 0; }
  printf '%s@%s' "$name" "$(printf '%s' "$ref" | tr '[:upper:]' '[:lower:]')"
}

# declared_sources prints every package source declared in settings.json.
declared_sources() {
  local settings="$AGENT_DIR/settings.json"
  [ -f "$settings" ] || return 0
  python3 - "$settings" <<'DECLARED'
import json, sys
try:
    with open(sys.argv[1]) as handle:
        packages = json.load(handle).get("packages") or []
except (OSError, json.JSONDecodeError):
    sys.exit(0)
for entry in packages:
    source = entry.get("source") if isinstance(entry, dict) else entry
    if isinstance(source, str):
        print(source)
DECLARED
}

# declared_source prints the declared entry that installs the same package as
# the given source spec, if any. A package declared through another source
# counts: installing it again would load the same code twice under two names.
declared_source() {
  local wanted identity source
  wanted="$(package_identity "$1")"
  while IFS= read -r source; do
    [ -n "$source" ] || continue
    identity="$(package_identity "$source")"
    if [ "$identity" = "$wanted" ]; then
      printf '%s' "$source"
      return 0
    fi
  done < <(declared_sources)
  return 1
}

# declared_version prints the version an npm package is installed at, or the
# commit a git package stands on.
declared_version() {
  local source="$1" path
  { read -r path; read -r _; } < <(source_parts "$source")
  case "$source" in
    npm:*)
      path="$AGENT_DIR/npm/node_modules/$path"
      [ -f "$path/package.json" ] && sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$path/package.json" | head -1
      ;;
    git:*)
      path="$AGENT_DIR/git/$path"
      [ -d "$path/.git" ] && git -C "$path" describe --tags --always 2>/dev/null
      ;;
  esac
}

# package_name prints the package name without its pinned ref, which is how two
# declarations of the same package compare when only the pin differs.
package_name() {
  local identity
  identity="$(package_identity "$1")"
  printf '%s' "${identity%@*}"
}

# declared_source_name prints the declared entry for a package name, whatever
# ref it pins, if it is declared at all.
declared_source_name() {
  local wanted source
  wanted="$(package_name "$1")"
  while IFS= read -r source; do
    [ -n "$source" ] || continue
    if [ "$(package_name "$source")" = "$wanted" ]; then
      printf '%s' "$source"
      return 0
    fi
  done < <(declared_sources)
  return 1
}

# --- Release selection ------------------------------------------------------

# download_to saves a URL with curl, then wget.
download_to() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$2" "$1"
  else
    printf 'install.sh: curl or wget is needed to download %s\n' "$1" >&2
    return 1
  fi
}

# release_tags <url> prints every release tag in the repository, newest last.
release_tags() {
  git ls-remote --tags --refs "$1" 2>/dev/null \
    | sed -n 's|.*refs/tags/\(v[0-9][0-9.]*\)$|\1|p' \
    | sort -V
}

signer_keys() {
  local cache="$RELEASE_TMP/keys"
  if [ ! -s "$cache" ]; then
    [ -n "$RELEASE_TMP" ] || die "internal: release workspace is missing"
    download_to "$KEYS_URL" "$cache" || return 1
  fi
  printf '%s' "$cache"
}

# verify_release <url> <tag> fetches one tag and prints its commit when the tag
# carries a signature from a published maintainer key. It prints nothing
# otherwise. Each repository gets its own clone, because tag names overlap.
verify_release() {
  local url="$1" tag="$2" repo keys allowed
  [ -n "$tag" ] || return 1
  repo="$RELEASE_TMP/repo"
  [ "$url" = "$GIT_URL" ] || repo="$RELEASE_TMP/$(basename "$url" .git)"
  if [ ! -d "$repo" ]; then
    git init -q --bare "$repo" || return 1
  fi
  git -C "$repo" fetch -q --depth=1 "$url" "+refs/tags/$tag:refs/tags/$tag" 2>/dev/null || return 1
  keys="$(signer_keys)" || return 1
  allowed="$RELEASE_TMP/allowed_signers"
  if [ -f "$SIGNER_FILE" ] && [ -s "$SIGNER_FILE" ]; then
    cp "$SIGNER_FILE" "$allowed"
  else
    awk 'NF >= 2 { printf "* namespaces=\"git\" %s %s\n", $1, $2 }' "$keys" > "$allowed"
  fi
  git -C "$repo" -c gpg.ssh.allowedSignersFile="$allowed" verify-tag "$tag" >/dev/null 2>&1 || return 1
  git -C "$repo" rev-parse "refs/tags/$tag^{commit}"
}

# select_release sets REF and REF_COMMIT to a release whose signature verifies.
select_release() {
  local tag commit
  RELEASE_TMP="$(mktemp -d)"
  if [ -n "$REF" ]; then
    commit="$(verify_release "$GIT_URL" "$REF" || true)"
    [ -n "$commit" ] || die "$REF is not a release whose tag signature verifies against $KEYS_URL
  Signed releases only: check the tag, or pass --ref with a signed release tag."
    REF_COMMIT="$commit"
    log "Release $REF ($(printf '%s' "$commit" | cut -c1-7)) has a valid signature"
    return 0
  fi
  for tag in $(release_tags "$GIT_URL" | sed '1!G;h;$!d'); do
    commit="$(verify_release "$GIT_URL" "$tag" || true)"
    if [ -n "$commit" ]; then
      REF="$tag"
      REF_COMMIT="$commit"
      log "Newest signed release: $tag ($(printf '%s' "$commit" | cut -c1-7))"
      return 0
    fi
    printf 'install.sh: %s has no verifiable signature; trying an older release\n' "$tag" >&2
  done
  die "no release tag carries a signature that verifies against $KEYS_URL
  To install a specific tag, pass --ref <tag>. Without a working network connection
  this check cannot run, so nothing is installed."
}

# release_notes prints the commit subjects between two release tags.
release_notes() {
  local from="$1" to="$2" repo="$RELEASE_TMP/repo" body
  [ -n "$from" ] && [ -n "$to" ] && [ "$from" != "$to" ] || return 0
  [ -d "$repo" ] || return 0
  # verify_release fetches each tag one commit deep, which leaves the commits
  # between two tags out of the clone, so fetch both tags with their history.
  if ! git -C "$repo" fetch -q --unshallow "$GIT_URL" '+refs/tags/*:refs/tags/*' 2>/dev/null; then
    git -C "$repo" fetch -q --depth=500 "$GIT_URL" \
      "+refs/tags/$from:refs/tags/$from" "+refs/tags/$to:refs/tags/$to" 2>/dev/null || return 0
  fi
  git -C "$repo" cat-file -e "refs/tags/$to" 2>/dev/null || return 0
  body="$(git -C "$repo" log --no-merges --format='%s' "refs/tags/$from..refs/tags/$to" 2>/dev/null \
    | grep -v '^release: v' | grep -v '^docs: update changelog for ' | sed 's/^/  - /' || true)"
  [ -n "$body" ] || return 0
  printf 'Changes from %s to %s:\n%s\n' "$from" "$to" "$body"
}

# --- Installer history ------------------------------------------------------
#
# Every run records the files this installer edits, before and after, in a git
# repository of its own. It never touches a repository the user keeps at
# $AGENT_DIR, and --rollback needs no tarball.

# $HIST is set in main, once the configuration directory is known.
CARRIED_PATHS="settings.json AGENTS.md extensions/pi-permission-system/config.json"
RUN_STAMP=""
RUN_DIR=""
HISTORY_RECORDED=0

hist_git() {
  git --git-dir="$HIST/store" --work-tree="$HIST/tree" \
      -c user.name="pi-agent-config installer" -c user.email="installer@pi-agent-config.invalid" \
      -c commit.gpgsign=false -c core.autocrlf=false -c core.hooksPath=/dev/null "$@"
}

# history_init creates the history and the lock, and refuses a second run.
history_init() {
  local lock="$HIST/lock"
  [ "$DRY_RUN" -eq 1 ] && return 0
  mkdir -p "$HIST/tree" "$HIST/runs"
  if [ ! -d "$HIST/store" ]; then
    git init -q --bare "$HIST/store" || die "cannot create $HIST/store"
  fi
  if ! mkdir "$lock" 2>/dev/null; then
    die "$lock exists: another run may be in progress. Remove that directory if no run is active."
  fi
  RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  RUN_DIR="$HIST/runs/$RUN_STAMP"
  mkdir -p "$RUN_DIR"
  log "Recording changes in $HIST (undo with --rollback)"
}

path_id() { printf '%s' "$1" | tr '/' '_' ; }

# history_commit stores the after-state as a new commit, so the next run can
# point at it in its start message.
history_commit() {
  local path copy message
  [ "$DRY_RUN" -eq 1 ] && return 0
  message="$RUN_STAMP"
  [ -n "${RUN_LABEL:-}" ] && message="$message $RUN_LABEL"
  for path in $CARRIED_PATHS; do
    if [ -f "$AGENT_DIR/$path" ]; then
      copy="$HIST/tree/$(path_id "$path")"
      cp "$AGENT_DIR/$path" "$copy"
      hist_git add -f -- "$(path_id "$path")" 2>/dev/null || true
    elif hist_git cat-file -e "HEAD:$(path_id "$path")" 2>/dev/null; then
      rm -f "$HIST/tree/$(path_id "$path")"
      hist_git rm --cached -q --ignore-unmatch -- "$(path_id "$path")" 2>/dev/null || true
    fi
  done
  if hist_git diff --cached --quiet 2>/dev/null; then
    log "No installer-owned file changed in this run"
    return 0
  fi
  hist_git commit -q -m "Run: $message" || die "cannot record the run in $HIST/store"
  HISTORY_RECORDED=1
  log "Recorded this run; undo it with: $0 --rollback"
}

# history_diff prints what this run changed in the files it owns.
history_diff() {
  [ -d "$HIST/store" ] || return 0
  hist_git diff --stat HEAD 2>/dev/null | sed 's/^/    /' || true
  hist_git diff HEAD -- settings.json 2>/dev/null | head -60 | sed 's/^/    /' || true
}

# history_report prints what the recorded run changed.
history_report() {
  local stat
  stat="$(hist_git diff --stat HEAD^ HEAD 2>/dev/null || true)"
  [ -n "$stat" ] || return 0
  printf '\nFiles this run changed:\n'
  printf '%s\n' "$stat" | sed 's/^/  /'
  local detail
  detail="$(hist_git diff HEAD^ HEAD -- settings.json 2>/dev/null | head -40 || true)"
  [ -n "$detail" ] && printf '%s\n' "$detail" | sed 's/^/  /'
  return 0
}

# history_rollback restores the installer-owned files from an earlier run. It
# leaves sessions, logins, and anything the user edited outside those files.
history_rollback() {
  local target label path restored=0
  [ -d "$HIST/store" ] || die "no installer history at $HIST/store; nothing to roll back"
  if [ -n "$ROLLBACK_TARGET" ]; then
    target="$(git --git-dir="$HIST/store" rev-parse "$ROLLBACK_TARGET^{commit}" 2>/dev/null || true)"
    [ -n "$target" ] || die "no recorded run matches '$ROLLBACK_TARGET'"
  else
    target="$(hist_git log --format='%H %s' --grep='^Run: ' 2>/dev/null | sed -n '2p' | awk '{ print $1 }')"
    [ -n "$target" ] || die "the history holds only one run; there is no earlier state to restore"
  fi
  label="$(hist_git log -1 --format='%s' "$target")"
  if ! confirm "Restore settings.json, AGENTS.md, and the permission policy to the state before '$label'?" y; then
    die "aborted; nothing was restored"
  fi
  for path in $CARRIED_PATHS; do
    id="$(path_id "$path")"
    if hist_git cat-file -e "$target:$id" 2>/dev/null; then
      hist_git checkout "$target" -- "$id" || die "could not restore $path"
      mkdir -p "$(dirname "$AGENT_DIR/$path")"
      cp "$HIST/tree/$id" "$AGENT_DIR/$path"
      log "Restored $path"
      restored=$((restored + 1))
    elif hist_git cat-file -e "HEAD:$id" 2>/dev/null; then
      rm -f "$AGENT_DIR/$path"
      rm -f "$HIST/tree/$id"
      log "Removed $path, which that run created"
      restored=$((restored + 1))
    fi
  done
  [ "$restored" -gt 0 ] || die "that run recorded no files to restore"
  log "Rolled back $restored file(s)"
  printf 'Packages are not rolled back: reinstall the release you want with --ref.\n'
  printf 'Removed packages stay removed until you install them again.\n'
}

# --- Settings helpers -------------------------------------------------------

# write_package_entry edits the packages array in settings.json.
#   add <file> <source> [filter-key] [filter-json] [replace-source]
#   drop <file> <source>
#   filter <file> <source> <filter-key>
write_package_entry() {
  local mode="$1"; shift
  if [ "$DRY_RUN" -eq 1 ]; then
    case "$mode" in
      add) log "Would add ${2:-} to packages in $1" ;;
      drop) log "Would remove ${2:-} from packages in $1" ;;
      filter) log "Would set \"${3:-}\": [] on ${2:-} in $1" ;;
      *) log "Would update $1 ($mode ${2:-})" ;;
    esac
    return 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    log "python3 is missing; showing the edit to apply by hand"
    case "$mode" in
      add) printf '  Add %s to packages in %s\n' "${2:-}" "${1:-settings.json}" ;;
      drop) printf '  Remove %s from packages in %s\n' "${2:-}" "${1:-settings.json}" ;;
      filter) printf '  Set "%s": [] on %s in %s\n' "${4:-}" "${3:-}" "${1:-settings.json}" ;;
    esac
    return 0
  fi
  python3 - "$mode" "$@" <<'PACKAGE_ENTRY'
import json, os, sys, tempfile

mode, path = sys.argv[1], sys.argv[2]
data = {}
if os.path.exists(path):
    with open(path) as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError as error:
            sys.exit(f"{path} is not valid JSON: {error}")
packages = data.get("packages") or []

if mode == "add":
    source, key, value, replace = (sys.argv[3:8] + ["", "", "", ""])[:4]

    def entry_for(previous):
        # Keep the shape the entry already had: pi writes a bare string unless
        # the entry carries resource filters.
        if isinstance(previous, dict):
            entry = dict(previous)
            entry["source"] = source
            if key:
                entry[key] = json.loads(value) if value else []
            return entry
        if key:
            return {"source": source, key: json.loads(value) if value else []}
        return source

    if replace:
        for index, existing in enumerate(packages):
            current = existing.get("source") if isinstance(existing, dict) else existing
            if current == replace:
                packages[index] = entry_for(existing)
                break
        else:
            packages.append(entry_for(None))
    else:
        packages.append(entry_for(None))
elif mode == "drop":
    source = sys.argv[3]
    packages = [entry for entry in packages
                if (entry.get("source") if isinstance(entry, dict) else entry) != source]
elif mode == "filter":
    source, key = sys.argv[3:5]
    for index, existing in enumerate(packages):
        current = existing.get("source") if isinstance(existing, dict) else existing
        if current == source:
            packages[index] = {"source": source, key: []}
            break
    else:
        sys.exit(0)
else:
    sys.exit(f"unknown mode {mode}")

data["packages"] = packages
directory = os.path.dirname(path) or "."
fd, tmp = tempfile.mkstemp(dir=directory)
with os.fdopen(fd, "w") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\n")
os.replace(tmp, path)
PACKAGE_ENTRY
}

# pin_filter writes the resource filter a pinned package needs, once the step
# has declared it.
pin_filter() {
  local pkg="$1" filter="$2"
  [ -n "$filter" ] || return 0
  write_package_entry filter "$AGENT_DIR/settings.json" "$(declared_source_name "$pkg" || echo "$pkg")" "$filter"
}

# set_browser_setting writes one pi-browser-use setting, keeping the others.
set_browser_setting() {
  local key="$1" value="$2" settings="$AGENT_DIR/settings.json"
  if ! command -v python3 >/dev/null 2>&1; then
    log "Set pi-browser-use.$key to $value in $settings"
    return
  fi
  python3 - "$settings" "$key" "$value" <<'BROWSERCFG' || printf 'install.sh: could not set pi-browser-use.%s in %s\n' "$key" "$settings" >&2
import json, os, sys, tempfile
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
data = {}
if os.path.exists(path):
    with open(path) as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError:
            sys.exit(1)
config = data.get("pi-browser-use")
if not isinstance(config, dict):
    config = {}
config[key] = json.loads(value) if value.startswith("[") else value
data["pi-browser-use"] = config
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path) or ".")
with os.fdopen(fd, "w") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\n")
os.replace(tmp, path)
BROWSERCFG
}

# --- Prerequisites ----------------------------------------------------------

# find_chrome mirrors how pi-browser-use resolves a browser: CHROME_PATH, the
# executablePath setting, then the standard install paths.
find_chrome() {
  local candidate configured="" settings="$AGENT_DIR/settings.json"
  [ -n "${CHROME_PATH:-}" ] && [ -x "${CHROME_PATH}" ] && return 0
  if [ -f "$settings" ] && command -v python3 >/dev/null 2>&1; then
    configured="$(python3 - "$settings" <<'CHROME' || true
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except (OSError, json.JSONDecodeError):
    sys.exit(0)
value = (data.get("pi-browser-use") or {}).get("executablePath")
print(value if isinstance(value, str) else "")
CHROME
)"
    [ -n "$configured" ] && [ -x "$configured" ] && return 0
  fi
  for candidate in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
                   "/Applications/Chromium.app/Contents/MacOS/Chromium" \
                   /usr/bin/google-chrome-stable /usr/bin/google-chrome \
                   /usr/bin/chromium /usr/bin/chromium-browser /snap/bin/chromium; do
    [ -x "$candidate" ] && return 0
  done
  for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
    command -v "$candidate" >/dev/null 2>&1 && return 0
  done
  return 1
}

node_platform() {
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) echo linux-x64 ;;
    Linux-aarch64|Linux-arm64) echo linux-arm64 ;;
    Darwin-arm64) echo darwin-arm64 ;;
    Darwin-x86_64) echo darwin-x64 ;;
    *) return 1 ;;
  esac
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{ print $1 }'
  else
    shasum -a 256 "$1" | awk '{ print $1 }'
  fi
}

# install_node_major unpacks an official Node.js build into ~/.local/opt and
# links it into ~/.local/bin. No root, no system package changes.
install_node_major() {
  local major="$1" platform tmp file version root expected actual binary
  if ! platform="$(node_platform)"; then
    log "No official Node.js build for $(uname -s) $(uname -m)"
    return 1
  fi
  tmp="$(mktemp -d)"
  if ! download_to "https://nodejs.org/dist/latest-v${major}.x/SHASUMS256.txt" "$tmp/SHASUMS256.txt"; then
    rm -rf "$tmp"
    return 1
  fi
  file="$(grep -oE "node-v[0-9.]+-${platform}\.tar\.xz" "$tmp/SHASUMS256.txt" | head -1 || true)"
  if [ -z "$file" ]; then
    log "No Node.js $major build listed for $platform"
    rm -rf "$tmp"
    return 1
  fi
  version="${file#node-v}"; version="${version%%-*}"
  expected="$(awk -v f="$file" '$2 == f { print $1; exit }' "$tmp/SHASUMS256.txt")"
  if [ -z "$expected" ]; then
    log "No checksum listed for $file; refusing to install it"
    rm -rf "$tmp"
    return 1
  fi
  log "Downloading $file"
  if ! download_to "https://nodejs.org/dist/latest-v${major}.x/$file" "$tmp/$file"; then
    rm -rf "$tmp"
    return 1
  fi
  actual="$(sha256_file "$tmp/$file")"
  if [ "$actual" != "$expected" ]; then
    log "Checksum mismatch for $file; refusing to unpack it"
    printf '  expected %s\n  actual   %s\n' "$expected" "$actual" >&2
    rm -rf "$tmp"
    return 1
  fi
  log "Checksum verified for $file"
  root="$HOME/.local/opt/node-$major"
  rm -rf "$root"
  mkdir -p "$root" "$HOME/.local/bin"
  if ! tar xf "$tmp/$file" -C "$root" --strip-components=1; then
    log "Could not unpack $file"
    rm -rf "$tmp"
    return 1
  fi
  for binary in node npm npx corepack; do
    [ -e "$root/bin/$binary" ] && ln -sf "$root/bin/$binary" "$HOME/.local/bin/$binary"
  done
  rm -rf "$tmp"
  export PATH="$HOME/.local/bin:$PATH"
  log "Node $version installed under $root; $HOME/.local/bin now points at it"
  log "Keep $HOME/.local/bin before the system path so Pi starts on Node $major"
}

# ensure_path_reaches installs nothing; it makes the new Node reachable in
# future shells when no profile adds ~/.local/bin.
ensure_path_reaches() {
  if grep -qF '.local/bin' "$HOME/.profile" "$HOME/.bashrc" 2>/dev/null; then
    log "~/.local/bin is already on PATH in your shell profile"
    return
  fi
  if ! confirm "Add ~/.local/bin to PATH in ~/.profile so new shells find Node?" y; then
    printf 'install.sh: add this to your shell profile before starting Pi:\n  export PATH="$HOME/.local/bin:$PATH"\n' >&2
    return
  fi
  printf '\n# Added by pi-agent-config: user installs live in ~/.local/bin\ncase ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac\n' >> "$HOME/.profile"
  log "Added ~/.local/bin to PATH in ~/.profile"
}

# missing_prerequisite prints what a package needs and returns 0 when it is
# missing, so the caller can skip the install instead of breaking the session.
missing_prerequisite() {
  local major
  case "$1" in
    node24)
      major="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || true)"
      if [ -z "$major" ] || [ "$major" -lt 24 ]; then
        printf 'Node 24 or later (found %s)' "${major:+v$major}"
        return 0
      fi
      ;;
    chrome)
      if ! find_chrome; then
        printf 'Google Chrome or Chromium'
        return 0
      fi
      ;;
  esac
  return 1
}

# ensure_prerequisite offers to install what a package needs, then confirms it
# is there. Without a terminal nothing is installed and the package is skipped.
# Chrome is never downloaded: Google publishes no checksums for it.
ensure_prerequisite() {
  local need="$1" reason
  reason="$(missing_prerequisite "$need" || true)"
  [ -n "$reason" ] || return 0
  log "$reason is required"
  case "$need" in
    node24)
      if [ "$DRY_RUN" -eq 1 ]; then
        log "Would install Node 24"
        return 1
      fi
      if ! confirm "Install $reason now?" y; then
        return 1
      fi
      install_node_major 24 || return 1
      ensure_path_reaches
      ;;
    *)
      printf 'install.sh: install %s yourself, then rerun. This installer does not download a browser.\n' "$reason" >&2
      return 1
      ;;
  esac
  reason="$(missing_prerequisite "$need" || true)"
  if [ -n "$reason" ]; then
    printf 'install.sh: %s is still missing\n' "$reason" >&2
    return 1
  fi
}

# --- Shared rules block -----------------------------------------------------

MARK_START="<!-- pi-agent-config: shared rules -->"
MARK_END="<!-- pi-agent-config: end shared rules -->"

# rules_block <mode> <target> <source>
#   check  exit 0 when the shared block in target already matches source
#   write  replace the shared block in target with the source
#   diff   print the difference between the shared block and the source
rules_block() {
  local mode="$1" target="$2" source="$3"
  python3 - "$mode" "$target" "$source" "$MARK_START" "$MARK_END" <<'RULES'
import difflib
import sys

mode, target, source, start, end = sys.argv[1:6]
with open(source) as handle:
    body = handle.read().rstrip("\n")
block = f"{start}\n{body}\n{end}"

try:
    with open(target) as handle:
        text = handle.read()
except FileNotFoundError:
    sys.exit(2)

if start not in text or end not in text:
    sys.exit(2)

start_index = text.index(start)
end_index = text.index(end, start_index) + len(end)
current = text[start_index:end_index]

if mode == "check":
    sys.exit(0 if current == block else 1)
if mode == "diff":
    for line in difflib.unified_diff(current.splitlines(), block.splitlines(),
                                     "current", "shared", lineterm="", n=2):
        print("    " + line)
    sys.exit(0)
if mode == "write":
    with open(target, "w") as handle:
        handle.write(text[:start_index] + block + text[end_index:])
    sys.exit(0)
sys.exit(f"unknown mode {mode}")
RULES
}

# rules_already_in reports whether every non-empty line of the second file
# already appears in the first.
rules_already_in() {
  [ -f "$1" ] && [ -f "$2" ] || return 1
  awk 'FNR == NR { if ($0 !~ /^[ \t]*$/) want[$0] = 1; next }
       { seen[$0] = 1 }
       END { for (line in want) if (!(line in seen)) exit 1 }' "$2" "$1"
}

# --- Main -------------------------------------------------------------------

need pi
need git
command -v python3 >/dev/null 2>&1 \
  || die "python3 is required to edit settings.json safely. Install it, then retry."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
AGENT_DIR="${AGENT_DIR%/}"

if [ "$(realpath "$SCRIPT_DIR" 2>/dev/null || echo "$SCRIPT_DIR")" = "$(realpath "$AGENT_DIR" 2>/dev/null || echo "$AGENT_DIR")" ]; then
  die "Run this script from a clone, not from inside $AGENT_DIR."
fi

cleanup() {
  rm -rf "${RELEASE_TMP:-}" 2>/dev/null || true
  [ -n "${HIST:-}" ] && rmdir "$HIST/lock" 2>/dev/null || true
}
trap cleanup EXIT

for step in ${STEPS//,/ }; do
  case "$step" in
    packages|claude|agents|permissions|verify) ;;
    *) die "unknown configure step '$step'. Steps: packages, claude, agents, permissions, verify" ;;
  esac
done

mkdir -p "$AGENT_DIR" || die "cannot create $AGENT_DIR"
HIST="$AGENT_DIR/.install-history"

log "Pi version: $(pi --version 2>/dev/null | head -1)"
log "Config directory: $AGENT_DIR"
if [ "$DRY_RUN" -eq 1 ]; then log "Dry run: no package, file, or setting will change"; fi

if [ "$ROLLBACK" -eq 1 ]; then
  history_rollback
  exit 0
fi

# The package list lives in settings.json, which this script reads and writes
# with python3. Without it every package looks undeclared.
command -v python3 >/dev/null 2>&1 \
  || die "python3 is required to read and write $AGENT_DIR/settings.json. Install python3, then rerun."

history_init
select_release

SOURCE="${SOURCE_OVERRIDE:-$REPO@$REF}"

# --- 1. Install or update the package --------------------------------------

FROM_REF=""
EXISTING="$(declared_source_name pi-agent-config || true)"
if [ -n "$EXISTING" ]; then
  case "$EXISTING" in
    *@*) FROM_REF="${EXISTING##*@}" ;;
  esac
fi

if [ -n "$EXISTING" ] && [ "$EXISTING" = "$SOURCE" ]; then
  log "Package already at $SOURCE; nothing to update"
elif [ -n "$EXISTING" ]; then
  log "Updating the package from $EXISTING to $SOURCE"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "Would update the package to $SOURCE"
    log "Would record $SOURCE in $AGENT_DIR/settings.json"
  elif ! pi update --extension "$SOURCE"; then
    printf 'install.sh: updating in place failed; reinstalling %s\n' "$SOURCE" >&2
    pi remove "$EXISTING" >/dev/null 2>&1 || true
    pi install "$SOURCE" || die "could not install $SOURCE; undo with: $0 --rollback"
  else
    # An in-place update leaves the declared ref alone, so a package tracked at
    # @main would look updatable on every run. Record the release that is now
    # on disk instead.
    recorded="$(declared_source_name pi-agent-config || true)"
    if [ "$recorded" != "$SOURCE" ]; then
      write_package_entry add "$AGENT_DIR/settings.json" "$SOURCE" "" "" "${recorded:-$EXISTING}"
      log "Recorded $SOURCE in settings.json"
    fi
  fi
else
  log "Installing $SOURCE"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "Would install $SOURCE"
  else
    pi install "$SOURCE" || die "pi install failed; nothing else was changed"
    declared_source_name pi-agent-config >/dev/null \
      || die "the package is not listed after install; check 'pi list'"
  fi
fi

if [ -n "$FROM_REF" ] && [ "$FROM_REF" != "$REF" ]; then
  release_notes "$FROM_REF" "$REF"
fi

# Use the files of the installed release, not of this checkout.
PKG_DIR=""
entry="$(declared_source_name pi-agent-config || true)"
case "$entry" in
  git:*)
    candidate="$AGENT_DIR/git/${entry#git:}"; candidate="${candidate%@*}"
    [ -f "$candidate/package.json" ] && PKG_DIR="$candidate"
    ;;
  npm:*)
    candidate="$AGENT_DIR/npm/node_modules/${entry#npm:}"; candidate="${candidate%@*}"
    [ -f "$candidate/package.json" ] && PKG_DIR="$candidate"
    ;;
esac
if [ -n "$PKG_DIR" ]; then
  log "Package files: $PKG_DIR"
elif [ "$DRY_RUN" -eq 1 ]; then
  PKG_DIR="$SCRIPT_DIR"
  log "Package files: $SCRIPT_DIR (checkout, because nothing is installed yet)"
fi

WARNINGS=""
warn() { WARNINGS="$WARNINGS$1
"; }

if [ -n "$STEPS" ] && [ "$ASSUME_YES" -ne 1 ] && [ ! -t 0 ]; then
  log "No terminal: steps that need an answer will be skipped. Use --yes for defaults"
  log "or run the script in a terminal."
fi

printf '\n'

# --- 2. Packages ------------------------------------------------------------
if has_step packages; then
  log "Third-party packages. Each one is optional and runs with your permissions."
  # source|description|default|resource filter|requires
  PINNED=(
    "npm:pi-ask-user@0.16.0|interactive multiple-choice questions|y|skills|"
    "npm:@ff-labs/pi-fff@0.11.0|indexed file search: fffind and ffgrep|y||"
    "npm:@gotgenes/pi-permission-system@41.0.0|tool permission checks|y||"
    "npm:pi-bg-bash@0.4.1|bash commands that move to the background when slow and wake the session when done|y||"
    "npm:@joaomj/pi-claude-usage@0.2.0|Claude subscription quota in the footer|y||"
    "npm:pi-context-view@0.8.0|inspect what fills the context window|y|skills|"
    "npm:pi-browser-use@0.12.15|managed browser automation tools|y||node24,chrome"
    "npm:@ahm3tj4f/pi-undo@0.5.0|undo and redo of the last agent run, files included|y||"
  )
  # Sources this configuration replaced. A leftover declaration keeps the old
  # code loading, and a tool that both packages register stops Pi from
  # starting, so a retired package is removed instead of left in place.
  RETIRED=(
    "npm:@joaomj/pi-background-bash|pi-bg-bash replaced it, and both register a bash tool"
    "npm:pi-background-run|pi-bg-bash replaced it as the background command runner"
  )
  for entry in "${RETIRED[@]}"; do
    IFS='|' read -r retired why <<< "$entry"
    existing="$(declared_source_name "$retired" || true)"
    [ -n "$existing" ] || continue
    if [ "$DRY_RUN" -eq 1 ]; then
      log "Would remove $existing ($why)"
      continue
    fi
    if confirm "Remove $existing? $why." y; then
      if pi remove "$existing" >/dev/null 2>&1; then
        log "Removed $existing ($why)"
      else
        warn "$existing could not be removed; run: pi remove $existing"
      fi
    else
      warn "$existing is still declared ($why); Pi may not start until it is removed"
    fi
  done

  for entry in "${PINNED[@]}"; do
    IFS='|' read -r pkg desc default filter requires <<< "$entry"
    wanted="${pkg##*@}"
    existing="$(declared_source_name "$pkg" || true)"
    current=""
    if [ -n "$existing" ]; then
      if [ "$(package_name "$existing")" != "$(package_name "$pkg")" ]; then
        log "Declared as $existing, which is a different package; leaving it"
        continue
      fi
      current="$(declared_version "$existing" || true)"
    fi
    # The copy on disk decides the version, declared or not, so a package that
    # is already there at the pinned version is never offered as an install.
    disk="$(declared_version "$pkg" || true)"
    present="${current:-$disk}"

    if [ "$present" = "$wanted" ]; then
      if [ -n "$existing" ]; then
        log "Already installed: $pkg"
      elif [ "$DRY_RUN" -eq 1 ]; then
        log "Would register $pkg; the pinned $wanted is already on disk"
      else
        log "Registering $pkg; the pinned $wanted is already on disk"
        if ! pi install "$pkg"; then
          warn "$pkg could not be registered"
          printf 'install.sh: %s could not be registered; continue without it\n' "$pkg" >&2
          continue
        fi
      fi
      pin_filter "$pkg" "$filter"
      continue
    fi

    # The pin is a floor, never a target: a newer copy stays where it is.
    if [ -n "$present" ] && version_ge "$present" "$wanted"; then
      log "Leaving $pkg at $present; this release pins $wanted and never downgrades"
      pin_filter "$pkg" "$filter"
      continue
    fi

    if [ -n "$requires" ]; then
      prereqs_ok=1
      missing_list=""
      IFS=',' read -ra needs <<< "$requires"
      for need in "${needs[@]}"; do
        if ! ensure_prerequisite "$need"; then
          prereqs_ok=0
          reason="$(missing_prerequisite "$need" || true)"
          [ -n "$reason" ] || reason="$need"
          missing_list="${missing_list:+$missing_list, }$reason"
        fi
      done
      if [ "$prereqs_ok" -eq 0 ]; then
        warn "$pkg was skipped: missing $missing_list"
        log "Skipped $pkg: missing $missing_list"
        continue
      fi
    fi

    if [ -z "$present" ]; then
      if [ -n "$existing" ]; then
        question="Reinstall $pkg at $wanted? It is declared as $existing but missing on disk."
      else
        question="Install $pkg ($desc)?"
      fi
    elif [ -n "$existing" ]; then
      question="Advance $pkg from $present to $wanted?"
    else
      question="Add $pkg? It advances the copy on disk from $present to $wanted."
    fi
    # A dry run reports the plan instead of asking for it.
    if [ "$DRY_RUN" -eq 1 ]; then
      if [ -n "$present" ]; then
        log "Would advance $pkg from $present to $wanted"
      elif [ -n "$existing" ]; then
        log "Would reinstall $pkg; it is declared but missing on disk"
      else
        log "Would install $pkg"
      fi
      continue
    fi
    if ! confirm "$question" "$default"; then
      log "Skipped: $pkg"
      continue
    fi
    if [ -n "$existing" ] && pi update --extension "$pkg"; then
      pin_filter "$pkg" "$filter"
      continue
    fi
    if [ -n "$existing" ]; then
      log "The in-place update left $pkg at $present; reinstalling from the pinned source"
      pi remove "$existing" >/dev/null 2>&1 || true
    fi
    if pi install "$pkg"; then
      pin_filter "$pkg" "$filter"
    else
      warn "$pkg failed to install"
      printf 'install.sh: %s failed to install; continue without it\n' "$pkg" >&2
    fi
  done
fi

# --- 3. Claude transport ----------------------------------------------------
if has_step claude; then
  CLAUDE_RANGE_MIN="2.1.263"
  CLAUDE_RANGE_MAX="2.2.0"
  CLAUDE_CLI_PIN="2.1.281"
  CLAUDESDK_URL="https://github.com/joaomj/pi-claude-directsdk.git"
  # The newest signed release, so the installer never offers an older transport.
  CLAUDESDK_TAG=""
  for tag in $(release_tags "$CLAUDESDK_URL" | sed '1!G;h;$!d'); do
    if [ -n "$(verify_release "$CLAUDESDK_URL" "$tag" || true)" ]; then
      CLAUDESDK_TAG="$tag"
      break
    fi
    printf 'install.sh: pi-claude-directsdk %s has no verifiable signature; trying an older release\n' "$tag" >&2
  done
  CLAUDESDK_SOURCE="git:github.com/joaomj/pi-claude-directsdk@$CLAUDESDK_TAG"

  cli_version_of() { claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true; }
  cli_qualified() {
    [ -n "$1" ] && version_ge "$1" "$CLAUDE_RANGE_MIN" && ! version_ge "$1" "$CLAUDE_RANGE_MAX"
  }

  existing="$(declared_source_name pi-claude-directsdk || true)"
  claude_wanted=0
  if [ -z "$CLAUDESDK_TAG" ]; then
    msg="no pi-claude-directsdk release tag carries a signature that verifies against $KEYS_URL; skipping the Claude transport"
    printf 'install.sh: %s\n' "$msg" >&2
    warn "$msg"
  elif [ -n "$existing" ] && [ "$existing" = "$CLAUDESDK_SOURCE" ]; then
    log "Claude transport already at the newest release, $CLAUDESDK_TAG"
  elif [ -n "$existing" ]; then
    log "Claude transport is declared as $existing; the newest release is $CLAUDESDK_SOURCE"
    if confirm "Move the Claude transport to $CLAUDESDK_TAG?" y; then claude_wanted=1; fi
  elif [ "$WITH_CLAUDE" -eq 1 ] \
       || confirm "Set up the Claude subscription transport? It needs a paid Claude plan and a Claude Code login." n; then
    claude_wanted=1
  else
    log "Skipped the Claude transport"
  fi

  if [ "$claude_wanted" -eq 1 ]; then
    node_major="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || true)"
    if [ -n "$node_major" ] && [ "$node_major" -lt 20 ]; then
      printf 'install.sh: Node 20 or later is required for this transport; found %s\n' "$(node -v)" >&2
    fi
    cli_version="$(cli_version_of || true)"
    if ! cli_qualified "$cli_version"; then
      if [ -n "$cli_version" ]; then
        log "Claude Code CLI $cli_version is outside the qualified range $CLAUDE_RANGE_MIN <= v < $CLAUDE_RANGE_MAX"
      else
        log "Claude Code CLI not found"
      fi
      log "The qualified version is $CLAUDE_CLI_PIN."
      if [ "$DRY_RUN" -ne 1 ] && confirm "Install it globally with npm now?" y; then
        log "Running: npm install -g --ignore-scripts=false @anthropic-ai/claude-code@$CLAUDE_CLI_PIN"
        if npm install -g --ignore-scripts=false "@anthropic-ai/claude-code@$CLAUDE_CLI_PIN"; then
          log "CLI install finished"
        else
          printf 'install.sh: the global install failed. A permissions error usually means npm needs a writable prefix.\n' >&2
        fi
        cli_version="$(cli_version_of || true)"
      fi
    fi

    if ! cli_qualified "$cli_version"; then
      warn "the Claude transport needs Claude Code CLI $CLAUDE_CLI_PIN"
      log "Claude transport not installed: the CLI is missing or outside the qualified range."
      printf '  Fix it with:\n    npm install -g --ignore-scripts=false @anthropic-ai/claude-code@%s\n  Then rerun:\n    %s --only claude\n' "$CLAUDE_CLI_PIN" "$0" >&2
    elif [ "$DRY_RUN" -eq 1 ]; then
      log "Would install the Claude transport from $CLAUDESDK_SOURCE"
    else
      if claude auth status --json 2>/dev/null | grep -Eq '"loggedIn"[[:space:]]*:[[:space:]]*true'; then
        log "Claude Code is signed in"
      else
        log "Claude Code is not signed in"
        if [ -t 0 ] && confirm "Run claude auth login now? It opens a browser." y; then
          claude auth login || printf 'install.sh: claude auth login did not finish; run it yourself, then rerun --only claude\n' >&2
        fi
      fi
      if [ -n "$existing" ]; then
        log "Moving the Claude transport from $existing to $CLAUDESDK_TAG"
        if ! pi update --extension "$CLAUDESDK_SOURCE"; then
          pi remove "$existing" >/dev/null 2>&1 || true
          pi install "$CLAUDESDK_SOURCE" || warn "the Claude transport could not be installed"
        fi
      else
        log "Installing $CLAUDESDK_SOURCE"
        pi install "$CLAUDESDK_SOURCE" || warn "the Claude transport could not be installed"
      fi
      cat <<'CLAUDE'
  One step stays interactive: restart Pi, open /model, wait for the DirectSDK
  catalog refresh, then choose a DirectSDK model. Start with the haiku model to
  check the account. This transport uses the Claude Code login, not Pi's
  Anthropic login.
CLAUDE
    fi
  fi
fi

# --- 4. Shared rules --------------------------------------------------------
if has_step agents; then
  if [ -z "$PKG_DIR" ] || [ ! -f "$PKG_DIR/AGENTS.md" ]; then
    log "No AGENTS.md in the package sources; skipping"
  else
    target="$AGENT_DIR/AGENTS.md"
    source="$PKG_DIR/AGENTS.md"
    if [ ! -f "$target" ]; then
      if confirm "Create $target from the shared rules?" y; then
        if [ "$DRY_RUN" -eq 1 ]; then
          log "Would create $target from the shared rules"
        else
          mkdir -p "$AGENT_DIR"
          cp "$source" "$target"
          log "Created $target"
        fi
      fi
    elif rules_block check "$target" "$source"; then
      log "Shared rules block in $target is current"
    elif grep -qF "$MARK_START" "$target"; then
      log "The shared rules block in $target differs from this release"
      rules_block diff "$target" "$source"
      if confirm "Replace the shared rules block in $target?" y; then
        if [ "$DRY_RUN" -eq 1 ]; then
          log "Would replace the shared rules block in $target"
        else
          rules_block write "$target" "$source" || warn "could not rewrite the shared rules block in $target"
          log "Replaced the shared rules block; review the diff before you rely on it"
        fi
      else
        log "Kept the existing shared rules block"
      fi
    elif rules_already_in "$target" "$source"; then
      log "Shared rules already in $target without markers; not appending them again"
    elif confirm "Append the shared rules block to $target?" n; then
      if [ "$DRY_RUN" -eq 1 ]; then
        log "Would append the shared rules block to $target"
      else
        { printf '\n%s\n' "$MARK_START"; cat "$source"; printf '%s\n' "$MARK_END"; } >> "$target"
        log "Appended the shared rules block; review the diff before you rely on it"
      fi
    fi
  fi
fi

# --- 5. Permission policy ---------------------------------------------------
if has_step permissions; then
  src="$PKG_DIR/extensions/pi-permission-system/config.json"
  target="$AGENT_DIR/extensions/pi-permission-system/config.json"
  if [ -z "$PKG_DIR" ] || [ ! -f "$src" ]; then
    log "No reference permission policy in the package sources; skipping"
  elif [ ! -f "$target" ]; then
    if confirm "Install the reference permission policy at $target?" y; then
      if [ "$DRY_RUN" -eq 1 ]; then
        log "Would install the reference permission policy"
      else
        mkdir -p "$(dirname "$target")"
        cp "$src" "$target"
        log "Installed the reference policy; review it in your editor"
      fi
    fi
  elif cmp -s "$src" "$target"; then
    log "Permission policy already matches the reference"
  else
    proposed="$target.proposed"
    log "Your policy differs from this release's reference"
    diff -u "$target" "$src" | head -40 || true
    if confirm "Overwrite your policy with the reference?" n; then
      if [ "$DRY_RUN" -eq 1 ]; then
        log "Would overwrite $target with the reference policy"
      else
        cp "$src" "$target"
        log "Overwrote the policy; undo with $0 --rollback"
      fi
    else
      [ "$DRY_RUN" -eq 1 ] || { cp "$src" "$proposed"; log "Nothing overwritten; the reference is at $proposed"; }
    fi
  fi
fi

# --- 6. Verify --------------------------------------------------------------
if has_step verify; then
  log "Installed packages"
  pi list 2>/dev/null | sed 's/^/    /'
  if [ -n "$PKG_DIR" ]; then
    prompts="$(find "$PKG_DIR/prompts" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ' || true)"
    skills="$(find "$PKG_DIR/skills" -name SKILL.md 2>/dev/null | wc -l | tr -d ' ' || true)"
    log "Package resources: $prompts prompt templates, $skills skills"
    log "Review or disable any of them with: pi config"
  fi
fi

# --- 7. Report --------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  printf '\nDry run: nothing was changed.\n'
  printf 'What the last recorded run changed (if anything):\n'
  history_diff
  exit 0
fi

history_commit
if [ "$HISTORY_RECORDED" -eq 1 ]; then history_report; fi

printf '\nDone.\n'
if [ -n "$WARNINGS" ]; then
  printf '\nNeeds attention:\n'
  printf '%s' "$WARNINGS" | sed 's/^/  - /'
fi
cat <<'MSG'

Next steps:
  1. Run /login and /model if this machine has no provider yet.
  2. Start Pi and check /help for the shared templates.
  3. Update later with this script. Undo the last run with --rollback.
MSG
