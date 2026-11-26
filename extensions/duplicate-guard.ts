/**
 * Stops Pi when this package is configured more than once.
 *
 * `pi install` replaces an entry of the same kind, so a newer git tag takes the
 * place of an older one. A git source and a local path are different kinds, and
 * a second entry then loads a second copy. Pi refuses every tool the second copy
 * registers and does not start, and its error names the tools, not the cause.
 * This guard names the two sources and the command that removes one.
 *
 * It reads the settings files itself: `pi.getSettings()` is not available while
 * extensions load, and a thrown error ends startup with a readable message. A
 * project entry with `autoload: false` is a filtering delta over the personal
 * entry, not a second copy, so it is skipped.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const OWN_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const OWN_NAME = JSON.parse(readFileSync(join(OWN_DIR, "package.json"), "utf8")).name as string;

type Entry = string | { source: string; autoload?: boolean };

/** The directory a configured source resolves to, or undefined for another form. */
function sourceDir(source: string, base: string): string | undefined {
  if (source.startsWith("npm:")) {
    const spec = source.slice("npm:".length);
    const name = spec.startsWith("@") ? spec.split("@").slice(0, 2).join("@") : spec.split("@")[0];
    return name ? join(AGENT_DIR, "npm", "node_modules", name) : undefined;
  }
  if (source.startsWith("git:")) {
    const repo = source.slice("git:".length).replace(/@[^/]*$/, "").replace(/\.git$/, "");
    return join(AGENT_DIR, "git", repo);
  }
  return isAbsolute(source) ? source : resolve(base, source);
}

function packageName(dir: string): string | undefined {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) return undefined;
  try {
    return JSON.parse(readFileSync(manifest, "utf8")).name;
  } catch {
    return undefined;
  }
}

function copiesIn(settingsPath: string, base: string): Map<string, string> {
  const copies = new Map<string, string>();
  if (!existsSync(settingsPath)) return copies;
  let packages: Entry[];
  try {
    packages = JSON.parse(readFileSync(settingsPath, "utf8")).packages ?? [];
  } catch {
    return copies;
  }
  for (const entry of packages) {
    if (typeof entry !== "string" && entry.autoload === false) continue;
    const source = typeof entry === "string" ? entry : entry.source;
    const dir = sourceDir(source, base);
    if (dir && dir !== OWN_DIR && packageName(dir) === OWN_NAME) copies.set(dir, source);
  }
  return copies;
}

const copies = new Map([
  ...copiesIn(join(AGENT_DIR, "settings.json"), AGENT_DIR),
  ...copiesIn(join(process.cwd(), ".pi", "settings.json"), process.cwd()),
]);

if (copies.size > 0) {
  const others = [...copies].map(([dir, source]) => `  ${source} -> ${dir}`).join("\n");
  throw new Error(
    `${OWN_NAME} is configured more than once, so Pi loads two copies and refuses their tools:\n` +
      `  this copy -> ${OWN_DIR}\n${others}\n` +
      "Keep one entry and remove the other.",
  );
}

export default function () {}
