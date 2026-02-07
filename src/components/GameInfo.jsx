import { WHITE, BLACK, PIECE_SYMBOLS, PIECE_VALUES } from '../engine/constants.js';
import './GameInfo.css';

export default function GameInfo({ gameState, isThinking, onNewGame }) {
  const { turn, status, capturedPieces } = gameState;
  const isGameOver = status === 'checkmate' || status === 'stalemate' || status === 'draw';

  let statusText;
  if (isGameOver) {
    statusText = status === 'checkmate'
      ? `${turn === WHITE ? 'Black' : 'White'} wins by checkmate`
      : status === 'stalemate' ? 'Stalemate' : 'Draw';
  } else {
    statusText = `${turn === WHITE ? 'White' : 'Black'} to move`;
  }

  return (
    <div className="game-info">
      <div className="info-header">
        <h2>Chess</h2>
        <div className="subtitle">Player vs Engine</div>
      </div>

      <div className="info-divider" />

      <div className="turn-section">
        <div className={`turn-indicator ${isGameOver ? 'ended' : ''}`}>
          <span className={`turn-dot ${turn === WHITE ? 'white-dot' : 'black-dot'}`} />
          <span className="turn-text">{statusText}</span>
        </div>
        {status === 'check' && <div className="check-badge">CHECK</div>}
        {isThinking && (
          <div className="thinking">
            <span className="thinking-dots" />
            Engine thinking...
          </div>
        )}
      </div>

      <div className="info-divider" />

      <div className="captured-section">
        <CapturedPieces label="White captures" pieces={capturedPieces[BLACK]} side="white" />
        <CapturedPieces label="Black captures" pieces={capturedPieces[WHITE]} side="black" />
      </div>

      <div className="info-divider" />

      <button className="new-game-btn" onClick={onNewGame}>
        New Game
      </button>
    </div>
  );
}

function CapturedPieces({ label, pieces, side }) {
  const sorted = [...pieces].sort((a, b) => (PIECE_VALUES[b.type] || 0) - (PIECE_VALUES[a.type] || 0));
  const totalValue = sorted.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);

  return (
    <div className="captured-group">
      <div className="captured-header">
        <span className="captured-label">{label}</span>
        {totalValue > 0 && <span className="captured-value">+{totalValue / 100}</span>}
      </div>
      <div className="captured-pieces">
        {sorted.length === 0
          ? <span className="no-captures">&mdash;</span>
          : sorted.map((p, i) => (
              <span key={i} className="captured-piece">
                {PIECE_SYMBOLS[p.color][p.type]}
              </span>
            ))
        }
      </div>
    </div>
  );
}
