import { QUEEN, ROOK, BISHOP, KNIGHT } from '../engine/constants.js';
import PieceSVG from './PieceSVG.jsx';
import './PromotionModal.css';

const PROMOTION_PIECES = [QUEEN, ROOK, BISHOP, KNIGHT];

export default function PromotionModal({ color, onSelect }) {
  return (
    <div className="promotion-overlay">
      <div className="promotion-modal">
        <h3>Promote pawn to:</h3>
        <div className="promotion-choices">
          {PROMOTION_PIECES.map(type => (
            <button key={type} className="promotion-btn" onClick={() => onSelect(type)}>
              <span className="promotion-piece">
                <PieceSVG type={type} color={color} />
              </span>
              <span className="promotion-label">{type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
