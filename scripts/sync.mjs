#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

function requireResolvedIndex() {
  const conflicts = git("diff", "--name-only", "--diff-filter=U").trim();
  if (conflicts) {
    throw new Error(`Resolve these conflicts before syncing again:\n${conflicts}\nGit retains a failed autostash in the stash list. Do not drop it until your changes are recovered.`);
  }
}

function readSettings(text, source) {
  let settings;
  try {
    settings = JSON.parse(text);
  } catch (cause) {
    throw new Error(`${source} is not valid JSON. Repair it before syncing again.`, { cause });
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error(`${source} must contain a JSON object.`);
  }
  return settings;
}

requireResolvedIndex();
const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}").trim();
const settingsPath = resolve(root, "settings.json");
readSettings(readFileSync(settingsPath, "utf8"), "Local settings.json");

console.log(`Syncing from ${upstream}; Git temporarily stashes tracked local changes.`);
execFileSync("git", ["pull", "--ff-only", "--autostash"], { cwd: root, stdio: "inherit" });
requireResolvedIndex();

const remote = readSettings(git("show", `${upstream}:settings.json`), `${upstream}:settings.json`);
if (Object.hasOwn(remote, "enabledModels") &&
    (!Array.isArray(remote.enabledModels) || remote.enabledModels.some((model) => typeof model !== "string"))) {
  throw new Error(`Fix enabledModels in ${upstream}:settings.json: expected an array of model patterns.`);
}
const original = readFileSync(settingsPath, "utf8");
const local = readSettings(original, "Local settings.json after autostash restoration");
if (Object.hasOwn(remote, "enabledModels")) local.enabledModels = remote.enabledModels;
else delete local.enabledModels;

if (JSON.stringify(readSettings(original, "Local settings.json")) !== JSON.stringify(local)) {
  writeFileSync(settingsPath, `${JSON.stringify(local, null, 2)}\n`);
}
console.log(`Sync complete. Scoped models follow ${upstream}; other local settings are preserved.`);
