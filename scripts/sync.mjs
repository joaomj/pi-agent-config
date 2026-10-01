#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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
    let local = source;
    if (local.startsWith("file:")) local = local.slice("file:".length);
    const resolved = local.startsWith("~/") ? join(homedir(), local.slice(2)) : resolve(root, local);
    if (!existsSync(resolved)) {
      throw new Error(`Local package ${source} configured in settings.json packages is missing at ${resolved}. Create it or remove it from settings.json before syncing.`);
    }
  }
}

function install() {
  const npmDir = join(root, "npm");
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

  try {
    for (const generated of ["package.json", "package-lock.json", "node_modules"]) {
      rmSync(join(npmDir, generated), { recursive: true, force: true });
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
    rmSync(backupParent, { recursive: true, force: true });
    console.log("Setup complete: latest Pi, packages, and extension loading verified.");
  } catch (cause) {
    try {
      rmSync(npmDir, { recursive: true, force: true });
      if (hadPrior) cpSync(backup, npmDir, { recursive: true, dereference: false, verbatimSymlinks: true });
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

function sync() {
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
    const incoming = paths(git("ls-tree", "-rz", "--name-only", target));
    for (const required of ["settings.json", "mcp.json", "scripts/sync.mjs"]) {
      if (!incoming.includes(required)) {
        throw new Error(`${upstream} is missing ${required}. Publish a complete sync configuration before running sync.`);
      }
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
    execFileSync(process.execPath, [script, "--install"], { cwd: root, stdio: "inherit" });
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
if (process.argv[2] === "--verify" && process.argv.length === 4) await verify(process.argv[3]);
else if (process.argv[2] === "--install" && process.argv.length === 3) install();
else if (process.argv.length === 2) sync();
else throw new Error("Usage: node scripts/sync.mjs");
