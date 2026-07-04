import { useGame } from '@/game/store';
import Btn from '@/components/ui/Btn';

export default function PauseScreen() {
  const reset = useGame((s) => s.reset);
  const onResume = () => window.dispatchEvent(new Event('dz:lock'));
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ash/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8 dz-rise">
        <h2 className="font-display text-7xl tracking-[0.2em] text-bone">PAUSED</h2>
        <div className="flex gap-4">
          <Btn onClick={onResume}>RESUME</Btn>
          <Btn variant="ghost" onClick={reset}>
            ABORT
          </Btn>
        </div>
        <p className="text-bone/40 text-xs tracking-[0.3em] uppercase">Click resume to re-lock the cursor</p>
      </div>
    </div>
  );
}
