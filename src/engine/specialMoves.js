import { WHITE, PAWN, ROOK, QUEEN } from './constants.js';
import { cloneBoard } from './board.js';

// Apply a move to a board clone and return updated board + metadata
export function applyMove(gameState, fromRow, fromCol, toRow, toCol, special, promotionPiece) {
  const board = cloneBoard(gameState.board);
  const piece = board[fromRow][fromCol];
  const captured = board[toRow][toCol];
  let newEnPassantTarget = null;

  // Move the piece
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  // Handle special moves
  if (special === 'doublePush') {
    const epRow = piece.color === WHITE ? toRow + 1 : toRow - 1;
    newEnPassantTarget = { row: epRow, col: toCol };
  }

  if (special === 'enPassant') {
    const capturedRow = piece.color === WHITE ? toRow + 1 : toRow - 1;
    board[capturedRow][toCol] = null;
  }

  if (special === 'castleKing') {
    board[toRow][5] = board[toRow][7];
    board[toRow][7] = null;
  }

  if (special === 'castleQueen') {
    board[toRow][3] = board[toRow][0];
    board[toRow][0] = null;
  }

  if (special === 'promotion') {
    board[toRow][toCol] = { type: promotionPiece || QUEEN, color: piece.color };
  }

  // Update castling rights
  const cr = { ...gameState.castlingRights };

  // King moved
  if (piece.type === 'king') {
    if (piece.color === WHITE) {
      cr.whiteKing = false;
      cr.whiteQueen = false;
    } else {
      cr.blackKing = false;
      cr.blackQueen = false;
    }
  }

  // Rook moved or captured
  if (piece.type === 'rook') {
    if (fromRow === 7 && fromCol === 0) cr.whiteQueen = false;
    if (fromRow === 7 && fromCol === 7) cr.whiteKing = false;
    if (fromRow === 0 && fromCol === 0) cr.blackQueen = false;
    if (fromRow === 0 && fromCol === 7) cr.blackKing = false;
  }
  // Rook captured
  if (toRow === 7 && toCol === 0) cr.whiteQueen = false;
  if (toRow === 7 && toCol === 7) cr.whiteKing = false;
  if (toRow === 0 && toCol === 0) cr.blackQueen = false;
  if (toRow === 0 && toCol === 7) cr.blackKing = false;

  // Half move clock
  const halfMoveClock = (piece.type === PAWN || captured || special === 'enPassant')
    ? 0
    : gameState.halfMoveClock + 1;

  return {
    board,
    enPassantTarget: newEnPassantTarget,
    castlingRights: cr,
    halfMoveClock,
    captured: special === 'enPassant'
      ? { type: PAWN, color: piece.color === WHITE ? 'black' : 'white' }
      : captured,
  };
}
