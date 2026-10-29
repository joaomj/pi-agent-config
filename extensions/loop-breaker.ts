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
 * A "check" is any shell command, keyed by the command behind a leading `cd`.
 * Background jobs count too: their completion wake names the command and its
 * exit code. The notes are appended to results; nothing is blocked.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const REPEAT_LIMIT = 3;
const SPLIT = /&&|\|\||;|\n/;

/** Shell commands that likely change files, so they count as a fix attempt. */
const WRITES = /(^|\s)(sed\s+-i|perl\s+-pi|tee|mv|cp|patch|git\s+(apply|checkout|restore|stash))\s|[^>&0-9]>{1,2}\s*[^&\s]|python3?\s+-\s*<</;

function checkKey(command: string): string {
  const segments = command.split(SPLIT).map((s) => s.trim()).filter(Boolean);
  const real = segments.filter((s) => !/^(cd|pushd|export)\b/.test(s));
  return (real.length > 0 ? real : segments).join(" && ").replace(/\s+/g, " ");
}

type Gate = { failures: number; editsSinceFailure: number };

export default function (pi: ExtensionAPI) {
  const gates = new Map<string, Gate>();
  let edits = 0;
  let lastCall = "";
  let repeats = 0;

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
    if ((event.toolName === "bash" || event.toolName === "bgrun") && typeof command === "string" && WRITES.test(command)) {
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
      const started = event.content.some((block) => block.type === "text" && /^started: /m.test(block.text));
      if (!started) {
        const verdict = judgeCheck(command, event.isError);
        if (verdict) notes.push(verdict);
      }
    }
    if (notes.length === 0) return undefined;
    return { content: [...event.content, { type: "text", text: notes.map(note).join("") }] };
  });

  // A background job's completion arrives as input; its exit code settles the gate.
  pi.on("input", (event) => {
    if (event.source !== "extension") {
      lastCall = "";
      repeats = 0;
      return { action: "continue" };
    }
    const finished = event.text.match(/Background job .* finished \(exit (-?\d+|\w+)\)/);
    const command = event.text.match(/^Command: (.*)$/m);
    if (!finished || !command) return { action: "continue" };
    const verdict = judgeCheck(command[1], finished[1] !== "0");
    if (!verdict) return { action: "continue" };
    return { action: "transform", text: event.text + note(verdict) };
  });
}
