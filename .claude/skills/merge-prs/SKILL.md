---
name: merge-prs
description: Review and merge open PRs into master in creation order, resolving any merge conflicts along the way.
---

## Context

- Open PRs: !`gh pr list --state open --json number,title,createdAt,mergeable,headRefName --jq 'sort_by(.createdAt) | .[] | "#\(.number) \(.title) [\(.headRefName)] mergeable=\(.mergeable)"'`
- Current branch: !`git branch --show-current`

## Instructions

Review and merge open PRs into master **in the order they were created** (oldest first). For each PR:

### 1. Review (via sub-agent)

Delegate the review to the **pr-reviewer** sub-agent so it runs in a **fresh context window** with no prior conversation history. The agent does NOT automatically load its definition file — the prompt must tell it to read it. Use the Task tool like this:

```
Task tool call:
  subagent_type: "pr-reviewer"
  prompt: |
    Review PR #<number> for the chess-game project at /home/jaime/Desktop/chess_game_workspace/chess_game.
    The PR number for all commands is: <number>

    IMPORTANT: First read your full review instructions from /home/jaime/Desktop/chess_game_workspace/chess_game/.claude/agents/pr-reviewer.md and follow them exactly. That file contains the evaluation criteria, strictness policy, and review submission steps.
```

### 2. Parse and act on the verdict

Parse the sub-agent's response:
- First line will be `APPROVE` or `REQUEST_CHANGES`
- The sub-agent has already submitted the review via the GitHub Actions bot

**If APPROVE**: proceed to merge (step 3).
**If REQUEST_CHANGES**: **skip** this PR and move on to the next one.

### 3. Merge

- Attempt `gh pr merge <number> --squash --delete-branch`
- If it fails due to merge conflicts:
  a. `git fetch origin master && git pull origin master`
  b. `git fetch origin <branch-name>`
  c. `git merge FETCH_HEAD --no-commit --no-ff`
  d. Read conflicted files, resolve all conflicts (keep content from both sides where appropriate)
  e. `git add` resolved files, then `git commit` and `git push origin master`
  f. The PR should auto-close once its commits are in master

### 4. Sync

After each successful merge, pull from origin to keep local state in sync:

```
git fetch origin master && git pull origin master
```

Then verify the merge succeeded before moving to the next PR.

---

If `$ARGUMENTS` is provided, treat it as a comma-separated list of PR numbers to review and merge (still in order). Otherwise process all open PRs.

Report a summary at the end: which PRs were approved and merged, which were skipped (and why), which had conflicts, and the final state.
