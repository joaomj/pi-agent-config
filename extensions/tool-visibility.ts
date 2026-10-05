import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const directTools = new Set(["read", "bash", "codemode"]);

export default function toolVisibility(pi: ExtensionAPI) {
  // Keep tools active so codemode can call them, but omit their request schemas.
  pi.registerTool({
    name: "tool_visibility",
    label: "Tool visibility policy",
    description: "Internal tool visibility policy. Not an executable tool.",
    exposure: "model-only",
    parameters: Type.Object({}),
    prepareLoadout(loadout) {
      if (!loadout.declared.some((tool) => tool.name === "codemode")) {
        throw new Error("Tool visibility requires codemode. Enable it in defaultTools and restart Pi.");
      }
      return {
        hiddenDeclarations: loadout.declared
          .filter((tool) => !directTools.has(tool.name))
          .map((tool) => tool.name),
      };
    },
    async execute() {
      throw new Error("tool_visibility is an internal policy and cannot be executed.");
    },
  });
}
