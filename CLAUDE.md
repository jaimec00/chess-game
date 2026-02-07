## Chess Game — Codebase Documentation

### Overview

A complete browser chess game (~1,800 lines) — Player (white) vs AI (black) with full standard rules, built from scratch with React 18 + Vite. No external chess libraries.

```
chess_game/
├── index.html              # Entry HTML, loads Google Fonts (Cinzel, Inter)
├── package.json            # React 19, Vite 7
├── src/
│   ├── main.jsx            # React DOM mount
│   ├── App.jsx             # Root component, state management, game loop
│   ├── App.css             # Dark felt-table background, layout
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
│       ├── Board.jsx/css   # 3D perspective board with wood frame, coordinates
│       ├── Square.jsx/css  # Individual square: highlights, hover, hints
│       ├── PieceSVG.jsx    # Renders cburnett piece SVGs as <img> elements
│       ├── GameInfo.jsx/css # Status panel: turn, captures, controls
│       └── PromotionModal.jsx/css  # Piece picker overlay (uses PieceSVG)
```

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

The board uses **CSS 3D perspective** (`perspective(1200px) rotateX(22deg)` as a transform function, not a rendering context) to create a tabletop viewing angle. A `::after` pseudo-element on the board frame renders a visible front edge. A blurred radial-gradient div beneath simulates a table shadow.

Pieces use the **cburnett SVG set** (`src/assets/pieces/`), the standard piece artwork from lichess.org (CC BY-SA 3.0 by Colin M.L. Burnett). `PieceSVG.jsx` imports all 12 SVGs and renders them as `<img>` elements. CSS `drop-shadow` filters on the piece wrapper cast shadows onto the board.

The info panel uses Cinzel serif for headings and Inter sans-serif for body, with a dark wood-toned card, gradient dividers, and a turn indicator dot (marble-textured radial gradient).

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
- **Commits**: short lowercase messages (e.g. `add move timer`, `fix castling bug`).
- **Commit & push freely** — no need to ask before committing or pushing.
- **Feature branches + PRs** — create a branch per feature/fix and open a PR to merge into `master`. Don't commit directly to `master` for new work. This applies to **all** changes — code, docs, config, CLAUDE.md updates, everything. No exceptions.
- **Git worktrees** — never work on `master` directly. Use `git worktree add` to create a worktree for each branch, do all work there, then commit, push, and open a PR with `gh pr create`. Remove the worktree after the PR is created.

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
- `src/App.{jsx,css}`
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

### Tips & gotchas

- **`gh pr edit` is broken** — the `gh` CLI (as of early 2026) returns exit code 1 on `gh pr edit` due to a deprecated Projects Classic GraphQL field, even though the underlying mutation sometimes succeeds. Use the REST API instead: `gh api repos/OWNER/REPO/pulls/N -X PATCH --input payload.json`.
- **Large payloads via `gh api`** — passing large values (e.g. base64-encoded images) through `-f "field=VALUE"` will fail with "Argument list too long". Write the JSON body to a temp file and use `--input file.json` instead.
- **Shell CWD + worktree removal** — if your shell's CWD is inside a worktree directory and that directory gets removed, all subsequent shell commands will fail. Always `cd` back to the main repo before removing a worktree.
- **Brave headless** — Brave is installed at `/usr/bin/brave-browser` and works as a Chromium drop-in for puppeteer-core. Use `--no-sandbox --disable-setuid-sandbox --disable-gpu --disable-extensions` flags for headless screenshots.
