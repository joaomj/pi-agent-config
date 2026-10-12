#!/usr/bin/env python3
"""Measure process launch to acceptance of a prompt through Pi's interactive editor."""

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import pty
import random
import re
import selectors
import shutil
import signal
import statistics
import struct
import subprocess
import termios
import time
import uuid

from terminal import TerminalReplies

ROOT = Path(__file__).resolve().parents[2]
PROBE = Path(__file__).with_name("probe.ts")
ANSI = re.compile(rb"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))")


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def package_source(package):
    return package if isinstance(package, str) else package["source"]


def cases(settings):
    result = {
        "baseline": {},
        "terminal-no-replies": {"replies": False},
        "quiet-startup": {"settings": {"quietStartup": True}},
        "dark-theme": {"settings": {"theme": "dark"}},
        "fullscreen": {"args": ["--tui-mode", "fullscreen"]},
        "no-mcp": {"args": ["--no-mcp"]},
        "no-skills": {"args": ["--no-skills"]},
        "no-prompts": {"args": ["--no-prompt-templates"]},
        "no-context": {"args": ["--no-context-files"]},
        "no-extensions-diagnostic": {"args": ["--no-extensions"]},
        "optional-integrations-and-fff-off": {"remove": [
            "pi-sentry", "pi-telemetry", "pi-subscription-usage", "pi-claude-directsdk", "pi-fff",
        ]},
        "optional-integrations-off": {"remove": [
            "pi-sentry", "pi-telemetry", "pi-subscription-usage", "pi-claude-directsdk",
        ]},
    }
    for package in settings.get("packages", []):
        source = package_source(package)
        name = source.removeprefix("npm:").split("@", 1)[0] if not source.startswith("npm:@") else source[5:].split("@", 1)[0]
        name = name.rsplit("/", 1)[-1].split("@", 1)[0]
        result[f"without-{name}"] = {"remove": [source]}
    return result


def snapshot_agent(source, destination, settings, case):
    destination.mkdir(mode=0o700)
    for path in source.glob("*.json"):
        if path.name != "auth.json":
            shutil.copy2(path, destination / path.name)
    for name in ("AGENTS.md", "SYSTEM.md", "APPEND_SYSTEM.md"):
        if (source / name).exists():
            shutil.copy2(source / name, destination / name)
    for name in ("extensions", "state"):
        if (source / name).exists():
            shutil.copytree(source / name, destination / name)
    for name in ("npm", "git", "bin", "skills", "prompts", "themes"):
        if (source / name).exists():
            (destination / name).symlink_to(source / name, target_is_directory=True)
    configured = json.loads(json.dumps(settings))
    removed = case.get("remove", [])
    configured["packages"] = [p for p in configured.get("packages", [])
                              if not any(part in package_source(p) for part in removed)]
    configured.update(case.get("settings", {}))
    save_json(destination / "settings.json", configured)


def stop_process(process):
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=1)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)


def launch(agent, directory, case, cwd, cache_state="warm", drop_os_caches=False):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 640, 960))
    probe_text = "startup_ready_" + uuid.uuid4().hex
    result_path = directory / "accepted.json"
    env = dict(os.environ)
    for name in ("PI_STARTUP_BENCHMARK", "PI_TUI_WRITE_LOG", "PI_CODING_AGENT_SESSION_DIR"):
        env.pop(name, None)
    env.update(PI_CODING_AGENT_DIR=str(agent), PI_READY_PROBE_TEXT=probe_text,
               PI_READY_PROBE_RESULT=str(result_path), PI_TIMING="1", PI_TELEMETRY="0")
    if cache_state == "cold":
        # Empty directories preserve normal cache reuse within this launch, but not across launches.
        cache_root = directory / "compilation-caches"
        cache_root.mkdir()
        env.pop("NODE_DISABLE_COMPILE_CACHE", None)
        env["NODE_COMPILE_CACHE"] = str(cache_root / "node")
        temporary = cache_root / "tmp"
        temporary.mkdir()
        env["TMPDIR"] = str(temporary)
        env["JITI_FS_CACHE"] = "true"
        env["JITI_REBUILD_FS_CACHE"] = "false"
    if case.get("first_use"):
        env["PI_PERF_FIRST_USE_RESULT"] = str(directory / "first-use.json")
        env["PI_PERF_PROTECTED_PATH"] = str(directory / ".env")
        (directory / ".env").write_text("Harmless startup measurement marker\n")
    command = ["pi", "--no-session", "-e", str(PROBE), *case.get("args", [])]
    save_json(directory / "invocation.json", {"command": command, "cwd": str(cwd),
              "terminal_replies": case.get("replies", True), "probe_interval_ms": 10,
              "cache_state": cache_state, "drop_os_caches": drop_os_caches,
              "compilation_caches": {key: env.get(key) for key in ("NODE_COMPILE_CACHE", "JITI_FS_CACHE", "TMPDIR")}})
    if drop_os_caches:
        before = Path("/proc/meminfo").read_text()
        try:
            # Clear reclaimable filesystem caches immediately before process launch, outside the timed interval.
            cleared = subprocess.run(
                ["sudo", "-n", "sh", "-c", "sync && printf '3\\n' > /proc/sys/vm/drop_caches"],
                capture_output=True, text=True, check=True,
            )
        except subprocess.CalledProcessError as error:
            os.close(master)
            os.close(slave)
            save_json(directory / "failure.json", {"error": "Filesystem cache clearing failed",
                      "stderr": error.stderr, "returncode": error.returncode})
            raise RuntimeError(f"Cannot clear filesystem caches: {error.stderr.strip()}. Run sudo -v first.") from error
        save_json(directory / "cache-reset.json", {"command": cleared.args,
                  "meminfo_before": before, "meminfo_after": Path("/proc/meminfo").read_text()})
    started = time.monotonic_ns()
    try:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdin=slave, stdout=slave,
                                   stderr=slave, start_new_session=True)
    except BaseException:
        os.close(master)
        os.close(slave)
        raise
    os.close(slave)
    terminal = TerminalReplies()
    selector = selectors.DefaultSelector()
    selector.register(master, selectors.EVENT_READ)
    raw = bytearray()
    submissions = 0
    first_ui_ns = None
    last_submit = 0
    with (directory / "terminal.raw").open("wb") as output, (directory / "events.jsonl").open("w") as events:
        def event(kind, **fields):
            events.write(json.dumps({"elapsed_ms": (time.monotonic_ns() - started) / 1e6,
                                     "kind": kind, **fields}) + "\n")
            events.flush()
        try:
            while not result_path.exists():
                now = time.monotonic_ns()
                if now - started > 30_000_000_000:
                    raise TimeoutError("Pi did not accept the interactive probe within 30 seconds")
                for key, _ in selector.select(timeout=0.005):
                    try:
                        data = os.read(key.fd, 65536)
                    except OSError as error:
                        if error.errno != errno.EIO:
                            raise
                        data = b""
                    if not data:
                        raise RuntimeError(f"Pi exited before accepting input (status {process.poll()})")
                    output.write(data)
                    output.flush()
                    raw.extend(data)
                    if len(raw) > 2 * 1024 * 1024:
                        raise RuntimeError("Startup output exceeded 2 MiB; inspect terminal.raw")
                    for query, reply in terminal.feed(data):
                        if first_ui_ns is None:
                            first_ui_ns = time.monotonic_ns()
                        event("terminal-query", query=query.hex())
                        if case.get("replies", True):
                            os.write(master, reply)
                            event("terminal-reply", reply=reply.hex())
                    # Bracketed-paste mode is enabled when the interactive terminal starts.
                    if first_ui_ns is None and b"\x1b[?2004h" in raw:
                        first_ui_ns = time.monotonic_ns()
                now = time.monotonic_ns()
                if first_ui_ns is not None and now - last_submit >= 10_000_000:
                    # Replace the editor line before each attempt; startup preserves unaccepted text.
                    os.write(master, b"\x01\x0b" + probe_text.encode() + b"\r")
                    submissions += 1
                    last_submit = now
                    event("submit", attempt=submissions)
            accepted = json.loads(result_path.read_text())
            accepted_ns = int(accepted["acceptedNs"])
            if accepted["mode"] != "tui" or accepted_ns < started:
                raise RuntimeError(f"Invalid interactive probe result: {accepted}")
            result = {"ready_ms": (accepted_ns - started) / 1e6,
                      "first_ui_ms": (first_ui_ns - started) / 1e6,
                      "submissions": submissions, "active_tools": accepted["activeTools"]}
            event("accepted", ready_ms=result["ready_ms"])
            if case.get("first_use"):
                first_use_path = directory / "first-use.json"
                for phase in (("prompt", "find", "grep") if case.get("search_use") else ("prompt", "protected")):
                    submitted_ns = time.monotonic_ns()
                    os.write(master, b"\x01\x0bstartup_performance_" + phase.encode() + b"\r")
                    event("first-use-submit", phase=phase)
                    while True:
                        if first_use_path.exists():
                            first_use = json.loads(first_use_path.read_text())
                            if f"{phase}CompletedNs" in first_use:
                                break
                        if time.monotonic_ns() - submitted_ns > 30_000_000_000:
                            raise TimeoutError(f"First-use {phase} did not complete within 30 seconds")
                        for key, _ in selector.select(timeout=0.005):
                            try:
                                data = os.read(key.fd, 65536)
                            except OSError as error:
                                if error.errno != errno.EIO:
                                    raise
                                data = b""
                            if not data:
                                raise RuntimeError(f"Pi exited during first-use {phase} (status {process.poll()})")
                            output.write(data)
                            output.flush()
                            raw.extend(data)
                            if len(raw) > 2 * 1024 * 1024:
                                raise RuntimeError("First-use output exceeded 2 MiB; inspect terminal.raw")
                            for _, reply in terminal.feed(data):
                                if case.get("replies", True):
                                    os.write(master, reply)
                    result[f"first_{phase}_ms"] = (int(first_use[f"{phase}CompletedNs"]) - submitted_ns) / 1e6
                    result[f"first_{phase}_handler_ms"] = (int(first_use[f"{phase}CompletedNs"]) - int(first_use[f"{phase}AcceptedNs"])) / 1e6
                    if phase == "protected":
                        if first_use.get("toolBlocked") is not True or first_use.get("requests") != 3:
                            raise RuntimeError(f"First protected read did not produce a verified denial: {first_use}")
                        result["first_protected_tool_ms"] = (int(first_use["toolCompletedNs"]) - submitted_ns) / 1e6
                        result["protected_tool_blocked"] = True
                    if phase in ("find", "grep"):
                        if first_use.get(f"{phase}Verified") is not True:
                            raise RuntimeError(f"First FFF {phase} returned no verified result: {first_use}")
                        result[f"first_{phase}_tool_ms"] = (int(first_use[f"{phase}ToolCompletedNs"]) - submitted_ns) / 1e6
                        result[f"{phase}_verified"] = True
                        if phase == "grep" and first_use.get("requests") != 5:
                            raise RuntimeError(f"Unexpected request count in FFF measurement: {first_use}")
                    event("first-use-completed", phase=phase)
            save_json(directory / "result.json", result)
            return result
        except BaseException as error:
            save_json(directory / "failure.json", {"error": str(error), "type": type(error).__name__})
            raise
        finally:
            stop_process(process)
            selector.close()
            os.close(master)
            (directory / "terminal.txt").write_text(ANSI.sub(b"", bytes(raw)).decode(errors="replace"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repetitions", type=int, default=5)
    parser.add_argument("--cases", nargs="*")
    parser.add_argument("--agent-dir", type=Path, default=Path.home() / ".pi/agent")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--cache-state", choices=("warm", "cold"), default="warm")
    parser.add_argument("--drop-os-caches", action="store_true",
                        help="Clear system-wide reclaimable filesystem caches through sudo before each cold launch")
    args = parser.parse_args()
    if platform.system() != "Linux":
        parser.error("The probe compares Linux CLOCK_MONOTONIC timestamps; run this experiment on Linux.")
    if args.repetitions < 1:
        parser.error("--repetitions must be at least 1")
    if os.geteuid() == 0:
        parser.error("Run the experiment as your normal user, not root. Only cache clearing uses sudo.")
    if args.drop_os_caches and args.cache_state != "cold":
        parser.error("--drop-os-caches requires --cache-state cold")
    os.umask(0o077)
    source = args.agent_dir.resolve()
    settings = json.loads((source / "settings.json").read_text())
    matrix = cases(settings)
    if args.cases:
        unknown = set(args.cases) - matrix.keys()
        if unknown:
            parser.error(f"Unknown cases: {sorted(unknown)}; available: {list(matrix)}")
        matrix = {name: matrix[name] for name in args.cases}
    output = args.output or (Path.home() / ".local/state/pi-startup-experiments" /
                            (time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]))
    output = output.resolve()
    output.mkdir(parents=True, mode=0o700)
    save_json(output / "manifest.json", {"metric": "launch to interactive prompt input handler",
              "source_agent": str(source), "cwd": str(ROOT), "repetitions": args.repetitions, "warmups_per_case": 1 if args.cache_state == "warm" else 0,
              "cache_state": args.cache_state, "drop_os_caches": args.drop_os_caches,
              "cases": matrix, "platform": platform.platform(), "pi": shutil.which("pi"),
              "node_version": subprocess.check_output(["node", "--version"], text=True).strip(),
              "runner_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "limitations": ["Synthetic terminal replies, not a real terminal emulator",
                              "No model request; input probe consumes the prompt",
                              ("Warm OS and compilation caches; no cold-cache claim" if args.cache_state == "warm" else
                               "Empty compilation caches per launch; " +
                               ("reclaimable filesystem caches cleared before each launch" if args.drop_os_caches else
                                "filesystem caches are not cleared")),
                              "Application databases and model catalogs are retained; hardware caches are not controlled",
                              "Input attempts have approximately 10 ms resolution"]})
    # Keep the exact runner and probe with the logs for recovery after branch changes.
    for path in (Path(__file__), PROBE, Path(__file__).with_name("terminal.py")):
        shutil.copy2(path, output / path.name)
    log_path = output / "progress.log"
    with log_path.open("w") as log:
        def report(text):
            print(text, flush=True)
            log.write(text + "\n")
            log.flush()
        report(f"Persistent results: {output}")
        profiles = output / "profiles"
        profiles.mkdir()
        for name, case in matrix.items():
            snapshot_agent(source, profiles / name, settings, case)
        samples = []
        rng = random.Random(20261011)
        try:
            # Warm runs exclude one cache-populating launch. Cold runs start every launch with empty caches.
            first_repetition = 0 if args.cache_state == "warm" else 1
            for repetition in range(first_repetition, args.repetitions + 1):
                order = list(matrix)
                rng.shuffle(order)
                for name in order:
                    directory = output / f"{repetition:02d}-{name}"
                    directory.mkdir()
                    agent = profiles / name
                    result = launch(agent, directory, matrix[name], ROOT, args.cache_state, args.drop_os_caches)
                    sample = {"case": name, "repetition": repetition, "warmup": repetition == 0, **result}
                    samples.append(sample)
                    save_json(output / "samples.json", samples)
                    label = "warmup" if repetition == 0 else f"{repetition}/{args.repetitions}"
                    report(f"{label} {name}: {result['ready_ms']:.1f} ms")
        except BaseException as error:
            report(f"FAILED: {type(error).__name__}: {error}")
            raise
        finally:
            # Retain configuration and logs, but remove credentials after the experiment.
            for agent in profiles.iterdir():
                (agent / "auth.json").unlink(missing_ok=True)
        summary = []
        for name in matrix:
            values = [sample["ready_ms"] for sample in samples if sample["case"] == name and not sample["warmup"]]
            summary.append({"case": name, "median_ms": statistics.median(values),
                            "min_ms": min(values), "max_ms": max(values), "samples": len(values)})
        save_json(output / "summary.json", summary)
        for row in sorted(summary, key=lambda row: row["median_ms"]):
            report(f"{row['case']}: median {row['median_ms']:.1f} ms "
                   f"({row['min_ms']:.1f}–{row['max_ms']:.1f})")


if __name__ == "__main__":
    main()
