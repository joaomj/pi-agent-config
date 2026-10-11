import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Reload replaces the extension runtime, but not the process startup reading.
const startupTimeKey = Symbol.for("pi-agent-config.startup-time-ms");
const processState = globalThis as typeof globalThis & Record<symbol, number | undefined>;

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (event, ctx) => {
		if (ctx.mode !== "tui") return;

		if (event.reason === "startup" && processState[startupTimeKey] === undefined) {
			processState[startupTimeKey] = Math.round(process.uptime() * 1000);
		}

		const milliseconds = processState[startupTimeKey];
		if (milliseconds !== undefined) {
			ctx.ui.setStatus("startup-time", `startup ${milliseconds}ms`);
		}
	});

	pi.registerCommand("startup-time", {
		description: "Show startup elapsed time and measurement boundaries",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") return;

			const milliseconds = processState[startupTimeKey];
			if (milliseconds === undefined) {
				ctx.ui.notify("Restart Pi to record startup time.", "warning");
				return;
			}

			await ctx.ui.select(
				[
					`Startup elapsed (approximate): ${milliseconds}ms`,
					"",
					"Start: Node.js process start",
					"End: this extension's first session_start handler",
					"Clock: monotonic elapsed time, including I/O and waits",
					"",
					"Includes: early initialization, extension loading, and early TUI setup.",
					"Excludes: later session-start handlers and final TUI setup.",
					"Native stage timings are not exposed by Pi's extension API.",
					"Reload and session changes preserve this process's original reading.",
				].join("\n"),
				["Close"],
			);
		},
	});
}
