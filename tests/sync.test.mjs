import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, chmod, rm, readdir, symlink, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function put(root, path, contents) {
  const destination = join(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pi-sync-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = join(root, "home");
  const bin = join(root, "bin");
  const origin = join(root, "origin.git");
  const seed = join(root, "seed");
  const work = join(root, "work");
  await Promise.all([home, bin, seed].map((path) => mkdir(path, { recursive: true })));
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    PI_CODING_AGENT_DIR: join(home, ".pi", "agent"),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_TERMINAL_PROMPT: "0",
    npm_config_cache: join(root, "npm-cache"),
    npm_config_userconfig: join(home, ".npmrc"),
    PATH: `${bin}:${process.env.PATH}`,
    FIXTURE_CALLS: join(root, "calls.jsonl"),
    FIXTURE_EXTENSIONS_FAIL: "0",
    FIXTURE_PI_UPDATE_FAIL: "0",
    FIXTURE_PI_FAIL: "0",
    FIXTURE_SDK_FAIL: "0",
  };
  function git(cwd, ...args) {
    const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", ...args], { cwd, env, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
    return result.stdout;
  }
  git(root, "init", "--bare", origin);
  git(seed, "init", "-b", "main");
  await mkdir(join(seed, "scripts"), { recursive: true });
  await copyFile(join(source, "scripts/sync.mjs"), join(seed, "scripts/sync.mjs"));
  const settings = json({ packages: ["npm:fixture-extension@1.0.0"], enabledModels: ["fixture/*"] });
  await put(seed, "settings.json", settings);
  await put(seed, "mcp.json", json({ mcpServers: {} }));
  await put(seed, ".gitignore", "auth.json\nsessions/\ndocs/\nuntracked.bin\nnpm/*\n!npm/.gitignore\n");
  await put(seed, "npm/.gitignore", "*\n!.gitignore\n");
  await put(seed, "tracked.txt", "upstream tracked contents\n");
  git(seed, "add", ".");
  git(seed, "commit", "-m", "Initial fixture");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-u", "origin", "main");
  git(root, "clone", "--branch", "main", origin, work);

  await writeFile(env.FIXTURE_CALLS, "");
  const sdk = "node_modules/@earendil-works/pi-coding-agent";
  await put(bin, `${sdk}/package.json`, json({
    name: "@earendil-works/pi-coding-agent", version: "0.99.0", type: "module", main: "index.js",
  }));
  await put(bin, `${sdk}/index.js`, `export class DefaultResourceLoader {
  constructor(options) { this.options = options; }
  async reload() {}
  getExtensions() {
    return { extensions: [], errors: process.env.FIXTURE_SDK_FAIL === '1'
      ? [{ path: 'fixture-extension', error: 'fixture SDK loader failure' }] : [] };
  }
}
`);

  const stub = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const sep = path.sep;
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const subset = {
  PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
  PI_OFFLINE: process.env.PI_OFFLINE,
  npm_config_ignore_scripts: process.env.npm_config_ignore_scripts,
  npm_config_min_release_age: process.env.npm_config_min_release_age,
};
fs.appendFileSync(process.env.FIXTURE_CALLS, JSON.stringify({ command, args, cwd: process.cwd(), env: subset }) + '\\n');
function fail(message, code) { console.error(message); process.exit(code); }
if (command === 'npm') {
  if (args[0] === '--version') { console.log('11.19.0'); process.exit(0); }
  if (args[0] === 'install' && args.includes('--global')) {
    if (!args.includes('@earendil-works/pi-coding-agent@latest')) fail('Expected latest Pi global install', 93);
    const prefix = args[args.indexOf('--prefix') + 1];
    if (prefix !== path.join(process.env.HOME, '.local')) fail('Global install escaped fixture prefix', 94);
    if (!args.includes('--ignore-scripts')) fail('Global install must ignore scripts', 95);
    const destination = path.join(prefix, 'bin');
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(process.argv[1], path.join(destination, 'pi'));
    fs.chmodSync(path.join(destination, 'pi'), 0o755);
    const srcModules = path.join(path.dirname(process.argv[1]), 'node_modules');
    if (fs.existsSync(srcModules)) fs.cpSync(srcModules, path.join(destination, 'node_modules'), { recursive: true });
    process.exit(0);
  }
  fail('Unexpected npm arguments: ' + args.join(' '), 91);
} else if (command === 'pi') {
  if (args.join(' ') === '--version') { console.log('0.99.0'); process.exit(0); }
  if (args[0] === 'update') {
    if (!args.includes('--no-approve')) fail('pi update must use --no-approve', 96);
    const agentDir = process.env.PI_CODING_AGENT_DIR || '';
    if (agentDir && (process.cwd() === agentDir || process.cwd().startsWith(agentDir + sep))) {
      fail('pi update must run in a neutral directory, got ' + process.cwd(), 97);
    }
    if (process.env.PI_OFFLINE) fail('pi update skips version lookup when PI_OFFLINE is nonempty', 98);
    if (process.env.npm_config_ignore_scripts !== 'true') fail('pi update requires npm_config_ignore_scripts=true', 100);
    if (process.env.npm_config_min_release_age !== '0') fail('pi update requires npm_config_min_release_age=0', 101);
    if (args.includes('--extensions')) {
      const npmDir = path.join(agentDir, 'npm');
      if (process.env.FIXTURE_EXTENSIONS_FAIL === '1') {
        fs.mkdirSync(path.join(npmDir, 'node_modules'), { recursive: true });
        fs.writeFileSync(path.join(npmDir, 'node_modules', 'partial-marker'), 'partial\\n');
        console.error('fixture extensions update failure');
        process.exit(42);
      }
      const settings = JSON.parse(fs.readFileSync(path.join(agentDir, 'settings.json'), 'utf8'));
      const packages = Array.isArray(settings.packages) ? settings.packages : [];
      const deps = {};
      fs.mkdirSync(path.join(npmDir, 'node_modules'), { recursive: true });
      for (const entry of packages) {
        const src = typeof entry === 'string' ? entry : entry && entry.source;
        if (typeof src !== 'string') continue;
        if (src.startsWith('npm:')) {
          const rest = src.slice(4);
          const at = rest.lastIndexOf('@');
          let name;
          let version;
          if (at > 0) { name = rest.slice(0, at); version = rest.slice(at + 1); }
          else { name = rest; version = '9.9.9'; }
          if (!name) continue;
          deps[name] = version;
          if (name === '@ff-labs/pi-fff' || name === '@ff-labs/fff-node') {
            const fffDir = path.join(npmDir, 'node_modules/@ff-labs/fff-node/dist');
            fs.mkdirSync(fffDir, { recursive: true });
            fs.writeFileSync(path.join(npmDir, 'node_modules/@ff-labs/fff-node/package.json'), JSON.stringify({ name: '@ff-labs/fff-node', version: '9.9.9' }));
            fs.writeFileSync(path.join(fffDir, 'index.js'), 'export const marker = 1;\\n');
            for (const pkg of ['@ff-labs/fff-bin-linux-x64-gnu', '@ff-labs/fff-bin-linux-x64-musl', '@ff-labs/fff-bin-linux-arm64-gnu', '@ff-labs/fff-bin-linux-arm64-musl', '@ff-labs/fff-bin-darwin-x64', '@ff-labs/fff-bin-darwin-arm64']) {
              const d = path.join(npmDir, 'node_modules', pkg);
              fs.mkdirSync(d, { recursive: true });
              fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: pkg, version: '9.9.9' }));
            }
            const piFffDir = path.join(npmDir, 'node_modules/@ff-labs/pi-fff');
            fs.mkdirSync(piFffDir, { recursive: true });
            fs.writeFileSync(path.join(piFffDir, 'package.json'), JSON.stringify({ name: '@ff-labs/pi-fff', version }));
          } else {
            const d = path.join(npmDir, 'node_modules', name);
            fs.mkdirSync(d, { recursive: true });
            fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name, version }));
          }
        }
      }
      fs.writeFileSync(path.join(npmDir, 'package.json'), JSON.stringify({ name: 'pi-extensions', private: true, dependencies: deps }, null, 2) + '\\n');
      fs.writeFileSync(path.join(npmDir, 'package-lock.json'), JSON.stringify({ name: 'pi-extensions', version: '1.0.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'pi-extensions', version: '1.0.0', dependencies: deps } } }, null, 2) + '\\n');
      console.log('fixture extensions updated');
      process.exit(0);
    }
    if (process.env.FIXTURE_PI_UPDATE_FAIL === '1') { console.error('fixture pi self update failure'); process.exit(44); }
    console.log('fixture pi self update');
    process.exit(0);
  }
  if (args.join(' ') === '--offline --no-session --help') {
    if (process.env.FIXTURE_PI_FAIL === '1') { console.error('fixture pi startup failure'); process.exit(43); }
    console.log('fixture pi help');
    process.exit(0);
  }
  fail('Unexpected pi arguments: ' + args.join(' '), 92);
} else {
  fail('Unknown command ' + command, 90);
}
`;
  for (const command of ["npm", "pi"]) {
    await put(bin, command, stub);
    await chmod(join(bin, command), 0o755);
  }
  return {
    root, home, bin, seed, work, settings, git,
    run(extraEnv = {}, extraArgs = []) {
      const result = spawnSync(process.execPath, [join(work, "scripts/sync.mjs"), ...extraArgs], {
        cwd: work, env: { ...env, ...extraEnv }, encoding: "utf8", timeout: 30_000,
      });
      assert.ifError(result.error);
      assert.notEqual(result.status, null, `Process terminated by ${result.signal}`);
      return { ...result, output: result.stdout + result.stderr };
    },
    async calls() {
      const text = await readFile(env.FIXTURE_CALLS, "utf8");
      return text.trim().split("\n").filter(Boolean).map(JSON.parse);
    },
    publish() {
      git(seed, "add", ".");
      git(seed, "commit", "-m", "Update fixture");
      git(seed, "push", "origin", "main");
    },
  };
}

async function filesBelow(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? filesBelow(child) : [child];
  }));
  return nested.flat();
}

test("sync replaces tracked changes, preserves private files, backs up, and is repeatable", async (t) => {
  const f = await fixture(t);
  const dirty = json({ packages: ["npm:fixture-extension@1.0.0"], localOnly: "keep in backup" });
  await put(f.work, "settings.json", dirty);
  await rm(join(f.work, "tracked.txt"));
  const preserved = ["auth.json", "sessions/nested/session.jsonl", "docs/local.md", "untracked.bin"];
  const bytes = Buffer.from([0, 255, 10, 13, 65, 128]);
  for (const path of preserved) await put(f.work, path, bytes);
  await put(f.work, "npm/node_modules/orphan-package/package.json", json({ name: "orphan-package", version: "0.0.1" }));
  await put(f.work, "npm/package.json", json({ name: "pi-extensions", private: true, dependencies: { "orphan-package": "0.0.1" } }));
  await put(f.seed, "tracked.txt", "new upstream contents\n");
  f.publish();

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = f.run({ PI_OFFLINE: "0" });
    assert.equal(result.status, 0, result.output);
    assert.equal(await readFile(join(f.work, "settings.json"), "utf8"), f.settings);
    assert.equal(await readFile(join(f.work, "tracked.txt"), "utf8"), "new upstream contents\n");
    for (const path of preserved) assert.deepEqual(await readFile(join(f.work, path)), bytes, path);
    assert.match(result.output, /latest Pi, packages/);
  }
  assert.equal(existsSync(join(f.work, "npm/node_modules/orphan-package/package.json")), false, "Clean install must remove orphan packages");
  assert.equal(existsSync(join(f.work, ".pi-version")), false);
  const installed = JSON.parse(await readFile(join(f.work, "npm/node_modules/fixture-extension/package.json"), "utf8"));
  assert.equal(installed.version, "1.0.0");
  assert.equal(await readFile(join(f.work, "npm/.gitignore"), "utf8"), "*\n!.gitignore\n");
  assert.ok(existsSync(join(f.work, "npm/package.json")), "Native update generates runtime manifests");
  const backups = await filesBelow(join(f.home, ".pi/backups"));
  const contents = await Promise.all(backups.map((path) => readFile(path)));
  assert.ok(contents.some((content) => content.equals(Buffer.from(dirty))), "Backup must contain the original dirty settings");
  const calls = await f.calls();
  const selfUpdates = calls.filter((call) => call.command === "pi" && call.args.includes("update") && !call.args.includes("--extensions"));
  const extensionUpdates = calls.filter((call) => call.command === "pi" && call.args.includes("--extensions"));
  assert.ok(selfUpdates.length >= 1, "Sync must update Pi itself");
  assert.ok(extensionUpdates.length >= 1, "Sync must update packages natively");
  for (const call of [...selfUpdates, ...extensionUpdates]) {
    assert.ok(call.args.includes("--no-approve"), "Native update must ignore project config");
    assert.notEqual(call.cwd, f.work, "Native update must run in a neutral directory");
    assert.ok(!call.cwd.startsWith(`${f.work}${sep}`), "Native update must not run inside the checkout");
    assert.equal(await realpath(call.env.PI_CODING_AGENT_DIR), await realpath(f.work));
    assert.equal(call.env.PI_OFFLINE, undefined);
    assert.equal(call.env.npm_config_ignore_scripts, "true");
    assert.equal(call.env.npm_config_min_release_age, "0");
  }
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
  assert.ok(!calls.some((call) => call.command === "npm" && call.args[0] === "ci"), "Native update must not use staged npm ci");
});

test("sync refuses an untracked file that upstream newly tracks", async (t) => {
  const f = await fixture(t);
  const local = Buffer.from("private untracked contents\n");
  await put(f.work, "new-config.json", local);
  await put(f.seed, "new-config.json", "upstream contents\n");
  f.publish();
  const before = f.git(f.work, "rev-parse", "HEAD");
  const result = f.run();
  assert.notEqual(result.status, 0, result.output);
  assert.deepEqual(await readFile(join(f.work, "new-config.json")), local);
  assert.equal(f.git(f.work, "rev-parse", "HEAD"), before);
});

test("native package update failure restores previous packages and preserves npm gitignore", async (t) => {
  const f = await fixture(t);
  await put(f.work, "npm/node_modules/old-install-marker", "old installation\n");
  await put(f.work, "npm/node_modules/orphan-package/package.json", json({ name: "orphan-package", version: "0.0.1" }));
  const gitignore = "*\n!.gitignore\n# parent edit\n";
  await put(f.seed, "npm/.gitignore", gitignore);
  f.publish();
  const result = f.run({ FIXTURE_EXTENSIONS_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture extensions update failure/);
  assert.equal(await readFile(join(f.work, "npm/node_modules/old-install-marker"), "utf8"), "old installation\n");
  assert.equal(await readFile(join(f.work, "npm/node_modules/orphan-package/package.json"), "utf8"), json({ name: "orphan-package", version: "0.0.1" }));
  assert.equal(await readFile(join(f.work, "npm/.gitignore"), "utf8"), gitignore);
  assert.equal(existsSync(join(f.work, "npm/node_modules/partial-marker")), false, "Partial update must be removed");
  assert.doesNotMatch(result.output, /latest Pi, packages.*verified/);
  const calls = await f.calls();
  assert.ok(calls.some((call) => call.command === "pi" && call.args.includes("--extensions")));
});

test("first sync installs latest Pi when no executable exists", async (t) => {
  const f = await fixture(t);
  await rm(join(f.bin, "pi"));
  await symlink("/usr/bin/git", join(f.bin, "git"));
  await symlink(process.execPath, join(f.bin, "node"));
  const localBin = join(f.home, ".local/bin");
  const result = f.run({ PATH: `${localBin}:${f.bin}` });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Installing latest Pi/);
  const calls = await f.calls();
  const install = calls.find((call) => call.command === "npm" && call.args[0] === "install");
  assert.ok(install, "Missing Pi must trigger installation");
  assert.ok(install.args.includes("--global"));
  assert.ok(install.args.includes("@earendil-works/pi-coding-agent@latest"));
  assert.ok(install.args.includes("--ignore-scripts"));
  assert.ok(!install.args.some((arg) => arg.match(/@0\.\d+\.\d+/)), "Bootstrap must use latest, not a pinned version");
  assert.ok(calls.some((call) => call.command === "pi" && call.args.includes("--extensions") && call.args.includes("--no-approve")));
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
  assert.ok((await readFile(join(localBin, "pi"), "utf8")).startsWith("#!"));
});

test("SDK extension loading failure restores previous packages", async (t) => {
  const f = await fixture(t);
  const marker = Buffer.from("previous installation\0private bytes");
  await put(f.work, "npm/node_modules/old-install-marker", marker);
  await put(f.work, "npm/node_modules/orphan-package/package.json", json({ name: "orphan-package", version: "0.0.1" }));
  const result = f.run({ FIXTURE_SDK_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture SDK loader failure/);
  assert.deepEqual(await readFile(join(f.work, "npm/node_modules/old-install-marker")), marker);
  assert.equal(await readFile(join(f.work, "npm/node_modules/orphan-package/package.json"), "utf8"), json({ name: "orphan-package", version: "0.0.1" }));
  assert.equal(existsSync(join(f.work, "npm/node_modules/fixture-extension/package.json")), false, "Partial update must be removed");
  assert.equal(await readFile(join(f.work, "npm/.gitignore"), "utf8"), "*\n!.gitignore\n");
  assert.ok((await f.calls()).some((call) => call.command === "pi" && call.args.includes("--extensions")));
  assert.doesNotMatch(result.output, /latest Pi, packages.*verified/);
});

test("missing configured local package fails before package updates", async (t) => {
  const f = await fixture(t);
  const settings = JSON.parse(await readFile(join(f.seed, "settings.json"), "utf8"));
  settings.packages = ["./missing-local-package", "npm:fixture-extension@1.0.0"];
  await put(f.seed, "settings.json", json(settings));
  f.publish();
  const result = f.run();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /settings\.json/);
  assert.match(result.output, /missing-local-package/);
  const calls = await f.calls();
  assert.ok(!calls.some((call) => call.command === "pi" && call.args.includes("--extensions")), "Local check must run before mutation");
});

test("pi offline startup failure propagates and restores previous packages", async (t) => {
  const f = await fixture(t);
  await put(f.work, "npm/node_modules/old-install-marker", "old installation\n");
  const result = f.run({ FIXTURE_PI_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture pi startup failure/);
  assert.equal(await readFile(join(f.work, "npm/node_modules/old-install-marker"), "utf8"), "old installation\n");
  assert.equal(existsSync(join(f.work, "npm/node_modules/fixture-extension/package.json")), false);
  const calls = await f.calls();
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
});

test("verifies FFF native package when configured", async (t) => {
  const f = await fixture(t);
  const settings = {
    packages: [{ source: "npm:@ff-labs/pi-fff@0.11.0" }],
    enabledModels: ["fixture/*"],
  };
  await put(f.seed, "settings.json", json(settings));
  settings.packages.push("./local-permission");
  await put(f.seed, "settings.json", json(settings));
  await mkdir(join(f.seed, "local-permission"), { recursive: true });
  await put(f.seed, "local-permission/keep.txt", "keep\n");
  f.publish();
  const result = f.run();
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Verifying FFF native package/);
  assert.ok(existsSync(join(f.work, "npm/node_modules/@ff-labs/fff-node/dist/index.js")));
});

async function baseLayout(t, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "pi-base-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = join(root, "home");
  await mkdir(home, { recursive: true });
  await mkdir(join(root, "scripts"), { recursive: true });
  await mkdir(join(root, "profiles"), { recursive: true });
  await copyFile(join(source, "scripts/sync.mjs"), join(root, "scripts/sync.mjs"));
  const base = {
    theme: "dark",
    packages: "@profile",
    ...(overrides.base ?? {}),
  };
  const profiles = {
    workstation: { packages: ["npm:alpha", "npm:@gotgenes/pi-permission-system"] },
    server: { packages: ["npm:alpha"] },
    minimal: { packages: ["npm:alpha"] },
    ...(overrides.profiles ?? {}),
  };
  await writeFile(join(root, "settings.base.json"), json(base));
  for (const [name, profile] of Object.entries(profiles)) {
    await writeFile(join(root, "profiles", `${name}.json`), json(profile));
  }
  await writeFile(join(root, "versions.lock"), json({
    lockVersion: 1,
    updated: "2026-10-04",
    packages: { alpha: "1.2.3", "@gotgenes/pi-permission-system": "9.9.9" },
    ...(overrides.lock ?? {}),
  }));
  await writeFile(join(root, "mcp.base.json"), json({
    mcpServers: {
      probe: { url: "https://example.invalid/mcp", headers: { From: "__AGENT_DIR__" } },
    },
  }));
  const env = { ...process.env, HOME: home };
  function runSync(...args) {
    const result = spawnSync(process.execPath, [join(root, "scripts/sync.mjs"), ...args], {
      cwd: root, env, encoding: "utf8", timeout: 30_000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, null, `Process terminated by ${result.signal}`);
    return { ...result, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  }
  return { root, home, runSync };
}

test("profiles select package sets and pin versions from the lock", async (t) => {
  const f = await baseLayout(t);
  const server = f.runSync("--install", "--dry-run", "--profile=server");
  assert.equal(server.status, 0, server.output);
  assert.match(server.output, /npm:alpha@1\.2\.3/);
  assert.doesNotMatch(server.output, /permission-system/);
  const workstation = f.runSync("--install", "--dry-run", "--profile=workstation");
  assert.equal(workstation.status, 0, workstation.output);
  assert.match(workstation.output, /npm:alpha@1\.2\.3/);
  assert.match(workstation.output, /npm:@gotgenes\/pi-permission-system@9\.9\.9/);
  const latest = f.runSync("--install", "--dry-run", "--profile=minimal", "--latest");
  assert.equal(latest.status, 0, latest.output);
  assert.match(latest.output, /npm:alpha\n/);
  assert.doesNotMatch(latest.output, /npm:alpha@/);
});

test("local overrides merge into generated files and stay out of the shared base", async (t) => {
  const f = await baseLayout(t);
  const baseBefore = await readFile(join(f.root, "settings.base.json"), "utf8");
  await mkdir(join(f.root, "local-perm"), { recursive: true });
  await writeFile(join(f.root, "settings.local.json"), json({
    modelThinkingLevels: { "openai/gpt-6.1-sol": "low" },
    permissionsSrc: "./local-perm",
  }));
  const result = f.runSync("--install", "--generate", "--profile=workstation");
  assert.equal(result.status, 0, result.output);
  const settings = JSON.parse(await readFile(join(f.root, "settings.json"), "utf8"));
  assert.equal(settings.modelThinkingLevels["openai/gpt-6.1-sol"], "low");
  assert.ok(settings.packages.includes("./local-perm"));
  assert.ok(!settings.packages.some((entry) => entry.includes("permission-system")));
  assert.equal(settings.permissionsSrc, undefined);
  assert.equal(await readFile(join(f.root, "settings.base.json"), "utf8"), baseBefore);
  const mcp = JSON.parse(await readFile(join(f.root, "mcp.json"), "utf8"));
  assert.equal(mcp.mcpServers.probe.headers.From, f.root);
});

test("missing local permissions source fails with the path, absence falls back to the published package", async (t) => {
  const f = await baseLayout(t);
  const missing = f.runSync("--install", "--generate", "--local-permissions=./nope");
  assert.notEqual(missing.status, 0);
  assert.match(missing.output, /nope/);
  const fallback = f.runSync("--install", "--generate", "--profile=workstation");
  assert.equal(fallback.status, 0, fallback.output);
  const settings = JSON.parse(await readFile(join(f.root, "settings.json"), "utf8"));
  assert.ok(settings.packages.includes("npm:@gotgenes/pi-permission-system@9.9.9"));
});
