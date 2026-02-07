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

Delegate the review to the **pr-reviewer** sub-agent so it runs in a **fresh context window** with no prior conversation history. The sub-agent reviews the diff, evaluates it, and **submits the review itself** (approve or request changes) via the GitHub Actions bot. Use the Task tool like this:

```
Task tool call:
  subagent_type: "general-purpose"
  model: "opus"
  prompt: |
    You are a PR reviewer for the chess-game project at /home/jaime/Desktop/chess_game_workspace/chess_game.

    Review PR #<number> by following these steps:

    1. Read the PR metadata:
       gh pr view <number> --json title,body,files --jq '{title: .title, body: .body, files: [.files[].path]}'

    2. Read the full diff:
       gh pr diff <number>

    3. Read CLAUDE.md for project conventions.

    4. If needed, read specific source files for additional context.

    Evaluate for: correctness, safety, style/conventions, completeness (CLAUDE.md updates if needed), documentation accuracy, and no regressions.

    Be STRICT. Every issue — no matter how small — must be fixed before approval. This includes wording nits, inaccurate or misleading comments/documentation, inconsistent terminology, and minor style issues. Do NOT approve with "minor observations" or "non-blocking notes." If you found something worth mentioning, REQUEST_CHANGES for it. The bar for APPROVE is zero issues.

    After your evaluation, submit the review yourself:
    - If APPROVE: run `gh workflow run "Approve PR" -f pr-number=<number>`, then wait and verify with `sleep 10 && gh pr view <number> --json reviews --jq '.reviews[] | "\(.author.login): \(.state)"'`
    - If REQUEST_CHANGES: run `gh workflow run "Request Changes" -f pr-number=<number> -f body="<concise numbered list of issues>"`

    Your response MUST start with either APPROVE or REQUEST_CHANGES on the first line, followed by your reasoning and confirmation that you submitted the review.
```

### 2. Act on the verdict

Parse the sub-agent's response:
- First line will be `APPROVE` or `REQUEST_CHANGES`
- The sub-agent has already submitted the review via the GitHub Actions bot

**If APPROVE**: proceed to merge (step 3).
**If REQUEST_CHANGES**: **skip** this PR and move on to the next one.

### 3. Merge

- Attempt `gh pr merge <number> --merge --delete-branch`
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
