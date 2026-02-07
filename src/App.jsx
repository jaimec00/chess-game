import { useState, useEffect, useCallback } from 'react';
import Board from './components/Board.jsx';
import PromotionModal from './components/PromotionModal.jsx';
import GameInfo from './components/GameInfo.jsx';
import { WHITE, BLACK } from './engine/constants.js';
import { getLegalMoves } from './engine/moves.js';
import { createInitialGameState, makeMove } from './engine/gameState.js';
import { getBestMove } from './engine/ai.js';
import './App.css';

export default function App() {
  const [gameState, setGameState] = useState(createInitialGameState);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  const isGameOver = gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw';

  // AI move after player's turn
  useEffect(() => {
    if (gameState.turn === BLACK && !isGameOver && !pendingPromotion) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        const move = getBestMove(gameState);
        if (move) {
          const promotionPiece = move.special === 'promotion' ? 'queen' : undefined;
          setGameState(prev => makeMove(prev, move.fromRow, move.fromCol, move.toRow, move.toCol, move.special, promotionPiece));
        }
        setIsThinking(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, isGameOver, pendingPromotion]);

  const handleSquareClick = useCallback((row, col) => {
    if (isGameOver || gameState.turn !== WHITE || isThinking) return;

    // If we have a selected piece, check if this is a legal move target
    if (selectedSquare) {
      const move = legalMoves.find(m => m.toRow === row && m.toCol === col);
      if (move) {
        if (move.special === 'promotion') {
          setPendingPromotion({ fromRow: selectedSquare.row, fromCol: selectedSquare.col, toRow: row, toCol: col, special: move.special });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
        setGameState(prev => makeMove(prev, selectedSquare.row, selectedSquare.col, row, col, move.special));
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select a new piece
    const piece = gameState.board[row][col];
    if (piece && piece.color === WHITE) {
      const moves = getLegalMoves(gameState, row, col);
      setSelectedSquare({ row, col });
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [gameState, selectedSquare, legalMoves, isGameOver, isThinking]);

  const handlePromotion = useCallback((pieceType) => {
    if (!pendingPromotion) return;
    const { fromRow, fromCol, toRow, toCol, special } = pendingPromotion;
    setGameState(prev => makeMove(prev, fromRow, fromCol, toRow, toCol, special, pieceType));
    setPendingPromotion(null);
  }, [pendingPromotion]);

  const handleNewGame = useCallback(() => {
    setGameState(createInitialGameState());
    setSelectedSquare(null);
    setLegalMoves([]);
    setIsThinking(false);
    setPendingPromotion(null);
  }, []);

  return (
    <div className="app">
      <div className="game-container">
        <Board
          gameState={gameState}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          onSquareClick={handleSquareClick}
        />
        <GameInfo
          gameState={gameState}
          isThinking={isThinking}
          onNewGame={handleNewGame}
        />
      </div>
      {pendingPromotion && (
        <PromotionModal color={WHITE} onSelect={handlePromotion} />
      )}
    </div>
  );
}
