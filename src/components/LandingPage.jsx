import { Link } from 'react-router-dom';
import { Button } from './ui/button.jsx';

export default function LandingPage() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full">
      <h1
        className="font-ocr text-[8rem] max-lg:text-[4rem] max-sm:text-[2.5rem] text-white uppercase tracking-[0.15em] leading-none select-none"
        style={{
          WebkitTextStroke: '2px rgba(255,255,255,0.9)',
          textShadow: '0 0 40px rgba(140,160,255,0.15), 0 0 80px rgba(140,160,255,0.08)',
        }}
      >
        chess rot
      </h1>

      <div className="flex flex-col gap-3 mt-12 max-sm:mt-8">
        <Button
          variant="outline"
          asChild
          className="py-2.5 px-8 h-auto font-ocr text-sm text-white/70 bg-white/[0.03] backdrop-blur-sm border-white/[0.08] hover:border-white/[0.18] hover:text-white/90 hover:shadow-[0_0_20px_rgba(100,140,255,0.12)] transition-all"
        >
          <Link to="/play">new game (local)</Link>
        </Button>
      </div>
    </div>
  );
}
