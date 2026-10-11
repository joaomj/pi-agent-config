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
}
