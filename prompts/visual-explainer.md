---
description: Create an HTML visual explanation, slide deck, or project recap
argument-hint: "<topic> [slides | recap]"
---

Create a visual explanation for `$@`. If no topic is supplied, ask for one.
Read `npm/node_modules/visual-explainer/plugins/visual-explainer/SKILL.md`
under the Pi agent configuration directory (`PI_CODING_AGENT_DIR`, or
`~/.pi/agent` when unset). This file is supporting guidance, not an active skill.
Resolve its references and templates from that installed package directory.

Use the visual_explainer rendering tool through codemode. Follow the supporting
layout, accessibility, evidence, and delivery guidance. Generate slides or a
project recap only when requested. Keep output outside Git unless the user
requests a durable project artifact.

This command authorizes only the requested visual artifact. Do not adopt the
supporting guidance's automatic HTML conversion of chat tables. Do not invoke
removed review, planning, or fact-check commands. Report missing package files
or renderer errors rather than silently claiming delivery.
