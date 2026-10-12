# STE-inspired clarity rules

Use these adapted rules for file-based technical prose and PR or commit prose.
They are not the full ASD-STE100 standard or a compliance checklist. Ordinary
chat follows `AGENTS.md`, not this reference. Explicit user style requests and
repository conventions take precedence over these writing preferences.

## Default descriptive profile

- Use plain words, established technical nouns, and established technical verbs.
- Use one term for one concept. Define unfamiliar terms and abbreviations when
  the intended reader needs them.
- Write one main idea per sentence. Aim for 25 words or fewer when practical.
- Prefer active voice, but retain passive voice when the actor is unknown or
  irrelevant. Do not invent an actor to satisfy a style rule.
- Use short paragraphs with one topic. Use headings that state useful conclusions.
- Preserve possibility, uncertainty, and obligation. Do not mechanically change
  “may,” “might,” or “should” to “must,” “can,” or “will.”
- Use American English unless the repository requires another variant.
- Avoid unnecessary jargon, idioms, and promotional language. Use a clearly
  labeled example or analogy when it improves understanding without distortion.
- Use tables only when readers must compare the same fields across items.

## Procedure and warning profile

- State prerequisites before the action they control.
- Use imperative steps and one action per step, except simultaneous actions.
- Aim for 20 words or fewer per instruction when practical.
- Give steps in order and make the expected result observable.
- Use `Warning` for injury or severe data-loss risks. Use `Caution` for software,
  equipment, or recoverable data damage, unless the repository uses another scheme.
- State the required or prohibited action, then the risk and its prevention.
- Separate explanation from action steps when mixing them obscures the sequence.

## Accuracy has priority

Preserve exact identifiers, paths, commands, quoted errors, numbers, and units.
Keep conditions, exceptions, attribution, and uncertainty. Do not imply complete
knowledge, safety, or formal STE compliance because a sentence reads clearly.
Word counts are review prompts, not automatic failures or reasons to omit facts.

## Before and after

Unclear: “Requests may require a greater amount of time to complete in the
event of upstream service unavailability.”

Clear: “If the upstream service is unavailable, requests may take longer.”

The possibility remains a possibility; it does not become a guaranteed failure.

Unclear: “It should be ensured that the service is stopped prior to proceeding.”

Clear, when stopping is a confirmed requirement: “Stop the service before you
continue. Confirm that its status is stopped.”

If the source only recommends stopping, preserve that distinction instead of
silently turning the recommendation into a requirement.
