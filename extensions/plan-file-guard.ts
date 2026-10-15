import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAbsolute, resolve } from "node:path";

// Plan files (PLAN-<ticket>.md) are temporary working files and must never be committed.
const PLAN_FILE = /(^|\/)PLAN-[^/]*\.md$/;
const COMMIT = /\bgit\b[^;&|]*\bcommit\b/;
const BULK_STAGE = /\bgit\b[^;&|]*\b(add\s+(-A|--all|\.)(\s|$)|commit\b[^;&|]*\s(-a|--all|-[a-zA-Z]*a[a-zA-Z]*)\b)/;

// Directories the command may commit from: the session cwd, plus `cd <dir>` and `git -C <dir>` targets.
function candidateDirs(command: string, cwd: string): string[] {
	const dirs = new Set([cwd]);
	for (const match of command.matchAll(/(?:\bcd|\bgit\s+-C)\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g)) {
		const raw = match[1].replace(/^["']|["']$/g, "").replace(/^~(?=\/|$)/, process.env.HOME ?? "~");
		dirs.add(isAbsolute(raw) ? raw : resolve(cwd, raw));
	}
	return [...dirs];
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return;
		const command = String((event.input as { command?: unknown }).command ?? "");
		if (!COMMIT.test(command)) return;

		if (command.split(/\s+/).some((word) => PLAN_FILE.test(word.replace(/^["']|["']$/g, "")))) {
			return { block: true, reason: "Plan files (PLAN-*.md) are temporary and must not be committed." };
		}

		for (const dir of candidateDirs(command, ctx.cwd)) {
			// Bulk staging in the same command (`git add -A`, `git add .`, `commit -a`) can pick up plan files
			// that are not staged yet, so check the whole worktree in that case.
			const args = BULK_STAGE.test(command)
				? ["-C", dir, "status", "--porcelain", "--untracked-files=all"]
				: ["-C", dir, "diff", "--cached", "--name-only"];
			const result = await pi.exec("git", args);
			if (result.code !== 0) continue; // not a git repository
			const staged = result.stdout
				.split("\n")
				.map((line) => (args.includes("status") ? line.slice(3) : line))
				.filter((file) => PLAN_FILE.test(file));
			if (staged.length > 0) {
				return {
					block: true,
					reason: `Plan files would be committed in ${dir}: ${staged.join(", ")}. Stage files explicitly and leave plan files out; plan files must never be committed.`,
				};
			}
		}
	});
}
