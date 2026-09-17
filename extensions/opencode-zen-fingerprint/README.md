# opencode-zen-fingerprint

Pi extension that makes OpenCode Zen free-tier requests pass the server-side
client fingerprint gate.

## Problem

`opencode/muse-spark-1.3-contributor-free` and other free models return:

```text
OpenAI API error (403): {"type":"FreeTierError","message":"Error from provider (Console): OpenCode's free tier can only be used from within OpenCode"}
```

The Zen endpoint rejects the Pi client fingerprint. Pi sends
`User-Agent: pi (<os>; <arch>)` and a plain UUID in `x-opencode-session`.

## Gate behavior

Direct requests to `https://opencode.ai/zen/v1/responses` show that the gate
accepts a request only when both headers match the OpenCode CLI:

| `User-Agent` | `x-opencode-session` | Result |
| --- | --- | --- |
| `opencode/1.18.31` | `ses_<12 hex><14 base62>` | 200 |
| `opencode/1.18.31` | `<uuid>` | 403 |
| `opencode/0.0.0` | `ses_<12 hex><14 base62>` | 426 |

The gate reads the client version from `User-Agent`. Old versions get `426`.
The session ID must use the OpenCode layout: `ses_` plus 12 hex time characters
plus 14 base62 characters. The other `x-opencode-*` headers, the request body,
and the API key do not change the result.

## Behavior

For OpenCode requests only, this extension rewrites:

- `User-Agent` to `opencode/1.18.31`
- `x-opencode-session` to a generated OpenCode session ID
- `x-opencode-request` and `x-opencode-project` to generated OpenCode IDs

It identifies OpenCode requests by the presence of an `x-opencode-session`
header and leaves all other providers untouched.

## Install

Pi auto-discovers this directory as a global extension at
`~/.pi/agent/extensions/opencode-zen-fingerprint/index.ts`. Run `/reload`
after an edit, or restart Pi.

## Verify

```bash
pi --model opencode/muse-spark-1.3-contributor-free -p "say ok"
```

## Version note

`OPENCODE_USER_AGENT` is `opencode/1.18.31`. If the gate raises its minimum
version, update that constant to a current release.

## References

- https://github.com/anomalyco/opencode/issues/49433 — open upstream issue on
  the free-tier client contract.
- https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/session/llm/request.ts
- https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/id/id.ts
