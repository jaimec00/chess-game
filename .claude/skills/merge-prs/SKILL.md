---
name: merge-prs
description: Review and merge open PRs into master in creation order, resolving any merge conflicts along the way.
disable-model-invocation: true
---

## Context

- Open PRs: !`gh pr list --state open --json number,title,createdAt,mergeable,headRefName --jq 'sort_by(.createdAt) | .[] | "#\(.number) \(.title) [\(.headRefName)] mergeable=\(.mergeable)"'`
- Current branch: !`git branch --show-current`

## Instructions

Review and merge open PRs into master **in the order they were created** (oldest first). For each PR:

### 1. Review

- Read the PR diff: `gh pr diff <number>`
- Read the PR description: `gh pr view <number>`
- Evaluate the changes: does the code look correct, reasonable, and safe?

### 2. Decide

- **If the PR looks good**: approve it by triggering the Approve PR workflow, then proceed to merge (step 3):
  ```
  gh workflow run "Approve PR" -f pr-number=<number>
  ```
  Wait for the workflow to complete before merging:
  ```
  sleep 10 && gh pr view <number> --json reviews --jq '.reviews[] | "\(.author.login): \(.state)"'
  ```
- **If the PR has problems**: request changes by triggering the Request Changes workflow with a review comment explaining the issues, then **skip** this PR and move on to the next one:
  ```
  gh workflow run "Request Changes" -f pr-number=<number> -f body="<explanation of what needs fixing>"
  ```

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
