# Git and change documentation

Owner preference: create meaningful, scoped commits during development and push completed work when appropriate. Commit messages, code comments, and documentation are written in English.

## Commit structure

Use Conventional Commits:

    type(optional-scope): imperative description

Common types: feat, fix, docs, refactor, test, chore. Use a scope only when it makes the subject clearer.

Keep the subject focused on the resulting change. Use the body to explain the problem, meaningful choices, relevant validation, and material limitations. Do not claim checks passed when they were skipped or blocked.

Example:

    fix: reject unconfigured cron requests

    Reject missing secret configuration before creating a privileged client.
    Keep invalid authorization distinct from unavailable configuration.

    Validation: production build and rejection-path HTTP scenarios passed.
    Lint remains pending configuration; no authorized jobs were executed.

## Workflow

1. Inspect status, current branch, remote, unstaged diff, and staged diff.
2. Keep functional changes and unrelated product/documentation work in separate commits where practical.
3. Stage explicit paths; avoid sweeping in unrelated owner work.
4. Run relevant checks and review the staged patch, including new files.
5. Create the commit with an English subject/body.
6. Inspect the resulting history and working tree before pushing to the intended remote/branch.
7. If the remote advanced, inspect and reconcile changes without force-pushing or discarding owner work.

Prefer a feature branch for substantial future changes. Do not unexpectedly switch the owner's active work or rewrite shared history. A local commit created in the current task may be corrected before publication; never assume a shared commit can be amended.

For multiline messages, use a UTF-8 message file without a byte-order mark and git commit --file. Keep temporary message files outside the staged paths.

## Files and evidence

Never commit .env files, credentials, access tokens, personal financial records, generated build output, or unnecessary machine-specific artifacts.

Commit relevant product decisions, business-rule updates, migration rationale, and sanitized reproducible evidence together with the change that needs them. Historical audit evidence is not rewritten to imply it was originally clean; track remediation separately.

A deployed behavior is not established by a local commit or successful push alone. Record production verification separately when it is performed.
