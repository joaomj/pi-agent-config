import { renameSync, writeFileSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const probeText = process.env.PI_READY_PROBE_TEXT;
	const resultPath = process.env.PI_READY_PROBE_RESULT;
	if (!probeText || !resultPath) {
		throw new Error("Set PI_READY_PROBE_TEXT and PI_READY_PROBE_RESULT through the experiment runner.");
	}
	let accepted = false;
	pi.on("input", (event, ctx) => {
		if (event.text !== probeText) return { action: "continue" as const };
		if (!accepted) {
			const acceptedNs = process.hrtime.bigint().toString();
			accepted = true;
			writeFileSync(`${resultPath}.tmp`, JSON.stringify({
				acceptedNs,
				mode: ctx.mode,
				activeTools: pi.getActiveTools(),
			}), { mode: 0o600 });
			renameSync(`${resultPath}.tmp`, resultPath);
		}
		return { action: "handled" as const };
	});
}
