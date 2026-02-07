import PieceSVG from './PieceSVG.jsx';
import './Square.css';

export default function Square({ row, col, piece, isSelected, isLegalMove, isLastMove, isCheck, onClick }) {
  const isDark = (row + col) % 2 === 1;

  let className = `square ${isDark ? 'dark' : 'light'}`;
  if (isSelected) className += ' selected';
  if (isLastMove) className += ' last-move';
  if (isCheck) className += ' in-check';

  return (
    <div className={className} onClick={onClick}>
      {piece && (
        <div className={`piece ${piece.color}`}>
          <PieceSVG type={piece.type} color={piece.color} />
        </div>
      )}
      {isLegalMove && (
        <span className={piece ? 'capture-hint' : 'move-hint'} />
      )}
    </div>
  );
}
