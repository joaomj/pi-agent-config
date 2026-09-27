#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const paths = (text) => text.split("\0").filter(Boolean);
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

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
    if (!entry) throw new Error(`Pi SDK entry is missing in ${packagePath}. Reinstall the pinned Pi version.`);
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

function install() {
  const npmDir = join(root, "npm");
  const version = readFileSync(join(root, ".pi-version"), "utf8").trim();
  if (!exactVersion.test(version)) throw new Error("Set .pi-version to an exact Pi version, such as 0.87.1.");
  const manifest = json(join(npmDir, "package.json"));
  const lock = json(join(npmDir, "package-lock.json"));
  const settings = json(join(root, "settings.json"));
  const dependencies = manifest.dependencies;
  if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) {
    throw new Error("npm/package.json must declare dependencies with exact versions.");
  }
  const expectedSources = Object.entries(dependencies).map(([name, value]) => {
    if (!exactVersion.test(value)) throw new Error(`Pin npm/package.json dependencies.${name} to an exact version.`);
    if (lock.packages?.[""]?.dependencies?.[name] !== value || lock.packages?.[`node_modules/${name}`]?.version !== value) {
      throw new Error(`npm/package-lock.json does not match ${name}@${value}. Regenerate the lockfile before syncing.`);
    }
    return `npm:${name}@${value}`;
  }).sort();
  if (!Array.isArray(settings.packages) || JSON.stringify([...settings.packages].sort()) !== JSON.stringify(expectedSources)) {
    throw new Error("settings.json packages must match the exact versions in npm/package.json.");
  }
  if (JSON.stringify(Object.keys(lock.packages?.[""]?.dependencies ?? {}).sort()) !== JSON.stringify(Object.keys(dependencies).sort())) {
    throw new Error("npm/package-lock.json dependencies differ from npm/package.json. Regenerate the lockfile.");
  }
  const npm = executable("npm");
  if (!npm) throw new Error("npm is required. Install npm and add it to PATH.");
  const npmVersion = execFileSync(npm, ["--version"], { encoding: "utf8" }).trim();
  if (Number(npmVersion.split(".")[0]) < 9) throw new Error("npm 9 or newer is required. Update npm and retry.");
  const env = { ...process.env, PI_CODING_AGENT_DIR: root, PI_OFFLINE: "1" };
  if (Number(npmVersion.split(".")[0]) >= 11) env.npm_config_min_release_age = "0";
  const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, env, stdio: "inherit", timeout: 300_000 });
  let pi = executable("pi");
  if (!pi || execFileSync(pi, ["--version"], { env, encoding: "utf8" }).trim() !== version) {
    const prefix = join(homedir(), ".local");
    console.log(`Installing Pi ${version} under ${prefix}...`);
    run(npm, ["install", "--global", "--prefix", prefix, "--ignore-scripts", "--dry-run=false", "--bin-links=true", `@earendil-works/pi-coding-agent@${version}`]);
    pi = executable("pi");
    if (!pi || realpathSync(pi) !== realpathSync(join(prefix, "bin", "pi"))) {
      throw new Error(`Put ${join(prefix, "bin")} first in PATH, then retry sync.`);
    }
  }
  if (execFileSync(pi, ["--version"], { env, encoding: "utf8" }).trim() !== version) {
    throw new Error(`Pi version does not match .pi-version (${version}). Check PATH and retry.`);
  }

  const installed = join(npmDir, "node_modules");
  const fingerprint = createHash("sha256")
    .update(readFileSync(join(npmDir, "package.json")))
    .update(readFileSync(join(npmDir, "package-lock.json"))).digest("hex");
  const stamp = join(installed, ".pi-config-lock");
  const installedVersionsMatch = () => {
    try {
      return Object.entries(lock.packages).every(([path, entry]) =>
        !path || (entry.optional && !existsSync(join(npmDir, path, "package.json"))) ||
        json(join(npmDir, path, "package.json")).version === entry.version);
    } catch (cause) {
      if (cause.code === "ENOENT") return false;
      throw cause;
    }
  };
  const verifyBinary = (directory) => {
    if (Object.hasOwn(dependencies, "@ff-labs/pi-fff")) {
      console.log(`Verifying FFF native package for ${platform.label}...`);
      const nativePath = `node_modules/${platform.fffPackage}`;
      const expected = lock.packages[nativePath]?.version;
      if (!expected || !existsSync(join(directory, nativePath, "package.json"))) {
        throw new Error(`Missing native package ${platform.fffPackage}. Install npm optional dependencies for ${platform.label} and retry.`);
      }
      const actual = json(join(directory, nativePath, "package.json")).version;
      if (actual !== expected) throw new Error(`Installed ${platform.fffPackage}@${actual}; lockfile requires ${expected}.`);
      const nativeEntry = pathToFileURL(join(directory, "node_modules/@ff-labs/fff-node/dist/index.js")).href;
      run(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(nativeEntry)});`], directory);
    }
    if (Object.hasOwn(dependencies, "donsetch")) {
      console.log("Verifying the platform-specific donsetch binary (downloads it if missing)...");
      run(process.execPath, [join(directory, "node_modules/donsetch/bin/donsetch.js"), "--version"], directory);
    }
  };
  if (existsSync(stamp) && readFileSync(stamp, "utf8") === fingerprint && installedVersionsMatch()) {
    console.log("Installed packages already match the lockfile.");
    verifyBinary(npmDir);
    run(process.execPath, [script, "--verify", pi]);
    return;
  }
  const stage = mkdtempSync(join(npmDir, ".sync-"));
  const previous = join(stage, "previous-node_modules");
  let activated = false;
  let completed = false;
  try {
    copyFileSync(join(npmDir, "package.json"), join(stage, "package.json"));
    copyFileSync(join(npmDir, "package-lock.json"), join(stage, "package-lock.json"));
    console.log(`Installing locked packages with npm ${npmVersion}; lifecycle scripts are disabled.`);
    run(npm, ["ci", "--ignore-scripts", "--legacy-peer-deps", "--global=false", "--dry-run=false", "--bin-links=true", "--no-audit", "--no-fund"], stage);
    for (const [path, entry] of Object.entries(lock.packages)) {
      if (!path || (entry.optional && !existsSync(join(stage, path, "package.json")))) continue;
      const actual = json(join(stage, path, "package.json")).version;
      if (actual !== entry.version) throw new Error(`Installed ${path}@${actual}; lockfile requires ${entry.version}.`);
    }
    verifyBinary(stage);
    writeFileSync(join(stage, "node_modules", ".pi-config-lock"), fingerprint);
    if (existsSync(installed)) renameSync(installed, previous);
    renameSync(join(stage, "node_modules"), installed);
    activated = true;
    run(process.execPath, [script, "--verify", pi]);
    completed = true;
    console.log(`Setup complete: Pi ${version}, locked packages, and extension loading verified.`);
  } catch (cause) {
    try {
      if (activated) rmSync(installed, { recursive: true, force: true });
      if (existsSync(previous)) renameSync(previous, installed);
    } catch (rollbackError) {
      throw new AggregateError([cause, rollbackError], `Package setup and recovery failed. Previous packages remain at ${previous}.`);
    }
    throw new Error("Package setup failed. Previous installed packages were preserved; fix the error above and retry.", { cause });
  } finally {
    if (completed || !existsSync(previous)) rmSync(stage, { recursive: true, force: true });
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
    for (const required of [".pi-version", "settings.json", "npm/package.json", "npm/package-lock.json", "scripts/sync.mjs"]) {
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
    console.log(`Sync complete. Untracked files were preserved. Backup: ${backup}`);
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
