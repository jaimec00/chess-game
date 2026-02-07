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
        <div className="board-frame relative flex items-stretch p-2.5 bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_0_20px_rgba(100,140,200,0.06),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
          {/* top-edge glass highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent animate-shimmer pointer-events-none" />
          {/* rank labels on the left edge */}
          <div className="flex flex-col justify-around w-6 shrink-0">
            {RANKS.map(r => (
              <div key={r} className="flex-1 flex items-center justify-center text-[12px] font-bold text-white/60 font-ocr">{r}</div>
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
                <div key={f} className="flex-1 text-center text-[12px] font-bold lowercase text-white/60 font-ocr">{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
