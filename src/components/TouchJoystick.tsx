import { useRef, useState } from 'react';

export interface DirectionalOutput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

interface TouchJoystickProps {
  styleMode: 'joystick' | 'dpad8';
  isRotated: boolean;
  activeDir: DirectionalOutput;
  onDirectionChange: (dir: DirectionalOutput) => void;
}

const DIR8_BUTTONS: { label: string; aria: string; dir: DirectionalOutput }[] = [
  { label: '↖', aria: 'Diagonal Cima Esquerda', dir: { left: true, right: false, up: true, down: false } },
  { label: '↑', aria: 'Saltar', dir: { left: false, right: false, up: true, down: false } },
  { label: '↗', aria: 'Diagonal Cima Direita', dir: { left: false, right: true, up: true, down: false } },
  { label: '←', aria: 'Mover para a esquerda', dir: { left: true, right: false, up: false, down: false } },
  { label: '•', aria: 'Centro', dir: { left: false, right: false, up: false, down: false } },
  { label: '→', aria: 'Mover para a direita', dir: { left: false, right: true, up: false, down: false } },
  { label: '↙', aria: 'Diagonal Baixo Esquerda', dir: { left: true, right: false, up: false, down: true } },
  { label: '↓', aria: 'Agachar', dir: { left: false, right: false, up: false, down: true } },
  { label: '↘', aria: 'Diagonal Baixo Direita', dir: { left: false, right: true, up: false, down: true } },
];

export function TouchJoystick({
  styleMode,
  isRotated,
  activeDir,
  onDirectionChange,
}: TouchJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const clearDirection = () => {
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onDirectionChange({ left: false, right: false, up: false, down: false });
  };

  const evaluatePointer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const screenDx = clientX - cx;
    const screenDy = clientY - cy;

    // Account for 90deg CW rotation shell when viewport is portrait
    const localDx = isRotated ? screenDy : screenDx;
    const localDy = isRotated ? -screenDx : screenDy;

    const maxRadius = 34;
    const dist = Math.hypot(localDx, localDy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(localDy, localDx);

    setKnob({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist,
    });

    const deadZone = 10;
    if (dist < deadZone) {
      onDirectionChange({ left: false, right: false, up: false, down: false });
      return;
    }

    // 8-sector angle quantization (45° sectors with full diagonal support)
    const deg = (angle * 180) / Math.PI;
    const right = deg >= -67.5 && deg <= 67.5;
    const left = deg >= 112.5 || deg <= -112.5;
    const down = deg >= 22.5 && deg <= 157.5;
    const up = deg <= -22.5 && deg >= -157.5;

    onDirectionChange({ left, right, up, down });
  };

  if (styleMode === 'dpad8') {
    return (
      <div className="pointer-events-auto touch-surface grid grid-cols-3 gap-1">
        {DIR8_BUTTONS.map((btn) => {
          const isCenter = btn.label === '•';
          const isActive =
            !isCenter &&
            activeDir.left === btn.dir.left &&
            activeDir.right === btn.dir.right &&
            activeDir.up === btn.dir.up &&
            activeDir.down === btn.dir.down;
          if (isCenter) {
            return (
              <div
                key="center"
                className="w-10 h-10 sm:w-12 sm:h-12 border border-white/15 bg-[#0A0E17]/75 flex items-center justify-center text-[10px] text-[#64748B]"
              >
                8D
              </div>
            );
          }
          return (
            <button
              key={btn.label}
              type="button"
              aria-label={btn.aria}
              onPointerDown={(e) => {
                e.preventDefault();
                onDirectionChange(btn.dir);
              }}
              onPointerUp={() => onDirectionChange({ left: false, right: false, up: false, down: false })}
              onPointerCancel={() => onDirectionChange({ left: false, right: false, up: false, down: false })}
              onPointerLeave={() => onDirectionChange({ left: false, right: false, up: false, down: false })}
              className={`w-10 h-10 sm:w-12 sm:h-12 border text-sm font-bold transition-transform ${
                isActive
                  ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                  : 'bg-[#10151F]/85 text-[#F4F7FB] border-white/25'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    );
  }

  const anyActive = activeDir.left || activeDir.right || activeDir.up || activeDir.down;

  return (
    <div
      ref={baseRef}
      data-testid="touch-joystick"
      aria-label="Joystick com Diagonais"
      onPointerDown={(e) => {
        e.preventDefault();
        pointerIdRef.current = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        evaluatePointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current === e.pointerId) {
          evaluatePointer(e.clientX, e.clientY);
        }
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current === e.pointerId) {
          clearDirection();
        }
      }}
      onPointerCancel={(e) => {
        if (pointerIdRef.current === e.pointerId) {
          clearDirection();
        }
      }}
      className="pointer-events-auto touch-surface relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0B101A]/85 border-2 border-[#00A8FF]/70 flex items-center justify-center"
    >
      {/* Subtle 8-way gate lines */}
      <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />

      {/* 8-direction tick indicators with legible diagonals */}
      <span className={`absolute top-1 text-[11px] font-bold leading-none ${activeDir.up && !activeDir.left && !activeDir.right ? 'text-[#00E5FF]' : 'text-white/60'}`}>↑</span>
      <span className={`absolute bottom-1 text-[11px] font-bold leading-none ${activeDir.down && !activeDir.left && !activeDir.right ? 'text-[#00E5FF]' : 'text-white/60'}`}>↓</span>
      <span className={`absolute left-1.5 text-[11px] font-bold leading-none ${activeDir.left && !activeDir.up && !activeDir.down ? 'text-[#00E5FF]' : 'text-white/60'}`}>←</span>
      <span className={`absolute right-1.5 text-[11px] font-bold leading-none ${activeDir.right && !activeDir.up && !activeDir.down ? 'text-[#00E5FF]' : 'text-white/60'}`}>→</span>
      <span className={`absolute top-2.5 left-3 text-[10px] font-bold leading-none ${activeDir.up && activeDir.left ? 'text-[#F5B700]' : 'text-[#38BDF8]/70'}`}>↖</span>
      <span className={`absolute top-2.5 right-3 text-[10px] font-bold leading-none ${activeDir.up && activeDir.right ? 'text-[#F5B700]' : 'text-[#38BDF8]/70'}`}>↗</span>
      <span className={`absolute bottom-2.5 left-3 text-[10px] font-bold leading-none ${activeDir.down && activeDir.left ? 'text-[#F5B700]' : 'text-[#38BDF8]/70'}`}>↙</span>
      <span className={`absolute bottom-2.5 right-3 text-[10px] font-bold leading-none ${activeDir.down && activeDir.right ? 'text-[#F5B700]' : 'text-[#38BDF8]/70'}`}>↘</span>

      {/* Thumb Stick Knob */}
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 transition-colors ${
          anyActive
            ? 'bg-[#00A8FF]/90 border-white'
            : 'bg-[#172235]/95 border-[#00A8FF]/85'
        }`}
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );
}
