export function cloneBoard(board) {
  return board.map(row =>
    row.map(cell => (cell ? { ...cell } : null))
  );
}

export function getPiece(board, row, col) {
  if (!isInBounds(row, col)) return null;
  return board[row][col];
}

export function isInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}
