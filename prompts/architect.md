---
description: Sketch two shapes for a change before writing code, and pick one
argument-hint: "<change>"
---

Design the shape of this change before any code: $ARGUMENTS

Trace every system the change touches. Then sketch two different shapes for
it: types, signatures, and module boundaries. Pick the one where each piece of
state has one owner, each task has one way to do it, and callers need to know
least. Redesign instead of patching when workarounds repeat.

Present both sketches side by side, your pick, and why. Write no code.

For a large or contested design, say so and recommend `/arena` instead of
deciding alone.
