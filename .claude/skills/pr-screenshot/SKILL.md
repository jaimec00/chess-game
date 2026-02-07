---
name: pr-screenshot
description: Capture a screenshot of the running game and attach it to a PR.
---

## Context

- Repo: jaimec00/chess-game
- Main repo dir: /home/jaime/Desktop/chess_game_workspace/chess_game
- Current branch: !`git branch --show-current`

## Instructions

Capture one or more screenshots of the chess game from a source directory (worktree or main repo) and attach them to a pull request.

`$ARGUMENTS` is required and has the format: `<pr-number> [source-dir] [--page <name>]`

- `<pr-number>` — the PR to attach the screenshot to (required).
- `[source-dir]` — absolute path to the directory containing the code to screenshot (optional, defaults to the main repo dir `/home/jaime/Desktop/chess_game_workspace/chess_game`).
- `[--page <name>]` — which page to screenshot (optional, defaults to `play`). Available pages: `play` (`/play`, waits for `.board`), `landing` (`/`, waits for `h1`), `api` (`/play/api`, waits for `.board`). Use `all` to screenshot every page.

### 1. Parse arguments

Extract the PR number, source directory, and page name from `$ARGUMENTS`. If no source dir is given, use the main repo dir. If `--page all` is specified, screenshot all three pages (play, landing, api).

### 2. Ensure node_modules exist in the source directory

The screenshot script (`scripts/screenshot.mjs`) uses relative paths like `node_modules/.bin/vite` and imports `puppeteer-core` from `node_modules`. **Worktrees do not have `node_modules`** — they only contain git-tracked files.

Check if `<source-dir>/node_modules` exists. If not, create a symlink to the main repo's node_modules:

```bash
ln -s /home/jaime/Desktop/chess_game_workspace/chess_game/node_modules <source-dir>/node_modules
```

### 3. Take the screenshot(s)

Source nvm (required — node is not on the system PATH), `cd` into the source directory, and run the screenshot script:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd <source-dir> && node scripts/screenshot.mjs /tmp/chess-screenshot-<page>.png --page <page>
```

For `--page all`, run the script three times with different page names and output paths:

```bash
cd <source-dir>
node scripts/screenshot.mjs /tmp/chess-screenshot-play.png --page play
node scripts/screenshot.mjs /tmp/chess-screenshot-landing.png --page landing
node scripts/screenshot.mjs /tmp/chess-screenshot-api.png --page api
```

**You MUST `cd` into the source directory** — the script resolves `node_modules/.bin/vite` relative to CWD.

Use a timeout of at least 120 seconds per screenshot — the script builds the app, starts a preview server, and launches a headless browser.

### 4. Upload and attach the screenshot(s)

Run the upload script from the source directory. Use `--label <page>` when uploading multiple screenshots so each gets a distinct filename (`pr-N-play.png`, `pr-N-landing.png`, `pr-N-api.png`) and all images are appended to the same `## Screenshot` section in the PR body.

**Single page (no `--page all`):**

```bash
bash <source-dir>/scripts/upload-screenshot.sh /tmp/chess-screenshot-<page>.png <pr-number> --label <page>
```

**All pages:**

```bash
bash <source-dir>/scripts/upload-screenshot.sh /tmp/chess-screenshot-play.png <pr-number> --label play
bash <source-dir>/scripts/upload-screenshot.sh /tmp/chess-screenshot-landing.png <pr-number> --label landing
bash <source-dir>/scripts/upload-screenshot.sh /tmp/chess-screenshot-api.png <pr-number> --label api
```

The script handles everything: uploading to the `pr-screenshots` orphan branch, creating or appending to the `## Screenshot` section in the PR body, and auto-fixing `\!` escaping.

### 5. Clean up

No temp file cleanup needed — the script handles its own temp files.

---

## Gotcha summary

| Issue | Cause | Fix |
|---|---|---|
| `node` / `npm` not found | nvm not sourced | Always `export NVM_DIR=... && . "$NVM_DIR/nvm.sh"` first |
| `Cannot find package 'puppeteer-core'` | Worktree has no `node_modules` | Symlink from main repo: `ln -s .../chess_game/node_modules <worktree>/node_modules` |
| `gh pr edit` exits 1 | Deprecated Projects Classic GraphQL field | The upload script uses the REST API internally — no action needed |
| Screenshots overwrite each other | Same filename without `--label` | Always pass `--label <page>` when uploading multiple screenshots |
