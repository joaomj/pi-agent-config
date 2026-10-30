# Background commands

[`pi-bg-bash`](https://pi.dev/packages/pi-bg-bash) replaces the `bash` tool. A
command starts in the foreground. If it is still running after the limit, it
moves to the background as a task, and the session continues. When the task
ends, a message with its exit status and last output lines starts the next turn.

The limit does not apply to a command with an explicit `timeout` or a command
that starts with `sleep`.

[`bg-bash-timer`](../extensions/bg-bash-timer.ts) sets the limit to 20 seconds.
Without it, `pi-bg-bash` uses 120 seconds.

## Change the limit

| Setting | Default | Effect |
| --- | --- | --- |
| `PI_BG_BASH_PROMOTE_MS` | `20000` | Limit at startup, in milliseconds. A value that is not a positive number shows a warning and uses 20 seconds. |
| `/bgtimer <seconds>` | 20 | Limit for the rest of this session. The next `bash` call uses it. |
| `/bgtimer` | | Shows the current limit. |

## Other ways to move a command

- The model can call `bash` with `background: true` to start a task at once.
- The model can call `bash` with `waitFor: "<text>"` to return when that text
  appears in the output, for example when a server is ready.
- `ctrl+shift+b` moves the running foreground command to the background.
- `/bg` lists the tasks of the session.

The model reads task output with `bash_output`, lists tasks with `bash_tasks`,
and stops a task with `bash_kill`.

## Limits

- `pi-bg-bash` reads `PI_BG_BASH_PROMOTE_MS` for its own tests. A later release
  can rename or remove it. `install.sh` pins version `0.4.1` for this reason.
  Check the variable in `src/foreground.ts` before you change the pin.
- The `bash` tool description from `pi-bg-bash` always says 120 seconds.
  `bg-bash-timer` adds a prompt rule with the real limit, which tells the model
  to ignore that number.
