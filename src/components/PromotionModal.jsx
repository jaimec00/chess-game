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
        className="relative bg-white/[0.06] backdrop-blur-3xl border-white/[0.14] shadow-[0_12px_48px_rgba(0,0,0,0.7),0_0_24px_rgba(100,140,200,0.06),0_0_0_1px_rgba(255,255,255,0.04)] max-w-fit overflow-hidden"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* top-edge glass highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none" />
        <DialogHeader className="items-center">
          <DialogTitle className="font-ocr text-base font-bold tracking-[1.5px] uppercase text-gold">
            Promote pawn to:
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 justify-center">
          {PROMOTION_PIECES.map(type => (
            <Button
              key={type}
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-3.5 px-4.5 bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-white/25 hover:bg-white/[0.08] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),0_0_12px_rgba(212,168,67,0.08)] active:translate-y-0 transition-all"
              onClick={() => onSelect(type)}
            >
              <span className="w-13 h-13 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
                <PieceSVG type={type} color={color} />
              </span>
              <span className="text-[10px] uppercase tracking-[1px] text-muted-foreground font-ocr font-bold">{type}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
