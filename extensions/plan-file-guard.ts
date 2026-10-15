import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAbsolute, resolve } from "node:path";

// Plan files (PLAN-<ticket>.md) are temporary working files and must never be committed.
// The guard parses the bash command into real git invocations, so text that merely mentions
// `git commit` (heredoc bodies, quoted strings, script contents) never triggers it.
const PLAN_FILE = /(^|\/)PLAN-[^/]*\.md$/;
const SEPARATORS = new Set([";", "&&", "||", "|", "&", "\n", "(", ")"]);
// git global options that take a separate value argument.
const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);

type GitCall = { dir: string; subcommand: string; args: string[] };

// Drop heredoc bodies: their lines are data, not commands.
function stripHeredocs(command: string): string {
	const lines = command.split("\n");
	const kept: string[] = [];
	let terminator: string | undefined;
	for (const line of lines) {
		if (terminator !== undefined) {
			if (line.trim() === terminator) terminator = undefined;
			continue;
		}
		kept.push(line);
		const match = line.match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
		if (match) terminator = match[2];
	}
	return kept.join("\n");
}

// Split into words and separators, honoring quotes. Quoted text stays inside one word.
function tokenize(command: string): string[] {
	const tokens: string[] = [];
	let word = "";
	let quote: string | undefined;
	let inWord = false;
	const flush = () => {
		if (inWord) tokens.push(word);
		word = "";
		inWord = false;
	};
	for (let i = 0; i < command.length; i++) {
		const ch = command[i];
		if (quote) {
			if (ch === quote) quote = undefined;
			else if (ch === "\\" && quote === '"' && i + 1 < command.length) word += command[++i];
			else word += ch;
			continue;
		}
		if (ch === "'" || ch === '"') {
			quote = ch;
			inWord = true;
		} else if (ch === "\\" && i + 1 < command.length) {
			word += command[++i];
			inWord = true;
		} else if (ch === "#" && !inWord) {
			while (i + 1 < command.length && command[i + 1] !== "\n") i++;
		} else if (ch === " " || ch === "\t") {
			flush();
		} else {
			const two = command.slice(i, i + 2);
			if (two === "&&" || two === "||") {
				flush();
				tokens.push(two);
				i++;
			} else if (SEPARATORS.has(ch)) {
				flush();
				tokens.push(ch);
			} else {
				word += ch;
				inWord = true;
			}
		}
	}
	flush();
	return tokens;
}

function resolveDir(base: string, raw: string): string {
	const expanded = raw.replace(/^~(?=\/|$)/, process.env.HOME ?? "~");
	return isAbsolute(expanded) ? expanded : resolve(base, expanded);
}

// Find each git invocation and the directory it runs in, following literal `cd` targets.
function findGitCalls(command: string, cwd: string): GitCall[] {
	const calls: GitCall[] = [];
	let dir = cwd;
	let segment: string[] = [];
	const finish = () => {
		const words = segment.filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word) || word !== segment[0]);
		segment = [];
		if (words[0] === "cd" && words[1]) dir = resolveDir(dir, words[1]);
		if (words[0] !== "git") return;
		let callDir = dir;
		let i = 1;
		while (i < words.length && words[i].startsWith("-")) {
			const option = words[i];
			if (option === "-C" && words[i + 1]) callDir = resolveDir(callDir, words[i + 1]);
			i += GIT_VALUE_OPTIONS.has(option) ? 2 : 1;
		}
		if (i < words.length) calls.push({ dir: callDir, subcommand: words[i], args: words.slice(i + 1) });
	};
	for (const token of tokenize(stripHeredocs(command))) {
		if (SEPARATORS.has(token)) finish();
		else segment.push(token);
	}
	finish();
	return calls;
}

const isBulkAdd = (call: GitCall) =>
	call.subcommand === "add" && call.args.some((arg) => arg === "-A" || arg === "--all" || arg === "." || arg === "-u");
const isCommitAll = (call: GitCall) =>
	call.subcommand === "commit" && call.args.some((arg) => arg === "--all" || /^-[a-zA-Z]*a[a-zA-Z]*$/.test(arg));

async function planFilesToBeCommitted(pi: ExtensionAPI, dir: string, includeWorktree: boolean): Promise<string[]> {
	const args = includeWorktree
		? ["-C", dir, "status", "--porcelain", "--untracked-files=all"]
		: ["-C", dir, "diff", "--cached", "--name-only"];
	const result = await pi.exec("git", args);
	if (result.code !== 0) return []; // not a git repository
	return result.stdout
		.split("\n")
		.map((line) => (includeWorktree ? line.slice(3) : line))
		.filter((file) => PLAN_FILE.test(file));
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return;
		const command = String((event.input as { command?: unknown }).command ?? "");
		const calls = findGitCalls(command, ctx.cwd);
		const commits = calls.filter((call) => call.subcommand === "commit");
		if (commits.length === 0) return;

		const named = calls
			.filter((call) => call.subcommand === "commit" || call.subcommand === "add")
			.flatMap((call) => call.args.filter((arg) => PLAN_FILE.test(arg)));
		if (named.length > 0) {
			return { block: true, reason: `Plan files must not be committed: ${named.join(", ")}.` };
		}

		const bulk = calls.some((call) => isBulkAdd(call) || isCommitAll(call));
		for (const dir of new Set(commits.map((call) => call.dir))) {
			const files = await planFilesToBeCommitted(pi, dir, bulk);
			if (files.length > 0) {
				return {
					block: true,
					reason: `Plan files would be committed in ${dir}: ${files.join(", ")}. Stage files explicitly and leave plan files out.`,
				};
			}
		}
	});
}
