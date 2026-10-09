import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// Maximum silence from the agent while it keeps working. A "report"
// is an assistant message with visible text. Tool calls alone do not count.
const TURN_TIMEOUT_MS = 5 * 60_000;

// How often the watchdog checks while a session is active. Ticks are cheap:
// no model call unless the turn timeout has actually been exceeded.
const HEARTBEAT_MS = 15_000;

function elapsedText(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	if (minutes < 1) return "over a minute";
	if (minutes === 1) return "over a minute";
	return `over ${minutes} minutes`;
}

function reminderText(silentMs: number): string {
	return (
		`You have been working for ${elapsedText(silentMs)} without a user-visible report. ` +
		`Pause and report in two or three sentences: current goal, what is done, what is next. ` +
		`If a command has moved to the background, do not rerun it. End your turn and wait for its automatic completion notification. For new long commands, use bash with background: true. ` +
		`Do not poll logs or processes in a loop.`
	);
}

function hasVisibleText(message: unknown): boolean {
	if (!message || typeof message !== "object") return false;
	const content = (message as { content?: unknown }).content;
	if (!Array.isArray(content)) return false;
	return content.some(
		(block) =>
			!!block &&
			typeof block === "object" &&
			(block as { type?: unknown }).type === "text" &&
			typeof (block as { text?: unknown }).text === "string" &&
			(block as { text: string }).text.trim().length > 0,
	);
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | undefined;
	let ctx: ExtensionContext | undefined;
	let lastReportAt = Date.now();
	let reminderQueued = false;

	const stopTimer = () => {
		if (timer) clearInterval(timer);
		timer = undefined;
	};

	const tick = () => {
		const current = ctx;
		if (!current) return;
		try {
			if (current.isIdle()) {
				current.ui.setStatus("session-responsiveness", undefined);
				return;
			}
		} catch {
			return;
		}
		const silentMs = Date.now() - lastReportAt;
		try {
			const minutes = Math.floor(silentMs / 60_000);
			current.ui.setStatus(
				"session-responsiveness",
				minutes >= 1 ? `working ${minutes}m without a report` : undefined,
			);
		} catch {
			// Status is best-effort; the steer below is the real guard.
		}
		if (silentMs < TURN_TIMEOUT_MS || reminderQueued) return;
		reminderQueued = true;
		try {
			pi.sendUserMessage(reminderText(silentMs), { deliverAs: "steer" });
		} catch {
			reminderQueued = false;
		}
	};

	pi.on("session_start", (_event, sessionCtx) => {
		ctx = sessionCtx;
		lastReportAt = Date.now();
		reminderQueued = false;
		stopTimer();
		timer = setInterval(tick, HEARTBEAT_MS);
		timer.unref?.();
	});

	pi.on("session_shutdown", () => {
		stopTimer();
		try {
			ctx?.ui.setStatus("session-responsiveness", undefined);
		} catch {
			// Shutdown path; nothing to do.
		}
		ctx = undefined;
		lastReportAt = Date.now();
		reminderQueued = false;
	});

	pi.on("agent_start", (_event, agentCtx) => {
		ctx = agentCtx;
		lastReportAt = Date.now();
		reminderQueued = false;
	});

	pi.on("agent_settled", () => {
		lastReportAt = Date.now();
		reminderQueued = false;
		try {
			ctx?.ui.setStatus("session-responsiveness", undefined);
		} catch {
			// Best-effort.
		}
	});

	pi.on("input", (event) => {
		if (event.source === "extension") return;
		lastReportAt = Date.now();
		reminderQueued = false;
	});

	pi.on("message_end", (event) => {
		if (event.message.role !== "assistant") return;
		if (!hasVisibleText(event.message)) return;
		lastReportAt = Date.now();
		reminderQueued = false;
	});

}
