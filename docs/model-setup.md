# Model setup reference

This note records the maintainer's local model arrangement as a reference.
It shares choices and reasoning, not configuration files, credentials, or exact settings.
Recreate the arrangement yourself with `/login`, `/model`, `/thinking`, and `/scoped-models`.

## Default model

The default is DeepSeek V4.1 Flash through the official DeepSeek provider at high thinking effort.
It is the official Chinese provider endpoint, not the OpenRouter copy of the same model family.

## Scoped models

Interactive cycling (`Ctrl+P`, `/scoped-models`) covers four models:

- DeepSeek V4.1 Flash (official DeepSeek provider) at high: the default.
- Muse Spark 1.3 Contributor (Meta provider) at xhigh.
- Claude Opus 5.5 at low.
- Claude Haiku 5.5 at high.

## Shared limits

Meta and DeepSeek overrides match the Opus 5.5 arrangement: bounded response length,
a 250k context window, and a short-tier prompt cache declaration.
The shared cap keeps behavior comparable across providers.
It narrows the large native context windows of the Meta and DeepSeek models.

## Cache behavior

Cache warming runs in streaming mode: Pi keeps eligible prompt caches warm during active runs.
The DeepSeek and Meta entries declare the short cache tier so they stay eligible.
Cache-miss notices stay on, so warming failures and significant misses surface in the TUI.

## Reproduce it locally

1. Sign in to each provider with `/login`.
2. Pick each model with `/model` and set its thinking effort with `/thinking`.
3. Save the cycle set with `/scoped-models` and the default with `Ctrl+S` on the model picker.
4. Mirror the Opus response, context, and short-cache values onto the Meta and DeepSeek entries in `models.json`.

Keep your `models.json`, `settings.json`, and `auth.json` outside Git.
This document never contains keys, tokens, or complete settings files.
