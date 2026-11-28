#!/usr/bin/env bash
# Check extensions/ticket-harness.ts in a real Pi run against a scripted model:
#
# 1. A failing done check makes the agent continue; once it passes, the run
#    settles.
# 2. A resumed session gets the contract back, in its system prompt.
# 3. A done command the permission policy asks about is never run by the
#    harness, and continuations stop at the cap.
#
#   scripts/check-ticket-harness.sh
#
# Uses a scratch Pi directory; your own configuration is not read or changed.
set -euo pipefail

die() { printf 'check-ticket-harness.sh: %s\n' "$*" >&2; exit 1; }
repo_root="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"; [[ -n "${KEEP:-}" ]] && echo "work: ${work}"
server_pid=""
cleanup() { [[ -n "${server_pid}" ]] && kill "${server_pid}" 2>/dev/null; [[ -n "${KEEP:-}" ]] || rm -rf "${work}"; }
trap cleanup EXIT
export PI_CODING_AGENT_DIR="${work}/agent"

# The server answers request N of a run with step N of the scenario file. It
# records each request body; run() empties the record, so N restarts per run.
cat > "${work}/server.mjs" <<'EOF'
import http from "node:http";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
const [scenarioFile, portFile, requestsFile] = process.argv.slice(2);
const chunk = (delta, finish = null) =>
  `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 0, model: "m",
    choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
http.createServer((req, res) => {
  let body = "";
  req.on("data", (part) => (body += part));
  req.on("end", () => {
    const count = existsSync(requestsFile) ? readFileSync(requestsFile, "utf8").split("\n").length - 1 : 0;
    appendFileSync(requestsFile, JSON.stringify(body) + "\n");
    const steps = JSON.parse(readFileSync(scenarioFile, "utf8"));
    const step = steps[Math.min(count, steps.length - 1)];
    res.writeHead(200, { "content-type": "text/event-stream" });
    if (step.tool) {
      res.write(chunk({ role: "assistant", tool_calls: [{ index: 0, id: `call_${count + 1}`, type: "function",
        function: { name: step.tool, arguments: JSON.stringify(step.args) } }] }));
      res.write(chunk({}, "tool_calls"));
    } else {
      res.write(chunk({ role: "assistant", content: step.text }));
      res.write(chunk({}, "stop"));
    }
    res.end("data: [DONE]\n\n");
  });
}).listen(0, "127.0.0.1", function () { writeFileSync(portFile, String(this.address().port)); });
EOF
node "${work}/server.mjs" "${work}/scenario.json" "${work}/port" "${work}/requests.jsonl" &
server_pid=$!
for _ in $(seq 50); do [[ -s "${work}/port" ]] && break; sleep 0.1; done
[[ -s "${work}/port" ]] || die "the scripted model server did not start"

cat > "${work}/provider.ts" <<EOF
export default function (pi: any) {
  pi.registerProvider("check", {
    name: "Check", baseUrl: "http://127.0.0.1:$(cat "${work}/port")/v1", apiKey: "unused", api: "openai-completions",
    models: [{ type: "chat", id: "m", name: "M", reasoning: false, input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 1000 }],
  });
}
EOF

repo="${work}/repo"
git init -q "${repo}"
git -C "${repo}" -c user.name=check -c user.email=check@example.invalid commit -q --allow-empty -m init

# run <scenario json> [pi option...]: one Pi run in the repository; sets $requests.
run() {
  printf '%s' "$1" > "${work}/scenario.json"
  shift
  : > "${work}/requests.jsonl"
  (cd "${repo}" && pi --session-dir "${work}/sessions" "$@" -ne \
    -e "${repo_root}/extensions/permission-policy.ts" \
    -e "${repo_root}/node_modules/@gotgenes/pi-permission-system/src/index.ts" \
    -e "${repo_root}/extensions/ticket-harness.ts" \
    -e "${work}/provider.ts" --model check/m -p "work the ticket") > "${work}/run.log" 2>&1 \
    || { cat "${work}/run.log" >&2; die "pi exited with an error"; }
  requests=$(wc -l < "${work}/requests.jsonl")
}
contract() {
  printf '{"tool":"ticket_contract","args":{"key":"T-1","worktree":"%s","done":"%s","text":"Done: %s"}}' "${repo}" "$1" "$1"
}
nth() { sed -n "${1}p" "${work}/requests.jsonl"; }

# 1. Red, then green.
run "[$(contract 'test -f done.txt'),
  {\"text\":\"Finished.\"},
  {\"tool\":\"bash\",\"args\":{\"command\":\"touch done.txt\"}},
  {\"text\":\"Finished.\"}]"
[[ ${requests} -eq 4 ]] || die "red then green: expected 4 model requests, got ${requests}"
nth 3 | grep -q 'is not done (check 1 of 2)' || die "red then green: the failing check did not reach the model"
grep -q 'is not done (check 2' "${work}/requests.jsonl" && die "red then green: a passing check still continued"
echo "OK: a failing done check continues the run, and a passing one settles it"

# 2. Resume.
run '[{"text":"Still done."}]' --continue
[[ ${requests} -eq 1 ]] || die "resume: expected 1 model request, got ${requests}"
nth 1 | grep -q 'Approved contract for T-1' || die "resume: the contract is not in the system prompt"
echo "OK: a resumed session keeps the contract in its system prompt"

# 3. A done command that needs a prompt never runs, and the cap holds.
touch "${repo}/canary"
run "[$(contract 'rm canary'), {\"text\":\"Finished.\"}]"
[[ -e "${repo}/canary" ]] || die "the harness ran a done command that the policy asks about"
[[ ${requests} -eq 4 ]] || die "cap: expected 4 model requests (1 contract, 1 finish, 2 continuations), got ${requests}"
nth 3 | grep -q 'cannot run the done check' || die "the model was not told to run the done check itself"
echo "OK: a done command that needs a prompt is not run, and continuations stop at 2"
