import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

process.umask(0o077);

const [sourceArg, piArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !piArg || !outputArg) throw new Error("Provide reviewed permission package, Pi package, and new output directory.");
const source = resolve(sourceArg), piPackage = resolve(piArg), output = resolve(outputArg);
const metadata = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
assert.equal(metadata.name, "@gotgenes/pi-permission-system");
assert.equal(metadata.version, "40.1.4");
const entry = await readFile(join(source, "src/index.ts"));
assert.equal(createHash("sha256").update(entry).digest("hex"), "a960d69ce8c048217145aa7d5a8cb2a74034bf8700585a09c7d8c43971d13d14");
await mkdir(output);
await cp(source, output, { recursive: true, filter: (path) => !path.startsWith(join(source, "node_modules")) });
await symlink(resolve(source, "../.."), join(output, "node_modules"), "dir");
const require = createRequire(join(piPackage, "package.json"));
const esbuild = require("esbuild");
const piMetadata = JSON.parse(await readFile(join(piPackage, "package.json"), "utf8"));
assert.equal(piMetadata.version, "1.1.0", "Recheck host export locations for the installed Pi version.");
const hosts = new Set(["@earendil-works/pi-coding-agent", "@earendil-works/pi-tui", "@earendil-works/pi-ai", "@earendil-works/pi-agent-core", "typebox"]);
const result = await esbuild.build({
  entryPoints: [join(source, "src/index.ts")], outfile: join(output, "src/compiled.cjs"),
  bundle: true, format: "cjs", platform: "node", target: "node22", packages: "external",
  minify: false, legalComments: "eof", metafile: true,
  plugins: [{ name: "preserve-host-and-source-locations", setup(build) {
    build.onResolve({ filter: /^#src\// }, async ({ path }) => {
      const base = join(source, "src", path.slice(5));
      for (const candidate of [base + ".ts", join(base, "index.ts")]) {
        try { if ((await stat(candidate)).isFile()) return { path: candidate }; }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      throw new Error(`Cannot resolve reviewed permission module ${path}`);
    });
    build.onResolve({ filter: /^(@earendil-works\/pi-(coding-agent|tui|ai|agent-core)|typebox)(?:\/.*)?$/ }, ({ path }) => {
      assert.ok([...hosts].some((host) => path === host || path.startsWith(host + "/")));
      if (path === "@earendil-works/pi-coding-agent") return { path: "used-sdk-exports", namespace: "host-exports" };
      const entry = require.resolve(path === "@earendil-works/pi-ai" ? path + "/compat" : path);
      return { path: entry, external: true };
    });
    build.onResolve({ filter: /.*/, namespace: "host-exports" }, ({ path }) => ({ path, external: true }));
    build.onLoad({ filter: /.*/, namespace: "host-exports" }, () => ({ loader: "js", contents:
      `export { getAgentDir, getPackageDir } from ${JSON.stringify(join(piPackage, "dist/config.js"))};\n` +
      `export { getSettingsListTheme } from ${JSON.stringify(join(piPackage, "dist/modes/interactive/theme/theme.js"))};\n`
    }));
    build.onLoad({ filter: /\.ts$/ }, async ({ path }) => {
      const text = await readFile(path, "utf8");
      return { contents: text.replaceAll("import.meta.url", JSON.stringify(pathToFileURL(path).href)), loader: "ts", resolveDir: resolve(path, "..") };
    });
  } }],
});
await writeFile(join(output, "upstream-index.ts"), entry);
const bundleSha256 = createHash("sha256").update(await readFile(join(output, "src/compiled.cjs"))).digest("hex");
await writeFile(join(output, "src/index.ts"), `import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export default async function(pi: ExtensionAPI) {
  let failure: Error | undefined;
  const reason = () => "Permission compiled engine initialization failed: " + failure?.message;
  const unsubscribe = [
    pi.on("tool_call", () => failure ? { block: true, reason: reason() } : undefined),
    pi.on("input", (_event, ctx) => {
      if (!failure) return { action: "continue" };
      ctx.ui.notify(reason(), "error");
      return { action: "handled" };
    }),
    pi.on("session_start", (_event, ctx) => { if (failure) ctx.ui.notify(reason(), "error"); }),
  ];
  try {
    const sourceVersion = JSON.parse(readFileSync(${JSON.stringify(join(source, "package.json"))}, "utf8")).version;
    const hostVersion = JSON.parse(readFileSync(${JSON.stringify(join(piPackage, "package.json"))}, "utf8")).version;
    if (sourceVersion !== "40.1.4" || hostVersion !== "1.1.0") throw new Error("Rebuild the compiled packages entry after updating Pi or the permission package.");
    const bundleUrl = new URL("./compiled.cjs", import.meta.url);
    if (createHash("sha256").update(readFileSync(bundleUrl)).digest("hex") !== ${JSON.stringify(bundleSha256)}) throw new Error("Compiled permission bundle changed. Rebuild it with permission/compile.mjs.");
    const nativeRequire = createRequire(import.meta.url);
    const bundlePath = nativeRequire.resolve("./compiled.cjs");
    delete nativeRequire.cache[bundlePath];
    const { default: initialize } = nativeRequire(bundlePath);
    await initialize(pi);
    for (const remove of unsubscribe) remove();
  } catch (cause) {
    failure = new Error(cause instanceof Error ? cause.message : String(cause), { cause });
    console.error(reason(), failure);
  }
}
`);
await writeFile(join(output, "experiment.json"), JSON.stringify({ sourceName: metadata.name, sourceVersion: metadata.version,
  kind: "compiled-eager-permissions", piVersion: piMetadata.version, compiler: `esbuild ${esbuild.version}`, sourceEntrySha256: createHash("sha256").update(entry).digest("hex"),
  bundleSha256,
  sourceLocationsPreserved: true, lifecycle: "eager and unchanged", metafile: result.metafile }, null, 2) + "\n");
console.log(`Compiled eager permission engine: ${output}`);
