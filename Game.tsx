import GameWorld from '@/components/game/GameWorld';
import WebGLBoundary from '@/components/game/WebGLBoundary';
import HUD from '@/components/hud/HUD';
import MenuScreen from '@/components/screens/MenuScreen';
import PauseScreen from '@/components/screens/PauseScreen';
import GameOverScreen from '@/components/screens/GameOverScreen';
import { useGame } from '@/game/store';

export default function Game() {
  const phase = useGame((s) => s.phase);
  return (
    <div className={`relative h-full w-full overflow-hidden ${phase === 'playing' ? 'no-cursor' : ''}`}>
      <WebGLBoundary>
        <GameWorld />
      </WebGLBoundary>
      {(phase === 'playing' || phase === 'paused') && <HUD />}
      {phase === 'menu' && <MenuScreen />}
      {phase === 'paused' && <PauseScreen />}
      {phase === 'gameover' && <GameOverScreen />}
    </div>
  );
}
