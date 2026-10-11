import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "startup-benchmark";

export default function (pi: ExtensionAPI) {
	let active: AbortController | undefined;

	pi.on("session_shutdown", (_event, ctx) => {
		active?.abort();
		ctx.ui.setStatus(STATUS_KEY, undefined);
	});
	pi.registerCommand("startup-benchmark", {
		description: "Show main startup stage timings from a fresh Pi launch",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") {
				throw new Error("/startup-benchmark requires Pi's interactive TUI.");
			}
			if (active) {
				ctx.ui.notify("A startup benchmark is already running.", "warning");
				return;
			}

			const controller = new AbortController();
			active = controller;
			ctx.ui.setStatus(STATUS_KEY, "benchmarking startup...");
			try {
				const { runBenchmark } = await import("./benchmark.js");
				const report = await runBenchmark(ctx.cwd, controller.signal);
				if (!controller.signal.aborted) {
					ctx.ui.notify(`Startup benchmark (fresh launch)\n${report}`, "info");
				}
			} catch (error) {
				if (!controller.signal.aborted) throw error;
			} finally {
				if (!controller.signal.aborted) ctx.ui.setStatus(STATUS_KEY, undefined);
				controller.abort();
				active = undefined;
			}
		},
	});
}
