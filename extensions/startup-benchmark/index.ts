import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let active: AbortController | undefined;

	pi.on("session_shutdown", () => active?.abort());
	pi.registerCommand("startup-benchmark", {
		description: "Benchmark a fresh Pi launch and show native startup timings",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") {
				throw new Error("/startup-benchmark requires Pi's interactive TUI.");
			}
			if (active) {
				ctx.ui.notify("A startup benchmark is already open.", "warning");
				return;
			}

			const controller = new AbortController();
			active = controller;
			try {
				const { showBenchmark } = await import("./view.js");
				await showBenchmark(ctx, controller);
			} finally {
				controller.abort();
				active = undefined;
			}
		},
	});
}
