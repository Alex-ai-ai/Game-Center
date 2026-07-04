import { Canvas } from '@react-three/fiber';
import Environment from './Environment';
import EnemyManager from './EnemyManager';
import GrenadeView from './GrenadeView';
import PlayerController from './PlayerController';

// 3D 世界:相机、环境、敌人、手榴弹、玩家控制器统一在此装配。
export default function GameWorld() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 75, position: [0, 1.6, 0], near: 0.1, far: 200 }}
    >
      <Environment />
      <EnemyManager />
      <GrenadeView />
      <PlayerController />
    </Canvas>
  );
}
