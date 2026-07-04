import { useMemo } from 'react';
import { useGame } from '@/game/store';
import Btn from '@/components/ui/Btn';

function AshField() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 8,
        dur: 6 + Math.random() * 8,
        size: 1 + Math.random() * 2.5,
        op: 0.2 + Math.random() * 0.5,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-bone"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.op,
            animation: `dz-fall ${f.dur}s linear ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

const CONTROLS: [string, string][] = [
  ['WASD', 'Move'],
  ['SPACE', 'Jump'],
  ['MOUSE', 'Aim'],
  ['LMB', 'Fire'],
  ['RMB', 'Scope'],
  ['1-6', 'Weapon'],
  ['R', 'Reload'],
  ['ESC', 'Pause'],
];

export default function MenuScreen() {
  const highScore = useGame((s) => s.highScore);
  const start = useGame((s) => s.start);

  const onStart = () => {
    start();
    window.dispatchEvent(new Event('dz:lock'));
  };

  return (
    <div className="scanlines grain absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* 背景氛围 */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, #2a0d0d 0%, #110808 45%, #050404 100%)' }}
      />
      <AshField />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="dz-rise">
          <div className="text-warn text-xs tracking-[0.6em] mb-3">// SECTOR 7 — CONTAINMENT BREACH</div>
          <h1
            className="font-display text-[8rem] sm:text-[11rem] leading-[0.85] text-bone"
            style={{ textShadow: '0 0 30px rgba(255,42,42,0.35), 4px 4px 0 #5a0d0d' }}
          >
            DEAD<span className="text-blood">ZONE</span>
          </h1>
          <p className="text-bone/50 tracking-[0.35em] text-sm uppercase mt-2">
            Hold the line. They keep coming.
          </p>
        </div>

        <div className="mt-10 dz-rise" style={{ animationDelay: '0.15s' }}>
          <Btn onClick={onStart}>ENGAGE</Btn>
        </div>

        <div
          className="mt-12 clip-card bg-black/40 border border-bone/10 px-8 py-5 dz-rise"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex gap-8">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex flex-col items-center">
                <span className="font-display text-2xl text-warn">{k}</span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-bone/40">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-bone/40 text-sm tracking-[0.3em] uppercase dz-rise" style={{ animationDelay: '0.45s' }}>
          Best Score · <span className="text-bone font-display text-xl">{highScore.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
