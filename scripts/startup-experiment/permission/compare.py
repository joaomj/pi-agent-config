#!/usr/bin/env python3
"""Compare unchanged and lazy permissions through the same interactive Pi process."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import statistics
import sys
import time
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from run import launch, package_source, save_json, snapshot_agent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent-dir", type=Path, required=True)
    parser.add_argument("--lazy-package", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--pairs", type=int, default=5)
    args = parser.parse_args()
    if args.pairs < 1:
        parser.error("--pairs must be positive")
    if os.geteuid() == 0:
        parser.error("Run as your normal user, not root")
    os.umask(0o077)
    settings = json.loads((args.agent_dir / "settings.json").read_text())
    packages = settings.get("packages", [])
    matches = [i for i, item in enumerate(packages) if "@gotgenes/pi-permission-system" in package_source(item)]
    if len(matches) != 1:
        raise ValueError("--agent-dir settings must contain exactly one current permission package")
    lazy = args.lazy_package.resolve(strict=True)
    if not (lazy / "experiment.json").is_file():
        raise ValueError("--lazy-package must be an overlay created by permission/prepare.py")
    output = args.output.resolve()
    output.mkdir(mode=0o700)
    seed = uuid.uuid4().int
    rng = random.Random(seed)
    first_use = Path(__file__).with_name("first-use.ts").resolve()
    cwd = Path(__file__).resolve().parents[3]
    save_json(output / "manifest.json", {"pairs_per_condition": args.pairs, "seed": seed,
        "warmups_per_case": 1, "cold_definition": "Fresh Node compile cache and jiti TMPDIR; filesystem caches not cleared",
        "metrics": ["ready_ms", "first_prompt_ms", "first_protected_tool_ms", "first_protected_ms"],
        "original_packages": packages, "lazy_manifest": json.loads((lazy / "experiment.json").read_text()),
        "first_use_sha256": hashlib.sha256(first_use.read_bytes()).hexdigest(),
        "runner_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "limitations": ["Synthetic terminal replies", "Approximately 10 ms readiness probe resolution",
            "Common offline provider added to both profiles", "First prompt precedes the first protected tool",
            "No filesystem cache reset; not comparable to earlier filesystem-cold medians"]})
    definitions = {}
    for name in ("unchanged", "lazy"):
        configured = json.loads(json.dumps(packages))
        if name == "lazy":
            index = matches[0]
            if isinstance(configured[index], str):
                configured[index] = str(lazy)
            else:
                configured[index]["source"] = str(lazy)
        case = {"settings": {"packages": configured}, "first_use": True,
            "args": ["-e", str(first_use), "--provider", "startup-performance", "--model", "scripted", "--thinking", "off"]}
        profile = output / f"profile-{name}"
        snapshot_agent(args.agent_dir, profile, settings, case)
        if (profile / "auth.json").exists():
            raise RuntimeError("The isolated profile unexpectedly contains authentication")
        definitions[name] = (profile, case)
    results = []
    for condition in ("warm", "cold"):
        rounds = [0, *range(1, args.pairs + 1)] if condition == "warm" else range(1, args.pairs + 1)
        for round_number in rounds:
            names = list(definitions)
            rng.shuffle(names)
            for name in names:
                directory = output / f"{condition}-{round_number:02d}-{name}"
                directory.mkdir()
                profile, case = definitions[name]
                result = launch(profile, directory, case, cwd, cache_state=condition)
                record = {"condition": condition, "pair": round_number, "case": name,
                    "warmup": round_number == 0, **result}
                results.append(record)
                save_json(output / "results.json", results)
                print(json.dumps(record), flush=True)
    summary = {}
    for condition in ("warm", "cold"):
        summary[condition] = {}
        for metric in ("ready_ms", "first_prompt_ms", "first_protected_tool_ms", "first_protected_ms"):
            grouped = {name: [r for r in results if r["condition"] == condition and r["case"] == name and not r["warmup"]] for name in definitions}
            diffs = [next(r[metric] for r in grouped["unchanged"] if r["pair"] == pair) - next(r[metric] for r in grouped["lazy"] if r["pair"] == pair) for pair in range(1, args.pairs + 1)]
            summary[condition][metric] = {"unchanged_median_ms": statistics.median(r[metric] for r in grouped["unchanged"]),
                "lazy_median_ms": statistics.median(r[metric] for r in grouped["lazy"]),
                "paired_saving_median_ms": statistics.median(diffs), "lazy_wins": sum(d > 0 for d in diffs), "pairs": args.pairs}
    save_json(output / "summary.json", summary)
    print("SUMMARY " + json.dumps(summary), flush=True)
    print(f"Evidence: {output}", flush=True)


if __name__ == "__main__":
    main()
