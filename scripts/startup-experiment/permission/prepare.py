#!/usr/bin/env python3
"""Prepare an isolated, version-pinned lazy load experiment from installed source."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

ENTRY_SHA256 = "a960d69ce8c048217145aa7d5a8cb2a74034bf8700585a09c7d8c43971d13d14"


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Reviewed source boundary changed: {old!r}")
    return text.replace(old, new, 1)


def lazy_entry(text):
    for imported in (
        'import { GateRunner } from "#src/handlers/gates/runner";\n',
        'import { SkillInputGatePipeline } from "#src/handlers/gates/skill-input-gate-pipeline";\n',
        'import { ToolCallGatePipeline } from "#src/handlers/gates/tool-call-gate-pipeline";\n',
        'import {\n  AncestorNodes,\n  InheritingToolAccessExtractorLookup,\n  InheritingToolInputFormatterLookup,\n} from "#src/authority/inherited-registrations";\n',
    ):
        text = replace_once(text, imported, "")
    text = replace_once(text,
        'import {\n  AgentPrepHandler,\n  PermissionGateHandler,\n  SessionLifecycleHandler,\n  SessionTurnPrep,\n} from "./handlers";',
        'import { SessionLifecycleHandler } from "./handlers/lifecycle";\n'
        'import { SessionTurnPrep } from "./handlers/session-turn-prep";')
    start = text.index("  const agentPrep = new AgentPrepHandler(")
    end = text.index('\n  pi.on("session_start",', start)
    original = text[start:end]
    agent_end = original.index("\n\n  const gateRunner")
    agent = original[:agent_end].replace("  const agentPrep = new AgentPrepHandler(", "    return new AgentPrepHandler(", 1)
    gates = original[agent_end:].replace("  const gates = new PermissionGateHandler(", "    return new PermissionGateHandler(", 1)
    bridge = '''  let initializationFailure: Error | undefined;
  let agentPrep: Promise<import("./handlers/before-agent-start").AgentPrepHandler> | undefined;
  let gates: Promise<import("./handlers/permission-gate-handler").PermissionGateHandler> | undefined;

  function failInitialization(component: string, cause: unknown): never {
    initializationFailure ??= new Error(
      `Permission ${component} initialization failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    throw initializationFailure;
  }

  function ensureAgentPrep() {
    if (initializationFailure) return Promise.reject(initializationFailure);
    return agentPrep ??= (async () => {
      const { AgentPrepHandler } = await import("./handlers/before-agent-start");
AGENT_CONSTRUCTION
    })().catch((cause) => failInitialization("agent preparation", cause));
  }

  function ensureGates() {
    if (initializationFailure) return Promise.reject(initializationFailure);
    return gates ??= (async () => {
      const [
        { GateRunner },
        { SkillInputGatePipeline },
        { ToolCallGatePipeline },
        { AncestorNodes, InheritingToolAccessExtractorLookup, InheritingToolInputFormatterLookup },
        { PermissionGateHandler },
      ] = await Promise.all([
        import("#src/handlers/gates/runner"),
        import("#src/handlers/gates/skill-input-gate-pipeline"),
        import("#src/handlers/gates/tool-call-gate-pipeline"),
        import("#src/authority/inherited-registrations"),
        import("./handlers/permission-gate-handler"),
      ]);
GATE_CONSTRUCTION
    })().catch((cause) => failInitialization("gate", cause));
  }
'''.replace("AGENT_CONSTRUCTION", agent).replace("GATE_CONSTRUCTION", gates)
    text = text[:start] + bridge + text[end:]
    text = replace_once(text,
        'pi.on("before_agent_start", (event, ctx) => agentPrep.handle(event, ctx));',
        'pi.on("before_agent_start", async (event, ctx) => (await ensureAgentPrep()).handle(event, ctx));')
    text = replace_once(text,
        'pi.on("input", (event, ctx) => gates.handleInput(event, ctx));',
        '''pi.on("input", async (event, ctx) => {
    session.activate(ctx);
    if (!event.text.trim().startsWith("/skill:")) return { action: "continue" };
    try {
      return await (await ensureGates()).handleInput(event, ctx);
    } catch (cause) {
      // Pi continues after an input-handler error. Consume the protected input instead.
      ctx.ui.notify(
        `Permission input blocked: ${cause instanceof Error ? cause.message : String(cause)}`,
        "error",
      );
      return { action: "handled" };
    }
  });''')
    return replace_once(text,
        '(event, ctx) => gates.handleToolCall(event, ctx),',
        'async (event, ctx) => (await ensureGates()).handleToolCall(event, ctx),')


def prepare(package, destination):
    package = package.resolve(strict=True)
    destination = destination.resolve()
    metadata = json.loads((package / "package.json").read_text())
    if (metadata.get("name"), metadata.get("version")) != ("@gotgenes/pi-permission-system", "40.1.4"):
        raise ValueError("--package must be the reviewed @gotgenes/pi-permission-system@40.1.4 installation.")
    entry = (package / "src/index.ts").read_bytes()
    if hashlib.sha256(entry).hexdigest() != ENTRY_SHA256:
        raise ValueError("--package entry differs from the reviewed source; inspect it before updating the recipe.")
    transformed = lazy_entry(entry.decode())
    if destination.exists():
        raise FileExistsError(f"--output already exists: {destination}. Choose a new temporary directory.")
    modules = package.parent.parent
    for dependency in ("zod", "web-tree-sitter", "tree-sitter-bash"):
        if not (modules / dependency).exists():
            raise FileNotFoundError(f"--package dependency is missing: {dependency}. Restore the installed dependency tree.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pi-lazy-permission-build-", dir=destination.parent) as temporary:
        stage = Path(temporary) / "package"
        stage.mkdir()
        for name in ("src", "dist"):
            shutil.copytree(package / name, stage / name)
        for name in ("package.json", "LICENSE"):
            shutil.copy2(package / name, stage / name)
        (stage / "src/index.ts").write_text(transformed)
        (stage / "node_modules").symlink_to(modules, target_is_directory=True)
        (stage / "experiment.json").write_text(json.dumps({
            "sourceName": metadata["name"], "sourceVersion": metadata["version"],
            "originalEntrySha256": ENTRY_SHA256,
            "modifiedEntrySha256": hashlib.sha256(transformed.encode()).hexdigest(),
            "changedFiles": ["src/index.ts"],
            "eager": ["configuration", "session lifecycle", "permission service", "forwarding", "approval UI"],
            "lazy": ["agent preparation", "skill/tool gates"],
        }, indent=2) + "\n")
        stage.rename(destination)
    print(f"Prepared isolated permission experiment: {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, required=True, help="Reviewed installed permission package")
    parser.add_argument("--output", type=Path, required=True, help="New directory outside Git")
    arguments = parser.parse_args()
    prepare(arguments.package, arguments.output)
