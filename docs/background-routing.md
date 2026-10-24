# Background routing

`extensions/bgrun-guard.ts` decides, for every `bash` call the agent makes,
whether to run the command inline or hand it to `bgrun` from
[`pi-background-run`](https://pi.dev/packages/pi-background-run). The tool result
states the decision, for example `[bgrun-guard: rule: build]` or
`[bgrun-guard: background p=0.24]`.

Without `pi-background-run` the extension does nothing: every call runs inline
and the model sees no note.

## Decision order

1. `/bgroute off` leaves every call inline for the rest of the session.
2. **Rules.** Unambiguous shapes settle the call without a model: test suites,
   builds, dependency installs, container builds, infrastructure changes, dev
   servers, watchers, sleeps of 30 seconds or more, and long-running linters.
3. **Measurements.** What this machine measured for the same command in the same
   directory travels with the request as a fact.
4. **Classifier.** A typed-decision model answers `background` or `inline` with a
   probability. The command goes to the background when `probabilities.background`
   is at or above the threshold, which defaults to `0.4`.

A compound command follows its heaviest part. A test command that carries a
selector (`pytest path::test`, `-k`, `-r`, `--grep`, a single test file) skips the
test rule and goes to the classifier, because one test is not a suite.

## Fail open

A missing classifier, a model that is not in the catalog, a timeout (2500 ms), an
answer that is not a choice, or a failed handoff all run the command inline.
Routing never blocks a command the agent asked for.

## Measurements

`~/.pi/agent/bgrun-observations.json`, under `PI_CODING_AGENT_DIR` when that is
set, records what this machine measured: duration, lines printed, and whether the
output was truncated. The key is the working directory plus the first two or
three words of the command, so a record describes one command in one project.
At most 500 entries are kept, newest first, with an atomic write.

Only an inline call that reached the classifier is recorded. Commands the rules
settled never write anything, because the classifier never sees them. Inline
scripts such as `python3 -c` and `node -e` are never recorded, because a one-off
program says nothing about the next one. A second session merges with the file
before it writes, so it cannot revert what another session measured.

Checks whose output the agent needs before it can choose the next step are judged
without a record: type checkers (`tsc`, `mypy`, `pyright`, `cargo check`,
`cargo clippy`, `go vet`), linters outside the rule table (`rubocop`, `pylint`,
`flake8`, `shellcheck`), formatters in check mode (`prettier --check`,
`black --check`, `gofmt`, `rustfmt`, `terraform fmt`, `terraform validate`), and
focused test selectors. A duration record taught the classifier to background
them, which costs a turn every time the answer is needed.

## Configuration

| Setting | Default | Effect |
| --- | --- | --- |
| `/bgroute on` or `/bgroute off` | on | Routing for this session |
| `/bgroute <provider>/<model>` | `openrouter/typesafe/jev-1.14` | Classifier for this session; any classifier in the catalog |
| `BGRUN_DECISION_MODEL` | `openrouter/typesafe/jev-1.14` | Classifier at startup |
| `BGRUN_DECISION_THRESHOLD` | `0.4` | Probability at or above which a call is backgrounded. A value outside 0 to 1 warns once and falls back to `0.4` |

`/bgroute` with no argument prints the mode, the classifier, the threshold, the
number of measured commands, and the counters for this session: how many calls
went to the background, how many rules settled without a model, how many were
judged, and how many fell back.

## Limits

- **Cold start.** A command with no record is judged on its shape alone. An
  unrecognised slow command can run inline once. That run is measured, so the
  next one carries the fact.
- **Records do not cross projects.** How long a command takes depends on the
  codebase, so a record from another repository is never used.
- **Backgrounded commands are never measured.** Only inline output is observed.
- **`cd` inside the command.** The record is keyed by the session directory, not
  by the directory the command changes into.
- **Threshold.** Backgrounding is the cheaper mistake: it costs one round trip,
  while an inline stall blocks the session. On a 14-command sample, three runs
  each, the classifier was correct on 11 commands at `0.4` and 9 at `0.8`; the
  two it lost were correct calls. Treat the numbers as a sample, not a benchmark.
