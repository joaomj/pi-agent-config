/**
 * Stops Git from opening an editor in agent shell commands.
 *
 * A `git commit` without `-m`, `git rebase -i`, `git rebase --continue`, or a
 * `git merge` waits for an editor that the agent cannot use, so the command
 * hangs until its deadline. Pi's bash tool and pi-bg-bash copy `process.env`
 * on every call, so setting `GIT_EDITOR=true` here reaches every command. Git
 * then keeps the prepared message or todo list as it is. A commit with no
 * message still fails with "Aborting commit due to empty commit message".
 *
 * It overrides a `GIT_EDITOR` the user set, because any interactive editor
 * hangs in the agent's shell.
 */

export default function () {
  process.env.GIT_EDITOR = "true";
}
