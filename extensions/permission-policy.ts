/**
 * Keeps the permission policy current with the package on every account.
 *
 * `pi-permission-system` reads only `config.json` in its directory, so this
 * extension writes that file at startup: the policy this package ships, with
 * the account's own rules from `local.json` merged over it. An account rule
 * replaces the shipped rule of the same pattern in place, and a new pattern is
 * appended, so it wins over the shipped catch-alls (the last matching pattern
 * wins). Settings outside `permission` merge the same way.
 *
 * `config.json` stays editable. When it differs from the last file this
 * extension wrote, the differences move into `local.json` first, and the old
 * file is kept as `config.json.bak`. That also adopts an account that set up
 * its policy by hand. A shipped rule that the account deleted comes back; to
 * turn one off, give its pattern another action in `local.json`.
 *
 * It writes only when the result changes, so a second start changes nothing.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Policy = Record<string, unknown> & { permission?: Record<string, unknown> };

const AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
const POLICY_DIR = join(AGENT_DIR, "extensions", "pi-permission-system");
const CONFIG = join(POLICY_DIR, "config.json");
const LOCAL = join(POLICY_DIR, "local.json");
const STAMP = join(POLICY_DIR, ".config.json.sha256");
const SHIPPED = join(dirname(dirname(fileURLToPath(import.meta.url))), "permissions", "pi-permission-system.json");

const isMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const render = (policy: Policy) => `${JSON.stringify(policy, null, 2)}\n`;

function read(path: string): Policy | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`pi-agent-config: ${path} is not valid JSON; fix or remove it. ${(error as Error).message}`);
  }
}

/** The settings and rules of `policy` that `base` lacks or sets differently. */
function difference(policy: Policy, base: Policy): Policy {
  const result: Policy = {};
  for (const [key, value] of Object.entries(policy)) {
    if (key === "permission" && isMap(value) && isMap(base.permission)) {
      const surfaces: Record<string, unknown> = {};
      for (const [surface, rules] of Object.entries(value)) {
        const shipped = base.permission[surface];
        if (isMap(rules) && isMap(shipped)) {
          const changed = Object.entries(rules).filter(([pattern, action]) => !same(action, shipped[pattern]));
          if (changed.length > 0) surfaces[surface] = Object.fromEntries(changed);
        } else if (!same(rules, shipped)) {
          surfaces[surface] = rules;
        }
      }
      if (Object.keys(surfaces).length > 0) result.permission = surfaces;
    } else if (!same(value, base[key])) {
      result[key] = value;
    }
  }
  return result;
}

/** `base` with `overlay` merged over it, one level into each `permission` surface. */
function merge(base: Policy, overlay: Policy): Policy {
  const result: Policy = { ...base, ...overlay };
  if (isMap(base.permission) && isMap(overlay.permission)) {
    const surfaces: Record<string, unknown> = { ...base.permission };
    for (const [surface, rules] of Object.entries(overlay.permission)) {
      const shipped = surfaces[surface];
      surfaces[surface] = isMap(rules) && isMap(shipped) ? { ...shipped, ...rules } : rules;
    }
    result.permission = surfaces;
  }
  return result;
}

export default function () {
  const shipped = read(SHIPPED);
  if (!shipped) throw new Error(`pi-agent-config: the shipped policy ${SHIPPED} is missing; reinstall the package.`);
  let local = read(LOCAL) ?? {};

  const current = existsSync(CONFIG) ? readFileSync(CONFIG, "utf8") : undefined;
  const stamp = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : undefined;
  if (current !== undefined && sha256(current) !== stamp) {
    const edits = difference(read(CONFIG)!, merge(shipped, local));
    if (Object.keys(edits).length > 0) {
      local = merge(local, edits);
      writeFileSync(LOCAL, render(local));
    }
    copyFileSync(CONFIG, `${CONFIG}.bak`);
  }

  const next = render(merge(shipped, local));
  if (next !== current) {
    mkdirSync(POLICY_DIR, { recursive: true });
    writeFileSync(CONFIG, next);
  }
  if (stamp !== sha256(next)) writeFileSync(STAMP, `${sha256(next)}\n`);
}
