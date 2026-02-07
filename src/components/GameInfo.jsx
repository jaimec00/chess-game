import { WHITE, BLACK, PIECE_SYMBOLS, PIECE_VALUES } from '../engine/constants.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <Card className="relative min-w-[320px] max-w-[360px] self-center bg-white/[0.05] backdrop-blur-2xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden max-md:min-w-0 max-md:max-w-none max-md:w-full max-md:flex-row max-md:flex-wrap max-md:items-center">
      {/* top-edge glass highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />
      <CardHeader className="max-md:flex-1 max-md:min-w-[120px]">
        <CardTitle className="font-ocr text-[28px] font-bold tracking-[3px] uppercase text-gold">
          Chess
        </CardTitle>
        <CardDescription className="font-ocr text-sm font-bold tracking-[1.5px] uppercase text-muted-foreground">
          Player vs Engine
        </CardDescription>
      </CardHeader>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent max-md:hidden" />

      <CardContent className="flex flex-col gap-3 max-md:flex-1 max-md:min-w-[140px]">
        <div className={cn('flex items-center gap-3', isGameOver && 'opacity-85')}>
          <span className={cn(
            'w-3 h-3 rounded-full shrink-0',
            turn === WHITE
              ? 'bg-[#e8e0d0] shadow-[0_0_8px_rgba(220,200,160,0.35),inset_0_0_2px_rgba(255,255,255,0.3)]'
              : 'bg-[#3a3232] border border-[#4a4040]'
          )} />
          <span className="text-[17px] font-ocr font-bold text-card-foreground">{statusText}</span>
        </div>
        {status === 'check' && (
          <Badge className="self-start bg-destructive/80 text-[#f0c8b8] border-none text-[13px] font-ocr font-bold tracking-[2px] uppercase rounded">
            CHECK
          </Badge>
        )}
        {isThinking && (
          <div className="flex items-center gap-2 text-muted-foreground text-[16px] font-ocr font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground animate-dots-pulse" />
            Engine thinking...
          </div>
        )}
      </CardContent>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent max-md:hidden" />

      <CardContent className="flex flex-col gap-5 max-md:flex-1 max-md:min-w-[160px]">
        <CapturedPieces label="White captures" pieces={capturedPieces[BLACK]} />
        <CapturedPieces label="Black captures" pieces={capturedPieces[WHITE]} />
      </CardContent>

      <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent max-md:hidden" />

      <CardFooter>
        <Button
          variant="outline"
          className="w-full font-ocr text-[15px] font-bold tracking-[1.5px] uppercase text-card-foreground bg-white/[0.04] backdrop-blur-sm border-white/10 hover:bg-white/[0.10] hover:border-white/20 hover:text-foreground hover:shadow-[0_0_12px_rgba(100,140,200,0.08)] active:translate-y-px transition-all"
          onClick={onNewGame}
        >
          New Game
        </Button>
      </CardFooter>
    </Card>
  );
}

function CapturedPieces({ label, pieces }) {
  const sorted = [...pieces].sort((a, b) => (PIECE_VALUES[b.type] || 0) - (PIECE_VALUES[a.type] || 0));
  const totalValue = sorted.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm uppercase tracking-[1px] text-muted-foreground font-ocr font-bold">{label}</span>
        {totalValue > 0 && <span className="text-[15px] text-gold-dim font-ocr font-bold">+{totalValue / 100}</span>}
      </div>
      <div className="flex flex-wrap gap-1 min-h-8 items-center">
        {sorted.length === 0
          ? <span className="text-base text-white/10">&mdash;</span>
          : sorted.map((p, i) => (
              <span key={i} className="text-[26px] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] opacity-90">
                {PIECE_SYMBOLS[p.color][p.type]}
              </span>
            ))
        }
      </div>
    </div>
  );
}
