#!/usr/bin/env python3
"""pass-cli shim - audit and supervision for callers Claude Code hooks cannot reach.

Claude Code sessions are gated by proton-pass-guard.py. This covers everything
else - Codex, cron, plain scripts, an interactive shell - with the same policy
and the same log, so there is one place to read and one place to change.

  ordinary reads       -> pass through, logged
  --show-secrets       -> confirm at a TTY; refuse if headless
  mutating operations  -> confirm at a TTY; refuse if headless

A headless caller that genuinely needs a sensitive operation must set
PROTON_PASS_APPROVED=1. That is deliberately awkward - it makes the escalation
visible in the command, in the log, and in any transcript.

This is supervision, not containment: the real binary is still on disk and
anyone who knows its path can call it directly. What this guarantees is that
the easy path is the observed path.
"""
import os
import re
import subprocess
import sys
import time

REAL = r"C:\Users\tohuw\AppData\Local\Programs\ProtonPass\pass-cli.exe"
LOG = os.path.join(os.path.expanduser("~"), ".claude", "proton-pass-audit.log")

BULK = re.compile(r"(?:^|\s)--show-secrets(?:\s|=|$)")
MUTATE = [
    (re.compile(r"\bitem\s+(?:trash|untrash|delete|update|move|create)\b"), "modifies vault items"),
    (re.compile(r"\bvault\s+(?:delete|update|create)\b"), "modifies vaults"),
    (re.compile(r"\b(?:agent\s+(?:create|delete|renew)|personal-access-token\s+(?:create|delete))\b"),
     "changes agent/PAT access"),
    (re.compile(r"\b(?:share|invite)\s+\w+"), "shares vault contents with someone else"),
]
REDACT = [
    (re.compile(r"pst_[A-Za-z0-9_\-]+::[A-Za-z0-9_\-]+"), "pst_<REDACTED>"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), "<REDACTED-GH-TOKEN>"),
]


def note(verdict, argstr):
    for pat, rep in REDACT:
        argstr = pat.sub(rep, argstr)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write("%s\t%s\tshim\tcwd=%s\tpass-cli %s\n" % (
                time.strftime("%Y-%m-%d %H:%M:%S"), verdict, os.getcwd(), argstr[:600]))
    except Exception:
        pass


def main():
    args = sys.argv[1:]
    argstr = " ".join(args)

    if not os.path.exists(REAL):
        sys.stderr.write("pass-cli shim: real binary not found at %s\n" % REAL)
        return 127

    why = None
    if BULK.search(" " + argstr):
        why = "bulk secret dump (every password in the vault, in one response)"
    else:
        for pat, label in MUTATE:
            if pat.search(argstr):
                why = label
                break

    if why:
        if os.environ.get("PROTON_PASS_APPROVED") == "1":
            note("ALLOW-preapproved", argstr)
        elif sys.stdin.isatty() and sys.stderr.isatty():
            sys.stderr.write("\n  Proton Pass: %s\n  > pass-cli %s\n\n  Allow? [y/N] " % (why, argstr))
            sys.stderr.flush()
            try:
                reply = sys.stdin.readline().strip().lower()
            except Exception:
                reply = ""
            if reply in ("y", "yes"):
                note("ALLOW-confirmed", argstr)
            else:
                note("DENY-declined", argstr)
                sys.stderr.write("  Declined.\n")
                return 13
        else:
            note("DENY-headless", argstr)
            sys.stderr.write(
                "\n  pass-cli shim: refusing a sensitive operation with no human present.\n"
                "    operation : %s\n    command   : pass-cli %s\n\n"
                "  Nothing here could prompt for approval. If this is genuinely intended,\n"
                "  re-run with PROTON_PASS_APPROVED=1 so the escalation is explicit and logged.\n\n"
                % (why, argstr))
            return 13
    else:
        note("allow", argstr)

    return subprocess.call([REAL] + args)


if __name__ == "__main__":
    sys.exit(main())
