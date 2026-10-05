import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const packageSource = (entry) => typeof entry === "string" ? entry : entry?.source;
const splitNpmSource = (source) => {
  const remainder = source.slice(4);
  const at = remainder.lastIndexOf("@");
  return { name: at > 0 ? remainder.slice(0, at) : remainder };
};

function packageIdentity(entry) {
  const source = packageSource(entry);
  if (typeof source !== "string" || !source) throw new Error("Invalid package declaration. Set packages to strings or objects with a source field.");
  return source.startsWith("npm:") ? `npm:${splitNpmSource(source).name}` : source;
}

function packageMap(settings) {
  const result = new Map();
  if (settings.packages !== undefined && !Array.isArray(settings.packages)) throw new Error("Invalid packages setting. Set packages to an array before syncing.");
  for (const entry of settings.packages ?? []) {
    const identity = packageIdentity(entry);
    result.set(identity, entry);
  }
  return result;
}

function installedNpmPackages(root) {
  const manifestPath = join(root, "npm", "package.json");
  if (!existsSync(manifestPath)) return new Map();
  const manifest = json(manifestPath);
  return new Map(Object.keys(manifest.dependencies ?? {}).sort().map((name) => {
    const metadataPath = join(root, "npm", "node_modules", name, "package.json");
    if (!existsSync(metadataPath)) return [`npm:${name}`, "not installed (manifest only)"];
    const metadata = json(metadataPath);
    if (typeof metadata.version !== "string") throw new Error(`Installed package ${name} has no version in ${metadataPath}. Repair it with pi update --extensions.`);
    return [`npm:${name}`, metadata.version];
  }));
}

export function writePackageReport({ root, profile, localPackages, installed, remoteSettings, revision }) {
  const remotePackages = packageMap(remoteSettings);
  const declaration = (entry) => JSON.stringify(entry);
  const lines = [
    "Pi configuration sync: package differences",
    `Account: ${homedir()}`,
    `Checkout: ${root}`,
    `Remote revision: ${revision}`,
    `Profile: ${profile}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Comparison: local declarations before sync versus the remote shared profile.",
    "Personal overrides are excluded from the remote package list.",
    "No installed packages were changed. Versions below are local observations, not latest-release checks.",
  ];
  const section = (title, entries) => lines.push("", title, ...(entries.length ? entries : ["  None."]));
  section("Declared remotely, not declared locally:", [...remotePackages].filter(([id]) => !localPackages.has(id)).map(([, entry]) => `  + ${declaration(entry)}`));
  section("Declared locally, not declared remotely (review for removal):", [...localPackages].filter(([id]) => !remotePackages.has(id)).map(([, entry]) => `  - ${declaration(entry)}`));
  section("Changed declarations (review source, version constraints, or resource filters):", [...remotePackages].filter(([id, entry]) => localPackages.has(id) && declaration(entry) !== declaration(localPackages.get(id))).flatMap(([id, entry]) => [`  ${id}`, `    Local:  ${declaration(localPackages.get(id))}`, `    Remote: ${declaration(entry)}`]));
  section("Remote npm packages not found in the local manifest inventory:", [...remotePackages.keys()].filter((id) => id.startsWith("npm:") && (!installed.has(id) || installed.get(id).startsWith("not installed"))).map((id) => `  ${id}`));
  section("Locally installed npm packages not declared remotely (review for removal):", [...installed].filter(([id, version]) => !remotePackages.has(id) && !version.startsWith("not installed")).map(([id, version]) => `  ${id} @ ${version}`));
  section("Local npm inventory before sync:", [...installed].map(([id, version]) => `  ${id} @ ${version}`));
  lines.push("", "To update extensions, run: pi update --extensions", "Use pi remove <source> only for packages you choose to remove.", "Package removal changes this account's declarations; a later configuration sync can restore shared declarations.", "");
  const directory = join(homedir(), ".pi", "reports");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, `package-diff-${createHash("sha256").update(root).digest("hex").slice(0, 16)}.txt`);
  writeFileSync(path, lines.join("\n"), { mode: 0o600 });
  console.log(`Package differences: ${path}`);
}

export function snapshotLocalPackages(root) {
  const settingsPath = join(root, "settings.json");
  const settings = existsSync(settingsPath) ? json(settingsPath) : {};
  return { localPackages: packageMap(settings), installed: installedNpmPackages(root) };
}
