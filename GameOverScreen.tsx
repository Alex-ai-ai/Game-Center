import { useGame } from '@/game/store';
import Btn from '@/components/ui/Btn';

function Result({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-bone/40">{label}</span>
      <span className="font-display text-5xl" style={{ color: accent ?? '#e8e2da' }}>
        {value}
      </span>
    </div>
  );
}

export default function GameOverScreen() {
  const score = useGame((s) => s.score);
  const kills = useGame((s) => s.kills);
  const wave = useGame((s) => s.wave);
  const highScore = useGame((s) => s.highScore);
  const start = useGame((s) => s.start);
  const reset = useGame((s) => s.reset);

  const isRecord = score > 0 && score >= highScore;

  const onRestart = () => {
    start();
    window.dispatchEvent(new Event('dz:lock'));
  };

  return (
    <div className="scanlines grain absolute inset-0 flex items-center justify-center bg-ash/85 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(120,8,8,0.35) 0%, rgba(5,4,4,0.9) 70%)' }}
      />
      <div className="relative z-10 flex flex-col items-center gap-7 dz-rise">
        {isRecord && (
          <div className="font-display text-xl tracking-[0.4em] text-warn dz-pulse">NEW RECORD</div>
        )}
        <h2
          className="font-display text-8xl tracking-[0.15em] text-blood"
          style={{ textShadow: '0 0 30px rgba(255,42,42,0.5)' }}
        >
          YOU DIED
        </h2>
        <div className="flex gap-14 mt-2">
          <Result label="Score" value={score.toLocaleString()} accent="#ff7a18" />
          <Result label="Kills" value={String(kills)} />
          <Result label="Wave" value={String(wave)} />
        </div>
        <div className="text-bone/40 text-xs tracking-[0.3em] uppercase mt-1">
          Best · <span className="text-bone font-display text-lg">{highScore.toLocaleString()}</span>
        </div>
        <div className="flex gap-4 mt-4">
          <Btn onClick={onRestart}>RE-ENGAGE</Btn>
          <Btn variant="ghost" onClick={reset}>
            MAIN MENU
          </Btn>
        </div>
      </div>
    </div>
  );
}
