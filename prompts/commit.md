---
description: Stage and commit recent changes using repository conventions
---

Commit recent changes. Do not fetch, rebase, or merge.

1. Check git status to see changed files. Run via bash: `git status --porcelain`
   Inspect both staged and unstaged paths.

2. Categorize all changes (modified, staged, untracked) into:

   - **Allowed** - source files, tests, configs, infrastructure code
   - **Planning/temp** - files whose names contain (case-insensitive):
     PLAN, TODO, DRAFT, WIP, TEMP, BACKUP, OLD. Also include editor or OS
     artifacts such as `.DS_Store`, swap files, and backup suffixes; `.env`
     files, credentials, secret-looking files, and local-only configs.
   - **Uncertain** - anything that doesn't clearly fit either category

3. Show the user the full file list split by category:
   "Planning/temp files (will be excluded):
    - file1, file2
   Allowed files (will be committed):
    - file3, file4
   Uncertain files:
    - file5"

4. If there are uncertain files, ask the user: "Should I exclude or include [file]?"
   Let the user decide for each uncertain file.

5. Also ask: "Any files from the allowed list you want to keep out of this commit?"
6. Treat repository configuration such as `.gitignore`, `.github/`, and
   `.editorconfig` as allowed when it is intentional. Check whether
   `.gitignore` exists. If it is missing or incomplete, suggest
   `/gitignore`; do not create or modify it during commit preparation.
7. Stage all remaining allowed files. Run via bash: `git add [file1 file2 ...]`
8. Inspect the staged file list and run `git diff --cached --check`. Stop if
   planning, temporary, secret-looking, or local-only files are staged.

9. Read repository commit guidance and analyze staged changes to determine the
   repository-required commit type and scope:
   - `feat:` - new features, added functionality
   - `fix:` - bug fixes, corrections
   - `docs:` - documentation changes
   - `style:` - formatting (no logic change)
   - `refactor:` - code restructuring without behavior change
   - `test:` - test files, testing infrastructure
   - `chore:` - dependencies, build process, configuration

10. Generate a concise commit message per repository and organization conventions.
   Use an imperative subject and include a body only when the convention needs
   context.

11. Show summary and commit:
   - Display: "Committing with message: [message]"
   - Show list of files being committed
   - Run via bash: `git commit -S -m "[message]"`

12. If commit succeeds: "Committed [hash] - [message]". Treat the commit as
    complete. Do not run a post-commit status inspection.
