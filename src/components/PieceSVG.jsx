import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK } from '../engine/constants.js';

import wK from '../assets/pieces/wK.svg';
import wQ from '../assets/pieces/wQ.svg';
import wR from '../assets/pieces/wR.svg';
import wB from '../assets/pieces/wB.svg';
import wN from '../assets/pieces/wN.svg';
import wP from '../assets/pieces/wP.svg';
import bK from '../assets/pieces/bK.svg';
import bQ from '../assets/pieces/bQ.svg';
import bR from '../assets/pieces/bR.svg';
import bB from '../assets/pieces/bB.svg';
import bN from '../assets/pieces/bN.svg';
import bP from '../assets/pieces/bP.svg';

const PIECE_IMAGES = {
  [WHITE]: { [KING]: wK, [QUEEN]: wQ, [ROOK]: wR, [BISHOP]: wB, [KNIGHT]: wN, [PAWN]: wP },
  [BLACK]: { [KING]: bK, [QUEEN]: bQ, [ROOK]: bR, [BISHOP]: bB, [KNIGHT]: bN, [PAWN]: bP },
};

export default function PieceSVG({ type, color }) {
  const src = PIECE_IMAGES[color]?.[type];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`${color} ${type}`}
      className="piece-svg"
      draggable={false}
    />
  );
}
