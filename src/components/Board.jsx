import Square from './Square.jsx';
import { KING } from '../engine/constants.js';
import { isInCheck } from '../engine/moves.js';
import './Board.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function Board({ gameState, selectedSquare, legalMoves, onSquareClick }) {
  const { board, lastMove, turn } = gameState;
  const inCheck = isInCheck(board, turn);

  return (
    <div className="board-scene">
      <div className="board-3d">
        {/* wooden frame surface */}
        <div className="board-frame">
          {/* rank labels on the left edge */}
          <div className="rank-labels">
            {RANKS.map(r => <div key={r} className="rank-label">{r}</div>)}
          </div>

          <div className="board-and-files">
            <div className="board">
              {board.map((row, r) => (
                <div key={r} className="board-row">
                  {row.map((piece, c) => {
                    const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
                    const isLegalMove = legalMoves.some(m => m.toRow === r && m.toCol === c);
                    const isLastMove = lastMove && (
                      (lastMove.fromRow === r && lastMove.fromCol === c) ||
                      (lastMove.toRow === r && lastMove.toCol === c)
                    );
                    const isKingInCheck = inCheck && piece && piece.type === KING && piece.color === turn;

                    return (
                      <Square
                        key={c}
                        row={r}
                        col={c}
                        piece={piece}
                        isSelected={isSelected}
                        isLegalMove={isLegalMove}
                        isLastMove={isLastMove}
                        isCheck={isKingInCheck}
                        onClick={() => onSquareClick(r, c)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* file labels along the bottom edge */}
            <div className="file-labels">
              {FILES.map(f => <div key={f} className="file-label">{f}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* shadow cast on the table */}
      <div className="table-shadow" />
    </div>
  );
}
