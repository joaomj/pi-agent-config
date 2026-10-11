import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { runBenchmark } from "./benchmark.js";

export async function showBenchmark(ctx: ExtensionContext, controller: AbortController): Promise<void> {
	await ctx.ui.custom<void>((tui, theme, _keys, done) => {
		const body = new Text("Measuring a fresh Pi launch...", 0, 0);
		let scroll = 0;
		let height = 1;
		let lines: string[] = [];
		let finished = false;
		let closed = false;
		const close = () => {
			closed = true;
			controller.abort();
			done();
		};
		void runBenchmark(ctx.cwd, controller.signal).then(
			(report) => {
				if (closed) return;
				finished = true;
				body.setText(report);
				tui.requestRender();
			},
			(error: Error) => {
				if (closed) return;
				finished = true;
				body.setText(`Benchmark failed: ${error.message}`);
				tui.requestRender();
			},
		);
		return {
			render(width: number) {
				height = Math.max(1, tui.terminal.rows - 7);
				lines = body.render(width);
				scroll = Math.max(0, Math.min(scroll, lines.length - height));
				return [
					truncateToWidth(theme.fg("accent", "Startup benchmark — separate launch"), width),
					truncateToWidth(finished ? "Up/Down, PgUp/PgDn, Home/End scroll; Enter/Esc close" : "Esc cancels the benchmark", width),
					"",
					...lines.slice(scroll, scroll + height),
				];
			},
			handleInput(data: string) {
				if (matchesKey(data, Key.escape) || (finished && matchesKey(data, Key.enter))) {
					close();
					return;
				}
				if (matchesKey(data, Key.up)) scroll--;
				else if (matchesKey(data, Key.down)) scroll++;
				else if (matchesKey(data, Key.pageUp)) scroll -= height;
				else if (matchesKey(data, Key.pageDown)) scroll += height;
				else if (matchesKey(data, Key.home)) scroll = 0;
				else if (matchesKey(data, Key.end)) scroll = Math.max(0, lines.length - height);
				tui.requestRender();
			},
			invalidate() { body.invalidate(); },
			dispose() { closed = true; controller.abort(); },
		};
	}, { overlay: true, overlayOptions: { width: "100%", maxHeight: "100%", anchor: "center", margin: 1 } });
}
