import { useMemo } from 'react';
import * as THREE from 'three';

// 废土环境:地面、雾、暗色天空、低角度橙光、远景废墟轮廓。
export default function Environment() {
  const skyline = useMemo(() => {
    const items: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.05;
      const r = 52 + Math.random() * 16;
      const h = 6 + Math.random() * 22;
      const w = 3 + Math.random() * 5;
      items.push({
        pos: [Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r],
        size: [w, h, w * (0.6 + Math.random() * 0.6)],
      });
    }
    return items;
  }, []);

  const debris = useMemo(() => {
    const items: { pos: [number, number, number]; size: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 30;
      const s = 0.4 + Math.random() * 1.4;
      items.push({
        pos: [Math.cos(a) * r, s / 2 - 0.2, Math.sin(a) * r],
        size: [s, s * (0.5 + Math.random()), s],
        rot: Math.random() * Math.PI,
      });
    }
    return items;
  }, []);

  return (
    <>
      <color attach="background" args={['#8a7158']} />
      <fog attach="fog" args={['#a8896a', 30, 80]} />

      <ambientLight intensity={0.85} color="#c9b89a" />
      <hemisphereLight args={['#b8a07a', '#3a2a20', 0.9]} />
      <directionalLight
        position={[-28, 22, -18]}
        intensity={2.2}
        color="#ffd9a0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#6b5238" roughness={1} metalness={0} />
      </mesh>

      {/* 微弱网格便于判断距离 */}
      <gridHelper args={[160, 80, '#3a2a18', '#5a4628']} position={[0, 0.02, 0]} />

      {/* 远景废墟轮廓 */}
      {skyline.map((b, i) => (
        <mesh key={`s${i}`} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#4a3a2a" roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* 散落残骸 */}
      {debris.map((b, i) => (
        <mesh key={`d${i}`} position={b.pos} rotation={[0, b.rot, 0]} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#5c4530" roughness={1} />
        </mesh>
      ))}
    </>
  );
}
