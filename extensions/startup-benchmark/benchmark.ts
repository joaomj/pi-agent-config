import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

type TimingGroup = { name: string; total: number; rows: { label: string; ms: number }[] };

function plainText(text: string): string {
	return text.replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, "").replaceAll("\r", "");
}

function timingGroups(text: string): TimingGroup[] | undefined {
	const headers = [...text.matchAll(/--- Startup Timings: ([^\n]+) ---\n/g)];
	const sections = [...text.matchAll(/--- Startup Timings: ([^\n]+) ---\n([\s\S]*?)\n-{8,}(?=\n|$)/g)];
	if (headers.length === 0 || headers.length !== sections.length) return;

	const groups = sections.map((section) => {
		const rows = section[2].split("\n").filter((line) => line.trim() !== "").map((line) => {
			const row = line.match(/^  (.+): (\d+)ms$/);
			if (!row) throw new Error(`Unrecognized native timing row: ${line}`);
			return { label: row[1], ms: Number(row[2]) };
		});
		const total = rows.pop();
		if (total?.label !== "TOTAL" || total.ms !== rows.reduce((sum, row) => sum + row.ms, 0)) {
			throw new Error(`Invalid native timing total for ${section[1]}. Pi's timing format may have changed.`);
		}
		return { name: section[1], total: total.ms, rows };
	});
	if (!groups.find((group) => group.name === "main")?.rows.some((row) => row.label === "interactiveMode.init")) return;
	return groups;
}

function report(groups: TimingGroup[]): string {
	const main = groups.find((group) => group.name === "main")!;
	return [
		...main.rows.map((row) => `- ${row.label}: ${row.ms}ms`),
		`- Total (native stages): ${main.total}ms`,
	].join("\n");
}

function signalGroup(pid: number | undefined, signal: NodeJS.Signals): void {
	if (pid === undefined) return;
	try {
		process.kill(-pid, signal);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
			throw new Error(`Cannot stop benchmark process group ${pid}: ${String(error)}`);
		}
	}
}

export async function runBenchmark(cwd: string, signal: AbortSignal): Promise<string> {
	if (process.platform !== "linux" && process.platform !== "darwin") {
		throw new Error("Startup benchmarking requires Linux or macOS and the system script command.");
	}
	signal.throwIfAborted();
	const marker = `PI_BENCHMARK_${randomUUID().replaceAll("-", "")}`;
	const command = `stty cols 120 rows 40 && printf '\n${marker}=%s\n' "$$" && exec pi --no-session`;
	const args = process.platform === "linux"
		? ["-q", "-e", "-c", command, "/dev/null"]
		: ["-q", "/dev/null", "/bin/sh", "-c", command];
	const env: NodeJS.ProcessEnv = { ...process.env, PI_TIMING: "1", PI_STARTUP_BENCHMARK: "1", PI_TELEMETRY: "0" };
	delete env.PI_TUI_WRITE_LOG;

	return await new Promise<string>((resolve, reject) => {
		const child = spawn("script", args, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
		let nativePid: number | undefined;
		let output = "";
		let bytes = 0;
		let result: string | undefined;
		let failure: Error | undefined;
		let captureTimer: ReturnType<typeof setTimeout> | undefined;
		let killTimer: ReturnType<typeof setTimeout> | undefined;

		const stop = () => {
			try {
				signalGroup(nativePid, "SIGTERM");
				signalGroup(child.pid, "SIGTERM");
			} catch (error) {
				failure = error as Error;
			}
			killTimer ??= setTimeout(() => {
				try {
					signalGroup(nativePid, "SIGKILL");
					signalGroup(child.pid, "SIGKILL");
				} catch (error) {
					failure = error as Error;
				}
			}, 500);
		};
		const abort = () => {
			failure = new Error("Startup benchmark cancelled.");
			stop();
		};
		const timeout = setTimeout(() => {
			failure = new Error(`Startup benchmark timed out after ${TIMEOUT_MS}ms. A startup dialog or extension may be blocking.`);
			stop();
		}, TIMEOUT_MS);
		signal.addEventListener("abort", abort, { once: true });

		const receive = (chunk: Buffer) => {
			if (result !== undefined || failure !== undefined) return;
			bytes += chunk.length;
			if (bytes > MAX_OUTPUT_BYTES) {
				failure = new Error(`Startup benchmark exceeded ${MAX_OUTPUT_BYTES} bytes of output.`);
				stop();
				return;
			}
			output += chunk.toString();
			const text = plainText(output);
			nativePid ??= Number(text.match(new RegExp(`${marker}=(\\d+)`))?.[1]) || undefined;
			if (captureTimer) clearTimeout(captureTimer);
			captureTimer = setTimeout(() => {
				try {
					const groups = timingGroups(plainText(output));
					if (!groups) return;
					result = report(groups);
					stop();
				} catch (error) {
					failure = error as Error;
					stop();
				}
			}, 80);
		};
		child.stdout.on("data", receive);
		child.stderr.on("data", receive);
		child.on("error", (error) => {
			failure = new Error(`Cannot launch startup benchmark: ${error.message}. Ensure pi and script are on PATH.`);
		});
		child.on("close", (code) => {
			clearTimeout(timeout);
			if (captureTimer) clearTimeout(captureTimer);
			if (killTimer) clearTimeout(killTimer);
			signal.removeEventListener("abort", abort);
			try {
				signalGroup(nativePid, "SIGKILL");
			} catch (error) {
				failure = error as Error;
			}
			if (!failure && result === undefined && code === 0) {
				try {
					const groups = timingGroups(plainText(output));
					if (groups) result = report(groups);
				} catch (error) {
					failure = error as Error;
				}
			}
			if (failure) reject(failure);
			else if (result !== undefined) resolve(result);
			else reject(new Error(`Startup benchmark exited with code ${code} without a complete interactive timing report.\n${plainText(output).slice(-2000)}`));
		});
	});
}
