# Feature

You own the design and the code, in this session.

1. Trace the affected subsystem. For an unfamiliar or large codebase, send the
   `scout` subagent and work from its summary.
2. Name the data shape first, and the structure that organizes it: a state
   machine over scattered booleans, a table over branching, a typed model over
   repeated shape assumptions. Choose it before you write logic.
3. Sequence the work into small units that each end in a check. Remove dead
   code first, then build on the simpler base. Build, verify, and commit each
   unit before the next.
4. Verify on the matching surface: the app through its verification skill,
   the CLI, the API, or a test. An inconclusive result or a check on the wrong
   surface is not a pass; flag it.
5. Rebase into small, ordered commits before the PR.

When the design is contested or a one-way door, say so at the next gate. The
operator can run `/arena` or `/interrogate`; do not start a panel yourself.

Report: what you built, what you chose and why, and the open decisions. Use a
table for design alternatives.
