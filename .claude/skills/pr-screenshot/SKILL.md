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

### 4. Upload the screenshot to the `pr-screenshots` orphan branch

Do NOT use `scripts/upload-screenshot.sh` — it has a bug where `gh api ... --jq '.sha'` on a 404 response captures the full error JSON body instead of being empty, corrupting the upload payload.

Instead, run these commands directly:

```bash
REPO="jaimec00/chess-game"
BRANCH="pr-screenshots"
PR_NUMBER=<pr-number>
FILENAME="pr-${PR_NUMBER}.png"

# Encode the image
base64 -w0 /tmp/chess-screenshot.png > /tmp/b64content.txt

# Build upload JSON with jq --rawfile (avoids "Argument list too long" from jq --arg)
jq -n --rawfile content /tmp/b64content.txt \
  --arg msg "add screenshot for PR #${PR_NUMBER}" \
  --arg branch "$BRANCH" \
  '{"message":$msg,"branch":$branch,"content":$content}' > /tmp/upload-screenshot.json

# Upload via Contents API
gh api "repos/${REPO}/contents/${FILENAME}" -X PUT --input /tmp/upload-screenshot.json --silent
```

**If the file already exists** (e.g. re-running for the same PR), you need to include the existing file's SHA in the payload. Check first:

```bash
EXISTING_SHA=$(gh api "repos/${REPO}/contents/${FILENAME}?ref=${BRANCH}" --jq '.sha' 2>/dev/null)
```

If that succeeds (exit code 0), add `,"sha":"$EXISTING_SHA"` to the JSON:

```bash
jq -n --rawfile content /tmp/b64content.txt \
  --arg msg "add screenshot for PR #${PR_NUMBER}" \
  --arg branch "$BRANCH" \
  --arg sha "$EXISTING_SHA" \
  '{"message":$msg,"branch":$branch,"content":$content,"sha":$sha}' > /tmp/upload-screenshot.json
```

### 5. Prepend screenshot section to the PR body

Build the image URL and prepend a `## Screenshot` section to the existing PR body:

```bash
IMAGE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILENAME}"
CURRENT_BODY=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body')
```

Check if the body already contains `## Screenshot`. If so, skip this step.

Otherwise, build the new body and update via REST API (`gh pr edit` is broken — returns exit 1 due to deprecated Projects Classic GraphQL):

```bash
NEW_BODY="## Screenshot

![PR Screenshot](${IMAGE_URL})

${CURRENT_BODY}"

printf '%s' "$NEW_BODY" | jq -Rs '{"body": .}' > /tmp/pr-body.json
gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input /tmp/pr-body.json --silent
```

### 6. Verify and fix `!` escaping

`jq -Rs` (and bash double-quote expansion) can escape `!` to `\!` in the PR body, which breaks GitHub's image markdown rendering — `\![image](url)` shows as a text link instead of an inline image.

**Always verify** after updating the body:

```bash
gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body' | head -5
```

If you see `\!` instead of `!`, fix it:

```bash
BODY=$(gh api "repos/${REPO}/pulls/${PR_NUMBER}" --jq '.body')
FIXED=$(printf '%s' "$BODY" | sed 's/\\!/!/g')
printf '%s' "$FIXED" | jq -Rs '{"body": .}' > /tmp/pr-body-fix.json
gh api "repos/${REPO}/pulls/${PR_NUMBER}" -X PATCH --input /tmp/pr-body-fix.json --silent
```

### 7. Clean up temp files

```bash
rm -f /tmp/b64content.txt /tmp/upload-screenshot.json /tmp/pr-body.json /tmp/pr-body-fix.json
```

---

## Gotcha summary

| Issue | Cause | Fix |
|---|---|---|
| `node` / `npm` not found | nvm not sourced | Always `export NVM_DIR=... && . "$NVM_DIR/nvm.sh"` first |
| `Cannot find package 'puppeteer-core'` | Worktree has no `node_modules` | Symlink from main repo: `ln -s .../chess_game/node_modules <worktree>/node_modules` |
| `Problems parsing JSON (HTTP 400)` on upload | `upload-screenshot.sh` captures 404 JSON body into `EXISTING_SHA` variable, corrupting the payload | Don't use the script. Build JSON with `jq -n --rawfile` as shown above |
| `Argument list too long` with `jq --arg` | base64 content exceeds shell arg limits | Use `jq --rawfile varname file` instead |
| `\![image](url)` renders as text link | `jq -Rs` or bash escapes `!` to `\!` | Verify PR body after update, `sed 's/\\!/!/g'` to fix |
| `gh pr edit` exits 1 | Deprecated Projects Classic GraphQL field | Use REST API: `gh api repos/.../pulls/N -X PATCH --input file.json` |
