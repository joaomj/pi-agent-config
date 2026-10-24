/**
 * Routes bash calls to bgrun when a command is long or verbose.
 *
 * The routing has two layers:
 *
 * 1. Bounded, quiet commands run inline, and commands that are unambiguously a
 *    suite, a build, an install, a server, or a long wait go straight to bgrun.
 * 2. Everything else is judged by a classifier model, which weighs the command
 *    against what this machine already measured for it.
 *
 * The classifier is any registered System One model, so the vendor is a
 * "<provider>/<model>" string. Through OpenRouter, `typesafe/jev-1.14` is the
 * default and `cloudflare/clef-flash` the cheaper alternate; `openai/
 * gpt-6-luna-decisions` needs an account that allows non-ZDR endpoints. It
 * fails open to inline: a missing key, a timeout, or an unreadable answer runs
 * the command the way the agent asked.
 *
 * This replaces the built-in bash tool so a background call can actually be
 * made. The inline path delegates to pi's own bash definition, so its output,
 * truncation, renderers, and tool_result details are unchanged.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { createBashToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_MODEL = process.env.BGRUN_DECISION_MODEL ?? "openrouter/typesafe/jev-1.14";
const JUDGE_TIMEOUT_MS = 2500;

/**
 * How sure the judge must be before a command runs in the background.
 * Background is the cheaper mistake here: the output survives on disk and a
 * wake arrives, while a stalled inline run costs the session and its context.
 */
const THRESHOLD = readThreshold();

function readThreshold(): { value: number; error?: string } {
  const raw = process.env.BGRUN_DECISION_THRESHOLD;
  if (raw === undefined) return { value: 0.4 };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) {
    return {
      value: 0.4,
      error:
        `bgrun-guard: BGRUN_DECISION_THRESHOLD is "${raw}", which is not a number between 0 and 1. ` +
        `Using 0.4. Set it to a fraction such as 0.4, or unset it.`,
    };
  }
  return { value: parsed };
}

/** Bounded, quiet, read-only work. Runs inline without asking anyone. */
const INLINE = [
  /^(git\s+(status|diff|log|show|rev-parse|branch|remote|stash\s+list|add|commit|tag|describe)\b)/,
  /^(ls|pwd|cat|head|tail|wc|echo|printf|date|whoami|id|which|type|file|stat|du|df|basename|dirname|realpath|readlink|jq|rg|fd|ag|grep|egrep|sort|uniq|cut|tr|sed|awk|diff|tree|md5|shasum|xxd|od|nproc|uname)\b/,
  /^(node|python3?|go|rustc|java|npm|pnpm|yarn|bun|cargo|docker|git|gh)\s+(--version|-v|version)\b/,
  /^(test|true|false|:|exit)\b/,
];

type BackgroundRule = { label: string; name: string; type?: string; pattern: RegExp };

/** Unambiguous cases. `focused` commands fall through to the judge instead. */
const BACKGROUND: BackgroundRule[] = [
  { label: "test suite", name: "tests", type: "test", pattern: /^(pytest|tox|nox)\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^python3?\s+-m\s+(pytest|unittest)\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^go\s+test\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^(jest|vitest|mocha)\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^playwright\s+test\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^cargo\s+(test|nextest)\b/ },
  { label: "test suite", name: "tests", type: "test", pattern: /^(mvn|gradle|\.\/gradlew|\.\/mvnw)\b/ },
  { label: "build", name: "build", type: "build", pattern: /^(npm|pnpm|yarn|bun)\s+run\s+(build|e2e)\b/ },
  { label: "build", name: "build", type: "build", pattern: /^cargo\s+build\b/ },
  { label: "build", name: "build", type: "build", pattern: /^go\s+build\s+\.\/\.\.\./ },
  { label: "build", name: "build", type: "build", pattern: /^tsc\s+(-b|--build)\b/ },
  { label: "build", name: "build", type: "build", pattern: /^docker\s+build\b/ },
  { label: "build", name: "build", type: "build", pattern: /^make\b/ },
  { label: "lint", name: "lint", type: "lint", pattern: /^(npm|pnpm|yarn|bun)\s+run\s+(lint|typecheck|check)\b/ },
  { label: "lint", name: "lint", type: "lint", pattern: /^(eslint|ruff\s+check|golangci-lint\s+run|pre-commit\s+run|mypy)\b/ },
  { label: "dependency install", name: "install", pattern: /^(npm|pnpm|bun)\s+(install|i|ci|add)\b/ },
  { label: "dependency install", name: "install", pattern: /^yarn(\s+install)?\s*$/ },
  { label: "dependency install", name: "install", pattern: /^(pip3?|uv\s+pip)\s+install\b/ },
  { label: "dependency install", name: "install", pattern: /^uv\s+sync\b/ },
  { label: "dependency install", name: "install", pattern: /^poetry\s+install\b/ },
  { label: "dependency install", name: "install", pattern: /^bundle\s+install\b/ },
  { label: "dependency install", name: "install", pattern: /^brew\s+(install|upgrade)\b/ },
  { label: "dependency install", name: "install", pattern: /^cargo\s+install\b/ },
  { label: "container build", name: "container", pattern: /^(docker|podman)\s+(build|pull)\b/ },
  { label: "container run", name: "container", pattern: /^docker\s+compose\s+(build|pull|up)\b/ },
  { label: "infrastructure change", name: "infra", pattern: /^terraform\s+(plan|apply|destroy)\b/ },
  { label: "infrastructure change", name: "infra", pattern: /^ansible-playbook\b/ },
  { label: "server", name: "server", pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|serve)\b/ },
  { label: "server", name: "server", pattern: /^(uvicorn|gunicorn|next\s+dev|vite)\b/ },
  { label: "server", name: "server", pattern: /^flask\s+run\b/ },
  { label: "server", name: "server", pattern: /^rails\s+s(erver)?\b/ },
  { label: "server", name: "server", pattern: /^python3?\s+-m\s+http\.server\b/ },
  { label: "watch", name: "watch", pattern: /^gh\s+(run|pr\s+checks)\s+watch\b/ },
];

const FOCUSED = /::|\s-(k|run|t)\s|--testNamePattern|--grep|\S+(_test\.go|_test\.py|\.test\.[jt]sx?|\.spec\.[jt]sx?)\b|\btest_\S+\.py\b/;
const INFO_ONLY = /\s--(version|help)\b/;
const LONG_SLEEP_SECONDS = 30;
const SPLIT = new RegExp("[;&\\n]|\\|\\||\\|");

/** Remove wrappers that do not change what runs. */
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

function focused(command: string): boolean {
  if (/^go\s+test\b/.test(command)) return !command.includes("...") || FOCUSED.test(` ${command} `);
  return FOCUSED.test(` ${command} `);
}

type RuleHit = { label: string; name: string; type?: string };

/** The unambiguous cases, without asking a model. */
export function matchRule(command: string): RuleHit | "inline" | undefined {
  let sawInline = false;
  for (const raw of command.split(SPLIT)) {
    const segment = normalize(raw);
    if (!segment) continue;
    // Asking for --version or --help is always quick.
    if (INFO_ONLY.test(` ${segment} `)) {
      sawInline = true;
      continue;
    }
    const sleep = segment.match(/^sleep\s+(\d+)/);
    if (sleep && Number(sleep[1]) >= LONG_SLEEP_SECONDS) return { label: "wait", name: "wait" };
    for (const rule of BACKGROUND) {
      if (!rule.pattern.test(segment)) continue;
      // A selector means one test, not a whole suite: let the classifier decide.
      if (rule.type === "test" && focused(segment)) continue;
      return { label: rule.label, name: rule.name, type: rule.type };
    }
    // Any part this file cannot vouch for hands the whole command to the classifier.
    if (!INLINE.some((re) => re.test(segment))) return undefined;
    sawInline = true;
  }
  return sawInline ? "inline" : undefined;
}

/**
 * What this machine has already measured, per working directory and command.
 * A command with a decisive record is routed without asking a model, which is
 * the whole point of keeping the file.
 */
type Observation = { ms: number; lines: number; truncated: boolean; at: number };

const MAX_OBSERVATIONS = 500;
const OBSERVATIONS_PATH = join(
  process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
  "bgrun-observations.json",
);

function loadObservations(): Record<string, Observation> {
  if (!existsSync(OBSERVATIONS_PATH)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(OBSERVATIONS_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, Observation>) : {};
  } catch {
    // A corrupt cache is not worth failing a tool call over; it rebuilds itself.
    return {};
  }
}

/**
 * Checks whose output the agent needs before it can pick the next step. How long
 * one took never settles the routing question, and handing the judge a duration
 * only teaches it to background them, so these are judged without a record.
 */
const CHECK_SHAPED = [
  /(^|\s)(npx\s+)?(tsc|mypy|pyright)\b/,
  /(^|\s)(cargo\s+(check|clippy)|go\s+vet|golangci-lint|staticcheck)\b/,
  /(^|\s)(eslint|stylelint|pylint|flake8|rubocop|shellcheck|hadolint|ruff|biome)\b/,
  /(^|\s)(prettier\s+--check|black\s+--check|gofmt|rustfmt|swift-format)\b/,
  /\bterraform\s+(fmt|validate)\b/,
];

export function checkShaped(command: string): boolean {
  return focused(command) || CHECK_SHAPED.some((re) => re.test(command));
}

export default function (pi: ExtensionAPI) {
  const template = createBashToolDefinition(process.cwd());
  const observations = loadObservations();
  let modelRef = DEFAULT_MODEL;
  let enabled = true;
  let lastRequest = "";
  const stats = {
    background: 0,
    ruleInline: 0,
    judged: 0,
    judgedBackground: 0,
    fallback: 0,
  };
  let warned: string | undefined;

  /** The first two words, or three for a package-runner wrapper, scoped to the directory. */
  function key(cwd: string, command: string): string {
    const tokens = normalize(command).split(/\s+/).filter(Boolean);
    const runner = tokens[0] === "npm" || tokens[0] === "pnpm" || tokens[0] === "yarn" || tokens[0] === "bun";
    const size = runner && (tokens[1] === "run" || tokens[1] === "exec") ? 3 : 2;
    return `${cwd}\u0000${tokens.slice(0, size).join(" ")}`;
  }

  /** An inline program is a one-off, so measuring one says nothing about the next. */
  function learnable(command: string): boolean {
    const tokens = normalize(command).split(/\s+/).filter(Boolean);
    return tokens[1] !== "-c" && tokens[1] !== "-e";
  }

  function observation(cwd: string, command: string): string | undefined {
    if (checkShaped(command)) return undefined;
    const seen = observations[key(cwd, command)];
    if (!seen) return undefined;
    return `earlier runs took about ${(seen.ms / 1000).toFixed(1)}s and printed about ${seen.lines} lines`;
  }

  function remember(cwd: string, command: string, ms: number, lines: number, truncated: boolean) {
    if (!learnable(command)) return;
    const id = key(cwd, command);
    const prior = observations[id];
    observations[id] = { ms, lines, truncated, at: Date.now() };
    // Rewriting the file on every call would cost more than the routing saves.
    const drifted = !prior || Math.abs(prior.ms - ms) > 1000 || prior.lines !== lines || prior.truncated !== truncated;
    if (!drifted) return;
    // Another session may have measured commands this one never saw. Merge with
    // what is on disk, or this session's snapshot reverts their entries.
    const merged = { ...loadObservations(), [id]: observations[id] };
    const kept = Object.fromEntries(
      Object.entries(merged)
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, MAX_OBSERVATIONS),
    );
    // A shared temporary path lets two sessions rename over each other mid-write.
    const tmp = `${OBSERVATIONS_PATH}.${process.pid}.tmp`;
    try {
      mkdirSync(dirname(OBSERVATIONS_PATH), { recursive: true });
      writeFileSync(tmp, JSON.stringify(kept));
      renameSync(tmp, OBSERVATIONS_PATH);
    } catch (error) {
      warnOnce(
        `bgrun-guard: could not save what it measured (${error instanceof Error ? error.message : String(error)}).`,
      );
      return;
    }
    for (const stale of Object.keys(observations)) delete observations[stale];
    Object.assign(observations, kept);
  }

  function warnOnce(message: string) {
    if (warned === message) return;
    warned = message;
    pi.sendMessage({ customType: "bgrun-guard", content: message, display: true }, { deliverAs: "nextTurn" });
  }

  async function judge(ctx: any, command: string): Promise<{ background: boolean; note: string } | undefined> {
    const slash = modelRef.indexOf("/");
    if (slash <= 0) return undefined;
    const provider = modelRef.slice(0, slash);
    const id = modelRef.slice(slash + 1);
    const model = ctx.modelRegistry.findOfType("classifier", provider, id);
    if (!model) {
      warnOnce(`bgrun-guard: classifier ${modelRef} is not in the catalog, so commands run inline.`);
      return undefined;
    }
    const timeout = AbortSignal.timeout(JUDGE_TIMEOUT_MS);
    const signal = ctx.signal ? AbortSignal.any([ctx.signal, timeout]) : timeout;
    const result = await ctx.modelRegistry.classify(
      model,
      {
        state: {
          command,
          working_directory: basename(ctx.cwd),
          user_request: lastRequest,
          earlier_observation: observation(ctx.cwd, command),
          focused_selector: focused(command),
        },
        questions: {
          route: {
            type: "choice",
            instructions:
              "How should the agent run this bash command? Backgrounding detaches it, keeps its output on disk, and wakes the agent when it finishes. Inline runs it in the session and returns the output immediately.",
            criteria: {
              background:
                "Runs over 30 seconds, or prints over 100 lines, or reads an unbounded input such as a wildcard, a recursive walk, xargs, -exec, or a follow flag. Its output is not needed to choose the immediate next step.",
              inline:
                "Fast and bounded: a version check, a single file, a focused test selector, or output the agent must read before choosing the next step.",
            },
          },
        },
      },
      { signal },
    );
    stats.judged++;
    if (result.stopReason !== "stop") {
      warnOnce(
        `bgrun-guard: ${modelRef} could not answer (${result.errorMessage ?? result.stopReason}), so commands run inline.`,
      );
      stats.fallback++;
      return undefined;
    }
    const answer = result.answers.route;
    if (answer?.type !== "choice") return undefined;
    const background = (answer.probabilities.background ?? 0) >= THRESHOLD.value;
    if (background) stats.judgedBackground++;
    return { background, note: `background p=${(answer.probabilities.background ?? 0).toFixed(2)}` };
  }

  /** Append a one-line note so the model sees why it got this result. */
  function withNote(result: any, note: string): any {
    const content = Array.isArray(result?.content) ? result.content : [];
    const text = content.map((block: any) => (block.type === "text" ? block.text : "")).join("\n");
    return {
      ...result,
      content: [{ type: "text", text: `${text ? `${text}\n\n` : ""}[bgrun-guard: ${note}]` }],
      structuredContent: result?.structuredContent,
    };
  }

  pi.registerTool({
    name: template.name,
    label: template.label,
    description:
      `${template.description} Long or verbose commands are routed to the background automatically: ` +
      `the result then reads "started: <job-id>". When that happens, end your turn and wait for the completion wake.`,
    promptSnippet: template.promptSnippet,
    promptGuidelines: [
      ...(template.promptGuidelines ?? []),
      "bash may answer `started: <job-id>` when the command was routed to the background. That is the expected outcome for long or verbose work: end your turn and wait for the wake instead of rerunning the command inline.",
    ],
    parameters: template.parameters,
    renderCall: template.renderCall,
    renderResult: template.renderResult,
    renderShell: template.renderShell,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const command = String((params as { command?: unknown }).command ?? "");
      const real = createBashToolDefinition(ctx.cwd);

      // A call the rules settled never reaches the judge, so measuring it would
      // only grow the file and rewrite it on every run.
      const runInline = async (note?: string, record = true) => {
        const started = performance.now();
        const result = await real.execute(toolCallId, params, signal, onUpdate, ctx);
        const text = Array.isArray(result.content)
          ? result.content.map((block: any) => (block.type === "text" ? block.text : "")).join("\n")
          : "";
        const truncated = result.details?.truncation?.truncated === true;
        if (record) {
          remember(ctx.cwd, command, performance.now() - started, text.split("\n").length, truncated);
        }
        return note ? withNote(result, note) : result;
      };

      if (THRESHOLD.error) warnOnce(THRESHOLD.error);
      if (!enabled) return runInline(undefined, false);

      const routed = matchRule(command);
      if (routed === "inline") {
        stats.ruleInline++;
        return runInline(undefined, false);
      }
      if (routed) {
        if (!ctx.tools.some((tool: any) => tool.name === "bgrun")) {
          stats.ruleInline++;
          return runInline(undefined, false);
        }
        stats.background++;
        const outcome = await ctx.executeTool("bgrun", { command, name: routed.name, type: routed.type }, { signal });
        return withNote(outcome.result, `rule: ${routed.label}`);
      }

      let verdict: { background: boolean; note: string } | undefined;
      try {
        verdict = await judge(ctx, command);
      } catch (error) {
        stats.fallback++;
        warnOnce(
          `bgrun-guard: the classifier failed (${error instanceof Error ? error.message : String(error)}), so commands run inline.`,
        );
      }

      if (!verdict?.background) return runInline(verdict?.note);
      if (!ctx.tools.some((tool: any) => tool.name === "bgrun")) return runInline(verdict.note);

      stats.background++;
      try {
        const outcome = await ctx.executeTool("bgrun", { command, name: "command" }, { signal });
        return withNote(outcome.result, verdict.note);
      } catch (error) {
        stats.fallback++;
        return runInline(
          `the classifier said background (${verdict.note}) but bgrun could not run it: ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  });

  // The judge needs to know what the session is trying to do to weigh "is the output needed now".
  pi.on("input", (event) => {
    if (event.text.trim().length > 0) lastRequest = event.text.trim().slice(0, 600);
  });

  pi.registerCommand("bgroute", {
    description: "Show or change how bash calls are routed to the background",
    handler: async (args, ctx) => {
      const arg = args.trim();
      if (arg === "off") enabled = false;
      else if (arg === "on") enabled = true;
      else if (arg.length > 0) {
        if (!arg.includes("/")) {
          ctx.ui.notify("Usage: /bgroute [on|off|<provider>/<model>]", "warning");
          return;
        }
        modelRef = arg;
      }
      const rate = stats.judged === 0 ? "0%" : `${Math.round((stats.judgedBackground / stats.judged) * 100)}%`;
      ctx.ui.notify(
        [
          `routing: ${enabled ? "on" : "off"}`,
          `classifier: ${modelRef}`,
          `threshold: ${THRESHOLD.value} (background at or above this probability)`,
          `measured commands on this machine: ${Object.keys(observations).length}`,
          `backgrounded: ${stats.background} (rules decided ${stats.ruleInline} without a model)`,
          `judged: ${stats.judged}, said background ${rate}, fell back ${stats.fallback}`,
        ].join("\n"),
        "info",
      );
    },
  });
}
