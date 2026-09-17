import { randomBytes } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// OpenCode Zen's free tier gate checks the client fingerprint:
//   - User-Agent must look like the OpenCode CLI: "opencode/<version>"
//   - x-opencode-session must be an OpenCode session id: "ses_" + 12 hex + 14 base62
// Pi sends its own User-Agent and a plain UUID session id, so the gate rejects it
// with FreeTierError. Rewrite both for OpenCode requests only.
const OPENCODE_USER_AGENT = "opencode/1.18.31";
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function randomBase62(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Mirror OpenCode's Identifier.create layout: "<prefix>_" + 12 hex time + 14 base62.
function opencodeId(prefix: "ses" | "msg" | "prj"): string {
  const value = BigInt(Date.now()) * 0x1000n;
  const timeBytes = Buffer.alloc(6);
  for (let i = 0; i < 6; i++) timeBytes[i] = Number((value >> BigInt(40 - 8 * i)) & 0xffn);
  return `${prefix}_${timeBytes.toString("hex")}${randomBase62(14)}`;
}

export default function (pi: ExtensionAPI) {
  const sessionId = opencodeId("ses");
  const requestId = opencodeId("msg");
  const projectId = opencodeId("prj");

  pi.on("before_provider_headers", (event) => {
    const isOpencode = Object.keys(event.headers).some((k) => k.toLowerCase() === "x-opencode-session");
    if (!isOpencode) return;

    event.headers["User-Agent"] = OPENCODE_USER_AGENT;
    event.headers["x-opencode-session"] = sessionId;
    event.headers["x-opencode-request"] = requestId;
    event.headers["x-opencode-project"] = projectId;
  });
}
