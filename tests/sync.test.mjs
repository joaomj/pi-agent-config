import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, chmod, rm, readdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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
    FIXTURE_NPM_FAIL: "0",
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
  const manifest = { name: "fixture-packages", version: "1.0.0", private: true, dependencies: { "fixture-extension": "1.0.0" } };
  await put(seed, "settings.json", settings);
  await put(seed, ".pi-version", "0.87.1\n");
  await put(seed, ".gitignore", "auth.json\nsessions/\ndocs/\nnpm/node_modules/\n");
  await put(seed, "tracked.txt", "upstream tracked contents\n");
  await put(seed, "npm/package.json", json(manifest));
  await put(seed, "npm/package-lock.json", json({
    name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true,
    packages: {
      "": { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies },
      "node_modules/fixture-extension": { version: "1.0.0" },
    },
  }));
  git(seed, "add", ".");
  git(seed, "commit", "-m", "Initial fixture");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-u", "origin", "main");
  git(root, "clone", "--branch", "main", origin, work);

  await writeFile(env.FIXTURE_CALLS, "");
  const sdk = "node_modules/@earendil-works/pi-coding-agent";
  await put(bin, `${sdk}/package.json`, json({
    name: "@earendil-works/pi-coding-agent", version: "0.87.1", type: "module", main: "index.js",
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
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FIXTURE_CALLS, JSON.stringify({ command, args, cwd: process.cwd() }) + '\\n');
if (command === 'npm') {
  if (args[0] === '--version') { console.log('11.19.0'); process.exit(0); }
  if (args[0] === 'ls') process.exit(0);
  if (args[0] === 'install' && args.includes('--global')) {
    if (!args.includes('@earendil-works/pi-coding-agent@0.87.1')) {
      console.error('Expected pinned Pi global install'); process.exit(93);
    }
    const prefix = args[args.indexOf('--prefix') + 1];
    if (prefix !== path.join(process.env.HOME, '.local')) {
      console.error('Global install escaped fixture prefix'); process.exit(94);
    }
    const destination = path.join(prefix, 'bin');
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(process.argv[1], path.join(destination, 'pi'));
    fs.chmodSync(path.join(destination, 'pi'), 0o755);
    fs.cpSync(path.join(path.dirname(process.argv[1]), 'node_modules'), path.join(destination, 'node_modules'), { recursive: true });
    process.exit(0);
  }
  if (args[0] !== 'ci') { console.error('Unexpected npm arguments: ' + args.join(' ')); process.exit(91); }
  if (process.env.FIXTURE_NPM_FAIL === '1') { console.error('fixture npm ci failure'); process.exit(42); }
  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    const directory = path.join('node_modules', name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, version }));
  }
} else if (command === 'pi') {
  if (args.join(' ') === '--version') { console.log('0.87.1'); process.exit(0); }
  if (args.join(' ') !== '--offline --no-session --help') { console.error('Unexpected pi arguments: ' + args.join(' ')); process.exit(92); }
  if (process.env.FIXTURE_PI_FAIL === '1') { console.error('fixture pi startup failure'); process.exit(43); }
  console.log('fixture pi help');
}
`;
  for (const command of ["npm", "pi"]) {
    await put(bin, command, stub);
    await chmod(join(bin, command), 0o755);
  }
  return {
    root, home, bin, seed, work, settings, git,
    run(extraEnv = {}) {
      const result = spawnSync(process.execPath, [join(work, "scripts/sync.mjs")], {
        cwd: work, env: { ...env, ...extraEnv }, encoding: "utf8", timeout: 30_000,
      });
      assert.ifError(result.error);
      assert.notEqual(result.status, null, `Process terminated by ${result.signal}`);
      return { ...result, output: result.stdout + result.stderr };
    },
    async calls() {
      return (await readFile(env.FIXTURE_CALLS, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
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
  await put(f.seed, "tracked.txt", "new upstream contents\n");
  f.publish();

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = f.run();
    assert.equal(result.status, 0, result.output);
    assert.equal(await readFile(join(f.work, "settings.json"), "utf8"), f.settings);
    assert.equal(await readFile(join(f.work, "tracked.txt"), "utf8"), "new upstream contents\n");
    for (const path of preserved) assert.deepEqual(await readFile(join(f.work, path)), bytes, path);
  }
  const backups = await filesBelow(join(f.home, ".pi/backups"));
  const contents = await Promise.all(backups.map((path) => readFile(path)));
  assert.ok(contents.some((content) => content.equals(Buffer.from(dirty))), "Backup must contain the original dirty settings");
  const calls = await f.calls();
  const installs = calls.filter((call) => call.command === "npm" && call.args[0] === "ci");
  assert.ok(installs.length >= 1, "Sync must invoke setup");
  for (const call of installs) {
    assert.ok(call.args.includes("--ignore-scripts"));
    assert.ok(call.args.includes("--legacy-peer-deps"));
    assert.notEqual(call.cwd, join(f.work, "npm"), "Install must use a staging directory");
  }
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--version"));
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
  const installed = JSON.parse(await readFile(join(f.work, "npm/node_modules/fixture-extension/package.json"), "utf8"));
  assert.equal(installed.version, "1.0.0");
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

test("npm ci failure preserves active node_modules and reports failure", async (t) => {
  const f = await fixture(t);
  await put(f.work, "npm/node_modules/old-install-marker", "old installation\n");
  const result = f.run({ FIXTURE_NPM_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture npm ci failure/);
  assert.equal(await readFile(join(f.work, "npm/node_modules/old-install-marker"), "utf8"), "old installation\n");
  assert.doesNotMatch(result.output, /(?:sync|setup)\s+(?:complete|successful|succeeded)|successfully\s+(?:synced|installed|configured)/i);
});

test("first sync installs pinned Pi when no executable exists", async (t) => {
  const f = await fixture(t);
  await rm(join(f.bin, "pi"));
  await symlink("/usr/bin/git", join(f.bin, "git"));
  await symlink(process.execPath, join(f.bin, "node"));
  const localBin = join(f.home, ".local/bin");
  const result = f.run({ PATH: `${localBin}:${f.bin}` });
  assert.equal(result.status, 0, result.output);
  const calls = await f.calls();
  const install = calls.find((call) => call.command === "npm" && call.args[0] === "install");
  assert.ok(install, "Missing Pi must trigger installation");
  assert.ok(install.args.includes("--global"));
  assert.ok(install.args.includes("@earendil-works/pi-coding-agent@0.87.1"));
  assert.ok(install.args.includes("--ignore-scripts"));
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--version"));
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
  assert.ok((await readFile(join(localBin, "pi"), "utf8")).startsWith("#!"));
});

test("SDK extension loading failure restores previous node_modules", async (t) => {
  const f = await fixture(t);
  const marker = Buffer.from("previous installation\\0private bytes");
  await put(f.work, "npm/node_modules/old-install-marker", marker);
  const result = f.run({ FIXTURE_SDK_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture SDK loader failure/);
  assert.deepEqual(await readFile(join(f.work, "npm/node_modules/old-install-marker")), marker);
  assert.deepEqual(await readdir(join(f.work, "npm/node_modules")), ["old-install-marker"]);
  assert.ok((await f.calls()).some((call) => call.command === "npm" && call.args[0] === "ci"));
  assert.doesNotMatch(result.output, /(?:sync|setup)\s+complete/i);
});

test("changed package manifest and settings mismatch fails before npm ci", async (t) => {
  const f = await fixture(t);
  const manifest = JSON.parse(await readFile(join(f.seed, "npm/package.json"), "utf8"));
  manifest.dependencies["fixture-extension"] = "2.0.0";
  const lock = JSON.parse(await readFile(join(f.seed, "npm/package-lock.json"), "utf8"));
  lock.packages[""].dependencies["fixture-extension"] = "2.0.0";
  lock.packages["node_modules/fixture-extension"].version = "2.0.0";
  await put(f.seed, "npm/package.json", json(manifest));
  await put(f.seed, "npm/package-lock.json", json(lock));
  f.publish();
  const result = f.run();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /settings\.json/);
  assert.match(result.output, /npm\/package\.json/);
  assert.ok(!(await f.calls()).some((call) => call.command === "npm" && call.args[0] === "ci"));
});

test("pi offline startup failure propagates through sync", async (t) => {
  const f = await fixture(t);
  const result = f.run({ FIXTURE_PI_FAIL: "1" });
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /fixture pi startup failure/);
  const calls = await f.calls();
  assert.ok(calls.some((call) => call.command === "pi" && call.args.join(" ") === "--offline --no-session --help"));
});
