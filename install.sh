#!/usr/bin/env bash
# Install the shared Pi package.
#
# The script backs up the Pi configuration before it changes anything.
# Restore it with the tarball path the script prints.
#
#   install.sh                      back up, then install the package
#   install.sh --reset              back up, move the current configuration aside, then install
#   install.sh --reset --drop-auth  also move the provider login aside
#   install.sh --backup-only        back up and stop
#
# Options:
#   --ref <ref>         git ref to install (default: main)
#   --source <source>   package source instead of the git URL, for testing
#   --backup-dir <dir>  where to write the backup (default: $HOME)
#   --reset             move the existing configuration aside before installing
#   --drop-auth         with --reset, move auth.json aside too
#   --backup-only       stop after the backup
#   --yes               run without confirmation prompts
set -euo pipefail

REPO="git:github.com/joaomj/pi-agent-config"
REF="main"
SOURCE_OVERRIDE=""
BACKUP_DIR="${HOME}"
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
    --reset) RESET=1; shift ;;
    --drop-auth) DROP_AUTH=1; shift ;;
    --backup-only) BACKUP_ONLY=1; shift ;;
    --yes|-y) ASSUME_YES=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "install.sh: unknown option $1" >&2; exit 2 ;;
  esac
done

log() { printf '==> %s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. Install it, then retry."; }
need pi
need tar
need git

AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
AGENT_DIR="${AGENT_DIR%/}"
AGENT_PARENT="$(dirname "$AGENT_DIR")"
AGENT_BASE="$(basename "$AGENT_DIR")"

if [ -d "$AGENT_DIR" ] && [ -n "$(command -v realpath >/dev/null 2>&1 && realpath "$AGENT_DIR")" ] \
   && [ "$(realpath "$AGENT_DIR")" = "$(realpath "$(dirname "$0")")" ]; then
  die "Run this script from a clone, not from inside $AGENT_DIR."
fi

log "Pi version: $(pi --version 2>/dev/null | head -1)"
log "Config directory: $AGENT_DIR"

# --- 1. Backup, before any change -------------------------------------------
mkdir -p "$BACKUP_DIR" || die "cannot create $BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$BACKUP_DIR/pi-agent-backup-$STAMP.tar.gz"

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
else
  log "No configuration at $AGENT_DIR yet; nothing to back up"
  BACKUP=""
fi

RESTORE_HINT=""
if [ -n "$BACKUP" ]; then
  RESTORE_HINT="tar xzf \"$BACKUP\" -C \"$AGENT_PARENT\""
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
      read -r answer
      case "$answer" in y|Y|yes|YES) ;; *) die "aborted; the backup is at $BACKUP" ;; esac
    else
      die "--reset needs --yes when stdin is not a terminal"
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
  log "Kept: $(ls -A "$AGENT_DIR" | tr '\n' ' ')"
fi

# --- 3. Install the package -------------------------------------------------
SOURCE="${SOURCE_OVERRIDE:-$REPO@$REF}"
log "Installing $SOURCE"
pi install "$SOURCE" || die "pi install failed; restore with: $RESTORE_HINT"

if ! pi list 2>/dev/null | grep -q "pi-agent-config"; then
  die "the package is not listed after install; restore with: $RESTORE_HINT"
fi

# --- 4. Report --------------------------------------------------------------
printf '\nInstalled.\n'
[ -n "$BACKUP" ] && printf '  Backup:     %s\n' "$BACKUP"
[ -n "$RESTORE_HINT" ] && printf '  Restore:    %s\n' "$RESTORE_HINT"
[ -n "$RESET_DIR" ] && printf '  Moved aside: %s\n' "$RESET_DIR"
cat <<'MSG'

Next steps:
  1. Start Pi and run /bootstrap.
     It installs the third-party packages you choose, asks about each MCP
     server, and merges AGENTS.md and the permission policy from /tmp.
  2. Run /login and /model if this machine has no provider yet.
  3. Update later with: pi update --extensions
MSG
