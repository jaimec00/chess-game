import { WHITE, BLACK, PIECE_VALUES, PIECE_SQUARE_TABLES } from './constants.js';
import { getAllLegalMoves } from './moves.js';
import { makeMove } from './gameState.js';

const AI_DEPTH = 3;

function getPieceSquareValue(type, color, row, col) {
  const table = PIECE_SQUARE_TABLES[type];
  if (!table) return 0;
  // Tables are from white's perspective; mirror for black
  const r = color === WHITE ? row : 7 - row;
  return table[r][col];
}

export function evaluate(gameState) {
  const { board } = gameState;
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] + getPieceSquareValue(piece.type, piece.color, r, c);
      score += piece.color === WHITE ? value : -value;
    }
  }

  return score;
}

function minimax(gameState, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw') {
    if (gameState.status === 'checkmate') {
      return { score: isMaximizing ? -100000 - depth : 100000 + depth };
    }
    if (gameState.status === 'stalemate' || gameState.status === 'draw') {
      return { score: 0 };
    }
    return { score: evaluate(gameState) };
  }

  const color = isMaximizing ? WHITE : BLACK;
  let moves = getAllLegalMoves(gameState, color);

  // Move ordering: captures first for better pruning
  moves.sort((a, b) => {
    const aCap = gameState.board[a.toRow]?.[a.toCol] ? 1 : 0;
    const bCap = gameState.board[b.toRow]?.[b.toCol] ? 1 : 0;
    return bCap - aCap;
  });

  let bestMove = moves[0] || null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newState = makeMove(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol, move.special, move.special === 'promotion' ? 'queen' : undefined);
      const result = minimax(newState, depth - 1, alpha, beta, false);
      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, maxScore);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const newState = makeMove(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol, move.special, move.special === 'promotion' ? 'queen' : undefined);
      const result = minimax(newState, depth - 1, alpha, beta, true);
      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, minScore);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

export function getBestMove(gameState) {
  const result = minimax(gameState, AI_DEPTH, -Infinity, Infinity, false);
  return result.move;
}
