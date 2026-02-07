---
name: pr-screenshot
description: Capture a screenshot of the running game and attach it to a PR.
---

## Context

- Repo: jaimec00/chess-game
- Main repo dir: /home/jaime/Desktop/chess_game_workspace/chess_game
- Current branch: !`git branch --show-current`

## Instructions

Capture a screenshot of the chess game from a source directory (worktree or main repo) and attach it to a pull request.

`$ARGUMENTS` is required and has the format: `<pr-number> [source-dir]`

- `<pr-number>` — the PR to attach the screenshot to (required).
- `[source-dir]` — absolute path to the directory containing the code to screenshot (optional, defaults to the main repo dir `/home/jaime/Desktop/chess_game_workspace/chess_game`).

### 1. Parse arguments

Extract the PR number and source directory from `$ARGUMENTS`. If no source dir is given, use the main repo dir.

### 2. Ensure node_modules exist in the source directory

The screenshot script (`scripts/screenshot.mjs`) uses relative paths like `node_modules/.bin/vite` and imports `puppeteer-core` from `node_modules`. **Worktrees do not have `node_modules`** — they only contain git-tracked files.

Check if `<source-dir>/node_modules` exists. If not, create a symlink to the main repo's node_modules:

```bash
ln -s /home/jaime/Desktop/chess_game_workspace/chess_game/node_modules <source-dir>/node_modules
```

### 3. Take the screenshot

Source nvm (required — node is not on the system PATH), `cd` into the source directory, and run the screenshot script:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd <source-dir> && node scripts/screenshot.mjs /tmp/chess-screenshot.png
```

**You MUST `cd` into the source directory** — the script resolves `node_modules/.bin/vite` relative to CWD.

Use a timeout of at least 120 seconds — the script builds the app, starts a preview server, and launches a headless browser.

### 4. Upload and attach the screenshot

Run the upload script from the **main repo directory** (not the worktree — the script uses `gh repo view` which works from any checkout):

```bash
bash <source-dir>/scripts/upload-screenshot.sh /tmp/chess-screenshot.png <pr-number>
```

The script handles everything: uploading to the `pr-screenshots` orphan branch, prepending a `## Screenshot` section to the PR body, and auto-fixing `\!` escaping.

### 5. Clean up

No temp file cleanup needed — the script handles its own temp files.

---

## Gotcha summary

| Issue | Cause | Fix |
|---|---|---|
| `node` / `npm` not found | nvm not sourced | Always `export NVM_DIR=... && . "$NVM_DIR/nvm.sh"` first |
| `Cannot find package 'puppeteer-core'` | Worktree has no `node_modules` | Symlink from main repo: `ln -s .../chess_game/node_modules <worktree>/node_modules` |
| `gh pr edit` exits 1 | Deprecated Projects Classic GraphQL field | The upload script uses the REST API internally — no action needed |
