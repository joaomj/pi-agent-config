---
description: Generate a standalone, offline HTML slide deck
argument-hint: "<topic, source file, or brief> [audience, duration, output path]"
---

Create a slide deck for `$@`. If neither the arguments nor the conversation
identify a topic or source, ask for one before creating files.

Resolve the Pi agent configuration directory from `PI_CODING_AGENT_DIR`, or
`~/.pi/agent` when unset. Read `docs/workflows/html-slide-decks.md` there and
follow its planning, design, accessibility, and delivery requirements.
Resolve this supporting path from that directory, not the current project.

Build the HTML, CSS, inline SVG, and JavaScript directly. No rendering extension,
external template, or slide library is required. Use the technical-writing
skill for the deck's prose, while preserving the slide-specific layout rules.

Deliver one complete HTML file, not a collection of assets or a long webpage
renamed as slides. Use the contract's review and verification steps. Keep the
artifact outside Git unless a durable project file is explicitly requested.
