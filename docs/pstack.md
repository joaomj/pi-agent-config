# The pstack workflow

This package carries a port of parts of
[pstack](https://github.com/cursor/plugins/tree/main/pstack), Lauren Tan's
skills and playbooks for coding agents (MIT license). The port fits one flow:
a ticket goes to a merged PR, and you decide at four fixed points instead
of steering the agent all the time.

## Run a ticket

```text
/skill:ticket PROJ-123
```

The ticket can be a tracker id or URL, a file, or pasted text. The agent
reads a tracker with the tools your session has for it, such as an MCP server
or `gh issue view`. When it has none, it asks once for the ticket text. A
ticket from a file or pasted text gets no tracker update at Gate D.

| Gate | When | You do |
|---|---|---|
| A | The agent read the ticket and wrote a contract: goal, done check, scope, branch, open questions with its picks | Approve or correct it |
| B | The code is done and verified | Read the catch-up, answer the one `open-pr.sh` prompt (push and PR) |
| C | CI passes and no review thread is open | Send the sign-off request it drafted, tell it when sign-off is given |
| D | Sign-off is given | Answer the `land-pr.sh` prompt (merge) and the tracker prompt, if any |

`open-pr.sh` never force-pushes. `land-pr.sh` merges only a PR that
`watch-pr.sh` still reports `ready`. A rebase or force-push after a conflict
is yours to do.

After Gate A, the `ticket-harness` extension holds the approved contract. It
keeps the contract in the system prompt, and before the agent stops it runs
the done command in the worktree and checks that tracked files are
committed. When either fails, the agent continues, at most twice per message
from you. The harness runs the done command only when the permission policy
allows it without a prompt; otherwise it tells the agent to run it.
`scripts/check-ticket-harness.sh` tests this.

Before Gate B, one `reviewer` subagent reads the diff with no memory of
writing it. The agent fixes or disproves each finding before it opens the PR.

Between gates the agent makes every choice it can undo, logs it, and lists it
at the next gate. It brings review comments it classifies as `ask` to you,
batched once per review round. Answer several numbered questions in one line,
such as `1 yes, 2 B`.

The decision log for a ticket is at `~/.pi/agent/pstack/logs/<KEY>.tsv`. View
it with `column -s$'\t' -t <file>`. To resume a ticket in a new session, run
`/skill:ticket <KEY>` again; the agent continues from the log.

## Other commands

| Command | Use |
|---|---|
| `/skill:ketchup` | A catch-up on what changed and what waits on you |
| `/skill:show-me-your-work` | Keep a decision log for other long work |
| `/skill:create-verification-skill` | Generate a skill that drives a repository's app and saves evidence |
| `/skill:maintain-verification-skill` | Check that such a skill still matches the app |
| `/how <question>` | Explain a subsystem, through a read-only scout |
| `/why <target>` | Explain why code is the way it is, from commits and PRs |
| `/architect <change>` | Two sketched shapes and a pick, before code |
| `/arena <task> [seats: ...]` | Competing candidates on several models, judged and grafted |
| `/interrogate [scope] [seats: ...]` | Adversaries try to break a change; only proven findings stay |
| `/swarm <task>` | Independent slices to parallel subagents |
| `/figure-it-out <task>` | Design and run an auditable workflow for a large task |

`/arena`, `/interrogate`, and `/swarm` cost one full agent run per seat or
worker. Use them on request, not by default.

## Where client data lives

Nothing client-specific goes into this repository. On the account that works
for a client:

| Data | Location |
|---|---|
| Decision logs | `~/.pi/agent/pstack/logs/` |
| Learned review-noise patterns | `~/.pi/agent/pstack/review-patterns/<repo>.md` |
| Verification skills | `~/.pi/agent/skills/verify-<app>/` |

## Set up an account

1. Install the package, as in the [README](../README.md#install).
2. Optional: connect your tracker, as an MCP server or a CLI. Check that the
   permission policy asks before its writes. The shipped policy covers
   Atlassian servers and `gh` issue writes, as
   [Permission checks](extensions.md#permission-checks) describes. For another
   tracker, add ask rules for its write tools to `local.json`.

## Subagents

The package ships one agent, `scout`, which replaces the `pi-subagents`
built-in of that name. It can only read: its tools are `read`, `grep`,
`find`, and `ls`. It runs in the background and loads your extensions, so it
can use the same model providers as your session.

Writing subagents, such as the `worker` seats of `/arena`, also load your
permission extension. A child forwards its permission prompts to your
interactive session; in print mode they are denied.

The package sets no subagent models. A subagent uses your session's model
unless you choose another in `~/.pi/agent/settings.json`, for example a
different model for `reviewer`, so it does not share the author's blind
spots:

```json
{ "subagents": { "agentOverrides": { "reviewer": { "model": "<provider>/<model>" } } } }
```

## Keep the port current

`skills/pstack/UPSTREAM` pins the upstream commit and lists each ported file.
`scripts/pstack-upstream.sh` prints what changed upstream in those files since
the pin. Port the changes you want by hand, then update the pinned commit.
