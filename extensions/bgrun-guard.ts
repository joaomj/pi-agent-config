/**
 * Blocks bash calls that look long-running and tells the agent to use bgrun.
 *
 * A long command run through bash blocks the session and puts its whole output
 * into the context. bgrun detaches the command, keeps the log on disk, and wakes
 * the session when the command finishes. The guard is inactive when the bgrun
 * tool is not registered, so it never points the agent at a missing tool.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Rule = {
  label: string;
  pattern: RegExp;
  // A focused run (one file, one package, or a name filter) is usually quick.
  allowFocused?: boolean;
};

const RULES: Rule[] = [
  { label: "test suite", pattern: /^(pytest|py\.test|tox|nox)\b/, allowFocused: true },
  { label: "test suite", pattern: /^python3?\s+-m\s+(pytest|unittest)\b/, allowFocused: true },
  { label: "test suite", pattern: /^go\s+test\b/, allowFocused: true },
  { label: "test suite", pattern: /^(jest|vitest|mocha|playwright\s+test)\b/, allowFocused: true },
  { label: "test suite", pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/, allowFocused: true },
  { label: "test suite", pattern: /^cargo\s+(test|nextest)\b/, allowFocused: true },
  { label: "build", pattern: /^(mvn|gradle|\.\/gradlew|\.\/mvnw)\b/ },
  {
    label: "build or test run",
    pattern: /^make\b(?=.*\s(test|tests|check|build|lint|all|ci|install|e2e)\b)|^make(\s+-\S+)*\s*$/,
  },
  { label: "build", pattern: /^(npm|pnpm|yarn|bun)\s+run\s+(build|lint|typecheck|check|e2e)\b/ },
  { label: "build", pattern: /^cargo\s+(build|check|clippy|install)\b/ },
  { label: "build", pattern: /^golangci-lint\s+run\b|^go\s+(build|vet)\s+\.\/\.\.\./ },
  { label: "build", pattern: /^tsc\b/ },
  { label: "dependency install", pattern: /^(npm\s+(install|i|ci)|pnpm\s+(install|i)|bun\s+install)\b|^yarn(\s+install)?\s*$/ },
  {
    label: "dependency install",
    pattern: /^(pip3?|uv\s+pip)\s+install\b|^uv\s+sync\b|^poetry\s+install\b|^bundle\s+install\b|^brew\s+(install|upgrade)\b/,
  },
  { label: "container build", pattern: /^(docker|podman)\s+(build|pull)\b/ },
  { label: "container build", pattern: /^(docker\s+compose|docker-compose)\s+(build|pull|up)\b(?!.*\s(-d|--detach)\b)/ },
  { label: "infrastructure change", pattern: /^terraform\s+(plan|apply|destroy)\b|^ansible-playbook\b/ },
  {
    label: "server",
    pattern:
      /^(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|serve)\b|^(uvicorn|gunicorn|next\s+dev|vite)\b|^flask\s+run\b|^rails\s+s(erver)?\b|^python3?\s+-m\s+http\.server\b/,
  },
];

const FOCUSED = /::|\s-(k|run|t)\s|--testNamePattern|--grep|\S+(_test\.go|_test\.py|\.test\.[jt]sx?|\.spec\.[jt]sx?)\b|\btest_\S+\.py\b/;
const INFO_ONLY = /\s--(version|help)\b/;
const LONG_SLEEP_SECONDS = 30;

// Remove wrappers that do not change what runs: env assignments, timing and
// timeout wrappers, and project runners such as `uv run`.
function normalize(segment: string): string {
  let s = segment.trim().replace(/^[({]\s*/, "");
  let previous = "";
  while (s !== previous) {
    previous = s;
    s = s
      .replace(/^\w+=("[^"]*"|'[^']*'|\S*)\s+/, "")
      .replace(/^(time|nice|nohup|command|exec)\s+/, "")
      .replace(/^timeout\s+\S+\s+/, "")
      .replace(/^(uv\s+run|poetry\s+run|pipenv\s+run|bundle\s+exec|npx|bunx|pnpm\s+exec|yarn\s+exec)\s+/, "");
  }
  return s;
}

function isFocused(command: string): boolean {
  if (/^go\s+test\b/.test(command)) return !command.includes("...") || FOCUSED.test(` ${command} `);
  return FOCUSED.test(` ${command} `);
}

export function findLongRunning(command: string): { label: string; segment: string } | undefined {
  for (const raw of command.split(/&&|\|\||;|\||\n/)) {
    const segment = normalize(raw);
    if (!segment || INFO_ONLY.test(` ${segment}`)) continue;
    const sleep = segment.match(/^sleep\s+(\d+)/);
    if (sleep && Number(sleep[1]) >= LONG_SLEEP_SECONDS) return { label: "wait", segment };
    for (const rule of RULES) {
      if (!rule.pattern.test(segment)) continue;
      if (rule.allowFocused && isFocused(segment)) continue;
      return { label: rule.label, segment };
    }
  }
  return undefined;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return undefined;
    const command = event.input.command;
    if (typeof command !== "string") return undefined;
    if (!pi.getAllTools().some((tool) => tool.name === "bgrun")) return undefined;

    const match = findLongRunning(command);
    if (!match) return undefined;
    return {
      block: true,
      reason:
        `bgrun-guard: "${match.segment}" looks like a ${match.label}, which can block the session and ` +
        `flood its context. Run the same command with the bgrun tool instead and give it a short name, ` +
        `then end your turn and wait for the completion wake. Keep bash for short, quiet commands.`,
    };
  });
}
