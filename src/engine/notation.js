import { WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from './constants.js';
import { getAllLegalMoves } from './moves.js';
import { createInitialGameState, makeMove } from './gameState.js';

const FILES = 'abcdefgh';
const PIECE_LETTER = {
  [KING]: 'K', [QUEEN]: 'Q', [ROOK]: 'R', [BISHOP]: 'B', [KNIGHT]: 'N',
};
const PIECE_CHAR = {
  [WHITE]: { [KING]: 'K', [QUEEN]: 'Q', [ROOK]: 'R', [BISHOP]: 'B', [KNIGHT]: 'N', [PAWN]: 'P' },
  [BLACK]: { [KING]: 'k', [QUEEN]: 'q', [ROOK]: 'r', [BISHOP]: 'b', [KNIGHT]: 'n', [PAWN]: 'p' },
};

export function toSquareName(row, col) {
  return FILES[col] + (8 - row);
}

export function fromSquareName(square) {
  const col = FILES.indexOf(square[0]);
  const row = 8 - parseInt(square[1], 10);
  return { row, col };
}

export function moveToSAN(gameState, move) {
  const { board } = gameState;
  const piece = board[move.fromRow][move.fromCol];
  if (!piece) return '';

  // Castling
  if (move.special === 'castleKing') return addCheckSuffix(gameState, move, 'O-O');
  if (move.special === 'castleQueen') return addCheckSuffix(gameState, move, 'O-O-O');

  const toSq = toSquareName(move.toRow, move.toCol);
  const isCapture = board[move.toRow][move.toCol] !== null || move.special === 'enPassant';

  let san = '';

  if (piece.type === PAWN) {
    if (isCapture) {
      san = FILES[move.fromCol] + 'x' + toSq;
    } else {
      san = toSq;
    }
    if (move.special === 'promotion') {
      const promoPiece = move.promotionPiece || QUEEN;
      san += '=' + PIECE_LETTER[promoPiece];
    }
  } else {
    const letter = PIECE_LETTER[piece.type];
    // Disambiguation: check if another piece of the same type can move to the same square
    const allMoves = getAllLegalMoves(gameState, piece.color);
    const samePieceMoves = allMoves.filter(
      m => m.toRow === move.toRow && m.toCol === move.toCol &&
        board[m.fromRow][m.fromCol]?.type === piece.type &&
        (m.fromRow !== move.fromRow || m.fromCol !== move.fromCol)
    );

    let disambig = '';
    if (samePieceMoves.length > 0) {
      const sameFile = samePieceMoves.some(m => m.fromCol === move.fromCol);
      const sameRank = samePieceMoves.some(m => m.fromRow === move.fromRow);
      if (!sameFile) {
        disambig = FILES[move.fromCol];
      } else if (!sameRank) {
        disambig = String(8 - move.fromRow);
      } else {
        disambig = toSquareName(move.fromRow, move.fromCol);
      }
    }

    san = letter + disambig + (isCapture ? 'x' : '') + toSq;
  }

  return addCheckSuffix(gameState, move, san);
}

function addCheckSuffix(gameState, move, san) {
  const promoPiece = move.special === 'promotion' ? (move.promotionPiece || QUEEN) : undefined;
  const newState = makeMove(gameState, move.fromRow, move.fromCol, move.toRow, move.toCol, move.special, promoPiece);
  if (newState.status === 'checkmate') return san + '#';
  if (newState.status === 'check') return san + '+';
  return san;
}

export function sanToMove(gameState, san) {
  if (!san) return null;
  const cleaned = san.trim().replace(/[?!]+$/, '');

  const allMoves = getAllLegalMoves(gameState, gameState.turn);

  // For promotion moves, expand into variants for each piece choice
  const expandedMoves = [];
  for (const move of allMoves) {
    if (move.special === 'promotion') {
      for (const promoPiece of [QUEEN, ROOK, BISHOP, KNIGHT]) {
        expandedMoves.push({ ...move, promotionPiece: promoPiece });
      }
    } else {
      expandedMoves.push(move);
    }
  }

  // Try matching SAN against generated SAN for each legal move
  for (const move of expandedMoves) {
    const moveSan = moveToSAN(gameState, move);
    if (moveSan === cleaned) return move;
  }

  // Try UCI format fallback (e.g. "e2e4" or "e7e8q")
  const uciMatch = cleaned.match(/^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/);
  if (uciMatch) {
    const from = fromSquareName(uciMatch[1]);
    const to = fromSquareName(uciMatch[2]);
    const promoChar = uciMatch[3]?.toLowerCase();
    const promoMap = { q: QUEEN, r: ROOK, b: BISHOP, n: KNIGHT };

    for (const move of expandedMoves) {
      if (move.fromRow === from.row && move.fromCol === from.col &&
          move.toRow === to.row && move.toCol === to.col) {
        if (move.special === 'promotion') {
          const wantedPiece = promoMap[promoChar] || QUEEN;
          if (move.promotionPiece === wantedPiece) return move;
        } else {
          return move;
        }
      }
    }
  }

  return null;
}

export function boardToDescription(gameState) {
  const { board } = gameState;
  const lines = [];
  for (let row = 0; row < 8; row++) {
    const rank = 8 - row;
    const cells = [];
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        cells.push(PIECE_CHAR[piece.color][piece.type]);
      } else {
        cells.push('.');
      }
    }
    lines.push(`${rank}: ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

export function moveHistoryToString(gameState) {
  if (gameState.moveHistory.length === 0) return '';

  // Replay moves from initial state to generate SAN for each
  let state = createInitialGameState();
  const sans = [];

  for (const move of gameState.moveHistory) {
    const san = moveToSAN(state, move);
    sans.push(san);
    const promoPiece = move.special === 'promotion' ? (move.promotionPiece || QUEEN) : undefined;
    state = makeMove(state, move.fromRow, move.fromCol, move.toRow, move.toCol, move.special, promoPiece);
  }

  const parts = [];
  for (let i = 0; i < sans.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const white = sans[i];
    const black = sans[i + 1];
    parts.push(black ? `${moveNum}. ${white} ${black}` : `${moveNum}. ${white}`);
  }
  return parts.join(' ');
}
