import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

function setting(name) {
  if (!process.env[name]) throw new Error(`Set ${name} to the installed package directory.`);
  return resolve(process.env[name]);
}

export const originalPackage = setting("PI_STARTUP_PERMISSION_PACKAGE");
export const lazyPackage = setting("PI_STARTUP_LAZY_PERMISSION_PACKAGE");
const piPackage = setting("PI_STARTUP_PI_PACKAGE");
const sdk = await import(pathToFileURL(join(piPackage, "dist/index.js")));
const ai = await import(pathToFileURL(join(piPackage, "node_modules/@earendil-works/pi-ai/dist/index.js")));

async function json(path, value) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value), { mode: 0o600 });
}

export async function fixture(packageDir, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "pi-permission-acceptance-"));
  const cwd = join(root, "workspace");
  const agentDir = join(root, "agent");
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = agentDir;
  const state = { requests: 0, diagnostics: [], notifications: [], services: [], results: [], autocomplete: [] };
  const control = `allowed-${randomUUID()}`;
  const protectedContent = `protected-${randomUUID()}`;
  const config = {
    debugLog: false, permissionReviewLog: true, yoloMode: false,
    permission: { "*": "allow", path: { "*": "allow", "**/.env": "deny" }, skill: { "*": "allow", blocked: "deny" } },
  };
  const globalConfig = join(agentDir, "extensions/pi-permission-system/config.json");
  const projectConfig = join(cwd, ".pi/extensions/pi-permission-system/config.json");
  let session;
  let pendingCalls = [];
  let completion = false;
  let sequence = 0;

  const provider = (pi) => {
    pi.registerProvider("startup-acceptance", {
      api: "startup-acceptance", baseUrl: "http://127.0.0.1:1/offline",
      models: [{ id: "scripted", name: "Offline scripted fixture", reasoning: false,
        input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 100000, maxTokens: 2000 }],
      streamSimple(model) {
        state.requests++;
        if (state.requests > 50) throw new Error("Unexpected provider request loop");
        const calls = completion ? [] : pendingCalls;
        completion = !completion && calls.length > 0;
        const stream = ai.createAssistantMessageEventStream();
        queueMicrotask(() => {
          const message = { role: "assistant", api: model.api, provider: model.provider, model: model.id,
            timestamp: Date.now(), content: [], stopReason: "pending",
            usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
          stream.push({ type: "start", partial: message });
          for (const call of calls) {
            const index = message.content.length;
            const block = { type: "toolCall", id: `fixture-${++sequence}`, name: call.name, arguments: {} };
            message.content.push(block);
            stream.push({ type: "toolcall_start", contentIndex: index, partial: message });
            block.arguments = call.arguments;
            stream.push({ type: "toolcall_end", contentIndex: index, toolCall: block, partial: message });
          }
          if (!calls.length) {
            message.content.push({ type: "text", text: "" });
            stream.push({ type: "text_start", contentIndex: 0, partial: message });
            message.content[0].text = "Fixture complete";
            stream.push({ type: "text_delta", contentIndex: 0, delta: "Fixture complete", partial: message });
            stream.push({ type: "text_end", contentIndex: 0, content: "Fixture complete", partial: message });
          }
          message.stopReason = calls.length ? "toolUse" : "stop";
          stream.push({ type: "done", reason: message.stopReason, message });
          stream.end();
        });
        return stream;
      },
    });
    pi.events.on("acceptance:service", (value) => state.services.push(value));
  };

  async function start() {
    const settingsManager = sdk.SettingsManager.inMemory({
      defaultProvider: "startup-acceptance", defaultModel: "scripted", defaultThinkingLevel: "off",
      defaultProjectTrust: "always", compaction: { enabled: false }, retry: { enabled: false },
    });
    const resourceLoader = new sdk.DefaultResourceLoader({
      cwd, agentDir, settingsManager, additionalExtensionPaths: [join(packageDir, "src/index.ts"), join(root, "peer.ts"), ...(options.fffPackage ? [join(options.fffPackage, "src/index.ts")] : [])],
      extensionFactories: [provider], noContextFiles: true, noPromptTemplates: true, noThemes: true,
    });
    await resourceLoader.reload();
    assert.deepEqual(resourceLoader.getExtensions().errors, [], "The permission extension and peer must load");
    ({ session } = await sdk.createAgentSession({ cwd, agentDir, settingsManager, resourceLoader,
      thinkingLevel: "off", sessionManager: sdk.SessionManager.inMemory(cwd) }));
    const offlineModel = session.modelRuntime.getModel("startup-acceptance", "scripted");
    assert.ok(offlineModel, "The scripted provider must register its model");
    await session.modelRuntime.setRuntimeApiKey("startup-acceptance", ["offline", "fixture"].join("-"));
    await session.setModel(offlineModel);
    assert.equal(session.model?.provider, "startup-acceptance", "Only the offline provider may run");
    session.subscribe((event) => {
      if (event.type === "tool_execution_end") state.results.push(event);
    });
    await session.bindExtensions({ mode: "json", onError: (error) => state.diagnostics.push(error),
      uiContext: { notify: (message, type) => state.notifications.push({ message, type }), setStatus() {},
        addAutocompleteProvider: (factory) => state.autocomplete.push(factory),
      },
    });
    assert.deepEqual(state.diagnostics, [], "Startup must not hide extension errors");
  }

  async function stop() {
    if (!session) return;
    try { await session.extensionRunner.emit({ type: "session_shutdown" }); }
    finally { session.dispose(); session = undefined; }
  }

  try {
    await mkdir(cwd, { recursive: true });
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(cwd, "open.txt"), control, { mode: 0o600 });
    await writeFile(join(cwd, ".env"), protectedContent, { mode: 0o600 });
    await writeFile(join(cwd, "project.txt"), "Project control", { mode: 0o600 });
    await json(globalConfig, config);
    if (options.fffPackage) await json(join(agentDir, "pi-fff.json"), {
      mode: "tools-only", frecencyDbPath: join(root, "frecency"), historyDbPath: join(root, "history"),
      ...options.fffConfig,
    });
    if (options.setup) await options.setup({ root, cwd, agentDir });
    for (const name of ["allowed", "blocked"]) {
      const directory = join(agentDir, "skills", name);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} acceptance fixture\n---\nHarmless fixture instructions.\n`);
    }
    await writeFile(join(root, "peer.ts"), `
import { readFile } from "node:fs/promises";
import { Type } from "typebox";
import { getPermissionsService } from ${JSON.stringify(join(packageDir, "src/service.ts"))};
export default function(pi) {
  const seen = new WeakSet();
  pi.events.on("permissions:ready", ({ sessionId }) => {
    const service = getPermissionsService(sessionId);
    if (!service) throw new Error("Ready service is unavailable");
    if (!seen.has(service)) {
      service.registerToolAccessExtractor("permission_probe", (input) => input.target);
      seen.add(service);
    }
  });
  pi.on("session_start", (_event, ctx) => {
    const service = getPermissionsService(ctx.sessionManager.getSessionId());
    if (!service) throw new Error("Startup service is unavailable");
    pi.events.emit("acceptance:service", {
      sessionId: ctx.sessionManager.getSessionId(),
      state: service.checkPermission("path", ${JSON.stringify(join(cwd, ".env"))}).state,
    });
  });
  pi.registerTool({ name: "permission_probe", label: "Permission probe", description: "Read a fixture via a registered path extractor",
    parameters: Type.Object({ target: Type.String() }),
    async execute(_id, params) { return { content: [{ type: "text", text: await readFile(params.target, "utf8") }], details: undefined }; }
  });
  pi.registerTool({ name: "nested_read", label: "Nested read", description: "Read a fixture through Pi's nested tool API",
    parameters: Type.Object({ target: Type.String() }),
    async execute(_id, params, _signal, _update, ctx) {
      const outcome = await ctx.executeTool("read", { path: params.target });
      return { ...outcome.result, isError: outcome.isError };
    }
  });
}
`, { mode: 0o600 });
    await start();
    return {
      cwd, root, control, protectedContent, state, globalConfig, projectConfig, config,
      get session() { return session; },
      async prompt(calls = [], text = "Run the fixture") {
        pendingCalls = calls; completion = false;
        const before = session.messages.length;
        await session.prompt(text);
        return session.messages.slice(before).filter((message) => message.role === "toolResult");
      },
      async writeConfig(path, value) { await json(path, value); },
      async replaceSession() { await stop(); await start(); },
      async close() {
        try { await stop(); }
        finally {
          if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
          else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
          await rm(root, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    try { await stop(); }
    finally {
      if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
      else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
      await rm(root, { recursive: true, force: true });
    }
    throw error;
  }
}

export function text(result) {
  return result.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
}
