#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const paths = (text) => text.split("\0").filter(Boolean);
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const MACHINE_LOCAL_KEYS = ["deviceId", "lastChangelogVersion"];
const KNOWN_PROFILES = ["workstation", "server", "minimal"];

function parseArgs(argv) {
  const options = { profile: process.env.PI_PROFILE ?? "workstation", latest: false, dryRun: false, generateOnly: false, localPermissions: process.env.PI_PERMISSIONS_SRC ?? "" };
  const positionals = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--profile" && index + 1 < argv.length) options.profile = argv[++index];
    else if (arg.startsWith("--profile=")) options.profile = arg.slice("--profile=".length);
    else if (arg === "--latest") options.latest = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--generate") options.generateOnly = true;
    else if (arg === "--local-permissions" && index + 1 < argv.length) options.localPermissions = argv[++index];
    else if (arg.startsWith("--local-permissions=")) options.localPermissions = arg.slice("--local-permissions=".length);
    else positionals.push(arg);
  }
  if (!KNOWN_PROFILES.includes(options.profile)) {
    throw new Error(`Unknown profile ${options.profile}. Use one of: ${KNOWN_PROFILES.join(", ")}.`);
  }
  return { options, positionals };
}

function hasBaseLayout() {
  return existsSync(join(root, "settings.base.json")) && existsSync(join(root, "mcp.base.json"));
}

function expandLocalPath(source) {
  let local = source;
  if (local.startsWith("file:")) local = local.slice("file:".length);
  local = local.replace(/\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([^}]+)\}/g, (_, simple, braced) => process.env[simple ?? braced] ?? "");
  const resolved = local.startsWith("~/") ? join(homedir(), local.slice(2)) : resolve(root, local);
  return { display: local, resolved };
}

function splitNpmSource(source) {
  const remainder = source.slice("npm:".length);
  const at = remainder.lastIndexOf("@");
  if (at > 0) return { name: remainder.slice(0, at), version: remainder.slice(at + 1) };
  return { name: remainder, version: "" };
}

function resolvePackages(profilePackages, { latest, permissionsSrc }) {
  let lock = null;
  if (!latest && existsSync(join(root, "versions.lock"))) lock = json(join(root, "versions.lock"));
  return profilePackages.map((entry) => {
    if (typeof entry !== "string" || !entry.startsWith("npm:")) return entry;
    const { name, version } = splitNpmSource(entry);
    if (name === "@gotgenes/pi-permission-system" && permissionsSrc) return permissionsSrc;
    if (version) return entry;
    if (lock?.packages?.[name]) return `npm:${name}@${lock.packages[name]}`;
    console.warn(`No pinned version for ${name} in versions.lock; using latest.`);
    return entry;
  });
}

function resolvePermissionsSrc(cliValue) {
  const candidates = [cliValue, join(homedir(), "projects/pi-packages/packages/pi-permission-system")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const { resolved } = expandLocalPath(candidate);
    if (existsSync(resolved)) return candidate;
  }
  if (cliValue) {
    const { resolved } = expandLocalPath(cliValue);
    throw new Error(`Local permission package ${cliValue} is missing at ${resolved}. Create it or omit --local-permissions to use the published package.`);
  }
  return "";
}

function mergeDeep(base, override) {
  if (Array.isArray(override)) return override;
  if (base !== null && typeof base === "object" && override !== null && typeof override === "object") {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (key === "_comment") continue;
      merged[key] = key in merged ? mergeDeep(merged[key], value) : value;
    }
    return merged;
  }
  return override;
}

function generate() {
  if (!hasBaseLayout()) return null;
  const base = json(join(root, "settings.base.json"));
  for (const key of MACHINE_LOCAL_KEYS) {
    if (base[key] !== undefined) throw new Error(`settings.base.json must not contain ${key}. Keep machine-local values out of shared commits.`);
  }
  const { options } = parseArgs(process.argv.slice(2));
  const profilePath = join(root, "profiles", `${options.profile}.json`);
  if (!existsSync(profilePath)) throw new Error(`Profile ${options.profile} is missing at ${profilePath}.`);
  const profile = json(profilePath);
  if (!Array.isArray(profile.packages)) throw new Error(`${profilePath} packages must be an array.`);
  const permissionsSrc = resolvePermissionsSrc(options.localPermissions);
  const packages = resolvePackages(profile.packages, { latest: options.latest, permissionsSrc });
  let settings = mergeDeep(base, {});
  delete settings._comment;
  if (settings.packages === "@profile:workstation" || settings.packages === "@profile") settings.packages = packages;
  else if (typeof settings.packages === "string") throw new Error(`settings.base.json packages placeholder ${settings.packages} is unknown. Use "@profile".`);
  const localPath = join(root, "settings.local.json");
  if (existsSync(localPath)) {
    const local = json(localPath);
    const localPermissions = typeof local.permissionsSrc === "string" && local.permissionsSrc
      ? resolvePermissionsSrc(local.permissionsSrc)
      : "";
    if (localPermissions) {
      settings.packages = settings.packages.map((entry) =>
        typeof entry === "string" && splitNpmSource(entry).name === "@gotgenes/pi-permission-system" ? localPermissions : entry);
    }
    delete local.permissionsSrc;
    settings = mergeDeep(settings, local);
  }
  const previous = existsSync(join(root, "settings.json")) ? json(join(root, "settings.json")) : {};
  for (const key of MACHINE_LOCAL_KEYS) {
    if (previous[key] !== undefined) settings[key] = previous[key];
  }

  const mcpBase = JSON.parse(readFileSync(join(root, "mcp.base.json"), "utf8").split("__AGENT_DIR__").join(root));
  let mcp = mergeDeep(mcpBase, {});
  delete mcp._comment;
  const mcpLocalPath = join(root, "mcp.local.json");
  if (existsSync(mcpLocalPath)) {
    const local = json(mcpLocalPath);
    mcp.mcpServers = { ...(mcp.mcpServers ?? {}), ...(local.mcpServers ?? {}) };
    for (const [key, value] of Object.entries(local)) {
      if (key !== "mcpServers" && key !== "_comment") mcp[key] = value;
    }
  }
  return { settings, mcp, profile: options.profile, latest: options.latest };
}

function writeGenerated(generated) {
  writeFileSync(join(root, "settings.json"), `${JSON.stringify(generated.settings, null, 2)}\n`);
  writeFileSync(join(root, "mcp.json"), `${JSON.stringify(generated.mcp, null, 2)}\n`);
}

function detectPlatform() {
  const os = process.platform;
  if (os !== "linux" && os !== "darwin") {
    throw new Error(`Unsupported operating system: ${os}. Run sync on Ubuntu/Linux or macOS.`);
  }
  const arch = process.arch;
  if (arch !== "x64" && arch !== "arm64") {
    throw new Error(`Unsupported architecture: ${arch}. Use x64 or arm64 Node.js on ${os}.`);
  }
  switch (os) {
    case "linux": {
      const report = process.report.getReport();
      let libc;
      if (report.header.glibcVersionRuntime) libc = "gnu";
      else if (report.sharedObjects.some((path) => /(?:ld-musl|libc\.musl)/.test(path))) libc = "musl";
      else throw new Error("Cannot identify the Linux C library. Use a glibc or musl Node.js installation and retry.");
      return { label: `Linux ${arch} (${libc})`, fffPackage: `@ff-labs/fff-bin-linux-${arch}-${libc}` };
    }
    case "darwin":
      return { label: `macOS ${arch}`, fffPackage: `@ff-labs/fff-bin-darwin-${arch}` };
  }
}

function executable(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const path = resolve(directory, name);
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch (cause) {
      if (!["ENOENT", "ENOTDIR", "EACCES"].includes(cause.code)) throw cause;
    }
  }
  return undefined;
}

async function verify(pi) {
  process.env.PI_CODING_AGENT_DIR = root;
  process.env.PI_OFFLINE = "1";
  const cwd = mkdtempSync(join(tmpdir(), "pi-verify-"));
  try {
    const packagePath = findPackageJSON("@earendil-works/pi-coding-agent", pathToFileURL(realpathSync(pi)));
    const metadata = json(packagePath);
    const entry = metadata.exports?.["."]?.import ?? metadata.main;
    if (!entry) throw new Error(`Pi SDK entry is missing in ${packagePath}. Reinstall the latest Pi version.`);
    const { DefaultResourceLoader } = await import(pathToFileURL(resolve(dirname(packagePath), entry)).href);
    const loader = new DefaultResourceLoader({ cwd, agentDir: root });
    await loader.reload();
    const { extensions, errors } = loader.getExtensions();
    if (errors.length) {
      throw new Error(`Extension loading failed:\n${errors.map(({ path, error }) => `${path}: ${error}`).join("\n")}`);
    }
    execFileSync(pi, ["--offline", "--no-session", "--help"], { cwd, stdio: "pipe", encoding: "utf8", timeout: 60_000 });
    console.log(`Verified ${extensions.length} extensions and Pi CLI startup without a model request.`);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function packageSource(entry) {
  return typeof entry === "string" ? entry : entry?.source;
}

function configuredNpmNames(settings) {
  const names = new Set();
  const packages = Array.isArray(settings.packages) ? settings.packages : [];
  for (const entry of packages) {
    const source = packageSource(entry);
    if (typeof source !== "string" || !source.startsWith("npm:")) continue;
    const remainder = source.slice("npm:".length);
    const at = remainder.lastIndexOf("@");
    const name = at > 0 ? remainder.slice(0, at) : remainder;
    if (name) names.add(name);
  }
  return names;
}

function checkLocalSources(settings) {
  if (settings.packages !== undefined && !Array.isArray(settings.packages)) throw new Error("settings.json packages must be an array. Set it to package sources before syncing.");
  const packages = Array.isArray(settings.packages) ? settings.packages : [];
  for (const entry of packages) {
    const source = packageSource(entry);
    if (typeof source !== "string" || !source) continue;
    if (source.startsWith("npm:") || source.startsWith("git:") || source.includes("://")) continue;
    const { display, resolved } = expandLocalPath(source);
    if (!existsSync(resolved)) {
      throw new Error(`Local package ${display} configured in settings.json packages is missing at ${resolved}. Create it, point settings.local.json permissionsSrc at an existing checkout, or remove it before syncing.`);
    }
  }
}

function preflight() {
  const failures = [];
  const warnings = [];
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 19)) failures.push(`Node.js 22.19 or newer is required (found ${process.version}).`);
  else console.log(`Node.js ${process.version}: ok.`);
  const npm = executable("npm");
  if (!npm) failures.push("npm is required. Install npm and add it to PATH.");
  else {
    const npmVersion = execFileSync(npm, ["--version"], { encoding: "utf8" }).trim();
    if (Number(npmVersion.split(".")[0]) < 9) failures.push(`npm 9 or newer is required (found ${npmVersion}).`);
    else console.log(`npm ${npmVersion}: ok.`);
  }
  const localBin = join(homedir(), ".local/bin");
  if (!(process.env.PATH ?? "").split(delimiter).includes(localBin)) warnings.push(`Put ${localBin} in PATH so Pi runs from ~/.local.`);
  if (!executable("pi")) warnings.push("Pi executable is missing; the installer bootstraps it under ~/.local.");
  if (hasBaseLayout()) {
    try {
      const generated = generate();
      checkLocalSources(generated.settings);
      console.log(`Profile ${generated.profile}: ${generated.settings.packages.length} packages resolve.`);
    } catch (cause) {
      failures.push(cause.message);
    }
    for (const service of ["exa", "parallel", "jina"]) {
      try {
        execSync(`sh ${join(root, "scripts/mcp-auth.sh")} ${service} >/dev/null 2>&1`, { timeout: 15_000 });
        console.log(`MCP key ${service}: found.`);
      } catch {
        warnings.push(`MCP key ${service} is missing; that server stays disconnected until a key is set.`);
      }
    }
  }
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  if (failures.length) throw new Error(`Preflight failed:\n${failures.join("\n")}`);
  console.log("Preflight passed.");
}

function install(cliOptions) {
  const generated = generate();
  if (generated && cliOptions.dryRun) {
    console.log(`Profile: ${generated.profile}${generated.latest ? " (latest, lock ignored)" : " (pinned from versions.lock)"}.`);
    console.log(`Generated settings.json packages:\n${generated.settings.packages.join("\n")}`);
    console.log("Dry run: no files were written and no packages were updated.");
    return;
  }
  if (generated) writeGenerated(generated);
  if (cliOptions.generateOnly) {
    console.log(`Generated settings.json and mcp.json for profile ${generated.profile}. No packages were updated.`);
    return;
  }
  const npmDir = join(root, "npm");
  const progressMarker = join(npmDir, ".install-in-progress");
  if (existsSync(progressMarker)) {
    let detail = "";
    try {
      detail = ` ${readFileSync(progressMarker, "utf8").trim()}`;
    } catch {
      detail = "";
    }
    throw new Error(
      `A previous package install did not finish.${detail} ` +
        `Inspect ${npmDir}, restore it from a backup if needed, then delete ${progressMarker} and retry.`,
    );
  }
  const settings = json(join(root, "settings.json"));
  checkLocalSources(settings);
  const npmNames = configuredNpmNames(settings);

  const npm = executable("npm");
  if (!npm) throw new Error("npm is required. Install npm and add it to PATH.");
  const npmVersion = execFileSync(npm, ["--version"], { encoding: "utf8" }).trim();
  if (Number(npmVersion.split(".")[0]) < 9) throw new Error("npm 9 or newer is required. Update npm and retry.");

  const prefix = join(homedir(), ".local");
  const childEnv = {
    ...process.env,
    PI_CODING_AGENT_DIR: root,
    npm_config_ignore_scripts: "true",
    npm_config_min_release_age: "0",
  };
  // Pi's version check treats any nonempty PI_OFFLINE value as offline.
  delete childEnv.PI_OFFLINE;
  const runOnline = (command, args, cwd) =>
    execFileSync(command, args, { cwd, env: childEnv, stdio: "inherit", timeout: 300_000 });

  let pi = executable("pi");
  if (!pi) {
    console.log(`Installing latest Pi under ${prefix}...`);
    const neutral = mkdtempSync(join(tmpdir(), "pi-update-"));
    try {
      execFileSync(npm,
        ["install", "--global", "--prefix", prefix, "--ignore-scripts", "--dry-run=false", "--bin-links=true", "@earendil-works/pi-coding-agent@latest"],
        { cwd: neutral, env: childEnv, stdio: "inherit", timeout: 300_000 });
    } finally {
      rmSync(neutral, { recursive: true, force: true });
    }
    pi = executable("pi");
    if (!pi || realpathSync(pi) !== realpathSync(join(prefix, "bin", "pi"))) {
      throw new Error(`Put ${join(prefix, "bin")} first in PATH, then retry sync.`);
    }
  } else {
    console.log("Updating Pi to the latest version...");
    const neutral = mkdtempSync(join(tmpdir(), "pi-update-"));
    try {
      runOnline(pi, ["update", "--no-approve"], neutral);
    } finally {
      rmSync(neutral, { recursive: true, force: true });
    }
    pi = executable("pi");
    if (!pi) throw new Error(`Pi executable is missing after update. Put ${join(prefix, "bin")} first in PATH, then retry sync.`);
  }

  const backupParent = mkdtempSync(join(tmpdir(), "pi-packages-"));
  const backup = join(backupParent, "npm-backup");
  const hadPrior = existsSync(npmDir);
  if (hadPrior) {
    cpSync(npmDir, backup, { recursive: true, dereference: false, verbatimSymlinks: true });
  }
  mkdirSync(npmDir, { recursive: true });
  writeFileSync(
    progressMarker,
    JSON.stringify({ startedAt: new Date().toISOString(), pid: process.pid, backup }) + "\n",
  );

  try {
    for (const generatedFile of ["package.json", "package-lock.json", "node_modules"]) {
      rmSync(join(npmDir, generatedFile), { recursive: true, force: true });
    }
    const neutral = mkdtempSync(join(tmpdir(), "pi-update-"));
    try {
      console.log("Updating packages to the latest versions from settings.json (local packages are used in place)...");
      runOnline(pi, ["update", "--extensions", "--no-approve"], neutral);
    } finally {
      rmSync(neutral, { recursive: true, force: true });
    }

    const wantsFff = [...npmNames].some((name) =>
      name === "@ff-labs/pi-fff" || name === "@ff-labs/fff-node" || name === platform.fffPackage);
    if (wantsFff) {
      console.log(`Verifying FFF native package for ${platform.label}...`);
      if (!existsSync(join(npmDir, "node_modules", platform.fffPackage, "package.json"))) {
        throw new Error(`Missing native package ${platform.fffPackage} for ${platform.label}. Run sync again with network access and retry.`);
      }
      const fffEntry = pathToFileURL(join(npmDir, "node_modules/@ff-labs/fff-node/dist/index.js")).href;
      execFileSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(fffEntry)});`],
        { cwd: npmDir, env: childEnv, stdio: "inherit", timeout: 120_000 });
    }
    execFileSync(process.execPath, [script, "--verify", pi], { cwd: root, stdio: "inherit", timeout: 300_000 });
    rmSync(progressMarker, { force: true });
    rmSync(backupParent, { recursive: true, force: true });
    console.log("Setup complete: latest Pi, packages, and extension loading verified.");
  } catch (cause) {
    try {
      rmSync(npmDir, { recursive: true, force: true });
      if (hadPrior) cpSync(backup, npmDir, { recursive: true, dereference: false, verbatimSymlinks: true });
      rmSync(progressMarker, { force: true });
    } catch (rollbackError) {
      throw new AggregateError([cause, rollbackError], `Package update and recovery failed. Previous packages remain at ${backup}.`);
    }
    try {
      rmSync(backupParent, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError([cause, cleanupError], `Package update failed; packages were restored, but backup cleanup failed at ${backupParent}.`);
    }
    throw new Error("Package update failed. Previous installed packages were restored; fix the error above and retry.", { cause });
  }
}

function sync(cliOptions) {
  const backupRoot = join(homedir(), ".pi", "backups");
  mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  const lock = join(backupRoot, `sync-${createHash("sha256").update(root).digest("hex").slice(0, 16)}.lock`);
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch (cause) {
    throw new Error(`Cannot acquire sync lock ${lock}. If no sync is running, remove this directory and retry.`, { cause });
  }
  try {
    for (const state of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"]) {
      if (existsSync(resolve(root, git("rev-parse", "--git-path", state).trim()))) {
        throw new Error(`Finish or abort the Git operation (${state}) before syncing.`);
      }
    }
    if (git("diff", "--name-only", "--diff-filter=U").trim()) {
      throw new Error("Resolve the Git index conflicts before syncing.");
    }
    const branch = git("symbolic-ref", "--short", "HEAD").trim();
    const remote = git("config", "--get", `branch.${branch}.remote`).trim();
    const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}").trim();
    console.log(`Fetching ${upstream}...`);
    execFileSync("git", ["fetch", "--", remote], { cwd: root, stdio: "inherit" });
    const target = git("rev-parse", "@{upstream}^{commit}").trim();
    const required = hasBaseLayout()
      ? ["settings.base.json", "mcp.base.json", "profiles/workstation.json", "versions.lock", "scripts/sync.mjs"]
      : ["settings.json", "mcp.json", "scripts/sync.mjs"];
    const incoming = paths(git("ls-tree", "-rz", "--name-only", target));
    for (const name of required) {
      if (!incoming.includes(name)) {
        throw new Error(`${upstream} is missing ${name}. Publish a complete sync configuration before running sync.`);
      }
    }
    if (cliOptions.dryRun) {
      const ahead = git("rev-list", "--oneline", "HEAD..@{upstream}").trim();
      console.log(ahead ? `Incoming changes:\n${ahead}` : "Already up to date; no incoming changes.");
      console.log("Dry run: tracked files were left unchanged.");
      return;
    }
    const untracked = paths(git("ls-files", "--others", "-z"));
    const collisions = untracked.filter((path) => incoming.some((tracked) =>
      path === tracked || path.startsWith(`${tracked}/`) || tracked.startsWith(`${path}/`)));
    if (collisions.length) {
      throw new Error(`Sync would overwrite untracked files. Move these files outside the checkout and retry:\n${collisions.join("\n")}`);
    }
    const backup = mkdtempSync(join(backupRoot, "agent-sync-"));
    console.log(`Backing up tracked configuration to ${backup}`);
    writeFileSync(join(backup, "revision.txt"), `${git("rev-parse", "HEAD").trim()}\n`, { mode: 0o600 });
    writeFileSync(join(backup, "worktree.patch"), git("diff", "--binary", "HEAD"), { mode: 0o600 });
    writeFileSync(join(backup, "index.patch"), git("diff", "--cached", "--binary"), { mode: 0o600 });
    execFileSync("git", ["bundle", "create", join(backup, "repository.bundle"), "--all"], { cwd: root, stdio: "inherit" });
    const tracked = new Set([...paths(git("ls-tree", "-rz", "--name-only", "HEAD")), ...paths(git("ls-files", "-z"))]);
    for (const path of tracked) {
      const destination = join(backup, "files", path);
      mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
      try {
        cpSync(join(root, path), destination, { dereference: false, verbatimSymlinks: true });
      } catch (cause) {
        if (cause.code !== "ENOENT") throw new Error(`Cannot back up ${path}`, { cause });
      }
    }
    console.log(`Replacing tracked configuration with ${upstream} (${target.slice(0, 12)}).`);
    execFileSync("git", ["reset", "--hard", target], { cwd: root, stdio: "inherit" });
    execFileSync(process.execPath, [script, "--install", `--profile=${cliOptions.profile}`, ...(cliOptions.latest ? ["--latest"] : [])], { cwd: root, stdio: "inherit" });
    console.log(`Sync complete. Latest packages verified. Untracked files were preserved. Backup: ${backup}`);
    console.log("Restart Pi to load the synchronized configuration.");
  } finally {
    rmSync(lock, { recursive: true });
  }
}

const platform = detectPlatform();
console.log(`Detected ${platform.label}.`);
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 19)) {
  throw new Error("Node.js 22.19 or newer is required. Update Node.js and retry.");
}
const { options, positionals } = parseArgs(process.argv.slice(2));
if (positionals[0] === "--verify" && positionals.length === 2) await verify(positionals[1]);
else if (positionals[0] === "--check" && positionals.length === 1) preflight();
else if (positionals[0] === "--install") install(options);
else if (positionals.length === 0) sync(options);
else throw new Error("Usage: node scripts/sync.mjs [--install] [--generate] [--profile=workstation|server|minimal] [--latest] [--dry-run] [--local-permissions=<path>]");
