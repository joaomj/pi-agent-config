import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, chmod, rm, readdir, symlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
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
  const callsPath = join(root, "calls.jsonl");
  const env = {
    ...process.env,
    HOME: home,
    PI_PROFILE: "workstation",
    PI_PERMISSIONS_SRC: "",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_TERMINAL_PROMPT: "0",
    PATH: `${bin}:${process.env.PATH}`,
    FIXTURE_CALLS: callsPath,
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
  await copyFile(join(source, "scripts/package-report.mjs"), join(seed, "scripts/package-report.mjs"));
  await put(seed, "settings.base.json", json({ theme: "dark", packages: "@profile" }));
  await put(seed, "mcp.base.json", json({ mcpServers: { probe: { url: "https://example.invalid", cwd: "__AGENT_DIR__" } } }));
  for (const profile of ["workstation", "server", "minimal"]) {
    await put(seed, `profiles/${profile}.json`, json({ packages: profile === "workstation" ? ["npm:alpha", "npm:@gotgenes/pi-permission-system"] : profile === "server" ? ["npm:alpha"] : ["npm:beta"] }));
  }
  await put(seed, "versions.lock", json({ packages: { alpha: "1.0.0" } }));
  await put(seed, "settings.json", json({ packages: ["npm:alpha@1.0.0"] }));
  await put(seed, "mcp.json", json({ mcpServers: {} }));
  await put(seed, ".gitignore", "auth.json\nsessions/\ndocs/\nuntracked.bin\nsettings.local.json\nmcp.local.json\nnpm/\n");
  await put(seed, "tracked.txt", "upstream tracked contents\n");
  git(seed, "add", "settings.base.json", "mcp.base.json", "profiles", "settings.json", "mcp.json", "scripts/sync.mjs", "scripts/package-report.mjs", ".gitignore", "tracked.txt", "versions.lock");
  git(seed, "commit", "-m", "Initial fixture");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-u", "origin", "main");
  git(root, "clone", "--branch", "main", origin, work);
  await writeFile(callsPath, "");
  const stub = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const command = path.basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FIXTURE_CALLS, JSON.stringify({ command, args }) + '\\n');
if (command === 'npm' && args[0] === '--version') {
  console.log('11.19.0');
} else if (command === 'npm' && args[0] === 'install' && args.includes('--global')) {
  const prefix = args[args.indexOf('--prefix') + 1];
  fs.mkdirSync(path.join(prefix, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(prefix, 'bin/pi'), '#!/bin/sh\\nexit 0\\n', { mode: 0o755 });
} else {
  console.error('Unexpected package-manager or Pi invocation: ' + command + ' ' + args.join(' '));
  process.exit(91);
}
`;
  for (const command of ["npm", "pi"]) {
    await put(bin, command, stub);
    await chmod(join(bin, command), 0o755);
  }
  return {
    root, home, bin, seed, work, git,
    run(args = [], extraEnv = {}) {
      const result = spawnSync(process.execPath, [join(work, "scripts/sync.mjs"), ...args], {
        cwd: work, env: { ...env, ...extraEnv }, encoding: "utf8", timeout: 20_000,
      });
      assert.ifError(result.error);
      assert.notEqual(result.status, null, `Process terminated by ${result.signal}`);
      return { ...result, output: result.stdout + result.stderr };
    },
    async calls() {
      return (await readFile(callsPath, "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse);
    },
    publish(...paths) {
      git(seed, "add", ...paths);
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

async function settings(f) {
  return JSON.parse(await readFile(join(f.work, "settings.json"), "utf8"));
}

async function report(f) {
  const directory = join(f.home, ".pi/reports");
  const files = await readdir(directory);
  assert.equal(files.length, 1);
  const path = join(directory, files[0]);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  return readFile(path, "utf8");
}

test("sync replaces configuration, preserves private files and installed packages, and reports differences", async (t) => {
  const f = await fixture(t);
  const dirty = json({ packages: ["npm:alpha@1.0.0", "npm:removed", { source: "npm:filtered", extensions: [] }], localOnly: "keep in backup" });
  await put(f.work, "settings.json", dirty);
  await rm(join(f.work, "tracked.txt"));
  const preserved = ["auth.json", "sessions/nested/session.jsonl", "docs/local.md", "untracked.bin", "npm/node_modules/removed/private-marker"];
  const bytes = Buffer.from([0, 255, 10, 13, 65, 128]);
  for (const path of preserved) await put(f.work, path, bytes);
  const manifest = json({ dependencies: { alpha: "1.0.0", removed: "2.0.0", orphan: "3.0.0" } });
  await put(f.work, "npm/package.json", manifest);
  await put(f.work, "npm/package-lock.json", "untouched lockfile\n");
  for (const [name, version] of [["alpha", "1.0.0"], ["removed", "2.0.0"], ["orphan", "3.0.0"]]) {
    await put(f.work, `npm/node_modules/${name}/package.json`, json({ name, version }));
  }
  await put(f.seed, "tracked.txt", "new upstream contents\n");
  await put(f.seed, "profiles/workstation.json", json({ packages: ["npm:alpha", "npm:added", { source: "npm:filtered", extensions: ["extensions/tool.ts"] }] }));
  f.publish("tracked.txt", "profiles/workstation.json");
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = f.run([], { PI_OFFLINE: "1" });
    assert.equal(result.status, 0, result.output);
    assert.deepEqual((await settings(f)).packages, ["npm:alpha", "npm:added", { source: "npm:filtered", extensions: ["extensions/tool.ts"] }]);
    assert.equal(await readFile(join(f.work, "tracked.txt"), "utf8"), "new upstream contents\n");
    for (const path of preserved) assert.deepEqual(await readFile(join(f.work, path)), bytes, path);
    assert.equal(await readFile(join(f.work, "npm/package.json"), "utf8"), manifest);
    assert.equal(await readFile(join(f.work, "npm/package-lock.json"), "utf8"), "untouched lockfile\n");
    const text = await report(f);
    assert.ok(text.includes(f.git(f.work, "rev-parse", "HEAD").trim()));
    assert.match(text, /npm:orphan @ 3\.0\.0/);
    assert.match(text, /npm:alpha @ 1\.0\.0/);
    if (attempt === 0) {
      assert.match(text, /Declared remotely, not declared locally:\n  \+ "npm:added"/);
      assert.match(text, /Declared locally, not declared remotely[^\n]*\n  - "npm:removed"/);
      assert.match(text, /Local:  "npm:alpha@1\.0\.0"\n    Remote: "npm:alpha"/);
      assert.match(text, /Local:  .*"extensions":\[\]/);
      assert.match(text, /Remote npm packages not found[^\n]*\n  npm:added\n  npm:filtered/);
    }
  }
  const backups = await filesBelow(join(f.home, ".pi/backups"));
  const contents = await Promise.all(backups.map((path) => readFile(path)));
  assert.ok(contents.some((content) => content.equals(Buffer.from(dirty))), "Backup contains original local settings");
  assert.deepEqual(await f.calls(), [], "Sync must never invoke npm or Pi");
});

test("sync collision and dry-run leave configuration and private content unchanged", async (t) => {
  const f = await fixture(t);
  const local = Buffer.from("private untracked contents\n");
  const before = f.git(f.work, "rev-parse", "HEAD");
  const settingsBefore = await readFile(join(f.work, "settings.json"));
  await put(f.work, "new-config.json", local);
  await put(f.seed, "new-config.json", "upstream contents\n");
  f.publish("new-config.json");
  const dry = f.run(["--dry-run"]);
  assert.equal(dry.status, 0, dry.output);
  const collision = f.run();
  assert.notEqual(collision.status, 0, collision.output);
  assert.match(collision.output, /overwrite untracked files/);
  assert.deepEqual(await readFile(join(f.work, "new-config.json")), local);
  assert.deepEqual(await readFile(join(f.work, "settings.json")), settingsBefore);
  assert.equal(f.git(f.work, "rev-parse", "HEAD"), before);
  assert.equal(existsSync(join(f.home, ".pi/reports")), false);
  assert.deepEqual(await f.calls(), []);
});

test("sync works without Pi and reports personal overrides separately from the remote package list", async (t) => {
  const f = await fixture(t);
  await rm(join(f.seed, "versions.lock"));
  f.publish("versions.lock");
  await rm(join(f.bin, "pi"));
  await symlink(process.execPath, join(f.bin, "node"));
  const gitPath = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  await symlink(gitPath, join(f.bin, "git"));
  await put(f.work, "settings.local.json", json({ packages: ["npm:personal"] }));
  const result = f.run([], { PATH: f.bin });
  assert.equal(result.status, 0, result.output);
  assert.deepEqual((await settings(f)).packages, ["npm:personal"]);
  const text = await report(f);
  assert.match(text, /Declared remotely, not declared locally:\n  \+ "npm:@gotgenes\/pi-permission-system"/);
  assert.doesNotMatch(text, /\+ "npm:personal"/);
  assert.deepEqual(await f.calls(), [], "Missing Pi must not cause configuration sync to install software");
});

test("generation ignores version locks and implicit development checkouts, but honors explicit overrides", async (t) => {
  const f = await fixture(t);
  await put(f.work, "versions.lock", "invalid obsolete lockfile\n");
  await mkdir(join(f.home, "projects/pi-packages/packages/pi-permission-system"), { recursive: true });
  for (const [profile, expected] of [["workstation", ["npm:alpha", "npm:@gotgenes/pi-permission-system"]], ["server", ["npm:alpha"]], ["minimal", ["npm:beta"]]]) {
    const result = f.run(["--install", "--generate", `--profile=${profile}`]);
    assert.equal(result.status, 0, result.output);
    assert.deepEqual((await settings(f)).packages, expected);
  }
  const dryBefore = await readFile(join(f.work, "settings.json"));
  const dry = f.run(["--generate", "--dry-run", "--profile=workstation"]);
  assert.equal(dry.status, 0, dry.output);
  assert.deepEqual(await readFile(join(f.work, "settings.json")), dryBefore);
  const baseBefore = await readFile(join(f.work, "settings.base.json"));
  await mkdir(join(f.work, "local-perm"));
  await put(f.work, "settings.local.json", json({ theme: "light", permissionsSrc: "./local-perm" }));
  const result = f.run(["--generate"]);
  assert.equal(result.status, 0, result.output);
  assert.deepEqual((await settings(f)).packages, ["npm:alpha", "./local-perm"]);
  assert.equal((await settings(f)).theme, "light");
  assert.equal((await settings(f)).permissionsSrc, undefined);
  assert.deepEqual(await readFile(join(f.work, "settings.base.json")), baseBefore);
  const mcp = JSON.parse(await readFile(join(f.work, "mcp.json"), "utf8"));
  assert.equal(mcp.mcpServers.probe.cwd, f.work);
  const generatedBefore = await readFile(join(f.work, "settings.json"));
  const missing = f.run(["--generate", "--local-permissions=./missing"]);
  assert.notEqual(missing.status, 0, missing.output);
  assert.match(missing.output, /missing/);
  assert.deepEqual(await readFile(join(f.work, "settings.json")), generatedBefore);
  assert.deepEqual(await f.calls(), []);
});

test("installer leaves existing software unchanged and only bootstraps missing Pi", async (t) => {
  const f = await fixture(t);
  const existing = f.run(["--install"]);
  assert.equal(existing.status, 0, existing.output);
  assert.deepEqual(await f.calls(), []);
  await rm(join(f.bin, "pi"));
  const localBin = join(f.home, ".local/bin");
  await symlink(process.execPath, join(f.bin, "node"));
  const installed = f.run(["--install"], { PATH: `${localBin}:${f.bin}` });
  assert.equal(installed.status, 0, installed.output);
  assert.ok(existsSync(join(localBin, "pi")));
  const calls = await f.calls();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "npm");
  assert.ok(calls[0].args.includes("@earendil-works/pi-coding-agent@latest"));
  assert.ok(calls[0].args.includes("--ignore-scripts"));
  assert.equal(calls[0].args[calls[0].args.indexOf("--prefix") + 1], join(f.home, ".local"));
});
