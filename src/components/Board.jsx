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
    <div className="board-scene shrink-0 relative flex items-center justify-center">
      <div className="relative">
        {/* board frame */}
        <div className="board-frame flex items-stretch p-2.5 bg-white/[0.06] border border-white/10 rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.3)]">
          {/* rank labels on the left edge */}
          <div className="flex flex-col justify-around w-6 shrink-0">
            {RANKS.map(r => (
              <div key={r} className="flex-1 flex items-center justify-center text-[12px] font-bold text-white/70 font-ocr">{r}</div>
            ))}
          </div>

          <div className="flex flex-col">
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
            <div className="flex h-[22px] items-center">
              {FILES.map(f => (
                <div key={f} className="flex-1 text-center text-[12px] font-bold lowercase text-white/70 font-ocr">{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
