#!/usr/bin/env python3
"""Add a `git -* <subcommand>` twin after every `git <subcommand>` ask rule.

A global option before the subcommand, as in `git -C <dir> push`, does not
match `git push*`, so the command runs without a prompt. The twin catches any
option spelling. Run it on a policy file; a second run changes nothing.

    scripts/git-option-rules.py <config.json>
"""
import json
import sys

path = sys.argv[1]
with open(path) as handle:
    policy = json.load(handle)

action = lambda value: value["action"] if isinstance(value, dict) else value
rules = policy["permission"]["bash"]
result = {}
for pattern, value in rules.items():
    if pattern.startswith("git -* "):
        continue
    result[pattern] = value
    if pattern.startswith("git ") and not pattern.startswith("git -") and action(value) == "ask":
        result["git -* " + pattern[4:]] = value
policy["permission"]["bash"] = result

with open(path, "w") as handle:
    json.dump(policy, handle, indent=2, ensure_ascii=False)
    handle.write("\n")
