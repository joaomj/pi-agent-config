# Changelog

All notable changes to this configuration are documented here. This file is generated from version tags and commit history.

## [v0.6.0] - 2026-10-24

### Changed

- Drop the reference to the removed Ubuntu guide
- Ignore runtime state and backups written next to the configuration
- Trim the Proton Pass skill to the CLI installed on the machine
- Add destructive-action and style rules; correct the browser claims
- Leave MCP servers out of the installer
- docs: update changelog for v0.5.0

## [v0.5.0] - 2026-10-24

### Changed

- Update the package in place and roll the last run back
- Explain which Claude login the usage packages read
- Route bash calls with rules, measurements, and a classifier
- Switch background jobs to pi-background-run and enforce bgrun
- Document the improve-me skill and the tooling skills directory
- Add improve-me to turn repeated fixes into structure
- Ground plans in current code and list the repositories involved
- Pin installs to a released tag and verify Node downloads
- Keep the bundled CLI wrapper out of PATH
- Document runtime use of Proton Pass and its SSH agent
- docs: update changelog for v0.4.1

## [v0.4.1] - 2026-10-20

### Changed

- Start the downloaded Chrome when its sandbox cannot work
- Install what browser automation needs instead of skipping it
- Skip browser automation when its requirements are missing
- Refuse to install a package or block twice
- Drop ponytail from the shared setup
- Offer every configured package in the installer
- docs: update changelog for v0.4.0

## [v0.4.0] - 2026-10-20

### Changed

- Release v0.4.0
- Document the fail-closed questions and the CLI guard
- Survive a missing Claude CLI and show y/n on prompts
- Ask for install consent on the terminal
- Offer the Claude transport as an installer step
- Run setup from the installer instead of an agent session
- Install as a Pi package with a backup-first script
- Ship shared resources as a Pi package
- Remove the visible task list package from the catalog
- Document extension catalog, monorepo publishing, and permission guardrails
- Add model setup reference
- Add container roadmap and allow ROADMAP.md
- Disable whole-home FFF indexing by default
- Track personal tool permission policy
- Clarify interactive questions and plan approval rules
- Keep personal Pi configuration local and document extensions
- Improve product planning and add optional technical depth
- Describe automatic background routing in agent rules
- Require verification first and deployed code as evidence
- Match only real git commands in the plan-file guard
- Replace secret redaction with permission deny rules
- Make the plan prompt product-focused and guard plan files
- Document Proton Pass-backed Exa authentication and add skill
- Remove subscription usage extension
- Disable FFF home directory scanning
- Configure shared models and user-owned Pi installation
- Use native tool settings and remove subscription usage
- Remove telemetry extension from workstation configuration
- Add startup readiness experiments and investigation findings
- Expand code reviews and simplify explanation workflows
- Simplify prompt commands and make chat style global
- Show compact startup timings in the native notification display
- Add on-demand startup benchmark report
- Remove startup timing command without a stage breakdown
- Show startup elapsed milliseconds in the TUI
- Use durable background bash in every profile
- Remove Luna from shared model configuration
- Default to fullscreen TUI and per-project trust
- Align shared configuration with the current VPS workflow
- Separate configuration sync from extension updates
- Keep read and bash direct and route extension tools through codemode
- docs: update changelog for v0.3.0

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
