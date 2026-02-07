import { useState, useEffect, useCallback, useRef } from 'react';
import Board from './Board.jsx';
import PromotionModal from './PromotionModal.jsx';
import ChatBox from './ChatBox.jsx';
import ProviderSelect from './ProviderSelect.jsx';
import ApiKeyInput from './ApiKeyInput.jsx';
import { WHITE, BLACK } from '../engine/constants.js';
import { getLegalMoves } from '../engine/moves.js';
import { createInitialGameState, makeMove } from '../engine/gameState.js';
import { moveToSAN, sanToMove, moveHistoryToString, boardToDescription } from '../engine/notation.js';
import { getProvider, getDefaultModel, PROVIDERS } from '../services/llm/provider.js';
import { getApiKey, setApiKey, clearApiKey } from '../services/llm/apiKeyStore.js';
import { SYSTEM_PROMPT, buildUserMoveMessage, buildFirstMoveMessage, buildIllegalMoveMessage, parseLLMResponse } from '../services/llm/prompt.js';

const MAX_RETRIES = 3;

export default function ApiGame() {
  const [gameState, setGameState] = useState(createInitialGameState);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  // LLM state
  const [providerId, setProviderId] = useState('anthropic');
  const [modelId, setModelId] = useState(() => getDefaultModel('anthropic')?.id || '');
  const [apiKey, setApiKeyState] = useState(() => getApiKey('anthropic'));
  const [chatMessages, setChatMessages] = useState([]);
  const conversationHistoryRef = useRef([]);
  const [viewMode, setViewMode] = useState('commentary');
  const [apiError, setApiError] = useState(null);

  // Track whether the LLM turn is being handled to prevent duplicate triggers
  const llmTurnRef = useRef(false);

  const isGameOver = gameState.status === 'checkmate' || gameState.status === 'stalemate' || gameState.status === 'draw';
  const hasStarted = gameState.moveHistory.length > 0;
  const provider = getProvider(providerId);
  const modelName = provider?.models.find(m => m.id === modelId)?.name || modelId;

  // Handle provider change
  const handleProviderChange = useCallback((newId) => {
    setProviderId(newId);
    const defaultModel = getDefaultModel(newId);
    setModelId(defaultModel?.id || '');
    setApiKeyState(getApiKey(newId));
  }, []);

  // Handle API key change
  const handleApiKeyChange = useCallback((key) => {
    if (key) {
      setApiKey(providerId, key);
    } else {
      clearApiKey(providerId);
    }
    setApiKeyState(key);
    setApiError(null);
  }, [providerId]);

  // LLM turn handler
  useEffect(() => {
    if (gameState.turn !== BLACK || isGameOver || !apiKey || llmTurnRef.current) return;
    if (gameState.moveHistory.length === 0) return; // no moves made yet

    llmTurnRef.current = true;
    setIsThinking(true);

    const runLLMTurn = async () => {
      try {
        // Reconstruct the SAN of the player's last move from the full move history
        const history = moveHistoryToString(gameState);
        const lastMoveSAN = history.split(/\s+/).filter(s => !s.includes('.')).pop() || '';

        let userMsg;
        if (gameState.moveHistory.length === 1) {
          userMsg = buildFirstMoveMessage(lastMoveSAN);
        } else {
          userMsg = buildUserMoveMessage(lastMoveSAN);
        }

        // Add player move to chat
        setChatMessages(prev => [
          ...prev,
          { role: 'player', type: 'move', content: lastMoveSAN, moveSAN: lastMoveSAN },
        ]);

        // Store conversation history without board state
        const newConvHistory = [
          ...conversationHistoryRef.current,
          { role: 'user', content: userMsg },
        ];

        // Append current board state only to the last user message for the API call
        const boardState = boardToDescription(gameState);
        const convForApi = [
          ...newConvHistory.slice(0, -1),
          { role: 'user', content: `${userMsg}\n\nBoard:\n${boardState}` },
        ];

        let attempts = 0;
        let moveFound = false;
        // convForApi has board state in the last user message — used for API calls
        // newConvHistory has no board state — used for persistent storage
        let currentConv = convForApi;
        let storedConv = newConvHistory;

        while (attempts < MAX_RETRIES && !moveFound) {
          attempts++;

          const responseText = await provider.sendMessage(apiKey, modelId, currentConv, SYSTEM_PROMPT);
          const { move: moveSAN, comment } = parseLLMResponse(responseText);

          if (!moveSAN) {
            // No move parsed from response
            const feedback = 'I could not parse a move from your response. Please respond with your move in SAN notation on the first line, then a blank line, then a comment.';
            currentConv = [...currentConv, { role: 'assistant', content: responseText }, { role: 'user', content: feedback }];
            storedConv = [...storedConv, { role: 'assistant', content: responseText }, { role: 'user', content: feedback }];
            continue;
          }

          // Try to validate the move
          const validMove = sanToMove(gameState, moveSAN);

          if (validMove) {
            // Valid move — apply it
            const promoPiece = validMove.special === 'promotion' ? (validMove.promotionPiece || 'queen') : undefined;
            const newState = makeMove(gameState, validMove.fromRow, validMove.fromCol, validMove.toRow, validMove.toCol, validMove.special, promoPiece);

            // Generate proper SAN for display
            const displaySAN = moveToSAN(gameState, validMove);

            // Store conversation history without board state
            conversationHistoryRef.current = [...storedConv, { role: 'assistant', content: responseText }];

            // Add LLM move to chat
            setChatMessages(prev => [
              ...prev,
              { role: 'llm', type: 'move', content: comment, moveSAN: displaySAN },
            ]);

            setGameState(newState);
            moveFound = true;
          } else {
            // Illegal move — send feedback
            const feedback = buildIllegalMoveMessage(moveSAN);

            setChatMessages(prev => [
              ...prev,
              { role: 'system', type: 'error', content: `Illegal move attempted: ${moveSAN} (retry ${attempts}/${MAX_RETRIES})` },
            ]);

            currentConv = [...currentConv, { role: 'assistant', content: responseText }, { role: 'user', content: feedback }];
            storedConv = [...storedConv, { role: 'assistant', content: responseText }, { role: 'user', content: feedback }];
          }
        }

        if (!moveFound) {
          setChatMessages(prev => [
            ...prev,
            { role: 'system', type: 'error', content: `Failed to get a legal move after ${MAX_RETRIES} attempts. Try making another move or start a new game.` },
          ]);
          conversationHistoryRef.current = storedConv;
        }
      } catch (err) {
        const errorMsg = err.message || 'Unknown error';
        setApiError(errorMsg);
        setChatMessages(prev => [
          ...prev,
          { role: 'system', type: 'error', content: `API error: ${errorMsg}` },
        ]);
      } finally {
        setIsThinking(false);
        llmTurnRef.current = false;
      }
    };

    // Defer to let UI update
    const timer = setTimeout(runLLMTurn, 100);
    return () => {
      clearTimeout(timer);
      llmTurnRef.current = false;
    };
  }, [gameState, isGameOver, apiKey, providerId, modelId]);

  // Add game-over message to chat
  useEffect(() => {
    if (!isGameOver) return;
    const { status, turn } = gameState;
    let msg;
    if (status === 'checkmate') {
      msg = turn === WHITE ? 'Checkmate. Black wins.' : 'Checkmate. White wins.';
    } else if (status === 'stalemate') {
      msg = 'Stalemate. The game is drawn.';
    } else {
      msg = 'Draw.';
    }
    setChatMessages(prev => {
      // Avoid duplicate game-over messages
      if (prev.length > 0 && prev[prev.length - 1].type === 'gameover') return prev;
      return [...prev, { role: 'system', type: 'gameover', content: msg }];
    });
  }, [isGameOver, gameState]);

  const handleSquareClick = useCallback((row, col) => {
    if (isGameOver || gameState.turn !== WHITE || isThinking) return;
    if (!apiKey) return;

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

    const piece = gameState.board[row][col];
    if (piece && piece.color === WHITE) {
      const moves = getLegalMoves(gameState, row, col);
      setSelectedSquare({ row, col });
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [gameState, selectedSquare, legalMoves, isGameOver, isThinking, apiKey]);

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
    setChatMessages([]);
    conversationHistoryRef.current = [];
    setApiError(null);
    llmTurnRef.current = false;
  }, []);

  const handleToggleView = useCallback(() => {
    setViewMode(prev => prev === 'commentary' ? 'full' : 'commentary');
  }, []);

  return (
    <>
      <div className="relative flex gap-6 items-stretch justify-center w-full h-full p-6 max-lg:flex-col max-lg:gap-3 max-lg:p-2">
        {/* Board */}
        <div className="shrink-0">
          <Board
            gameState={gameState}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            onSquareClick={handleSquareClick}
          />
          {!apiKey && (
            <div className="mt-3 text-center font-ocr text-[12px] text-white/30">
              Enter your API key to start playing
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-3 w-[380px] max-lg:w-full max-lg:max-w-[500px] max-lg:max-h-[400px]">
          {/* Controls */}
          <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-lg p-4 flex flex-col gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)]">
            <ProviderSelect
              providerId={providerId}
              modelId={modelId}
              onProviderChange={handleProviderChange}
              onModelChange={setModelId}
              disabled={hasStarted}
            />
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <ApiKeyInput
              providerId={providerId}
              apiKey={apiKey}
              onApiKeyChange={handleApiKeyChange}
            />
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0 max-lg:min-h-[250px]">
            <ChatBox
              gameState={gameState}
              chatMessages={chatMessages}
              isThinking={isThinking}
              viewMode={viewMode}
              onToggleView={handleToggleView}
              onNewGame={handleNewGame}
              modelName={modelName}
            />
          </div>
        </div>
      </div>
      {pendingPromotion && (
        <PromotionModal color={WHITE} onSelect={handlePromotion} />
      )}
    </>
  );
}
