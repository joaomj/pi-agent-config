#!/usr/bin/env python3
"""PreToolUse guard for Proton Pass access.

Two jobs:

1. **Close the audit gap.** `pass-cli` only logs reads made with an *agent*
   token. Anything run against the human session - which is what an agent
   inherits by default - leaves no trace at all. Every invocation seen here is
   appended to a local log regardless of which session it used.

2. **Put bulk and destructive operations in front of a human.** `--show-secrets`
   returns every password in a vault in one call; `item trash` removes items.
   Neither should happen because a model decided to, so both return `ask`.

Ordinary single-secret reads are allowed untouched - that is the whole point of
having the vault, and stopping them would only teach people to bypass this.

Matching is on the resolved command text, so invoking the binary by absolute
path is caught the same as invoking it by name.
"""
import json
import os
import re
import sys
import time

LOG = os.path.join(os.path.expanduser("~"), ".claude", "proton-pass-audit.log")

# Any of these mean "pass-cli is being invoked", including by absolute path.
INVOKE = re.compile(r"(?:^|[\s;|&(`'\"])(?:[\w:\\/.~-]*[\\/])?pass-cli(?:\.exe)?\b", re.I)

# Dumps every secret in a vault in a single call.
BULK = re.compile(r"--show-secrets\b", re.I)

# Changes or destroys vault contents.
MUTATE = re.compile(
    r"\b(?:item\s+(?:trash|untrash|delete|update|move|create)"
    r"|vault\s+(?:delete|update|create)"
    r"|agent\s+(?:create|delete|renew)"
    r"|personal-access-token\s+(?:create|delete)"
    r"|share\s+\w+|invite\s+\w+)\b",
    re.I,
)

# Reading the session material directly, bypassing the CLI entirely.
SESSION_PEEK = re.compile(r"proton-pass-cli[\\/]?\.?session|\.session[\\/]", re.I)

# Files that define this policy. Editing them is itself a policy change.
# Matches the canonical copies in this repo and wherever they are installed.
SELF_PROTECT = re.compile(
    r"hooks/proton-pass-guard\.py$"
    r"|hooks/pass-cli-shim\.py$"
    r"|\.claude/settings(\.local)?\.json$"
    r"|/bin/pass-cli(\.cmd)?$",
    re.I,
)

# The same protected files, but named inside a shell command rather than an
# Edit/Write tool call. Without this, a here-doc or redirection that rewrites
# settings.json walks straight past the self-protection above.
PROTECTED_IN_CMD = re.compile(
    r"proton-pass-guard\.py|pass-cli-shim\.py"
    r"|\.claude[\/]settings(\.local)?\.json"
    r"|bin[\/]pass-cli(\.cmd)?\b",
    re.I,
)

# Shell constructs that modify a file. Reading a policy file is fine; rewriting
# it is the thing worth surfacing.
WRITES = re.compile(
    r">>?"                                              # shell redirection
    r"|(?:^|[\s;|&(])(?:tee|cp|mv|rm|dd|install)\b"     # commands, as whole words
    r"|sed\s+-i|perl\s+-i"                              # in-place rewrites
    r"|Set-Content|Out-File|Add-Content|Remove-Item"    # PowerShell
    r"|Copy-Item|Move-Item|New-Item"
    r"|open\([^)]*['\"][wa]|io\.open\([^)]*['\"][wa]",  # Python file writes
    re.I,
)

# Never let a token reach the log even if someone puts one on a command line.
REDACT = [
    (re.compile(r"pst_[A-Za-z0-9_\-]+::[A-Za-z0-9_\-]+"), "pst_<REDACTED>"),
    (re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{20,})\b"), "<REDACTED-GH-TOKEN>"),
    (re.compile(r"(--?password[= ])\S+", re.I), r"\1<REDACTED>"),
]


def redact(s):
    for pat, rep in REDACT:
        s = pat.sub(rep, s)
    return s


def log(verdict, command, cwd):
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        line = "%s\t%s\tcwd=%s\t%s\n" % (
            time.strftime("%Y-%m-%d %H:%M:%S"),
            verdict,
            cwd or "?",
            redact(" ".join(command.split()))[:600],
        )
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass  # logging must never block the tool call


def decide(decision, reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    ti = payload.get("tool_input") or {}
    command = ti.get("command") or ""
    cwd = payload.get("cwd") or ti.get("cwd") or ""

    # A guard that can edit itself away is a suggestion, not a control.
    path = (ti.get("file_path") or ti.get("notebook_path") or "").replace("\\", "/")
    if path:
        low = path.lower()
        if SELF_PROTECT.search(low):
            log("ASK-self-edit", "EDIT " + path, cwd)
            decide("ask", (
                "This edits the Proton Pass guard itself (or the settings that "
                "install it). Approve only if you asked for the policy to change "
                "- an agent editing its own restrictions is exactly the case this "
                "is here to surface."
            ))
        sys.exit(0)

    if not command:
        sys.exit(0)

    touches_cli = bool(INVOKE.search(command))
    peeks = bool(SESSION_PEEK.search(command))

    if PROTECTED_IN_CMD.search(command) and WRITES.search(command):
        log("ASK-policy-file", command, cwd)
        decide("ask", (
            "This command references a file that defines the Proton Pass access "
            "policy - the guard, the shim, or the settings that install them. "
            "Here-docs and redirection bypass the Edit/Write checks, so shell "
            "commands naming these files are gated too. Approve only if you "
            "asked for the policy to change."
        ))

    if not touches_cli and not peeks:
        sys.exit(0)

    if peeks and not touches_cli:
        log("ASK-session-peek", command, cwd)
        decide("ask", (
            "This command reads Proton Pass session material directly, which "
            "sidesteps pass-cli and its access controls entirely. Approve only "
            "if you know why it needs the raw session."
        ))

    if BULK.search(command):
        log("ASK-bulk", command, cwd)
        decide("ask", (
            "`--show-secrets` returns EVERY password, TOTP seed and passkey in "
            "the vault in a single response - there is no per-item scope. It is "
            "also blocked on agent sessions by design, so this is running "
            "against your human session with full access.\n\n"
            "Legitimate for a whole-vault job like deduplication. Not legitimate "
            "for looking up one credential - that is `item view pass://...`."
        ))

    if MUTATE.search(command):
        log("ASK-mutate", command, cwd)
        decide("ask", (
            "This changes or removes Proton Pass contents. `item trash` is "
            "reversible via `item untrash`; `vault delete` and alias removal are "
            "not. Check the target is what you expect before approving."
        ))

    log("allow", command, cwd)
    decide("allow", "Ordinary Proton Pass read - logged, not gated.")


if __name__ == "__main__":
    main()
