# Model setup reference

This note records the maintainer's local model arrangement as a reference.
It shares choices and reasoning, not configuration files, credentials, or exact settings.
Recreate the arrangement yourself with `/login`, `/model`, `/thinking`, and `/scoped-models`.

## Default model

The default is DeepSeek V4.1 Flash through the OpenRouter provider at low thinking effort.
No model has its own thinking default: every model starts at the global default, `low`.

## Scoped models

Interactive cycling (`Ctrl+P`, `/scoped-models`) covers four models:

- DeepSeek V4.1 Flash (OpenRouter provider): the default.
- Claude Opus 5.5 (Claude DirectSDK provider).
- Claude Sonnet 5.5 (Claude DirectSDK provider).
- Claude Haiku 5.5 (Claude DirectSDK provider).

## Shared limits

The DeepSeek and Claude DirectSDK overrides in `models.json` (Opus 5.5, Sonnet 5.5, and Haiku 5.5)
share the same limits: a 250k context window, a 20k maximum response length, and declared prompt cache tiers.
The shared cap keeps behavior comparable across providers.
It narrows the native context windows of these models.

## Cache behavior

Cache warming is off (`cacheWarming` is `"off"` in `settings.json`), so Pi does not keep prompt caches warm.
The DeepSeek and Claude DirectSDK entries still declare prompt cache tiers.
Cache-miss notices stay on, so significant misses surface in the TUI.

## Reproduce it locally

1. Sign in to each provider with `/login`.
2. Pick each model with `/model`. Set its thinking effort with `/thinking` only if you want something other than `low`.
3. Save the cycle set with `/scoped-models` and the default with `Ctrl+S` on the model picker.
4. Set the same context window, response length, and prompt cache values on the DeepSeek and Claude DirectSDK entries in `models.json`.

Keep your `models.json`, `settings.json`, and `auth.json` outside Git.
This document never contains keys, tokens, or complete settings files.
