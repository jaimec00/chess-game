import { WHITE, BLACK, KING, KNIGHT, BISHOP, getInitialBoard } from './constants.js';
import { isInCheck } from './moves.js';
import { getAllLegalMoves } from './moves.js';
import { applyMove } from './specialMoves.js';

export function createInitialGameState() {
  return {
    board: getInitialBoard(),
    turn: WHITE,
    castlingRights: {
      whiteKing: true,
      whiteQueen: true,
      blackKing: true,
      blackQueen: true,
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    moveHistory: [],
    positionHistory: [],
    capturedPieces: { [WHITE]: [], [BLACK]: [] },
    status: 'playing',
    lastMove: null,
  };
}

// Simple board hash for repetition detection
function hashBoard(board, turn) {
  let hash = turn;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) hash += `${r}${c}${p.type[0]}${p.color[0]}`;
    }
  }
  return hash;
}

function hasInsufficientMaterial(board) {
  const pieces = { [WHITE]: [], [BLACK]: [] };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== KING) {
        pieces[p.color].push(p.type);
      }
    }
  }

  const w = pieces[WHITE], b = pieces[BLACK];

  // King vs King
  if (w.length === 0 && b.length === 0) return true;
  // King vs King + Bishop/Knight
  if (w.length === 0 && b.length === 1 && (b[0] === BISHOP || b[0] === KNIGHT)) return true;
  if (b.length === 0 && w.length === 1 && (w[0] === BISHOP || w[0] === KNIGHT)) return true;
  // King + Bishop vs King + Bishop (same color bishop)
  if (w.length === 1 && b.length === 1 && w[0] === BISHOP && b[0] === BISHOP) {
    // Find bishop positions to check square color
    let wBishopColor = null, bBishopColor = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === BISHOP) {
          const sqColor = (r + c) % 2;
          if (p.color === WHITE) wBishopColor = sqColor;
          else bBishopColor = sqColor;
        }
      }
    }
    if (wBishopColor === bBishopColor) return true;
  }

  return false;
}

export function makeMove(gameState, fromRow, fromCol, toRow, toCol, special, promotionPiece) {
  const result = applyMove(gameState, fromRow, fromCol, toRow, toCol, special, promotionPiece);
  const nextTurn = gameState.turn === WHITE ? BLACK : WHITE;

  const capturedPieces = {
    [WHITE]: [...gameState.capturedPieces[WHITE]],
    [BLACK]: [...gameState.capturedPieces[BLACK]],
  };

  if (result.captured) {
    capturedPieces[result.captured.color].push(result.captured);
  }

  const moveRecord = { fromRow, fromCol, toRow, toCol, special, promotionPiece };
  const posHash = hashBoard(result.board, nextTurn);

  const newState = {
    board: result.board,
    turn: nextTurn,
    castlingRights: result.castlingRights,
    enPassantTarget: result.enPassantTarget,
    halfMoveClock: result.halfMoveClock,
    moveHistory: [...gameState.moveHistory, moveRecord],
    positionHistory: [...gameState.positionHistory, posHash],
    capturedPieces,
    status: 'playing',
    lastMove: { fromRow, fromCol, toRow, toCol },
  };

  // Determine game status
  newState.status = getGameStatus(newState);

  return newState;
}

export function getGameStatus(gameState) {
  const { board, turn } = gameState;
  const legalMoves = getAllLegalMoves(gameState, turn);
  const inCheck = isInCheck(board, turn);

  if (legalMoves.length === 0) {
    return inCheck ? 'checkmate' : 'stalemate';
  }

  // 50-move rule
  if (gameState.halfMoveClock >= 100) return 'draw';

  // Threefold repetition
  const currentHash = gameState.positionHistory[gameState.positionHistory.length - 1];
  if (currentHash) {
    const count = gameState.positionHistory.filter(h => h === currentHash).length;
    if (count >= 3) return 'draw';
  }

  // Insufficient material
  if (hasInsufficientMaterial(board)) return 'draw';

  return inCheck ? 'check' : 'playing';
}

export { isInCheck };
