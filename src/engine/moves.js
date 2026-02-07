import { WHITE, BLACK, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from './constants.js';
import { getPiece, isInBounds, cloneBoard, findKing } from './board.js';

const OPPONENT = { [WHITE]: BLACK, [BLACK]: WHITE };

// Check if a square is attacked by any piece of the given color
export function isSquareAttacked(board, row, col, byColor) {
  // Pawn attacks
  const pawnDir = byColor === WHITE ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir;
    const pc = col + dc;
    const p = getPiece(board, pr, pc);
    if (p && p.type === PAWN && p.color === byColor) return true;
  }

  // Knight attacks
  const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightOffsets) {
    const p = getPiece(board, row + dr, col + dc);
    if (p && p.type === KNIGHT && p.color === byColor) return true;
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const p = getPiece(board, row + dr, col + dc);
      if (p && p.type === KING && p.color === byColor) return true;
    }
  }

  // Sliding attacks (bishop/queen diagonals, rook/queen straights)
  const diagonals = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of diagonals) {
    for (let i = 1; i < 8; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (!isInBounds(r, c)) break;
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === BISHOP || p.type === QUEEN)) return true;
        break;
      }
    }
  }

  const straights = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of straights) {
    for (let i = 1; i < 8; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (!isInBounds(r, c)) break;
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === ROOK || p.type === QUEEN)) return true;
        break;
      }
    }
  }

  return false;
}

export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.row, king.col, OPPONENT[color]);
}

// Generate raw (pseudo-legal) moves for a piece, then filter for legality
function getRawMoves(board, row, col, enPassantTarget, castlingRights) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const color = piece.color;
  const opp = OPPONENT[color];

  switch (piece.type) {
    case PAWN: {
      const dir = color === WHITE ? -1 : 1;
      const startRow = color === WHITE ? 6 : 1;
      const promoRow = color === WHITE ? 0 : 7;

      // Forward 1
      const f1r = row + dir;
      if (isInBounds(f1r, col) && !board[f1r][col]) {
        if (f1r === promoRow) {
          moves.push({ toRow: f1r, toCol: col, special: 'promotion' });
        } else {
          moves.push({ toRow: f1r, toCol: col });
        }

        // Forward 2 from start
        const f2r = row + dir * 2;
        if (row === startRow && !board[f2r][col]) {
          moves.push({ toRow: f2r, toCol: col, special: 'doublePush' });
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const cr = row + dir, cc = col + dc;
        if (!isInBounds(cr, cc)) continue;
        const target = board[cr][cc];
        if (target && target.color === opp) {
          if (cr === promoRow) {
            moves.push({ toRow: cr, toCol: cc, special: 'promotion' });
          } else {
            moves.push({ toRow: cr, toCol: cc });
          }
        }
      }

      // En passant
      if (enPassantTarget) {
        const { row: epRow, col: epCol } = enPassantTarget;
        if (row + dir === epRow && Math.abs(col - epCol) === 1) {
          moves.push({ toRow: epRow, toCol: epCol, special: 'enPassant' });
        }
      }
      break;
    }

    case KNIGHT: {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of offsets) {
        const r = row + dr, c = col + dc;
        if (!isInBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color === opp) {
          moves.push({ toRow: r, toCol: c });
        }
      }
      break;
    }

    case BISHOP: {
      addSlidingMoves(board, row, col, [[-1,-1],[-1,1],[1,-1],[1,1]], opp, moves);
      break;
    }

    case ROOK: {
      addSlidingMoves(board, row, col, [[-1,0],[1,0],[0,-1],[0,1]], opp, moves);
      break;
    }

    case QUEEN: {
      addSlidingMoves(board, row, col, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], opp, moves);
      break;
    }

    case KING: {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr, c = col + dc;
          if (!isInBounds(r, c)) continue;
          const target = board[r][c];
          if (!target || target.color === opp) {
            moves.push({ toRow: r, toCol: c });
          }
        }
      }

      // Castling
      if (castlingRights) {
        const baseRow = color === WHITE ? 7 : 0;
        if (row === baseRow && col === 4) {
          // King side
          const ksRight = color === WHITE ? castlingRights.whiteKing : castlingRights.blackKing;
          if (ksRight &&
              !board[baseRow][5] && !board[baseRow][6] &&
              !isSquareAttacked(board, baseRow, 4, opp) &&
              !isSquareAttacked(board, baseRow, 5, opp) &&
              !isSquareAttacked(board, baseRow, 6, opp)) {
            moves.push({ toRow: baseRow, toCol: 6, special: 'castleKing' });
          }
          // Queen side
          const qsRight = color === WHITE ? castlingRights.whiteQueen : castlingRights.blackQueen;
          if (qsRight &&
              !board[baseRow][1] && !board[baseRow][2] && !board[baseRow][3] &&
              !isSquareAttacked(board, baseRow, 4, opp) &&
              !isSquareAttacked(board, baseRow, 3, opp) &&
              !isSquareAttacked(board, baseRow, 2, opp)) {
            moves.push({ toRow: baseRow, toCol: 2, special: 'castleQueen' });
          }
        }
      }
      break;
    }
  }

  return moves;
}

function addSlidingMoves(board, row, col, directions, opp, moves) {
  for (const [dr, dc] of directions) {
    for (let i = 1; i < 8; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (!isInBounds(r, c)) break;
      const target = board[r][c];
      if (!target) {
        moves.push({ toRow: r, toCol: c });
      } else {
        if (target.color === opp) moves.push({ toRow: r, toCol: c });
        break;
      }
    }
  }
}

// Filter out moves that leave own king in check
function filterLegalMoves(board, row, col, rawMoves, color) {
  return rawMoves.filter(move => {
    const newBoard = cloneBoard(board);

    // Apply the move
    newBoard[move.toRow][move.toCol] = newBoard[row][col];
    newBoard[row][col] = null;

    // Handle en passant capture
    if (move.special === 'enPassant') {
      const capturedRow = color === WHITE ? move.toRow + 1 : move.toRow - 1;
      newBoard[capturedRow][move.toCol] = null;
    }

    // Handle castling - move the rook too
    if (move.special === 'castleKing') {
      const baseRow = move.toRow;
      newBoard[baseRow][5] = newBoard[baseRow][7];
      newBoard[baseRow][7] = null;
    }
    if (move.special === 'castleQueen') {
      const baseRow = move.toRow;
      newBoard[baseRow][3] = newBoard[baseRow][0];
      newBoard[baseRow][0] = null;
    }

    return !isInCheck(newBoard, color);
  });
}

export function getLegalMoves(gameState, row, col) {
  const piece = getPiece(gameState.board, row, col);
  if (!piece) return [];

  const raw = getRawMoves(gameState.board, row, col, gameState.enPassantTarget, gameState.castlingRights);
  return filterLegalMoves(gameState.board, row, col, raw, piece.color);
}

export function getAllLegalMoves(gameState, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = gameState.board[r][c];
      if (piece && piece.color === color) {
        const pieceMoves = getLegalMoves(gameState, r, c);
        for (const move of pieceMoves) {
          moves.push({ fromRow: r, fromCol: c, ...move });
        }
      }
    }
  }
  return moves;
}
