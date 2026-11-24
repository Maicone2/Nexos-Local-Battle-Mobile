import { useEffect, useRef } from 'react';
import { createMatchState } from '../game/CombatSystem';
import { GameRenderer } from '../game/GameRenderer';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new GameRenderer();
    const showcase = createMatchState({
      mode: 'training',
      stage: 'orbital_arena',
      p1Id: 'kael',
      p2Id: 'vexa',
    });
    showcase.phase = 'fighting';
    showcase.p1.x = 340;
    showcase.p2.x = 940;

    let rafId = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      showcase.p1.actionFrame = Math.floor(t * 60);
      showcase.p2.actionFrame = Math.floor(t * 60);
      renderer.render(ctx, canvas.width, canvas.height, showcase, t, 'high');
      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#07090D]">
      <canvas
        ref={canvasRef}
        data-testid="title-canvas"
        className="absolute inset-0 w-full h-full block"
      />

      {/* Contrast scrim framing upper negative space */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(7,9,13,0.28) 0%, rgba(7,9,13,0.78) 85%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-between w-full h-full px-4 py-3 sm:px-6 sm:py-6">
        <div />

        {/* Center Title Emblem over calm upper-center negative space */}
        <div className="flex flex-col items-center text-center max-w-2xl">
          <svg
            viewBox="0 0 640 155"
            className="w-[260px] sm:w-[380px] md:w-[520px] max-h-[40vh] h-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]"
            aria-label="NEON CLASH: ARENA LAN"
            role="img"
          >
            <defs>
              <linearGradient id="bladeAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="50%" stopColor="#00A8FF" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            {/* Angular fighting emblem crest */}
            <polygon
              points="46,18 594,18 618,46 588,112 24,112 52,46"
              fill="#0A0E17"
              fillOpacity="0.88"
              stroke="url(#bladeAccent)"
              strokeWidth="3"
            />
            <polygon points="36,118 604,118 590,126 50,126" fill="#00A8FF" />
            <text
              x="320"
              y="84"
              textAnchor="middle"
              fill="#F4F7FB"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontStyle="italic"
              fontSize="74"
              letterSpacing="6"
            >
              NEON CLASH
            </text>
            <text
              x="320"
              y="148"
              textAnchor="middle"
              fill="#00A8FF"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
              fontSize="20"
              letterSpacing="10"
            >
              ARENA LAN
            </text>
          </svg>

          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="mt-4 sm:mt-6 px-10 py-2.5 sm:px-12 sm:py-3.5 bg-[#00A8FF] hover:bg-[#33B9FF] active:scale-[0.98] text-[#07090D] font-display text-xl sm:text-2xl font-extrabold tracking-widest uppercase transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            style={{ clipPath: 'polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' }}
          >
            INICIAR
          </button>
        </div>

        {/* Single flat control-hint line */}
        <p className="text-[11px] sm:text-xs text-[#94A3B8] tracking-wide text-center">
          Joystick Diagonal / WASD · J Ligeiro · H Médio · K Pesado · L Especial · U Defesa · Enter Iniciar
        </p>
      </div>
    </main>
  );
}
