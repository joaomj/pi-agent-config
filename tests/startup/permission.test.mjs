import assert from "node:assert/strict";
import { cp, mkdtemp, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fixture, lazyPackage, originalPackage, text } from "./session-fixture.mjs";

const variants = [["unchanged", originalPackage], ["lazy", lazyPackage]];

// The readiness probe never runs these actions. Use the real gate and nested-tool transport;
// an offline provider supplies intentions, not permission decisions or tool results.
test("first-turn permissions protect direct, shell, nested, and registered custom reads", async () => {
  for (const [name, packageDir] of variants) {
    const f = await fixture(packageDir);
    try {
      const actions = [
        { name: "read", arguments: { path: join(f.cwd, ".env") } },
        { name: "bash", arguments: { command: "cat .env" } },
        { name: "nested_read", arguments: { target: join(f.cwd, ".env") } },
        { name: "permission_probe", arguments: { target: join(f.cwd, ".env") } },
        { name: "read", arguments: { path: join(f.cwd, "open.txt") } },
        { name: "bash", arguments: { command: "cat open.txt" } },
        { name: "nested_read", arguments: { target: join(f.cwd, "open.txt") } },
        { name: "permission_probe", arguments: { target: join(f.cwd, "open.txt") } },
      ];
      const results = await f.prompt(actions);
      assert.equal(results.length, actions.length, `${name}: every requested tool must return`);
      for (const result of results.slice(0, 4)) {
        assert.equal(result.isError, true, `${name}: ${result.toolName} must deny the protected file`);
        assert.match(text(result), /denied/i, `${name}: denial must come from permissions, not tool validation`);
        assert.ok(!text(result).includes(f.protectedContent));
      }
      for (const result of results.slice(4)) {
        assert.equal(result.isError, false, `${name}: ${result.toolName} must allow its control`);
        assert.ok(text(result).includes(f.control), `${name}: the real tool must read the control file`);
      }
      const nested = f.state.results.filter((result) => result.parentToolCallId);
      assert.equal(nested.length, 2, `${name}: nested reads must reach Pi's nested dispatch`);
      assert.equal(nested[0].isError, true);
      assert.equal(nested[1].isError, false);
      assert.equal(f.state.services[0].state, "deny", `${name}: synchronous startup service sees the policy`);
      assert.deepEqual(f.state.diagnostics, []);
    } finally { await f.close(); }
  }
});

test("skill checks and refreshed protection survive reload and session replacement", async () => {
  for (const [name, packageDir] of variants) {
    const f = await fixture(packageDir);
    try {
      const before = f.state.requests;
      await f.prompt([], "/skill:blocked");
      assert.equal(f.state.requests, before, `${name}: denied skill must not reach the provider`);
      await f.prompt([], "/skill:allowed");
      assert.equal(f.state.requests, before + 1, `${name}: allowed skill must reach the provider`);
      await f.writeConfig(f.globalConfig, { ...f.config, permission: {
        ...f.config.permission, path: { ...f.config.permission.path, "**/open.txt": "deny" },
      } });
      await f.writeConfig(f.projectConfig, { permission: { path: { "**/project.txt": "deny" } } });
      await f.session.reload();
      for (const phase of ["reload", "new session"]) {
        if (phase === "new session") await f.replaceSession();
        const results = await f.prompt([
          { name: "read", arguments: { path: join(f.cwd, "open.txt") } },
          { name: "permission_probe", arguments: { target: join(f.cwd, "project.txt") } },
          { name: "bash", arguments: { command: "printf lifecycle-control" } },
        ]);
        assert.equal(results.length, 3);
        for (const result of results.slice(0, 2)) {
          assert.equal(result.isError, true, `${name}: ${phase} must refresh global/project policy`);
          assert.match(text(result), /denied/i);
        }
        assert.equal(results[2].isError, false);
        assert.match(text(results[2]), /lifecycle-control/);
        const count = f.state.requests;
        await f.prompt([], "/skill:blocked");
        assert.equal(f.state.requests, count);
      }
      assert.ok(new Set(f.state.services.map((value) => value.sessionId)).size >= 2,
        `${name}: the replacement must actually create a different session`);
      assert.deepEqual(f.state.diagnostics, []);
    } finally { await f.close(); }
  }
});

test("missing deferred gate blocks first and later actions with a visible initialization error", async () => {
  const isolated = await mkdtemp(join(tmpdir(), "pi-broken-lazy-permission-"));
  const packageDir = join(isolated, "package");
  let f;
  try {
    await cp(lazyPackage, packageDir, { recursive: true, verbatimSymlinks: true });
    f = await fixture(packageDir);
    const dependency = join(packageDir, "src/handlers/gates/tool-call-gate-pipeline.ts");
    await rename(dependency, `${dependency}.unavailable`);
    for (const phase of ["first", "later"]) {
      const results = await f.prompt([
        { name: "read", arguments: { path: join(f.cwd, ".env") } },
        { name: "read", arguments: { path: join(f.cwd, "open.txt") } },
      ]);
      assert.equal(results.length, 2);
      for (const result of results) {
        assert.equal(result.isError, true, `${phase}: an incomplete engine must never execute the tool`);
        assert.match(text(result), /Permission gate initialization failed/);
        assert.ok(!text(result).includes(f.protectedContent));
        assert.ok(!text(result).includes(f.control));
      }
    }
    const count = f.state.requests;
    await f.prompt([], "/skill:allowed");
    assert.equal(f.state.requests, count, "Skill initialization failure must not enter the agent run");
    assert.ok(f.state.notifications.some((error) => String(error.message).includes("Permission gate initialization failed")),
      "The failed skill must report the initialization error");
  } finally {
    try { if (f) await f.close(); }
    finally { await rm(isolated, { recursive: true, force: true }); }
  }
});
