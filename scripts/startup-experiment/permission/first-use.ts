import { renameSync, writeFileSync } from "node:fs";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const resultPath = process.env.PI_PERF_FIRST_USE_RESULT;
  const protectedPath = process.env.PI_PERF_PROTECTED_PATH;
  if (!resultPath || !protectedPath) throw new Error("Set PI_PERF_FIRST_USE_RESULT and PI_PERF_PROTECTED_PATH through the runner.");
  let phase = "idle";
  let issued = false;
  let requests = 0;
  const results: Record<string, unknown> = {};
  const save = () => {
    writeFileSync(`${resultPath}.tmp`, JSON.stringify(results), { mode: 0o600 });
    renameSync(`${resultPath}.tmp`, resultPath);
  };
  pi.registerProvider("startup-performance", {
    api: "startup-performance", baseUrl: "http://127.0.0.1:1/offline",
    apiKey: ["offline", "fixture"].join("-"),
    models: [{ id: "scripted", name: "Offline startup measurement", reasoning: false,
      input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 100000, maxTokens: 1000 }],
    streamSimple(model) {
      if (++requests > 3) throw new Error("Unexpected request in startup measurement");
      const stream = createAssistantMessageEventStream();
      queueMicrotask(() => {
        const message: any = { role: "assistant", api: model.api, provider: model.provider, model: model.id,
          timestamp: Date.now(), content: [], stopReason: "pending",
          usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
        stream.push({ type: "start", partial: message });
        if (phase === "protected" && !issued) {
          issued = true;
          const call = { type: "toolCall" as const, id: "startup-protected-read", name: "read", arguments: {} as Record<string, unknown> };
          message.content.push(call);
          stream.push({ type: "toolcall_start", contentIndex: 0, partial: message });
          call.arguments = { path: protectedPath };
          stream.push({ type: "toolcall_end", contentIndex: 0, toolCall: call, partial: message });
          message.stopReason = "toolUse";
        } else {
          message.content.push({ type: "text", text: "" });
          stream.push({ type: "text_start", contentIndex: 0, partial: message });
          message.content[0].text = "Measurement complete";
          stream.push({ type: "text_delta", contentIndex: 0, delta: "Measurement complete", partial: message });
          stream.push({ type: "text_end", contentIndex: 0, content: "Measurement complete", partial: message });
          message.stopReason = "stop";
        }
        stream.push({ type: "done", reason: message.stopReason, message });
        stream.end();
      });
      return stream;
    },
  });
  pi.on("input", (event) => {
    if (event.text === "startup_performance_prompt") phase = "prompt";
    else if (event.text === "startup_performance_protected") phase = "protected";
    else return { action: "continue" };
    results[`${phase}AcceptedNs`] = process.hrtime.bigint().toString();
    return { action: "continue" };
  });
  pi.on("tool_execution_end", (event) => {
    if (event.toolCallId !== "startup-protected-read") return;
    const reason = event.result.content.filter((block: any) => block.type === "text").map((block: any) => block.text).join("\n");
    results.toolCompletedNs = process.hrtime.bigint().toString();
    results.toolBlocked = event.isError === true && /denied/i.test(reason);
    save();
  });
  pi.on("agent_settled", () => {
    if (phase !== "prompt" && phase !== "protected") return;
    results[`${phase}CompletedNs`] = process.hrtime.bigint().toString();
    results.requests = requests;
    save();
  });
}
