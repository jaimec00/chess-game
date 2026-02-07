import PieceSVG from './PieceSVG.jsx';
import { cn } from '@/lib/utils';

export default function Square({ row, col, piece, isSelected, isLegalMove, isLastMove, isCheck, onClick }) {
  const isDark = (row + col) % 2 === 1;

  return (
    <div
      className={cn(
        'w-full aspect-square flex items-center justify-center relative cursor-pointer select-none transition-colors duration-[120ms] group',
        isDark ? 'bg-sq-dark' : 'bg-sq-light',
        isLastMove && (isDark ? '!bg-sq-lastmove-dark' : '!bg-sq-lastmove-light'),
        isSelected && '!bg-sq-selected shadow-[inset_0_0_14px_rgba(0,0,0,0.2)]',
        isCheck && '!bg-[radial-gradient(ellipse_at_center,rgba(192,40,0,0.56)_0%,rgba(155,26,0,0.37)_40%,transparent_75%)] animate-check-throb'
      )}
      onClick={onClick}
    >
      {piece && (
        <div className="w-[82%] h-[82%] pointer-events-none flex items-center justify-center drop-shadow-[1px_3px_2px_rgba(0,0,0,0.45)] drop-shadow-[0_6px_6px_rgba(0,0,0,0.2)] transition-transform duration-[120ms] group-hover:scale-[1.08]">
          <PieceSVG type={piece.type} color={piece.color} />
        </div>
      )}
      {isLegalMove && (
        piece
          ? <span className="absolute w-[88%] h-[88%] rounded-full border-4 border-black/[0.38] pointer-events-none box-border" />
          : <span className="absolute w-[26%] h-[26%] rounded-full bg-black/[0.32] pointer-events-none shadow-[0_1px_4px_rgba(0,0,0,0.2)]" />
      )}
    </div>
  );
}
