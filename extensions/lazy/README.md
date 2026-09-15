# extensions/lazy

Deferred extensions load in the background after the session starts.

The `beval-pi-lazy-loader` package scans this directory on `session_start`
and loads each entry in parallel. Pi loads all other extensions
synchronously before the first prompt.

## Format

- Place a standalone file as `<name>.ts` or `<name>.js`.
- Place a multi-file extension as `<name>/index.ts` or `<name>/index.js`.
- The loader skips `index.ts`, `index.js`, `.d.ts`, and `.d.js` at the top level.

## Policy

Keep these extensions synchronous in `settings.json` `packages`:

- `npm:@gotgenes/pi-permission-system` blocks tool calls from the first turn.
- `npm:@liborw/pi-startup-time` measures startup on `session_start`.
- `npm:beval-pi-lazy-loader` performs the deferred load.

Move an extension here only when its absence on the first turn is acceptable.
Safe examples are passive listeners, cost trackers, and notifiers. Keep
provider proxies, model overrides, permission gates, and first-turn tools
synchronous.

## Configuration

`settings.json` `lazyLoader` controls this directory:

```json
{
  "lazyLoader": {
    "enabled": true,
    "startDelay": 0,
    "timeout": 5000,
    "hotReload": false,
    "whitelist": [],
    "blacklist": []
  }
}
```

Set `whitelist` to load only named extensions. Set `blacklist` to skip named
extensions. Set `hotReload` to `true` to load new files without restart.
