import { useEffect, useRef } from 'react';
import { WHITE, BLACK, PIECE_SYMBOLS, PIECE_VALUES } from '../engine/constants.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function ChatBox({
  gameState,
  chatMessages,
  isThinking,
  viewMode,
  onToggleView,
  onNewGame,
  modelName,
}) {
  const { turn, status, capturedPieces } = gameState;
  const isGameOver = status === 'checkmate' || status === 'stalemate' || status === 'draw';
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  const filtered = viewMode === 'commentary'
    ? chatMessages.filter(m => m.type !== 'position')
    : chatMessages;

  let statusText;
  if (isGameOver) {
    statusText = status === 'checkmate'
      ? `${turn === WHITE ? 'Black' : 'White'} wins by checkmate`
      : status === 'stalemate' ? 'Stalemate' : 'Draw';
  } else {
    statusText = `${turn === WHITE ? 'White' : 'Black'} to move`;
  }

  return (
    <Card className="relative flex flex-col bg-white/[0.05] backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden h-full">
      {/* top-edge glass highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-ocr text-[22px] font-bold tracking-[3px] uppercase text-gold">
              Chat
            </CardTitle>
            <CardDescription className="font-ocr text-[11px] font-bold tracking-[1.5px] uppercase text-muted-foreground">
              Player vs {modelName || 'LLM'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-ocr text-[9px] uppercase tracking-[1px] h-6 px-2 bg-white/[0.04] border-white/10 hover:bg-white/[0.10] hover:border-white/20 transition-all"
            onClick={onToggleView}
          >
            {viewMode === 'commentary' ? 'Full' : 'Moves'}
          </Button>
        </div>
      </CardHeader>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Messages */}
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-4">
            {filtered.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-ocr font-bold py-1">
                <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground animate-dots-pulse" />
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Status + game info */}
      <CardContent className="flex flex-col gap-2 pt-3 pb-2">
        <div className={cn('flex items-center gap-3', isGameOver && 'opacity-85')}>
          <span className={cn(
            'w-3 h-3 rounded-full shrink-0',
            turn === WHITE
              ? 'bg-[#e8e0d0] shadow-[0_0_8px_rgba(220,200,160,0.35),inset_0_0_2px_rgba(255,255,255,0.3)]'
              : 'bg-[#3a3232] border border-[#4a4040]'
          )} />
          <span className="text-[14px] font-ocr font-bold text-card-foreground">{statusText}</span>
        </div>
        {status === 'check' && (
          <Badge className="self-start bg-destructive/80 text-[#f0c8b8] border-none text-[11px] font-ocr font-bold tracking-[2px] uppercase rounded">
            CHECK
          </Badge>
        )}
      </CardContent>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <CardContent className="flex flex-col gap-3 py-2">
        <CapturedPieces label="White captures" pieces={capturedPieces[BLACK]} />
        <CapturedPieces label="Black captures" pieces={capturedPieces[WHITE]} />
      </CardContent>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <CardFooter className="pt-3">
        <Button
          variant="outline"
          className="w-full font-ocr text-[13px] font-bold tracking-[1.5px] uppercase text-card-foreground bg-white/[0.04] backdrop-blur-sm border-white/10 hover:bg-white/[0.10] hover:border-white/20 hover:text-foreground hover:shadow-[0_0_12px_rgba(100,140,200,0.08)] active:translate-y-px transition-all"
          onClick={onNewGame}
        >
          New Game
        </Button>
      </CardFooter>
    </Card>
  );
}

function ChatMessage({ message }) {
  const { role, type, content, moveSAN } = message;

  // System/info messages
  if (role === 'system') {
    return (
      <div className={cn(
        'text-center text-[11px] font-ocr py-1',
        type === 'error' ? 'text-red-400/80' : 'text-white/30',
      )}>
        {content}
      </div>
    );
  }

  // Player move (right-aligned)
  if (role === 'player') {
    return (
      <div className="flex justify-end">
        <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-lg px-3 py-1.5 max-w-[85%]">
          <span className="font-ocr text-[13px] font-bold text-white/80">
            {moveSAN || content}
          </span>
        </div>
      </div>
    );
  }

  // LLM move + comment (left-aligned)
  if (role === 'llm') {
    if (type === 'move') {
      return (
        <div className="flex justify-start">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 max-w-[85%]">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/[0.08] text-white/60 border-none text-[9px] font-ocr font-bold tracking-[1px] uppercase rounded px-1.5 py-0">
                {moveSAN}
              </Badge>
            </div>
            {content && (
              <p className="font-ocr text-[12px] text-white/50 mt-1 leading-relaxed">
                {content}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Position description (collapsible in full view)
    if (type === 'position') {
      return (
        <div className="text-center text-[9px] font-ocr text-white/15 py-0.5 truncate">
          [position sent to LLM]
        </div>
      );
    }
  }

  return null;
}

function CapturedPieces({ label, pieces }) {
  const sorted = [...pieces].sort((a, b) => (PIECE_VALUES[b.type] || 0) - (PIECE_VALUES[a.type] || 0));
  const totalValue = sorted.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[1px] text-muted-foreground font-ocr font-bold">{label}</span>
        {totalValue > 0 && <span className="text-[12px] text-gold-dim font-ocr font-bold">+{totalValue / 100}</span>}
      </div>
      <div className="flex flex-wrap gap-0.5 min-h-6 items-center">
        {sorted.length === 0
          ? <span className="text-sm text-white/10">&mdash;</span>
          : sorted.map((p, i) => (
              <span key={i} className="text-[20px] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] opacity-90">
                {PIECE_SYMBOLS[p.color][p.type]}
              </span>
            ))
        }
      </div>
    </div>
  );
}
