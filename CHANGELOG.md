# Changelog

All notable changes to this configuration are documented here. This file is generated from version tags and commit history.

## [v0.3.0] - 2026-10-04

### Added

- feat: add configuration sync command and ignore local binaries
- feat: add independent btw side questions

### Changed

- Document scoped GitHub access for shared machines
- Cover profile generation, local overrides, and permission fallback
- Make configuration shareable with one-command install
- Clear dangling github-rest-read authorizer link
- Abort package install when a previous run did not finish
- Remove Muse and Astra from model configuration
- Remove DonSeTch binary check from installer and tests
- Replace DonSeTch with four keyed web MCP servers
- Remove temporary intelligence snapshots
- Keep sessions responsive with background jobs and a report guard
- Add skill-doctor conversation grader adapted for Pi
- Add test-audit skill, visual-explainer docs, compact defaults
- Set OpenAI model limits and thinking defaults
- Record local UI and runtime preferences
- Remove subagent delegation from configuration
- Use Sol at xhigh for diagnosis, planning, and review; Muse high for explore and implement
- Keep native Pi tools visible alongside codemode
- Simplify Pi tools, MCP connections, and updates
- Document Pi architecture and engineering decisions
- Refine agent responsibilities and add portable FFF search
- Configure global role-based subagents
- Restore the exit command extension
- Unify Pi installation and synchronization with locked packages
- chore: enable sentry, usage-meters, subagents; swap web-access for donsetch
- chore: remove unused prompts and pine-of-glass extension
- Configure scoped Muse and GPT models with explicit thinking levels
- docs: focus README on setup and first use
- chore: update packages
- Install pi-open-tui; keep startup minimal with on-demand extension filters

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
