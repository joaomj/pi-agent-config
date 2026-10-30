/**
 * Interrupts two kinds of wasted loops.
 *
 * 1. The same check fails again after changes were made to fix it. From the
 *    second such failure on, the result carries a note that asks the agent to
 *    name and test the premise its fixes shared, instead of trying a third fix
 *    on the same premise.
 * 2. The same tool call repeats with identical input. Its result will not
 *    change, so the third repeat carries a note that says so.
 *
 * A "check" is any shell command, keyed by the whole command, so the same
 * test run from different directories counts as different checks.
 * A command that runs on as a pi-bg-bash task counts when its completion
 * message arrives. The notes are appended to results; nothing is blocked.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REPEAT_LIMIT = 3;
/** The `customType` of pi-bg-bash completion messages. */
const TASK_MESSAGE = "pi-bg-bash";
const SPLIT = /&&|\|\||;|\n/;

/** Shell commands that likely change files, so they count as a fix attempt. */
const WRITES = /(^|\s)(sed\s+-i|perl\s+-pi|tee|mv|cp|patch|git\s+(apply|checkout|restore|stash))\s|[^>&0-9]>{1,2}\s*[^&\s]|python3?\s+-\s*<</;

function checkKey(command: string): string {
  return command
    .split(SPLIT)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" && ")
    .replace(/\s+/g, " ");
}

/** The pi-bg-bash task a bash result ran on as, if any. A Pi without structured bash results only has the text. */
function backgroundTaskId(structured: unknown, content: { type: string; text?: string }[]): string | undefined {
  const id = (structured as { task_id?: unknown } | undefined)?.task_id;
  if (typeof id === "string") return id;
  for (const block of content) {
    const match = block.type === "text" && block.text?.match(/background (?:task|as task) (bg-\d+)/);
    if (match) return match[1];
  }
  return undefined;
}

type Gate = { failures: number; editsSinceFailure: number };

export default function (pi: ExtensionAPI) {
  const gates = new Map<string, Gate>();
  let edits = 0;
  let lastCall = "";
  let repeats = 0;
  /** Commands that run on as background tasks, by task id, until their completion arrives. */
  const tasks = new Map<string, string>();

  function note(text: string): string {
    return `\n\n[loop-breaker] ${text}`;
  }

  /** Record a check's outcome. Returns a note when the same gate failed again after changes. */
  function judgeCheck(command: string, failed: boolean): string | undefined {
    const key = checkKey(command);
    if (!key) return undefined;
    const gate = gates.get(key);
    if (!failed) {
      gates.delete(key);
      return undefined;
    }
    if (!gate) {
      gates.set(key, { failures: 1, editsSinceFailure: edits });
      return undefined;
    }
    // A rerun with no change in between is not a new fix attempt.
    if (edits === gate.editsSinceFailure) return undefined;
    gate.failures++;
    gate.editsSinceFailure = edits;
    return (
      `\`${key}\` has now failed ${gate.failures} times, with changes in between. ` +
      "Stop fixing for a moment. Write down the one premise those fixes shared, then run a check " +
      "that would come out differently if the premise were false. Make the next fix only after that check."
    );
  }

  pi.on("tool_call", (event) => {
    const signature = `${event.toolName}\u0000${JSON.stringify(event.input)}`;
    repeats = signature === lastCall ? repeats + 1 : 1;
    lastCall = signature;
    if (event.toolName === "edit" || event.toolName === "write") edits++;
    const command = (event.input as { command?: unknown }).command;
    if (event.toolName === "bash" && typeof command === "string" && WRITES.test(command)) {
      edits++;
    }
  });

  pi.on("tool_result", (event) => {
    const notes: string[] = [];
    if (repeats >= REPEAT_LIMIT && `${event.toolName}\u0000${JSON.stringify(event.input)}` === lastCall) {
      notes.push(
        `This exact ${event.toolName} call has now run ${repeats} times in a row with the same input. ` +
          "Its result will not change. Use the earlier output, or change the approach.",
      );
    }
    const command = (event.input as { command?: unknown }).command;
    if (event.toolName === "bash" && typeof command === "string") {
      const taskId = backgroundTaskId(event.structuredContent, event.content);
      if (taskId) {
        tasks.set(taskId, command);
      } else {
        const verdict = judgeCheck(command, event.isError);
        if (verdict) notes.push(verdict);
      }
    }
    if (notes.length === 0) return undefined;
    // Replacing content alone drops structuredContent, which codemode scripts read.
    return {
      content: [...event.content, { type: "text", text: notes.map(note).join("") }],
      structuredContent: event.structuredContent,
    };
  });

  pi.on("input", (event) => {
    if (event.source !== "extension") {
      lastCall = "";
      repeats = 0;
    }
    return { action: "continue" };
  });

  // A background task's completion arrives as a custom message; its exit code settles the gate.
  pi.on("message_end", (event) => {
    const message = event.message;
    if (message.role !== "custom" || message.customType !== TASK_MESSAGE) return undefined;
    const details = message.details as { id?: unknown; exitCode?: unknown; state?: unknown } | undefined;
    if (typeof details?.id !== "string") return undefined;
    const command = tasks.get(details.id);
    tasks.delete(details.id);
    // A killed task or an unknown exit says nothing about the check.
    if (command === undefined || details.state !== "exited" || typeof details.exitCode !== "number") return undefined;
    const verdict = judgeCheck(command, details.exitCode !== 0);
    if (!verdict) return undefined;
    const text = note(verdict);
    const content =
      typeof message.content === "string"
        ? message.content + text
        : [...message.content, { type: "text" as const, text }];
    return { message: { ...message, content } };
  });
}
