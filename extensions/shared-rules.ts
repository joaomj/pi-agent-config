/**
 * Adds the shared rules in this package's AGENTS.md to the system prompt, in
 * the same project-context block that Pi uses for AGENTS.md files.
 *
 * The rules arrive and leave with the package, so no user file is edited. They
 * are not added again when a loaded context file already holds them: this
 * repository's own AGENTS.md, or a block that the former installer appended
 * between the markers below.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RULES_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "AGENTS.md");
const INSTALLER_MARKER = "<!-- pi-agent-config: shared rules -->";

export default function (pi: ExtensionAPI) {
  const rules = readFileSync(RULES_PATH, "utf8");
  const body = rules.trim();

  pi.on("before_agent_start", (event) => {
    const files = event.systemPromptOptions.contextFiles;
    if (files.some((file) => file.content.includes(INSTALLER_MARKER) || file.content.includes(body))) return;
    files.push({ path: RULES_PATH, content: rules });
  });
}
