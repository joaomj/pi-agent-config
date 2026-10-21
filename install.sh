#!/usr/bin/env bash
# Install and configure the shared Pi package.
#
# The script backs up the Pi configuration before it changes anything, then
# installs the package and walks the settings a package cannot ship.
#
#   install.sh                      back up, install, then configure
#   install.sh --only packages      run selected configure steps only
#   install.sh --no-configure       back up and install only
#   install.sh --reset              move the current configuration aside first
#   install.sh --backup-only        stop after the backup
#
# Configure steps: packages, claude, agents, permissions, mcp, verify
#
# Options:
#   --ref <ref>         git ref to install (default: main)
#   --source <source>   package source instead of the git URL, for testing
#   --backup-dir <dir>  where to write the backup and the moved-aside copy (default: $HOME)
#   --reset             move the existing configuration aside before installing
#   --drop-auth         with --reset, move the provider login aside too
#   --backup-only       stop after the backup
#   --claude            set up the Claude subscription transport without asking
#   --yes               accept the default answer for every question
set -euo pipefail

REPO="git:github.com/joaomj/pi-agent-config"
REF="main"
SOURCE_OVERRIDE=""
BACKUP_DIR="${HOME}"
STEPS="packages,claude,agents,permissions,mcp,verify"
WITH_CLAUDE=0
RESET=0
DROP_AUTH=0
BACKUP_ONLY=0
ASSUME_YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="${2:?--ref needs a value}"; shift 2 ;;
    --ref=*) REF="${1#--ref=}"; shift ;;
    --source) SOURCE_OVERRIDE="${2:?--source needs a value}"; shift 2 ;;
    --source=*) SOURCE_OVERRIDE="${1#--source=}"; shift ;;
    --backup-dir) BACKUP_DIR="${2:?--backup-dir needs a value}"; shift 2 ;;
    --backup-dir=*) BACKUP_DIR="${1#--backup-dir=}"; shift ;;
    --only) STEPS="${2:?--only needs a value}"; shift 2 ;;
    --only=*) STEPS="${1#--only=}"; shift ;;
    --no-configure) STEPS=""; shift ;;
    --reset) RESET=1; shift ;;
    --drop-auth) DROP_AUTH=1; shift ;;
    --backup-only) BACKUP_ONLY=1; shift ;;
    --claude) WITH_CLAUDE=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
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

MARK_START="<!-- pi-agent-config: shared rules -->"
MARK_END="<!-- pi-agent-config: end shared rules -->"

need pi
need tar
need git

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
AGENT_DIR="${AGENT_DIR%/}"
AGENT_PARENT="$(dirname "$AGENT_DIR")"
AGENT_BASE="$(basename "$AGENT_DIR")"

if [ "$(realpath "$SCRIPT_DIR" 2>/dev/null || echo "$SCRIPT_DIR")" = "$(realpath "$AGENT_DIR" 2>/dev/null || echo "$AGENT_DIR")" ]; then
  die "Run this script from a clone, not from inside $AGENT_DIR."
fi

log "Pi version: $(pi --version 2>/dev/null | head -1)"
log "Config directory: $AGENT_DIR"

# --- 1. Backup, before any change -------------------------------------------
mkdir -p "$BACKUP_DIR" || die "cannot create $BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$BACKUP_DIR/pi-agent-backup-$STAMP.tar.gz"
RESTORE_HINT=""

if [ -d "$AGENT_DIR" ]; then
  log "Backing up configuration to $BACKUP"
  # Settings, instructions, prompts, skills, and extension configuration.
  # Downloads and session history are excluded; both are large and regenerable.
  tar czf "$BACKUP" -C "$AGENT_PARENT" \
    --exclude="$AGENT_BASE/sessions" \
    --exclude="$AGENT_BASE/npm" \
    --exclude="$AGENT_BASE/git" \
    --exclude="$AGENT_BASE/state" \
    --exclude="$AGENT_BASE/fff" \
    --exclude="$AGENT_BASE/bin" \
    --exclude="$AGENT_BASE/telemetry.db" \
    "$AGENT_BASE" || die "backup failed; nothing was changed"
  COUNT="$(tar tzf "$BACKUP" | wc -l | tr -d ' ')"
  [ "$COUNT" -gt 0 ] || die "backup is empty; nothing was changed"
  log "Backup contains $COUNT entries"
  RESTORE_HINT="tar xzf \"$BACKUP\" -C \"$AGENT_PARENT\""
else
  log "No configuration at $AGENT_DIR yet; nothing to back up"
fi

if [ "$BACKUP_ONLY" -eq 1 ]; then
  log "Stopping after backup"
  [ -n "$RESTORE_HINT" ] && printf 'Restore with:\n  %s\n' "$RESTORE_HINT"
  exit 0
fi

# --- 2. Optionally move the current configuration aside ---------------------
RESET_DIR=""
if [ "$RESET" -eq 1 ]; then
  if [ "$ASSUME_YES" -ne 1 ]; then
    if [ -t 0 ]; then
      printf 'Move your current Pi configuration aside (backup: %s)? [y/N] ' "$BACKUP"
      read -r answer || answer=""
      case "$answer" in y|Y|yes|YES) ;; *) die "aborted; the backup is at $BACKUP" ;; esac
    else
      die "--reset needs --yes when no terminal is available"
    fi
  fi
  RESET_DIR="$BACKUP_DIR/pi-agent-aside-$STAMP"
  mkdir -p "$RESET_DIR"
  log "Moving the current configuration to $RESET_DIR"
  shopt -s nullglob dotglob
  for entry in "$AGENT_DIR"/*; do
    name="$(basename "$entry")"
    case "$name" in
      # Kept on every run: history, Pi's own binaries, and extension
      # configuration such as the permission policy.
      sessions|bin|extensions) continue ;;
      # Kept unless --drop-auth: provider login and model choices.
      auth.json) [ "$DROP_AUTH" -eq 0 ] && continue ;;
      models.json|models-store.json) continue ;;
    esac
    mv "$entry" "$RESET_DIR/" || die "could not move $entry; restore with: $RESTORE_HINT"
  done
  shopt -u nullglob dotglob
fi

# --- 3. Install the package -------------------------------------------------
SOURCE="${SOURCE_OVERRIDE:-$REPO@$REF}"
log "Installing $SOURCE"
pi install "$SOURCE" || die "pi install failed; restore with: $RESTORE_HINT"
pi list 2>/dev/null | grep -q "pi-agent-config" \
  || die "the package is not listed after install; restore with: $RESTORE_HINT"

# Resolve the package files: prefer this checkout, fall back to pi list.
PKG_DIR=""
if [ -f "$SCRIPT_DIR/package.json" ] && grep -q '"pi"' "$SCRIPT_DIR/package.json"; then
  PKG_DIR="$SCRIPT_DIR"
else
  candidate="$(pi list 2>/dev/null | grep -A1 'pi-agent-config' | tail -1 | sed 's/^ *//' || true)"
  [ -n "$candidate" ] && [ -f "$candidate/package.json" ] && PKG_DIR="$candidate"
fi

if [ -n "$STEPS" ] && [ "$ASSUME_YES" -ne 1 ] && [ ! -t 0 ]; then
  log "No terminal: steps that need an answer will be skipped. Use --yes for defaults"
  log "or run the script in a terminal."
fi

printf '\n'

# --- 4. Configure -----------------------------------------------------------
apply_package_filter() {
  local source="$1" key="$2" settings="$AGENT_DIR/settings.json"
  if ! command -v python3 >/dev/null 2>&1; then
    log "Set \"$key\": [] for $source in $settings to match the shared setup"
    return
  fi
  python3 - "$settings" "$source" "$key" <<'FILTER' || log "Could not set \"$key\": [] for $source in $settings"
import json, os, sys, tempfile
path, source, key = sys.argv[1:4]
with open(path) as handle:
    data = json.load(handle)
packages = data.get("packages") or []
for index, entry in enumerate(packages):
    if entry == source:
        packages[index] = {"source": source, key: []}
        break
else:
    sys.exit(0)
data["packages"] = packages
fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
with os.fdopen(fd, "w") as handle:
    json.dump(data, handle, indent=2)
    handle.write("\n")
os.replace(tmp, path)
FILTER
}

if has_step packages; then
  log "Third-party packages. Each one is optional and runs with your permissions."
  # source|description|default|resource filter (key=, empty for none)
  packages=(
    "npm:@ff-labs/pi-fff|indexed file search: fffind and ffgrep|y|"
    "npm:@gotgenes/pi-permission-system|tool permission checks|y|"
    "npm:@joaomj/pi-background-bash|durable background commands|y|"
    "npm:@joaomj/pi-claude-usage|Claude subscription quota in the footer|y|"
    "npm:pi-ask-user@0.16.0|interactive multiple-choice questions|y|skills="
    "npm:pi-context-view|inspect what fills the context window|y|"
    "npm:@dietrichgebert/ponytail|minimal-change coding skills on demand|y|extensions="
    "npm:pi-browser-use|managed browser automation tools|y|"
  )
  for entry in "${packages[@]}"; do
    IFS='|' read -r pkg desc default filter <<< "$entry"
    if pi list 2>/dev/null | grep -Fq "$pkg"; then
      log "Already installed: $pkg"
      continue
    fi
    if confirm "Install $pkg ($desc)?" "$default"; then
      if pi install "$pkg"; then
        [ -n "$filter" ] && apply_package_filter "$pkg" "${filter%=}"
      else
        printf 'install.sh: %s failed to install; continue without it\n' "$pkg" >&2
      fi
    else
      log "Skipped: $pkg"
    fi
  done
fi

if has_step claude; then
  CLAUDE_RANGE_MIN="2.1.263"
  CLAUDE_RANGE_MAX="2.2.0"
  CLAUDE_PIN="2.1.281"

  cli_version_of() { claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true; }
  cli_qualified() {
    [ -n "$1" ] && version_ge "$1" "$CLAUDE_RANGE_MIN" && ! version_ge "$1" "$CLAUDE_RANGE_MAX"
  }

  if pi list 2>/dev/null | grep -Fq "pi-claude-directsdk"; then
    log "Claude transport already installed"
  elif [ "$WITH_CLAUDE" -eq 1 ] || confirm "Set up the Claude subscription transport? It needs a paid Claude plan and a Claude Code login." n; then
    node_major="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1 || true)"
    if [ -n "$node_major" ] && [ "$node_major" -lt 20 ]; then
      printf 'install.sh: Node 20 or later is required for this transport; found %s\n' "$(node -v)" >&2
    fi

    cli_version="$(cli_version_of || true)"
    if cli_qualified "$cli_version"; then
      log "Claude Code CLI $cli_version is inside the qualified range"
    else
      if [ -n "$cli_version" ]; then
        log "Claude Code CLI $cli_version is outside the qualified range $CLAUDE_RANGE_MIN <= v < $CLAUDE_RANGE_MAX"
      else
        log "Claude Code CLI not found"
      fi
      log "The qualified version is $CLAUDE_PIN."
      if confirm "Install it globally with npm now?" y; then
        log "Running: npm install -g --ignore-scripts=false @anthropic-ai/claude-code@$CLAUDE_PIN"
        if npm install -g --ignore-scripts=false "@anthropic-ai/claude-code@$CLAUDE_PIN"; then
          log "CLI install finished"
        else
          printf 'install.sh: the global install failed. A permissions error usually means npm needs a writable prefix.\n' >&2
        fi
        cli_version="$(cli_version_of || true)"
      fi
    fi

    if ! cli_qualified "$cli_version"; then
      log "Claude transport not installed: the CLI is missing or outside the qualified range."
      printf '  Fix it with:\n    npm install -g --ignore-scripts=false @anthropic-ai/claude-code@%s\n  Then rerun:\n    %s --only claude\n' "$CLAUDE_PIN" "$0" >&2
    else
      if claude auth status --json 2>/dev/null | grep -Eq '"loggedIn"[[:space:]]*:[[:space:]]*true'; then
        log "Claude Code is signed in"
      else
        log "Claude Code is not signed in"
        if [ -t 0 ] && confirm "Run claude auth login now? It opens a browser." y; then
          claude auth login || printf 'install.sh: claude auth login did not finish; run it yourself, then rerun --only claude\n' >&2
        fi
      fi
      if pi list 2>/dev/null | grep -Fq "pi-claude-directsdk"; then
        log "Claude transport already installed"
      else
        log "Installing npm:pi-claude-directsdk"
        pi install npm:pi-claude-directsdk || printf 'install.sh: could not install the transport; rerun --only claude\n' >&2
      fi
      cat <<'CLAUDE'
  One step stays interactive: restart Pi, open /model, wait for the DirectSDK
  catalog refresh, then choose a DirectSDK model. Start with the haiku model to
  check the account. This transport uses the Claude Code login, not Pi's
  Anthropic login.
CLAUDE
    fi
  else
    log "Skipped the Claude transport"
  fi
fi

if has_step agents; then
  if [ -z "$PKG_DIR" ] || [ ! -f "$PKG_DIR/AGENTS.md" ]; then
    log "No AGENTS.md in the package sources; skipping"
  else
    target="$AGENT_DIR/AGENTS.md"
    if [ ! -f "$target" ]; then
      if confirm "Create $target from the shared rules?" y; then
        mkdir -p "$AGENT_DIR"
        cp "$PKG_DIR/AGENTS.md" "$target"
        log "Created $target"
      fi
    elif grep -qF "$MARK_START" "$target"; then
      log "Shared rules already present in $target"
    else
      if confirm "Append the shared rules block to $target?" n; then
        { printf '\n%s\n' "$MARK_START"; cat "$PKG_DIR/AGENTS.md"; printf '%s\n' "$MARK_END"; } >> "$target"
        log "Appended the shared rules block; review the diff before you rely on it"
      fi
    fi
  fi
fi

if has_step permissions; then
  src="$PKG_DIR/extensions/pi-permission-system/config.json"
  target="$AGENT_DIR/extensions/pi-permission-system/config.json"
  if [ -z "$PKG_DIR" ] || [ ! -f "$src" ]; then
    log "No reference permission policy in the package sources; skipping"
  elif [ ! -f "$target" ]; then
    if confirm "Install the reference permission policy at $target?" y; then
      mkdir -p "$(dirname "$target")"
      cp "$src" "$target"
      log "Installed the reference policy; review it in your editor"
    fi
  elif cmp -s "$src" "$target"; then
    log "Permission policy already matches the reference"
  else
    proposed="$target.proposed"
    cp "$src" "$proposed"
    log "Your policy differs. The reference is at $proposed; nothing was overwritten."
    diff -u "$target" "$proposed" | head -40 || true
    printf 'Merge what you want by hand, then delete %s\n' "$proposed"
  fi
fi

if has_step mcp; then
  if [ -n "${EXA_API_KEY:-}" ]; then
    if confirm "Add the Exa MCP server using EXA_API_KEY?" n; then
      pi mcp add exa --url https://mcp.exa.ai/mcp \
        --bearer-token-env-var EXA_API_KEY \
        --exposure codemode \
        --description "Web search, fetch, and research" \
        || printf 'install.sh: could not add the Exa server\n' >&2
    fi
  else
    log "Skipping the Exa MCP server: export EXA_API_KEY first, then rerun --only mcp"
  fi
  log "Other MCP servers stay yours: pi mcp add, then pi mcp login for OAuth servers"
fi

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

# --- 5. Report --------------------------------------------------------------
printf '\nDone.\n'
[ -n "$RESTORE_HINT" ] && printf '  Backup:      %s\n  Restore:     %s\n' "$BACKUP" "$RESTORE_HINT"
[ -n "$RESET_DIR" ] && printf '  Moved aside: %s\n' "$RESET_DIR"
cat <<'MSG'

Next steps:
  1. Run /login and /model if this machine has no provider yet.
  2. Start Pi and check /help for the shared templates.
  3. Update later with: pi update --extensions
MSG
