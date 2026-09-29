import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("context_with_system", (event, ctx) => {
    if (ctx.model?.provider !== "claude-directsdk") return;
    const codemode = pi.getAllTools().find((tool) => tool.name === "codemode");
    if (codemode?.sourceInfo.path !== "builtin:codemode") return;

    return {
      messages: event.messages.map((message) => {
        if (message.role !== "system" || !message.toolsAdded) return message;
        return {
          ...message,
          toolsAdded: message.toolsAdded.map((tool) => {
            const sampling = tool.constrainedSampling;
            if (
              tool.name !== "codemode" ||
              !sampling ||
              sampling.type !== "grammar" ||
              Object.keys(sampling.variants).length !== 1 ||
              !sampling.variants.openai_lark
            ) return tool;

            // Claude uses the JSON schema; the raw-code grammar is for OpenAI.
            return {
              ...tool,
              constrainedSampling: { type: "json_schema" as const, strict: "prefer" as const },
            };
          }),
        };
      }),
    };
  });
}
