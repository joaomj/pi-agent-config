# Changelog

All notable changes to this configuration are documented here. This file is generated from version tags and commit history.

## [v0.2.0] - 2026-09-26

### Added

- feat: simplify guardrails and default-allow permission policy
- feat: refresh personal Pi workstation profile
- feat: add OpenCode Zen free-tier fingerprint extension
- feat: add startup-time and lazy-loader extensions

### Changed

- Replace testing skill with test-approval guardrail
- Remove openrouter glm-flash model from favourites and overrides
- Bump extension dependencies: permission-system 33.0.5, web-access 0.30.0, pine-of-glass 0.12.0
- Sync agent settings: changelog version, streaming cache warming, cachemire extension
- Remove openai-codex gpt-6 models from favourites and overrides
- Protect sensitive paths and disable install telemetry
- Swap OpenAI favourites to GPT-6 Sol and Luna, slim overrides to context and cache
- Relax token and env-example rules in permission policy
- Align meta muse-spark limits with other models
- docs: add user-run, detached-execution, focused-test, and reference guardrails
- docs: add web-search.example.json template for Exa + Jina setup
- Swap DeepSeek favourite for GLM 5.3 Flash, tune prompt-cache warming
- Remove OpenCode provider and fingerprint extension
- chore: remove beval-pi-lazy-loader
- refactor: move opencode-zen-fingerprint into its own folder
- chore: harden ssh path permissions
- chore: update permissions
- chore: harden agent policies and prompts

## [v0.1.0] - 2026-09-14

### Added

- feat: streamline agent setup and skills
- feat: simplify agent routing and permissions
- feat: port opencode workflows to pi skills and prompts

### Fixed

- fix: default-allow bash, prompt on destructive and remote writes

### Changed

- Set default thinking to xhigh, add gpt-5.6-sol at medium
- docs: add repo readme with skills, prompts, and permissions
- Add codex + openrouter models at 200K/64K, cache tuning
- Initial pi agent config
