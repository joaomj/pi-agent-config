#!/bin/bash
# One-command installer for pi-agent-config.
#
# New machine, one step:
#   git clone https://github.com/joaomj/pi-agent-config.git ~/.pi/agent
#   ~/.pi/agent/install.sh
#
# Or without cloning first:
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/joaomj/pi-agent-config/main/install.sh)" -- --clone-dir ~/.pi/agent
#
# Options:
#   --clone-dir <dir>       clone the repo here first (bootstrap mode)
#   --profile <name>        workstation (default), server, or minimal
#   --local-permissions <p> use a local permission-system checkout
#   --ref <ref>             git ref to install (bootstrap mode, default main)
set -euo pipefail

REPO_URL="${PI_AGENT_REPO_URL:-https://github.com/joaomj/pi-agent-config.git}"
CLONE_DIR=""
PROFILE="${PI_PROFILE:-workstation}"
LOCAL_PERMISSIONS="${PI_PERMISSIONS_SRC:-}"
REF="main"
CHECK_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --clone-dir) CLONE_DIR="$2"; shift 2 ;;
    --clone-dir=*) CLONE_DIR="${1#--clone-dir=}"; shift ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --profile=*) PROFILE="${1#--profile=}"; shift ;;
    --local-permissions) LOCAL_PERMISSIONS="$2"; shift 2 ;;
    --local-permissions=*) LOCAL_PERMISSIONS="${1#--local-permissions=}"; shift ;;
    --ref) REF="$2"; shift 2 ;;
    --ref=*) REF="${1#--ref=}"; shift ;;
    --check-only) CHECK_ONLY=1; shift ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "install.sh: unknown option $1" >&2
      exit 2
      ;;
  esac
done

log() { printf '==> %s\n' "$*"; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "install.sh: $1 is required but not installed." >&2
    case "$1" in
      node) echo "Install Node.js 22.19 or newer, then retry." >&2 ;;
      npm) echo "Install npm 9 or newer, then retry." >&2 ;;
      git) echo "Install git, then retry." >&2 ;;
    esac
    exit 1
  fi
}

need git
need node
need npm

if [ -n "$CLONE_DIR" ]; then
  if [ -d "$CLONE_DIR/.git" ]; then
    log "Using existing checkout at $CLONE_DIR"
  else
    log "Cloning $REPO_URL ($REF) into $CLONE_DIR"
    git clone --branch "$REF" "$REPO_URL" "$CLONE_DIR"
  fi
  AGENT_DIR="$CLONE_DIR"
else
  AGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

if [ ! -f "$AGENT_DIR/scripts/sync.mjs" ]; then
  echo "install.sh: $AGENT_DIR is not a pi-agent-config checkout." >&2
  exit 1
fi

node --check "$AGENT_DIR/scripts/sync.mjs"

if [ ! -f "$AGENT_DIR/settings.local.json" ] && [ -f "$AGENT_DIR/settings.local.json.example" ]; then
  log "Creating settings.local.json from the example (edit it for personal overrides)"
  cp "$AGENT_DIR/settings.local.json.example" "$AGENT_DIR/settings.local.json"
fi

SYNC_ARGS=(--install "--profile=$PROFILE")
[ -n "$LOCAL_PERMISSIONS" ] && SYNC_ARGS+=(--local-permissions="$LOCAL_PERMISSIONS")

log "Preflight check"
node "$AGENT_DIR/scripts/sync.mjs" --check "${SYNC_ARGS[@]:1}" || {
  echo "install.sh: fix the preflight errors above and retry." >&2
  exit 1
}

if [ "$CHECK_ONLY" -eq 1 ]; then
  log "Check-only mode: no packages were installed."
  exit 0
fi

log "Configuring profile '$PROFILE'"
node "$AGENT_DIR/scripts/sync.mjs" "${SYNC_ARGS[@]}"

case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) cat >&2 <<EOF
Add ~/.local/bin to PATH so the pi command resolves:
  export PATH="\$HOME/.local/bin:\$PATH"
EOF
    ;;
esac

cat <<EOF
==> Done. Next steps:
  1. Restart your shell (or export PATH above), then run: pi
  2. Inside Pi, run /login to connect a model provider, then /model.
  3. Optional web keys: copy .env.example to .env and set values,
     or store them in your system keychain (see README).
EOF
