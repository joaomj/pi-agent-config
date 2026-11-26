#!/usr/bin/env bash
# Install a commit of this package into a scratch Pi directory and check that
# it loads: every extension path exists, every bundled tool registers, no
# extension fails, the shared rules reach the model request exactly once, a
# bash call with a long `timeout` still passes the permission check, and the
# shipped bash policy decides each row of scripts/permission-probes.tsv as
# expected.
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

# A local server stands in for the model provider and records the first
# request. Its first reply asks for `rm <canary>` with a long timeout, which
# the permission policy must stop (an `ask` is denied without a UI). Later
# replies end the run.
cat > "${work}/server.mjs" <<'EOF'
import http from "node:http";
import { writeFileSync } from "node:fs";
const [out, portFile, canary] = process.argv.slice(2);
let count = 0;
const chunk = (delta, finish = null) =>
  `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 0, model: "m",
    choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (part) => (body += part));
  req.on("end", () => {
    if (count++ === 0) writeFileSync(out, body);
    res.writeHead(200, { "content-type": "text/event-stream" });
    if (count === 1) {
      const args = JSON.stringify({ command: `rm ${canary}`, timeout: 600 });
      res.write(chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function",
        function: { name: "bash", arguments: args } }] }));
      res.write(chunk({}, "tool_calls"));
    } else {
      res.write(chunk({ role: "assistant", content: "done" }));
      res.write(chunk({}, "stop"));
    }
    res.end("data: [DONE]\n\n");
  });
});
server.listen(0, "127.0.0.1", () => writeFileSync(portFile, String(server.address().port)));
EOF
touch "${work}/canary"
node "${work}/server.mjs" "${work}/request.json" "${work}/port" "${work}/canary" &
server_pid=$!
for _ in $(seq 50); do [[ -s "${work}/port" ]] && break; sleep 0.1; done
[[ -s "${work}/port" ]] || die "the recording server did not start"

# At the first tool call the bash parser is warm, so checkPermission decides
# each probe as the gate would.
git -C "${repo_root}" show "${commit}:scripts/permission-probes.tsv" > "${work}/probes.tsv"
cat > "${work}/probe.ts" <<EOF
import { readFileSync, writeFileSync } from "node:fs";
export default function (pi: any) {
  let done = false;
  pi.on("tool_call", (_event: any, ctx: any) => {
    if (done) return;
    done = true;
    const services = (globalThis as any)[Symbol.for("@gotgenes/pi-permission-system:session-services")];
    const service = services?.get(ctx.sessionManager.getSessionId());
    const rows = readFileSync("${work}/probes.tsv", "utf8").split("\\n").filter((l) => l && !l.startsWith("#"));
    const out = rows.map((row) => {
      const [expected, command] = row.split("\\t");
      const result = service?.checkPermission("bash", command);
      return [expected, result?.state ?? "no-service", command, result?.matchedPattern ?? ""].join("\\t");
    });
    writeFileSync("${work}/probes.out", out.join("\\n") + "\\n");
  });
}
EOF

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
(cd "${work}" && pi --no-session -e "${work}/provider.ts" -e "${work}/probe.ts" --model check/m -p "hi") > "${work}/run.log" 2>&1 || true
[[ -s "${work}/request.json" ]] || { cat "${work}/run.log" >&2; die "Pi sent no model request"; }
[[ -e "${work}/canary" ]] || die "a bash call with timeout 600 ran 'rm' without a permission check; load pi-permission-system before bg-bash-timer in package.json"

[[ -s "${work}/probes.out" ]] || die "the permission probes did not run"
awk -F'\t' '$1 != $2 { bad = 1; printf "permission probe: expected %s, got %s (rule %s): %s\n", $1, $2, $4, $3 > "/dev/stderr" } END { exit bad }' "${work}/probes.out" \
  || die "the shipped bash policy decided a probe in scripts/permission-probes.tsv differently"

installed="$(dirname "$(find "${PI_CODING_AGENT_DIR}" -path '*/pi-agent-config/package.json' -not -path '*/node_modules/*' | head -n 1)")"
node -e '
const [dir] = process.argv.slice(1);
const fs = require("node:fs"), path = require("node:path");
const missing = require(path.join(dir, "package.json")).pi.extensions.filter((p) => !fs.existsSync(path.join(dir, p)));
if (missing.length) { console.error(`check-package.sh: missing extension paths: ${missing.join(", ")}`); process.exit(1); }
' "${installed}"

policy="${PI_CODING_AGENT_DIR}/extensions/pi-permission-system/config.json"
git -C "${repo_root}" show "${commit}:permissions/pi-permission-system.json" | cmp -s "${policy}" - \
  || die "a new account did not get the shipped permission policy at ${policy}"

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
for (const tool of ["bash", "bash_output", "bash_tasks", "bash_kill", "fffind", "ffgrep", "subagent"]) {
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
console.log("OK: extension paths exist, bundled tools registered, no extension errors, shared rules present once, shipped policy in place, long-timeout bash still checked, permission probes match");
EOF
