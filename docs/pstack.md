# The pstack workflow

This package carries a port of parts of
[pstack](https://github.com/cursor/plugins/tree/main/pstack), Lauren Tan's
skills and playbooks for coding agents (MIT license). The port fits one flow:
a Jira ticket goes to a merged PR, and you decide at four fixed points instead
of steering the agent all the time.

## Run a ticket

```text
/skill:ticket PROJ-123
```

| Gate | When | You do |
|---|---|---|
| A | The agent read the ticket and wrote a contract: goal, done check, scope, branch, open questions with its picks | Approve or correct it |
| B | The code is done and verified | Read the catch-up, answer the push and PR prompts |
| C | CI passes and no review thread is open | Send the sign-off request it drafted, tell it when sign-off is given |
| D | Sign-off is given | Answer the merge and Jira prompts |

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
2. Install the permission extension and copy or merge the reference policy, as
   in [Add-ons](add-ons.md#permission-checks). The policy allows commits, asks
   before pushes, and asks before Atlassian writes.
3. Name the Atlassian MCP server `atlassian` in `~/.pi/agent/mcp.json`. The
   policy asks before any tool of a server whose name contains "atlassian",
   except reads (`get*`, `list*`, `search*`, `lookup*`, `download*`, `fetch`).
   Under another server name, only tools with Jira, Confluence, or Bitbucket in
   their names ask. The policy also applies to MCP calls made from `codemode`.
4. Install `pi-subagents`, as in [Add-ons](add-ons.md#subagents).

## Subagents

The package ships one agent, `scout`, which replaces the `pi-subagents`
built-in of that name. It can only read: its tools are `read`, `grep`,
`find`, and `ls`. It runs in the background and loads your extensions, so it
can use the same model providers as your session.

Writing subagents, such as the `worker` seats of `/arena`, also load your
permission extension. A child forwards its permission prompts to your
interactive session; in print mode they are denied.

## Keep the port current

`skills/pstack/UPSTREAM` pins the upstream commit and lists each ported file.
`scripts/pstack-upstream.sh` prints what changed upstream in those files since
the pin. Port the changes you want by hand, then update the pinned commit.
