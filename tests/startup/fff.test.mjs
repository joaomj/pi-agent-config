import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scenario = fileURLToPath(new URL("./fff-scenario.mjs", import.meta.url));
// Each scenario owns a distinct first-use, lifecycle, or failure contract at Pi's real boundary.
// Fresh processes prevent FFF's process-global native SDK cache from hiding a broken installation.
for (const [name, value] of [
  ["FFF first and concurrent workspace/auxiliary searches return real indexed results", "search"],
  ["FFF autocomplete, commands, mode reload, fresh sessions, and interrupted initialization remain usable", "lifecycle"],
  ["FFF deferred SDK failure stays visible without disabling unrelated tools", "failure"],
]) {
  test(name, () => {
    execFileSync(process.execPath, [scenario, value], { env: process.env, timeout: 30000, maxBuffer: 256 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  });
}
