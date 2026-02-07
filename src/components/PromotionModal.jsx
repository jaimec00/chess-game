import { QUEEN, ROOK, BISHOP, KNIGHT } from '../engine/constants.js';
import PieceSVG from './PieceSVG.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PROMOTION_PIECES = [QUEEN, ROOK, BISHOP, KNIGHT];

export default function PromotionModal({ color, onSelect }) {
  return (
    <Dialog open={true}>
      <DialogContent
        showCloseButton={false}
        className="bg-white/[0.06] backdrop-blur-2xl border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.7)] max-w-fit"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="items-center">
          <DialogTitle className="font-display text-base font-semibold tracking-[1.5px] uppercase text-gold">
            Promote pawn to:
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 justify-center">
          {PROMOTION_PIECES.map(type => (
            <Button
              key={type}
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3.5 px-4.5 bg-white/[0.04] border-white/10 hover:border-white/25 hover:bg-white/[0.08] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 transition-all"
              onClick={() => onSelect(type)}
            >
              <span className="w-13 h-13 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
                <PieceSVG type={type} color={color} />
              </span>
              <span className="text-[10px] uppercase tracking-[1px] text-muted-foreground font-semibold">{type}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
