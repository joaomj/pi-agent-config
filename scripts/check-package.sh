#!/usr/bin/env bash
# Install a commit of this package into a scratch Pi directory and check that
# it loads: every bundled tool registers, no extension fails, and the shared
# rules reach the model request exactly once.
#
#   scripts/check-package.sh            check HEAD
#   scripts/check-package.sh <commit>   check another commit
#
# The install goes through `pi install git:...`, the same path a user takes,
# so it needs network access for npm. Your own Pi configuration is not read or
# changed. Uncommitted changes are not part of the check.
set -euo pipefail

die() { printf 'check-package.sh: %s\n' "$*" >&2; exit 1; }
note() { printf '==> %s\n' "$*"; }

command -v pi >/dev/null 2>&1 || die "pi is required"
repo_root="$(git rev-parse --show-toplevel)"
commit="$(git -C "${repo_root}" rev-parse --verify "${1:-HEAD}^{commit}")"
[[ -z "$(git -C "${repo_root}" status --porcelain --untracked-files=no)" ]] \
  || note "Uncommitted changes are not checked; checking ${commit:0:7}"

work="$(mktemp -d)"
server_pid=""
cleanup() { [[ -n "${server_pid}" ]] && kill "${server_pid}" 2>/dev/null; rm -rf "${work}"; }
trap cleanup EXIT

# Pi accepts only https and ssh git URLs, so a git rewrite points a fake host
# at a bare copy of this repository.
git clone --quiet --bare "${repo_root}" "${work}/src/pi-agent-config"
export PI_CODING_AGENT_DIR="${work}/agent"
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="url.file://${work}/src/.insteadOf"
export GIT_CONFIG_VALUE_0="https://package.test/"

note "Installing ${commit:0:7} into a scratch Pi directory"
pi install "git:package.test/pi-agent-config@${commit}" > "${work}/install.log" 2>&1 \
  || { cat "${work}/install.log" >&2; die "pi install failed"; }

# A local server stands in for the model provider and records the request.
cat > "${work}/server.mjs" <<'EOF'
import http from "node:http";
import { writeFileSync } from "node:fs";
const [out, portFile] = process.argv.slice(2);
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    writeFileSync(out, body);
    res.writeHead(500);
    res.end('{"error":"recorded"}');
  });
});
server.listen(0, "127.0.0.1", () => writeFileSync(portFile, String(server.address().port)));
EOF
node "${work}/server.mjs" "${work}/request.json" "${work}/port" &
server_pid=$!
for _ in $(seq 50); do [[ -s "${work}/port" ]] && break; sleep 0.1; done
[[ -s "${work}/port" ]] || die "the recording server did not start"

cat > "${work}/provider.ts" <<EOF
export default function (pi: any) {
  pi.registerProvider("check", {
    name: "Check", baseUrl: "http://127.0.0.1:$(cat "${work}/port")/v1", apiKey: "unused", api: "openai-completions",
    models: [{ type: "chat", id: "m", name: "M", reasoning: false, input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 1000 }],
  });
}
EOF

note "Starting Pi with the package"
# The recorded request fails on purpose, so Pi exits non-zero here.
(cd "${work}" && pi --no-session -e "${work}/provider.ts" --model check/m -p "hi") > "${work}/run.log" 2>&1 || true
[[ -s "${work}/request.json" ]] || { cat "${work}/run.log" >&2; die "Pi sent no model request"; }

node - "${work}/request.json" "${work}/run.log" "${repo_root}/AGENTS.md" <<'EOF'
import { readFileSync } from "node:fs";
const [requestPath, logPath, rulesPath] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestPath, "utf8"));
const log = readFileSync(logPath, "utf8");
const system = request.messages.filter((m) => m.role === "system" || m.role === "developer")
  .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
const tools = (request.tools ?? []).map((t) => t.function?.name ?? t.name);
const rule = readFileSync(rulesPath, "utf8").split("\n").find((line) => line.startsWith("1. **"));
const failures = [];
for (const tool of ["bash", "bash_output", "bash_tasks", "bash_kill", "fffind", "ffgrep"]) {
  if (!tools.includes(tool)) failures.push(`tool ${tool} is missing`);
}
for (const line of log.split("\n")) {
  if (/Failed to load extension|conflicts with/.test(line)) failures.push(line.trim());
}
const copies = system.split(rule).length - 1;
if (copies !== 1) failures.push(`the shared rules appear ${copies} times in the system prompt, expected 1`);
console.log(`tools: ${tools.sort().join(", ")}`);
if (failures.length > 0) {
  console.error(`FAILED\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("OK: bundled tools registered, no extension errors, shared rules present once");
EOF
