# Bug fix

You own this fix. Be scientific: every line you ship traces to runtime
evidence. A change that "might help" is a hypothesis, not a fix, and it does
not ship. When evidence refutes a hypothesis, revert what it motivated. Ship
the smallest change the evidence justifies.

1. Reproduce the bug yourself on the surface where users meet it: the app
   through its verification skill, the CLI, the API, or a test. Ask the
   operator only when that surface cannot reach the target, and say why. If
   it does not reproduce, synthesize the trigger, tighten the conditions, or
   add instrumentation until it does.
2. Binary-search the cause. List the candidate hypotheses, then rule them out
   until one survives. Seed them with a trace of the affected code and its
   history (`git log -L`, `git blame`). Each pass, take the split that removes
   the most remaining problem space and get runtime evidence. When program
   state is unclear, add logging and read it as the code runs. Confirm the
   surviving mechanism with runtime evidence before you plan the fix.
3. Plan the fix. Name the data shape it changes before you write logic.
4. Verify on the same surface. The original repro now passes. An
   inconclusive result or a check on the wrong surface is not a pass; flag
   it. Unit tests show branch behavior, not that the bug is gone.
5. Stage the commits so the failing repro lands before the fix, when the bug
   has a cheap local test. Skip that when the test would be expensive,
   integration-heavy, or unclear.

Report: what was broken, the root cause, the fix, and how you verified it,
with the failing-then-passing output.
