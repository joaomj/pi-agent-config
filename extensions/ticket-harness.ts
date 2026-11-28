/**
 * Holds an approved ticket contract and keeps the agent from settling while
 * the contract's done check fails.
 *
 * The ticket skill calls `ticket_contract` once the operator approves the
 * contract at Gate A. From then on:
 *
 * - the contract stays in the system prompt, so compaction cannot drop it;
 * - before the agent settles, the done command runs in the worktree, and the
 *   worktree must have no uncommitted changes to tracked files. When either
 *   fails, the agent gets the output and continues, at most
 *   MAX_CONTINUATIONS times per operator message.
 *
 * The done command runs here only when the permission policy allows it
 * without a prompt, because a command run here does not pass the bash
 * permission gate. Otherwise the agent is told to run it with `bash`.
 *
 * The contract lives in the tool result details, so a resumed session gets it
 * back, and it ends when the worktree is removed after the merge.
 */

import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const TOOL = "ticket_contract";
const SECTION = "ticket_contract";
const MAX_CONTINUATIONS = 2;
const DONE_TIMEOUT_MS = 300_000;
const OUTPUT_TAIL = 3000;

interface Contract {
  key: string;
  worktree: string;
  done: string;
  text: string;
}

export default function (pi: ExtensionAPI) {
  let contract: Contract | undefined;
  let continuations = 0;

  const restore = (ctx: ExtensionContext) => {
    contract = undefined;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === TOOL) {
        contract = (entry.message.details as { contract?: Contract } | undefined)?.contract ?? contract;
      }
    }
  };
  pi.on("session_start", async (_event, ctx) => restore(ctx));
  pi.on("session_tree", async (_event, ctx) => restore(ctx));

  pi.registerTool({
    name: TOOL,
    label: "Ticket contract",
    description:
      "Record the ticket contract the operator approved at Gate A. Before you settle, the harness then runs the " +
      "done command in the worktree and checks that tracked files are committed. Calling it again replaces the contract.",
    promptSnippet: "Record the approved ticket contract so its done check runs before you settle",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Ticket key, as in the decision log name" },
        worktree: { type: "string", description: "Absolute path of the ticket's worktree" },
        done: { type: "string", description: "The contract's Done command, run with bash in the worktree" },
        text: { type: "string", description: "The approved contract text" },
      },
      required: ["key", "worktree", "done", "text"],
      additionalProperties: false,
    } as any,
    async execute(_id, params: Contract) {
      const problems = [];
      if (!isAbsolute(params.worktree) || !existsSync(params.worktree)) problems.push(`worktree ${params.worktree} is not an existing absolute path`);
      if (!params.done.trim()) problems.push("done is empty");
      if (problems.length > 0) throw new Error(`${TOOL}: ${problems.join("; ")}. Create the worktree first, then call ${TOOL} again.`);
      contract = { ...params };
      return {
        content: [{ type: "text", text: `Contract for ${params.key} recorded. Its done check runs in ${params.worktree} before you settle.` }],
        details: { contract },
      };
    },
  });

  pi.on("before_agent_start", async (event) => {
    if (event.messageType === "user") continuations = 0;
    const sections = event.systemPromptOptions.sections;
    if (contract && existsSync(contract.worktree)) {
      sections[SECTION] = `Approved contract for ${contract.key}. Do not relax its done check.\n\n${contract.text}`;
    } else {
      delete sections[SECTION];
    }
  });

  pi.on("agent_before_settle", async (event, ctx) => {
    // A removed worktree means the ticket merged or was dropped.
    if (!contract || !existsSync(contract.worktree) || continuations >= MAX_CONTINUATIONS) return;
    const { worktree, done, key } = contract;
    const failures: string[] = [];

    const status = await pi.exec("git", ["-C", worktree, "status", "--porcelain", "--untracked-files=no"], { timeout: 30_000 });
    if (status.code !== 0) failures.push(`git status failed in ${worktree}:\n${status.stderr.trim()}`);
    else if (status.stdout.trim()) failures.push(`Tracked files have uncommitted changes:\n${status.stdout.trim()}`);

    if (await allowedWithoutPrompt(ctx, done)) {
      const run = await pi.exec("bash", ["-c", done], { cwd: worktree, timeout: DONE_TIMEOUT_MS });
      if (run.code !== 0) {
        const output = `${run.stdout}\n${run.stderr}`.trim().slice(-OUTPUT_TAIL);
        const why = run.killed ? `did not finish in ${DONE_TIMEOUT_MS / 1000} s` : `exited ${run.code}`;
        failures.push(`The done check \`${done}\` ${why}:\n${output}`);
      }
    } else {
      failures.push(`The harness cannot run the done check \`${done}\` without a permission prompt. Run it with bash in ${worktree} and report the result.`);
    }

    if (failures.length === 0) return;
    continuations++;
    return {
      entries: [
        ...event.entries,
        {
          type: "custom_message",
          customType: "ticket-harness",
          display: true,
          content:
            `Ticket ${key} is not done (check ${continuations} of ${MAX_CONTINUATIONS}).\n\n${failures.join("\n\n")}\n\n` +
            "Fix the cause and run the check again. If you stopped on purpose because only the operator can unblock you, " +
            "reply with the blocker in one line.",
        },
      ],
      continue: true,
    };
  });
}

/** True only when the permission policy would run `command` without asking. */
async function allowedWithoutPrompt(ctx: ExtensionContext, command: string): Promise<boolean> {
  try {
    const { getPermissionsService } = await import("@gotgenes/pi-permission-system");
    return getPermissionsService(ctx.sessionManager.getSessionId())?.checkPermission("bash", command).state === "allow";
  } catch {
    return false;
  }
}
