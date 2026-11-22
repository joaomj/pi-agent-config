---
name: ketchup
description: "Catch the operator up on what changed in this session since their last message, in plain words, then list every decision waiting on them with what they need to decide it from the reply alone. Use for /skill:ketchup and at every gate of a ticket run."
disable-model-invocation: true
---

# Ketchup

Adapted from pstack by Lauren Tan (`../LICENSE`).

Catch the operator up on what changed since the last message they wrote, and
help them understand each change, not only where it stands. Then lay out every
call waiting on them so they can make it from your reply alone. Tool results,
notifications, and subagent reports are not their messages. Assume they
remember their last message and nothing after it.

Use plain words and short sentences, like one person catching up another. Say
what changed for the operator, not how you did it. Say "the tests pass", not
"CI is green". Leave out hashes, file paths, commands, build numbers, and test
counts unless the operator needs one to act. Call each PR, branch, or agent by
a name the operator knows.

## Gather what changed

Keep this turn read-only: do not change code, start a job, or post anything.
Collect your own work since that message and any subagent reports. Check the
current state of each PR, CI run, or agent this session touched. Check each
number you will show against the facts it comes from.

An action item is a call or step only the operator can take: a product
choice, an approval, an irreversible action, or access you lack. Include any
still waiting, even one raised before their last message. Work you can still
do yourself is not an action item. Never make up a call to fill the reply.

For each item, collect its link, what it changes for users, the evidence
behind your pick, its risk, and your pick. Write "unknown" for a fact the call
needs that you do not know.

## Write the reply

Spend words on the calls, not on the story.

1. Open with one sentence that names what waits on the operator, or says
   nothing does. If nothing happened and nothing waits, say so and stop.
2. What happened: one short bullet per thing the operator asked for, with
   its outcome and whether it is done, running, failed, or not checked. Keep
   this under 100 words. Name any bug found and fixed on the way. Never mark
   something done that still waits on the operator.
3. Action items, numbered, so one reply can answer several (`1 yes, 2 B`).
   Each item is about 30 words: the call, your pick, what it changes for
   users, the evidence, and its risk, even when the risk is low. When items
   share a call, write the call and pick once, then one bullet per item,
   riskiest first. For a choice between options, give each option its gain
   and its cost.

Never cut items or shrink them to stay under a word count. A link can add
depth, but the reply alone must be enough to decide.

Mermaid does not render in the terminal. Use a picture only when the operator
can open it: link a screenshot or video file the work produced. Never invent
a number or a screen you did not capture.
