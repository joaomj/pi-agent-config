// Runs a bash command and stops it after a deadline, like coreutils `timeout -k 5`.
// bg-bash-timer calls this through Node, which Pi always has, so the deadline
// works where GNU `timeout` is missing, such as on macOS.
//
//   node deadline.mjs <seconds> <command>
//
// Exits with the command's status, or 124 when the deadline stopped it.
import { spawn } from "node:child_process";

const [seconds, command] = process.argv.slice(2);
const child = spawn("bash", ["-c", command], { stdio: "inherit", detached: true });
let expired = false;

// The command runs in its own process group, so the signal also reaches its children.
const signal = (name) => {
  try {
    process.kill(-child.pid, name);
  } catch {}
};
const timer = setTimeout(() => {
  expired = true;
  signal("SIGTERM");
  setTimeout(() => signal("SIGKILL"), 5000).unref();
}, Number(seconds) * 1000);

for (const name of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(name, () => signal(name));

child.on("error", (error) => {
  console.error(`deadline: ${error.message}`);
  process.exit(127);
});
child.on("exit", (code, name) => {
  clearTimeout(timer);
  process.exit(expired ? 124 : (code ?? 128 + (name === "SIGKILL" ? 9 : 15)));
});
