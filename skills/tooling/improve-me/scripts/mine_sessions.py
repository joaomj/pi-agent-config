#!/usr/bin/env python3
"""Mine recent Pi sessions for lessons that recur and could become structure.

Reads ~/.pi/agent/sessions/*/*.jsonl modified in the last N days and writes
<out>/signals.json plus a short <out>/summary.md. Signals:

- corrections: user turns that push back on the previous assistant turn
- denials: tool calls blocked by a policy, guard, or permission extension
- errors: failing tool results, grouped by a normalized signature
- commands: shell command shapes repeated across sessions
- phrases: user sentences repeated across sessions

Everything stays local. Python 3.9+, stdlib only.
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

CORRECTION = re.compile(
    r"^(no\b|nope\b|wrong\b|stop\b|don'?t\b|do not\b|not\b|never\b|why did you\b|"
    r"i (already |just )?(said|told|asked)\b|again\b|undo\b|revert\b|instead\b|actually\b)"
    r"|\b(i told you|as i said|i said|not what i|you forgot|you didn'?t|you missed|"
    r"stop doing|don'?t (do|use|add|ask|run|create|commit|push)|should have|"
    r"instead of|wrong (file|branch|repo|place)|that'?s not)\b",
    re.IGNORECASE,
)
DENIAL = re.compile(r"denied by policy|\bblocked\b|not allowed|permission denied|refus", re.IGNORECASE)
ERROR_HINT = re.compile(r"error|failed|traceback|exception|not found|no such file", re.IGNORECASE)
SHELL_TOOLS = {"bash", "bgrun"}
MAX_EXAMPLES = 5
# A long user message repeated verbatim across this many sessions is injected text
# (harness nudges, pasted boilerplate), not something the user typed.
BOILERPLATE_SESSIONS = 3
BOILERPLATE_MIN_CHARS = 120


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--days", type=int, default=14, help="lookback window in days (default 14)")
    p.add_argument("--pi-home", type=Path, default=Path.home() / ".pi/agent", help="Pi agent home")
    p.add_argument("--cwd", action="append", default=[], help="only sessions whose cwd starts with this path (repeatable)")
    p.add_argument("--min-sessions", type=int, default=2, help="minimum distinct sessions for a recurring signal (default 2)")
    p.add_argument("--out", type=Path, required=True, help="output directory")
    return p.parse_args()


def text_of(content):
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")


def clip(text, limit):
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 3] + "..."


def signature(text):
    """Normalize an error so the same failure groups across sessions."""
    line = next((l for l in text.splitlines() if ERROR_HINT.search(l)), text.splitlines()[0] if text else "")
    line = re.sub(r"(/[\w.@~+-]+)+", "<path>", line)
    line = re.sub(r"\b[0-9a-f]{7,}\b", "<id>", line)
    line = re.sub(r"\d+", "<n>", line)
    return clip(line, 160)


def command_shape(command):
    """First real command of a shell line, with its subcommand: `git commit`, `npm test`."""
    first = command.strip().split("\n", 1)[0]
    first = re.split(r"&&|\|\||;|\|", first, maxsplit=1)[0].strip()
    words = [w for w in first.split() if "=" not in w or w.startswith("-")]
    while words and words[0] in {"cd", "sudo", "env", "time", "command"}:
        words = words[2:] if words[0] == "cd" else words[1:]
    if not words:
        return None
    head = Path(words[0]).name
    sub = next((w for w in words[1:] if not w.startswith("-")), "")
    return f"{head} {sub}".strip() if sub and re.fullmatch(r"[\w:.-]+", sub) else head


def template_openings(pi_home):
    """Opening lines of every prompt template, so expanded templates are not read as user text."""
    dirs = [pi_home / "prompts", *pi_home.glob("npm/node_modules/*/prompts"),
            *pi_home.glob("npm/node_modules/@*/*/prompts"), *pi_home.glob("git/*/*/*/prompts")]
    openings = set()
    for d in dirs:
        for f in d.glob("*.md"):
            body = re.sub(r"\A---\n.*?\n---\n", "", f.read_text(errors="replace"), flags=re.S)
            line = next((l for l in body.splitlines() if l.strip()), "")
            line = re.sub(r"`?\$\{?@[^`]*`?|\$ARGUMENTS|\$\d", "", line)
            words = " ".join(line.split()[:6]).lower()
            if len(words) >= 15:
                openings.add(words[:40])
    return openings


def is_injected(text, openings):
    t = text.lstrip()
    if not t or t.startswith(("<", "---\n", "# ")) or len(t) > 4000:
        return True
    head = " ".join(t.split()[:6]).lower()
    return any(head.startswith(o[:30]) for o in openings)


def sentences(text):
    for s in re.split(r"(?<=[.!?])\s+|\n+", text):
        s = re.sub(r"\s+", " ", s.strip().lower()).strip(" .!?")
        if 4 <= len(s.split()) <= 30:
            yield s


def session_files(root, cutoff):
    for path in sorted(root.glob("*/*.jsonl")):
        try:
            if datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc) >= cutoff:
                yield path
        except OSError as exc:
            print(f"skip {path}: {exc}", file=sys.stderr)


def mine(path, acc, openings):
    sid, cwd = path.stem, None
    last_assistant = ""
    user_turns = 0
    for line_no, raw in enumerate(path.open(encoding="utf-8", errors="replace"), 1):
        try:
            rec = json.loads(raw)
        except json.JSONDecodeError:
            print(f"{path}:{line_no}: bad JSON line skipped", file=sys.stderr)
            continue
        if rec.get("type") == "session":
            sid, cwd = rec.get("id") or sid, rec.get("cwd")
            continue
        if rec.get("type") != "message":
            continue
        msg = rec.get("message") or {}
        role = msg.get("role")
        ref = {"session": sid, "cwd": cwd, "file": str(path), "line": line_no}

        if role == "assistant":
            said = text_of(msg.get("content"))
            if said.strip():
                last_assistant = said
            for block in msg.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "toolCall" and block.get("name") in SHELL_TOOLS:
                    args = block.get("arguments") or {}
                    shape = command_shape(args.get("command", "")) if isinstance(args, dict) else None
                    if shape:
                        acc["commands"][shape].append(ref)
        elif role == "user":
            said = text_of(msg.get("content"))
            if is_injected(said, openings):
                continue
            user_turns += 1
            # Injected nudges reword their tail between versions; group them by their opening.
            ref["text_key"] = " ".join(said.split()).lower()[:BOILERPLATE_MIN_CHARS]
            acc["user_texts"][ref["text_key"]].add(sid)
            if user_turns > 1 and CORRECTION.search(said):
                acc["corrections"].append({**ref, "user": clip(said, 600), "after": clip(last_assistant[-400:], 400)})
            for s in sentences(said):
                acc["phrases"][s].append(ref)
        elif role == "toolResult":
            out = text_of(msg.get("content"))
            if not out:
                continue
            tool = msg.get("toolName") or "unknown"
            if DENIAL.search(out[:300]) and ("policy" in out[:300].lower() or "guard" in out[:300].lower() or msg.get("isError")):
                acc["denials"][signature(out)].append({**ref, "tool": tool, "text": clip(out, 300)})
            elif msg.get("isError"):
                acc["errors"][f"{tool}: {signature(out)}"].append({**ref, "text": clip(out, 300)})


def recurring(groups, min_sessions):
    rows = []
    for key, refs in groups.items():
        sessions = {r["session"] for r in refs}
        if len(sessions) >= min_sessions:
            rows.append({"key": key, "sessions": len(sessions), "hits": len(refs), "examples": refs[:MAX_EXAMPLES]})
    return sorted(rows, key=lambda r: (-r["sessions"], -r["hits"]))


def main():
    args = parse_args()
    root = args.pi_home.expanduser() / "sessions"
    if not root.is_dir():
        sys.exit(f"No Pi sessions at {root}. Pass --pi-home to point at the Pi agent home.")
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    prefixes = [str(Path(c).expanduser().resolve()) for c in args.cwd]

    acc = {"corrections": [], "denials": defaultdict(list), "errors": defaultdict(list),
           "commands": defaultdict(list), "phrases": defaultdict(list), "user_texts": defaultdict(set)}
    openings = template_openings(args.pi_home.expanduser())
    scanned = []
    for path in session_files(root, cutoff):
        with path.open(encoding="utf-8", errors="replace") as fh:
            head = json.loads(fh.readline() or "{}")
        cwd = head.get("cwd") or ""
        if prefixes and not any(cwd.startswith(p) for p in prefixes):
            continue
        mine(path, acc, openings)
        scanned.append(str(path))

    boilerplate = {t for t, sids in acc["user_texts"].items()
                   if len(t) == BOILERPLATE_MIN_CHARS and len(sids) >= BOILERPLATE_SESSIONS}
    acc["corrections"] = [c for c in acc["corrections"] if c.pop("text_key") not in boilerplate]
    for key in list(acc["phrases"]):
        refs = [r for r in acc["phrases"][key] if r.get("text_key") not in boilerplate]
        if refs:
            acc["phrases"][key] = refs
        else:
            del acc["phrases"][key]
    for refs in acc["phrases"].values():
        for r in refs:
            r.pop("text_key", None)

    signals = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "window_days": args.days,
        "sessions_scanned": len(scanned),
        "corrections": acc["corrections"],
        "denials": recurring(acc["denials"], 1),
        "errors": recurring(acc["errors"], args.min_sessions),
        "commands": recurring(acc["commands"], max(args.min_sessions, 3)),
        "phrases": recurring(acc["phrases"], args.min_sessions),
    }
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "signals.json").write_text(json.dumps(signals, indent=2, ensure_ascii=False))

    lines = [f"# Session signals: {len(scanned)} sessions, last {args.days} days", ""]
    lines.append(f"- Corrections: {len(signals['corrections'])}")
    for name in ("denials", "errors", "commands", "phrases"):
        lines.append(f"- {name.capitalize()} (recurring): {len(signals[name])}")
        for row in signals[name][:8]:
            lines.append(f"  - {row['sessions']} sessions, {row['hits']} hits: {row['key']}")
    (args.out / "summary.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nFull signals: {args.out / 'signals.json'}")


if __name__ == "__main__":
    main()
