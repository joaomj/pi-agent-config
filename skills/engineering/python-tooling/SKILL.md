---
name: python-tooling
description: Apply the repository Python package-manager, command, type, lint, and hardcoding policies. Use for Python changes or Python verification.
---

# Python Tooling

- Use `uv` as the only package manager and execution wrapper.
- Run Python tools through `uv run` or `uvx`.
- Do not run direct `python`, `pip`, `pytest`, `ruff`, `mypy`, or similar tools.
- Use the detected project lockfile and package manager.
- Keep dependency changes in the package manager workflow.
- Never inspect `.env` values. Load environment configuration through the
  application's supported configuration interface.

Load `coding-standards` for general correctness, configuration, and API
boundary rules. This skill owns Python commands and dependencies.

If the environment blocks a command, surface the exact failure and use the
cheapest reliable alternative. Do not create a substitute test environment
without approval.
