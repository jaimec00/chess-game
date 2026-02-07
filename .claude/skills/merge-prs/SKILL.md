---
name: merge-prs
description: Merge open PRs into master in creation order, resolving any merge conflicts along the way.
disable-model-invocation: true
---

## Context

- Open PRs: !`gh pr list --state open --json number,title,createdAt,mergeable,headRefName --jq 'sort_by(.createdAt) | .[] | "#\(.number) \(.title) [\(.headRefName)] mergeable=\(.mergeable)"'`
- Current branch: !`git branch --show-current`

## Instructions

Merge all open PRs into master **in the order they were created** (oldest first). For each PR:

1. Attempt `gh pr merge <number> --merge --delete-branch`
2. If it fails due to merge conflicts:
   a. `git fetch origin master && git pull origin master`
   b. `git fetch origin <branch-name>`
   c. `git merge FETCH_HEAD --no-commit --no-ff`
   d. Read conflicted files, resolve all conflicts (keep content from both sides where appropriate)
   e. `git add` resolved files, then `git commit` and `git push origin master`
   f. The PR should auto-close once its commits are in master
3. After each merge, verify it succeeded before moving to the next PR

If `$ARGUMENTS` is provided, treat it as a comma-separated list of PR numbers to merge (still in order). Otherwise merge all open PRs.

Report a summary at the end: which PRs were merged, which had conflicts, and the final state.
