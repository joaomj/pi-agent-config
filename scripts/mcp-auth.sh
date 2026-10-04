#!/bin/sh
# Print an Authorization header value for an MCP web server.
# Lookup order: environment variable, macOS keychain, Linux libsecret.
# Usage: mcp-auth.sh <exa|parallel|jina>
set -eu

service="${1:-}"
case "$service" in
  exa) env_name="PI_AGENT_EXA" ; kc_service="pi-agent-exa" ; kc_account="exa" ;;
  parallel) env_name="PI_AGENT_PARALLEL" ; kc_service="pi-agent-parallel" ; kc_account="parallel" ;;
  jina) env_name="PI_AGENT_JINA" ; kc_service="pi-agent-jina" ; kc_account="jina" ;;
  *)
    echo "mcp-auth.sh: unknown service '$service' (want exa, parallel, or jina)" >&2
    exit 2
    ;;
esac

from_env="$(printenv "$env_name" || true)"
if [ -n "$from_env" ]; then
  printf 'Bearer %s' "$from_env"
  exit 0
fi

if command -v security >/dev/null 2>&1; then
  from_macos="$(security find-generic-password -s "$kc_service" -a "$kc_account" -w 2>/dev/null || true)"
  if [ -n "$from_macos" ]; then
    printf 'Bearer %s' "$from_macos"
    exit 0
  fi
fi

if command -v secret-tool >/dev/null 2>&1; then
  from_linux="$(secret-tool lookup service "$kc_service" account "$kc_account" 2>/dev/null || true)"
  if [ -n "$from_linux" ]; then
    printf 'Bearer %s' "$from_linux"
    exit 0
  fi
fi

echo "mcp-auth.sh: no API key for '$service'." >&2
echo "Set \$$env_name, or store the key once:" >&2
echo "  macOS: security add-generic-password -s $kc_service -a $kc_account -w" >&2
echo "  Linux: secret-tool store --label '$service MCP key' service $kc_service account $kc_account" >&2
exit 1
