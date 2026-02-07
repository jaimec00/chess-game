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
│       ├── PieceSVG.jsx    # SVG piece shapes with radial gradient shading
│       ├── GameInfo.jsx/css # Status panel: turn, captures, controls
│       └── PromotionModal.jsx/css  # Piece picker overlay
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

Pieces are **custom SVGs** (`PieceSVG.jsx`) — six hand-crafted shapes with a shared base platform, filled with a `radialGradient` (light hitting from upper-left) defined once in a hidden `<svg>` in Board.jsx. White pieces get an ivory-to-tan gradient with dark stroke; black pieces get gray-to-near-black with black stroke. CSS `drop-shadow` filters on the piece wrapper cast shadows onto the board.

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

**Not a git repository** — the project directory does not have git initialized. If version control is needed, run `git init` first.
