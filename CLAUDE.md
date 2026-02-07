## Chess Game — Codebase Documentation

### Overview

A complete browser chess game (~1,800 lines) — Player (white) vs AI (black) with full standard rules, built from scratch with React 19 + Vite + Tailwind CSS v4 + shadcn/ui. No external chess libraries.

```
chess_game/
├── index.html              # Entry HTML, loads Google Fonts (Cinzel, Inter)
├── package.json            # React 19, Vite 7, Tailwind v4, shadcn/ui
├── jsconfig.json           # @/* path alias for shadcn imports
├── components.json         # shadcn/ui configuration
├── src/
│   ├── main.jsx            # React DOM mount + CSS import
│   ├── index.css           # Tailwind entry point, theme tokens, keyframes
│   ├── App.jsx             # Root component, state management, game loop
│   ├── lib/
│   │   └── utils.js        # cn() helper (clsx + tailwind-merge)
│   ├── assets/
│   │   └── pieces/         # cburnett SVG piece set (CC BY-SA 3.0)
│   │       ├── wK/Q/R/B/N/P.svg  # White pieces
│   │       └── bK/Q/R/B/N/P.svg  # Black pieces
│   ├── engine/
│   │   ├── constants.js    # Piece types, colors, values, piece-square tables, initial board
│   │   ├── board.js        # cloneBoard, getPiece, isInBounds, findKing
│   │   ├── moves.js        # Move generation + legality filtering for all pieces
│   │   ├── specialMoves.js # applyMove: castling, en passant, promotion, rights tracking
│   │   ├── gameState.js    # makeMove, check/checkmate/stalemate/draw detection
│   │   └── ai.js           # Minimax + alpha-beta pruning (depth 3), positional evaluation
│   └── components/
│       ├── ui/             # shadcn/ui primitives (Card, Button, Badge, Dialog)
│       ├── Board.jsx       # Board with glass frame, coordinates
│       ├── Board.css       # Grid sizing, inner shadow + responsive media queries (~30 lines)
│       ├── Square.jsx      # Individual square: highlights, hover, hints (all Tailwind)
│       ├── PieceSVG.jsx    # Renders cburnett piece SVGs as <img> elements
│       ├── GameInfo.jsx    # Status panel using shadcn Card/Badge/Button
│       └── PromotionModal.jsx  # Piece picker using shadcn Dialog
```

---

### Styling stack

**Tailwind CSS v4** via `@tailwindcss/vite` — no PostCSS config, no `tailwind.config.js`. The Vite plugin handles everything.

**shadcn/ui** — pre-built accessible components (Card, Button, Badge, Dialog) from `src/components/ui/`. These depend on Radix UI primitives, `clsx`, `tailwind-merge`, and `class-variance-authority`.

**`cn()` helper** (`src/lib/utils.js`) — merges Tailwind classes with `clsx` + `tailwind-merge`. Used throughout components for conditional class application.

**`src/index.css`** — Tailwind entry point. Contains:
- `@import "tailwindcss"` + shadcn imports
- `@theme inline { ... }` with custom tokens: board square colors (`sq-light`, `sq-dark`, etc.), accent gold, font families (`font-display`, `font-body`, `font-ocr`), custom animations (`check-throb`, `dots-pulse`, `shimmer`)
- `:root` CSS variables for the dark color scheme (`--background: #000000`; visible page background is `#080a0e` set in App.jsx)
- `@keyframes` for check-throb, dots-pulse, and shimmer animations

**Board.css** is the only remaining custom CSS file (~30 lines), used for things Tailwind can't express: CSS custom property `--board-size` with responsive media query overrides, grid layout for the board.

---

### Engine layer (`src/engine/`)

All pure JavaScript — zero React dependency, portable and independently testable.

**`constants.js`** — Source of truth for the game's vocabulary. Defines `WHITE`/`BLACK`, six piece types, Unicode symbols (still used in captured-pieces display), material values (pawn=100 up to king=20000), piece-square positional tables, and `getInitialBoard()` which returns the standard 8x8 starting position.

**`board.js`** — Low-level board utilities. `cloneBoard()` deep-copies the 8x8 array (critical since the engine tests moves by cloning + mutating). `findKing()` locates a king for check detection.

**`moves.js`** — The heart of the engine. `getRawMoves()` generates pseudo-legal moves per piece type (pawn pushes/captures, knight L-shapes, sliding pieces, king moves + castling). `filterLegalMoves()` removes any move that leaves the own king in check by cloning the board, applying the move, and calling `isInCheck()`. Public API: `getLegalMoves(gameState, row, col)` for one piece, `getAllLegalMoves(gameState, color)` for all pieces of a color.

**`specialMoves.js`** — `applyMove()` takes a game state + move coordinates and returns the mutated board plus metadata. Handles double-push en passant targets, en passant captures (removing the captured pawn from a different square), castling (moving the rook alongside the king), promotion (replacing the pawn), and castling rights revocation when kings/rooks move or rooks are captured.

**`gameState.js`** — `makeMove()` orchestrates a complete turn: calls `applyMove()`, flips the turn, tracks captured pieces, appends to move/position history, then calls `getGameStatus()`. Status detection checks (in order): no legal moves → checkmate or stalemate, 50-move rule (halfMoveClock ≥ 100), threefold repetition (simple string hash of board+turn), insufficient material (K vs K, K+B vs K, K+N vs K, same-color bishops).

**`ai.js`** — The AI opponent for black, running **entirely locally in the browser** — no API calls, no external chess engine (e.g. Stockfish), no server communication. It is ~86 lines of vanilla JavaScript with no dependencies beyond the game's own engine files. `getBestMove()` runs minimax with alpha-beta pruning at depth 3 (~100k positions). The evaluation sums material + piece-square table bonuses (positive favors white). Move ordering sorts captures first for better pruning. The AI always promotes to queen. Computation runs on the browser's main thread, deferred by a 100ms `setTimeout` to keep the UI responsive.

---

### Click → Move → AI data flow

```
User clicks square
  → Square.onClick → App.handleSquareClick(row, col)

FIRST CLICK (select piece):
  → Verify piece.color === WHITE
  → getLegalMoves(gameState, row, col)
  → Store selectedSquare + legalMoves in state
  → Board re-renders with green highlights on legal targets

SECOND CLICK (execute move):
  → Find matching move in legalMoves
  → If promotion: show PromotionModal, wait for piece choice
  → Else: makeMove(gameState, from, to, special)
    → applyMove() mutates cloned board
    → Turn flips to BLACK, status computed
    → setGameState(newState)

AI RESPONSE (useEffect on gameState.turn === BLACK):
  → setIsThinking(true) → "Engine thinking..." shown
  → setTimeout(100ms) to unblock UI
  → getBestMove(gameState) → minimax search
  → makeMove() with AI's chosen move
  → Turn flips back to WHITE
  → setIsThinking(false)
```

---

### Game state shape

```js
{
  board,            // 8x8 array, each cell: { type, color } | null
  turn,             // 'white' | 'black'
  castlingRights,   // { whiteKing, whiteQueen, blackKing, blackQueen } booleans
  enPassantTarget,  // { row, col } | null — square behind a double-pushed pawn
  halfMoveClock,    // increments each non-pawn non-capture move (draw at 100)
  moveHistory,      // array of { fromRow, fromCol, toRow, toCol, special }
  positionHistory,  // array of board hash strings (for threefold repetition)
  capturedPieces,   // { white: [...], black: [...] }
  status,           // 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'
  lastMove,         // { fromRow, fromCol, toRow, toCol } for square highlighting
}
```

---

### Visual architecture

The visual theme is **dark glassmorphism** — semi-transparent cards over a near-black background (`#080a0e`) with two layered radial gradients: a blue-gray ellipse centered near the board (`#1a2332` → `#0d1117` → transparent) and a faint purple accent in the lower-right (`rgba(90,60,150,0.10)`). These color layers give `backdrop-blur` surfaces visible refraction.

The board is **flat 2D** — no perspective tilt or 3D transforms. The board frame is a glass surface (`bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg`) with a blue outer glow shadow and a top-edge shimmer highlight (`animate-shimmer`, 8s slow opacity pulse).

Board squares use **cool blue-gray tones** (`bg-sq-light` #8e96a0 / `bg-sq-dark` #262a30) defined as Tailwind theme tokens. Selection adds a green-tinted inner glow alongside the dark inset shadow. Legal move hint dots use `backdrop-blur-[2px]` for a frosted glass effect. Board coordinate labels (ranks/files) use `font-ocr` (Share Tech Mono) at 12px with `text-white/60`.

Pieces use the **cburnett SVG set** (`src/assets/pieces/`), the standard piece artwork from lichess.org (CC BY-SA 3.0 by Colin M.L. Burnett). `PieceSVG.jsx` imports all 12 SVGs and renders them as `<img>` elements. Tailwind `drop-shadow` utilities on the piece wrapper cast shadows onto the board.

The info panel uses shadcn **Card** with deep glassmorphism (`bg-white/[0.05] backdrop-blur-2xl`), gradient-faded dividers, **Share Tech Mono** (`font-ocr`) for all text, and gold accent color for the title. The New Game button has `backdrop-blur-sm` with a subtle blue glow on hover. The promotion modal uses shadcn **Dialog** with `backdrop-blur-3xl`, a brighter border (`white/[0.14]`), blue outer glow, and gold hover glow on piece buttons. The dialog overlay adds `backdrop-blur-sm` for soft background blur (customized from vendored shadcn component).

---

### Development environment notes

**Node.js** is installed via **nvm** (`~/.nvm/versions/node/v24.13.0/bin/node`). It is not available on the system `PATH` by default — you must source nvm first before running any node/npm/vite commands:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

After that, the Vite CLI is available at `node_modules/.bin/vite`. There is no global `npx` on the path either, so always use the local binary directly:

```bash
node_modules/.bin/vite build
node_modules/.bin/vite          # dev server
```

**Git repository** — initialized on the `master` branch, with remote `origin` at `github.com/jaimec00/chess-game`.

### Git & GitHub preferences

- **Branches**: use prefixed names — `feature/…`, `fix/…`, `refactor/…`, etc.
- **Commits**: short lowercase messages (e.g. `add move timer`, `fix castling bug`). For larger PRs, commit incrementally as you work — don't bundle everything into one or two giant commits. Small PRs with only a few logical changes are fine with fewer commits. Use your best judgement.
- **Commit & push freely** — no need to ask before committing or pushing.
- **Feature branches + PRs** — create a branch per feature/fix and open a PR to merge into `master`. Don't commit directly to `master` for new work. This applies to **all** changes — code, docs, config, CLAUDE.md updates, everything. No exceptions.
- **Git worktrees** — never work on `master` directly. Create the branch and worktree **first**, then do all work inside the worktree. Never make changes in the main repo directory and copy them over — always start from the worktree. Use `git -C <worktree-path>` for all git commands (never `cd` into the worktree). When done, commit, push, open a PR with `gh pr create`, then remove the worktree.
- **Always review before merging** — never merge a PR without reviewing it first. Read the diff, evaluate the changes, and approve via the workflow dispatch before merging. This applies whether merging a single PR or batch-merging with `/merge-prs`. No exceptions.
- **Branch cleanup** — the repo has **auto-delete head branches** enabled, so GitHub deletes remote branches automatically after a PR is merged. Local branches should be deleted after their PR is merged or closed (`git branch -d <branch>` and `git remote prune origin`).

---

### PR review workflows (`.github/workflows/`)

GitHub blocks self-approving and self-requesting-changes on your own PRs. Two workflow_dispatch actions use the **github-actions bot** to submit reviews on your behalf:

**Approve PR** (`auto-approve.yml`) — approves a PR via `hmarr/auto-approve-action`:
```bash
gh workflow run "Approve PR" -f pr-number=<N>
```

**Request Changes** (`request-changes.yml`) — submits a REQUEST_CHANGES review with a comment via `actions/github-script`:
```bash
gh workflow run "Request Changes" -f pr-number=<N> -f body="<explanation>"
```

Both require the repo setting **"Allow GitHub Actions to create and approve pull requests"** to be enabled (Settings > Actions > General).

---

### PR screenshots

Two scripts automate capturing a PNG of the running game and attaching it to a pull request.

**`scripts/screenshot.mjs`** — Builds the app with Vite, starts `vite preview` on port 4173, launches headless Brave via `puppeteer-core`, waits for the `.board` selector + fonts + a 500ms settle, and saves a 2x-resolution PNG. Usage:

```bash
node scripts/screenshot.mjs [output-path]   # default: /tmp/chess-screenshot.png
```

**`scripts/upload-screenshot.sh`** — Uploads the PNG to a `pr-screenshots` orphan branch on GitHub (via Contents API) and prepends a `## Screenshot` section with the image to the PR body. Creates the orphan branch automatically on first run. Usage:

```bash
bash scripts/upload-screenshot.sh <image-path> <pr-number>
```

**Automation rule** — when a PR touches any of these paths, capture and attach a screenshot before (or right after) creating the PR:

- `src/components/**/*.{jsx,css}`
- `src/App.jsx`
- `src/index.css`
- `src/assets/**`
- `index.html`

**Full workflow example:**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node scripts/screenshot.mjs /tmp/chess-screenshot.png
gh pr create --title "…" --body "…"
bash scripts/upload-screenshot.sh /tmp/chess-screenshot.png <pr-number>
```

The screenshot is never committed to the feature branch — it lives only on the `pr-screenshots` orphan branch.

---

### Workspace layout

The project lives inside `~/Desktop/chess_game_workspace/chess_game`. The parent directory `~/Desktop/chess_game_workspace/` is used for git worktrees — each worktree is created as a sibling of the `chess_game/` folder (e.g. `../my-feature/`). The `.claude/settings.local.json` includes `"additionalDirectories": ["../"]` so that file operations in sibling worktree directories are permitted without extra prompts.

---

### Keeping this file up to date

**This file must always reflect the current state of the codebase.** Follow these rules:

- Any change that adds, removes, or restructures files, scripts, dependencies, or conventions must include a corresponding update to this CLAUDE.md in the same commit.
- When you discover a useful tip, gotcha, or workaround while working in this repo, add it to the appropriate section (or to "Tips & gotchas" below).
- If a section becomes inaccurate, fix it — don't leave stale documentation.

---

### Sub-agents (`.claude/agents/`)

Custom sub-agent definitions live in `.claude/agents/<name>.md`. Sub-agents run in a **fresh context window** via the Task tool, with no access to the parent conversation's history.

**`pr-reviewer`** — Reviews a single PR diff for correctness, safety, documentation accuracy, and adherence to project conventions. Enforces a strict zero-issues-before-approval bar: wording nits, misleading documentation, inconsistent terminology, and minor style issues all block approval. Returns a structured verdict: first line is `APPROVE` or `REQUEST_CHANGES`, followed by reasoning (numbered issue list for rejections). Used by the `/merge-prs` skill to ensure each PR is reviewed independently (not influenced by the conversation that created the code).

---

### Skills (`.claude/skills/`)

Custom slash-command skills live in `.claude/skills/<name>/SKILL.md`.

**`/merge-prs`** — Reviews and merges open PRs into master in creation order. Each PR review is **delegated to the `pr-reviewer` sub-agent** so it runs in a fresh context window — this prevents the review from being influenced by prior conversation context where the code was written. Based on the sub-agent's verdict, the skill approves and merges the PR or requests changes and skips it. Resolves merge conflicts when they arise. After every merge it pulls from origin to keep local and remote in sync. Accepts optional PR numbers as arguments (e.g. `/merge-prs 5,7,9`).

**`/pr-screenshot`** — Captures a screenshot of the running game and attaches it to a PR. Usage: `/pr-screenshot <pr-number> [source-dir]`. Builds the app from the source directory (defaults to main repo), launches headless Brave to take a 2x PNG, uploads it to the `pr-screenshots` orphan branch via the GitHub Contents API, and prepends a `## Screenshot` section to the PR body. Handles worktree `node_modules` symlinking and uses `upload-screenshot.sh` for uploading and PR body updates (including auto-fixing `\!` escaping). Call this skill after creating any PR that touches UI files (`src/components/**`, `src/App.jsx`, `src/index.css`, `src/assets/**`, `index.html`).

---

### Tips & gotchas

- **`gh pr edit` is broken** — the `gh` CLI (as of early 2026) returns exit code 1 on `gh pr edit` due to a deprecated Projects Classic GraphQL field, even though the underlying mutation sometimes succeeds. Use the REST API instead: `gh api repos/OWNER/REPO/pulls/N -X PATCH --input payload.json`.
- **Large payloads via `gh api`** — passing large values (e.g. base64-encoded images) through `-f "field=VALUE"` will fail with "Argument list too long". Write the JSON body to a temp file and use `--input file.json` instead.
- **Shell CWD + worktree removal** — if your shell's CWD is inside a worktree directory and that directory gets removed, all subsequent shell commands will fail. Always `cd` back to the main repo before removing a worktree.
- **Brave headless** — Brave is installed at `/usr/bin/brave-browser` and works as a Chromium drop-in for puppeteer-core. Use `--no-sandbox --disable-setuid-sandbox --disable-gpu --disable-extensions` flags for headless screenshots.
- **Always pull after merging PRs** — after merging a PR (via `gh pr merge` or manually), always run `git fetch origin master && git pull origin master` to keep local master in sync with remote. This prevents conflicts and stale state when merging subsequent PRs.
- **Tailwind v4 + shadcn** — shadcn requires a CSS file with `@import "tailwindcss"` to detect the Tailwind config. Create `src/index.css` with the import before running `npx shadcn@latest init`.
- **PR screenshot `!` escaping** — `upload-screenshot.sh` (and any manual `jq -Rs` pipeline) can escape `!` in `![image](url)` markdown to `\![image](url)`, causing GitHub to render a text link instead of an inline image. After uploading, verify the PR body with `gh api repos/OWNER/REPO/pulls/N --jq '.body' | head -5` and fix the escaped `\!` if needed.
- **`jq --arg` vs `--rawfile` for large values** — `jq --arg varname "$LARGE_VALUE"` hits "Argument list too long" when the value exceeds shell arg limits (e.g. base64-encoded screenshots). Write the value to a temp file and use `jq --rawfile varname file` instead.
- **`git worktree add` from a detached branch** — if you `git checkout feature-branch` on the main repo first and then try `git worktree add ../path feature-branch`, it fails because the branch is already checked out. Stay on `master` in the main repo and create the worktree directly from there.
- **`upload-screenshot.sh` 404 SHA bug (fixed)** — previously, when the screenshot file didn't exist on the `pr-screenshots` branch, `gh api ... --jq '.sha'` with `|| true` captured the full 404 JSON error body into `EXISTING_SHA`, corrupting the upload payload. Fixed by checking exit code explicitly and building JSON with `jq -n --rawfile`. The script also now auto-fixes `\!` escaping in the PR body.
- **Worktree missing `node_modules`** — git worktrees only contain tracked files. The screenshot script needs `node_modules` (for `puppeteer-core` and `vite`). Symlink from the main repo: `ln -s /path/to/chess_game/node_modules <worktree>/node_modules`.
