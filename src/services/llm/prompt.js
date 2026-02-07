import { boardToDescription, moveHistoryToString, moveToSAN } from '../../engine/notation.js';
import { getAllLegalMoves } from '../../engine/moves.js';

export const SYSTEM_PROMPT = `You are playing chess as Black against a human player. You are a confident, witty opponent who provides brief commentary on each move.

RESPONSE FORMAT — you MUST follow this exactly:
1. First line: your move in Standard Algebraic Notation (SAN) only, nothing else
2. Second line: blank
3. Third line: a short 1-2 sentence comment (trash talk, analysis, or reaction to the player's move)

SAN NOTATION RULES:
- Piece letters: K (King), Q (Queen), R (Rook), B (Bishop), N (Knight)
- Pawns have no letter prefix: e5, d4, exd5
- Captures use "x": Nxe4, Bxf7, exd5
- Castling: O-O (kingside), O-O-O (queenside)
- Promotion: e1=Q (pawn to e1, promotes to queen)
- Check: + suffix. Checkmate: # suffix.
- Disambiguation: when two pieces of the same type can reach the same square, add the file letter (Nbd7), rank number (R1e1), or both (Qh4e1).

EXAMPLE RESPONSES:
e5

Classic. Let's see if you can handle the Sicilian.

Nf6+

Your king looks a little nervous. Good.

IMPORTANT:
- You will be given the board state and full move history to help you find a legal move.
- If told your move was illegal, carefully re-read the position and pick a DIFFERENT legal move from the list provided.
- Never repeat an illegal move you already tried.`;

export function buildUserMoveMessage(san, gameState) {
  const boardDesc = boardToDescription(gameState);
  const history = moveHistoryToString(gameState);

  let msg = `My move: ${san}\n\nCurrent position:\n${boardDesc}`;
  if (history) msg += `\n\nMove history: ${history}`;
  msg += '\n\nYour turn (Black).';

  return msg;
}

export function buildFirstMoveMessage(gameState) {
  const boardDesc = boardToDescription(gameState);
  return `The game just started. Here is the current position after White's first move:\n${boardDesc}\n\nI'm White, you're Black. Your turn.`;
}

export function buildIllegalMoveMessage(attempted, gameState) {
  const legalMoves = getAllLegalMoves(gameState, gameState.turn);
  const legalSANs = legalMoves.map(m => moveToSAN(gameState, m));
  // Deduplicate (promotion variants may generate duplicates without piece specified)
  const unique = [...new Set(legalSANs)];

  return `"${attempted}" is not a legal move. Here are all legal moves: ${unique.join(', ')}\n\nPlease pick one of these moves. Remember: first line is your move in SAN, then a blank line, then a short comment.`;
}

export function parseLLMResponse(text) {
  if (!text) return { move: null, comment: '' };

  const lines = text.trim().split('\n');
  const moveLine = lines[0]?.trim() || '';

  // Everything after the first blank line (or after line 1) is the comment
  let commentStart = 1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      commentStart = i + 1;
      break;
    }
  }
  const comment = lines.slice(commentStart).join('\n').trim();

  return { move: moveLine, comment };
}
