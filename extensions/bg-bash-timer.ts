/**
 * Sets how long a foreground `bash` command from pi-bg-bash may run before it
 * moves to the background.
 *
 * pi-bg-bash reads the limit from `PI_BG_BASH_PROMOTE_MS` on every call and
 * defaults to 120 s. This extension sets that variable, so the limit applies to
 * the next call without a restart. pi-bg-bash still writes "120 s" into the
 * bash tool description, so a prompt rule tells the model the real limit.
 *
 * pi-bg-bash never promotes a call that sets `timeout`, so a model that adds
 * `timeout: 600` blocks the session for up to ten minutes. This extension moves
 * that deadline into the command (coreutils `timeout`) and drops the
 * parameter, so the call keeps its deadline and still moves to the background.
 *
 * Without pi-bg-bash the variable has no effect and neither the rule nor the
 * rewrite applies.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const VARIABLE = "PI_BG_BASH_PROMOTE_MS";
const DEFAULT_SECONDS = 20;
const RULE_START = "A foreground bash command";

function readStartupSeconds(): { seconds: number; error?: string } {
  const raw = process.env[VARIABLE];
  if (raw === undefined || raw === "") return { seconds: DEFAULT_SECONDS };
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) {
    return {
      seconds: DEFAULT_SECONDS,
      error:
        `bg-bash-timer: ${VARIABLE} is "${raw}", which is not a positive number of milliseconds. ` +
        `Using ${DEFAULT_SECONDS} s. Set it to a value such as 20000, or unset it.`,
    };
  }
  return { seconds: ms / 1000 };
}

/** Wraps `command` so it stops after `timeout` seconds, as the `timeout` parameter would. */
export function withDeadline(command: string, timeout: number): string {
  const quoted = `'${command.replace(/'/g, `'\\''`)}'`;
  return `timeout -k 5 ${timeout} bash -c ${quoted}`;
}

export default function (pi: ExtensionAPI) {
  const startup = readStartupSeconds();
  let seconds = startup.seconds;
  let warned = false;
  process.env[VARIABLE] = String(Math.round(seconds * 1000));

  pi.on("tool_call", (event) => {
    if (event.toolName !== "bash" || !pi.getAllTools().some((tool) => tool.name === "bash_output")) return;
    const input = event.input as { command?: string; timeout?: number; background?: boolean; waitFor?: string };
    // background and waitFor already use `timeout` as the task deadline.
    if (input.background || input.waitFor !== undefined) return;
    if (typeof input.command !== "string" || typeof input.timeout !== "number") return;
    if (input.timeout <= seconds) return;
    input.command = withDeadline(input.command, input.timeout);
    delete input.timeout;
  });

  pi.on("before_agent_start", (event, ctx) => {
    if (startup.error && !warned) {
      warned = true;
      ctx.ui.notify(startup.error, "warning");
    }
    const options = event.systemPromptOptions;
    if (!options.selectedTools.includes("bash_output")) return;
    // A changed limit must replace the earlier rule, not sit next to it.
    options.promptGuidelines = options.promptGuidelines.filter((rule) => !rule.startsWith(RULE_START));
    options.promptGuidelines.push(
      `${RULE_START} still running after ${seconds} s (unless it starts with \`sleep\`) moves to the background, ` +
        "even when it sets `timeout`; the timeout still ends it. This limit replaces the 120 s in the bash tool " +
        "description. When a call returns a task id, end your turn if nothing else is left; the completion message starts the next one.",
    );
  });

  pi.registerCommand("bgtimer", {
    description: "Show or set the seconds before a foreground bash command moves to the background",
    handler: async (args, ctx) => {
      const arg = args.trim();
      if (arg.length > 0) {
        const next = Number(arg);
        if (!Number.isFinite(next) || next <= 0) {
          ctx.ui.notify("Usage: /bgtimer [seconds], for example /bgtimer 20", "warning");
          return;
        }
        seconds = next;
        process.env[VARIABLE] = String(Math.round(seconds * 1000));
      }
      ctx.ui.notify(
        `Foreground bash commands move to the background after ${seconds} s (this session). ` +
          `Set ${VARIABLE} in milliseconds to change the startup value.`,
        "info",
      );
    },
  });
}
