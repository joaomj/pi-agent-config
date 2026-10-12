import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixture, originalPackage, text } from "./session-fixture.mjs";

const original = process.env.PI_STARTUP_FFF_PACKAGE;
const lazy = process.env.PI_STARTUP_LAZY_FFF_PACKAGE;
if (!original || !lazy) throw new Error("Set PI_STARTUP_FFF_PACKAGE and PI_STARTUP_LAZY_FFF_PACKAGE to the reviewed packages.");
const variants = [["unchanged", original], ["lazy", lazy]];
const query = { name: "fffind", arguments: { pattern: "opentxt" } };
const fallback = {
  async getSuggestions() { return null; },
  applyCompletion() { throw new Error("This scenario does not apply an editor completion"); },
};
function autocomplete(f) {
  assert.ok(f.state.autocomplete.length, "FFF must register its editor provider before first use");
  return f.state.autocomplete.at(-1)(fallback);
}
function suggestions(provider, value = "@op") {
  return provider.getSuggestions([value], 0, value.length, { signal: new AbortController().signal });
}
function findSucceeded(result, message) {
  assert.equal(result.isError, false, message);
  assert.match(text(result), /open\.txt/, message);
}

async function search() {
  for (const [name, packageDir] of variants) {
    const f = await fixture(originalPackage, { fffPackage: packageDir,
      async setup({ root }) {
        await mkdir(join(root, "aux"));
        await writeFile(join(root, "aux", "remote.txt"), "auxiliary-control");
      },
    });
    try {
      const results = await f.prompt([
        query,
        { name: "ffgrep", arguments: { pattern: f.control } },
        { name: "ffgrep", arguments: { pattern: "auxiliary-control", path: "../aux" } },
      ]);
      assert.equal(results.length, 3, `${name}: all concurrent searches must complete`);
      findSucceeded(results[0], `${name}: first fuzzy file search must use FFF`);
      assert.equal(results[1].isError, false);
      assert.match(text(results[1]), /open\.txt/);
      assert.ok(text(results[1]).includes(f.control));
      assert.equal(results[2].isError, false);
      assert.match(text(results[2]), /remote\.txt/);
      assert.match(text(results[2]), /auxiliary-control/);
      const repeated = await f.prompt([query]);
      findSucceeded(repeated[0], `${name}: repeated search must keep working`);
      assert.deepEqual(f.state.diagnostics, []);
      assert.ok(!f.state.notifications.some((entry) => entry.type === "error"));
    } finally { await f.close(); }
  }
}

async function lifecycle() {
  for (const [name, packageDir] of variants) {
    const f = await fixture(originalPackage, { fffPackage: packageDir, fffConfig: { mode: "tools-and-ui" } });
    try {
      const result = await suggestions(autocomplete(f));
      assert.ok(result?.items.some((item) => item.value === "@open.txt"), `${name}: first autocomplete must return an indexed file`);
      await f.prompt([], "/fff-health");
      assert.ok(f.state.notifications.some((entry) => /FFF v/.test(entry.message)), `${name}: health must reach the native engine`);
      await f.prompt([], "/fff-rescan");
      assert.ok(f.state.notifications.some((entry) => /FFF rescan triggered/.test(entry.message)));
      await f.prompt([], "/fff-mode override");
      await f.session.reload();
      const results = await f.prompt([{ name: "find", arguments: { pattern: "opentxt" } }]);
      findSucceeded(results[0], `${name}: restored override must perform fuzzy FFF search, not built-in glob search`);
      await f.replaceSession();
      const fresh = await f.prompt([query]);
      findSucceeded(fresh[0], `${name}: fresh session must restore working FFF search`);
      assert.deepEqual(f.state.diagnostics, []);
      assert.ok(!f.state.notifications.some((entry) => entry.type === "error"));
    } finally { await f.close(); }
    const commandsFirst = await fixture(originalPackage, { fffPackage: packageDir });
    try {
      await commandsFirst.prompt([], "/fff-health");
      assert.ok(commandsFirst.state.notifications.some((entry) => /FFF v/.test(entry.message)), `${name}: health before search must initialize`);
      findSucceeded((await commandsFirst.prompt([query]))[0], `${name}: search after command initialization must work`);
    } finally { await commandsFirst.close(); }
  }
  const interrupted = await fixture(originalPackage, { fffPackage: lazy, fffConfig: { mode: "tools-and-ui" } });
  try {
    const pending = suggestions(autocomplete(interrupted));
    await interrupted.session.extensionRunner.emit({ type: "session_shutdown" });
    assert.equal(await pending, null, "A finder created after shutdown must not deliver stale autocomplete results");
    await interrupted.replaceSession();
    findSucceeded((await interrupted.prompt([query]))[0], "A fresh finder must reopen the same private databases after interrupted initialization");
  } finally { await interrupted.close(); }
}

async function failure() {
  const root = await mkdtemp(join(tmpdir(), "pi-broken-fff-"));
  let f;
  try {
    const packageDir = join(root, "package");
    await cp(lazy, packageDir, { recursive: true, verbatimSymlinks: true });
    const sdkPath = join(packageDir, "src/sdk.ts");
    const source = await readFile(sdkPath, "utf8");
    assert.ok(source.includes('import("@ff-labs/fff-node")') && source.includes('import("@ff-labs/fff-bun")'));
    await writeFile(sdkPath, source.replace('import("@ff-labs/fff-node")', 'import("./missing-native-node")')
      .replace('import("@ff-labs/fff-bun")', 'import("./missing-native-bun")'));
    f = await fixture(originalPackage, { fffPackage: packageDir, fffConfig: { mode: "tools-and-ui" } });
    assert.ok(!f.state.notifications.some((entry) => entry.type === "error"), "A deferred SDK must not load during startup");
    const results = await f.prompt([query, { name: "read", arguments: { path: join(f.cwd, "open.txt") } }]);
    assert.equal(results[0].isError, true);
    assert.match(text(results[0]), /missing-native-bun/);
    assert.equal(results[1].isError, false, "Unrelated real tools must remain usable");
    assert.ok(text(results[1]).includes(f.control));
    await f.prompt([], "/fff-health");
    assert.ok(f.state.notifications.some((entry) => /FFF init failed/.test(entry.message) && /missing-native-bun/.test(entry.message)));
    const provider = autocomplete(f);
    assert.equal(await suggestions(provider), null);
    assert.equal(await suggestions(provider, "@proj"), null);
    assert.equal(f.state.notifications.filter((entry) => /FFF autocomplete failed/.test(entry.message)).length, 1,
      "Autocomplete must report the real loader failure without repeating the same error on every keystroke");
    const later = await f.prompt([query]);
    assert.equal(later[0].isError, true);
    assert.match(text(later[0]), /missing-native-bun/);
  } finally {
    try { if (f) await f.close(); }
    finally { await rm(root, { recursive: true, force: true }); }
  }
}

const scenarios = { search, lifecycle, failure };
const scenario = process.argv[2];
if (!scenarios[scenario]) throw new Error("Select search, lifecycle, or failure");
await scenarios[scenario]();
console.log(`FFF scenario passed: ${scenario}`);
