import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Enemy } from '@/game/types';
import { enemyRegistry } from '@/game/enemyRegistry';

interface Props {
  enemy: Enemy;
}

// 程序化人形敌人:由基础几何体拼装。命中盒(head/body)注册到 registry 供射线检测。
export default function EnemyView({ enemy }: Props) {
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const mats = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({ color: '#4a1414', roughness: 0.85, metalness: 0.05, emissive: '#ff1e1e', emissiveIntensity: 0 });
    const head = new THREE.MeshStandardMaterial({ color: '#6b1f1f', roughness: 0.8, emissive: '#ff2a2a', emissiveIntensity: 0 });
    const limb = new THREE.MeshStandardMaterial({ color: '#3a1010', roughness: 0.9 });
    return { body, head, limb };
  }, []);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    enemy.group = g;
    if (bodyRef.current) enemyRegistry.registerHitbox(bodyRef.current, enemy.id, 'body');
    if (headRef.current) enemyRegistry.registerHitbox(headRef.current, enemy.id, 'head');
    return () => {
      if (bodyRef.current) enemyRegistry.unregisterHitbox(bodyRef.current);
      if (headRef.current) enemyRegistry.unregisterHitbox(headRef.current);
    };
  }, [enemy]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();

    // 死亡动画:缩放塌陷
    if (enemy.dyingAt > 0) {
      const t = (now - enemy.dyingAt) / 220;
      const s = Math.max(0, 1 - t);
      g.scale.setScalar(s);
      g.position.y = -0.4 * (1 - s);
      if (t >= 1) g.visible = false;
      return;
    }

    // 朝向玩家(水平)
    const target = camera.position;
    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    g.rotation.y = Math.atan2(dx, dz);

    // 行走动画
    enemy.walkPhase += dt * (2 + enemy.speed);
    const swing = Math.sin(enemy.walkPhase) * 0.6;
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = -swing;
    if (legL.current) legL.current.rotation.x = -swing;
    if (legR.current) legR.current.rotation.x = swing;
    g.position.y = Math.abs(Math.sin(enemy.walkPhase)) * 0.07;

    // 命中闪光
    const flash = now - enemy.hitFlash;
    const fi = flash < 90 ? (1 - flash / 90) * 2.2 : 0;
    mats.body.emissiveIntensity = fi;
    mats.head.emissiveIntensity = fi;

    // 受伤越多身体越暗
    const ratio = enemy.hp / enemy.maxHp;
    mats.body.color.setRGB(0.29 * ratio + 0.05, 0.08 * ratio, 0.08 * ratio);
  });

  return (
    <group ref={group} position={enemy.position.toArray()}>
      <mesh ref={bodyRef} material={mats.body} position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.55, 0.72, 0.32]} />
      </mesh>
      <mesh ref={headRef} material={mats.head} position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      </mesh>
      <mesh ref={armL} material={mats.limb} position={[-0.38, 1.1, 0]} castShadow>
        <boxGeometry args={[0.14, 0.6, 0.16]} />
      </mesh>
      <mesh ref={armR} material={mats.limb} position={[0.38, 1.1, 0]} castShadow>
        <boxGeometry args={[0.14, 0.6, 0.16]} />
      </mesh>
      <mesh ref={legL} material={mats.limb} position={[-0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.72, 0.2]} />
      </mesh>
      <mesh ref={legR} material={mats.limb} position={[0.14, 0.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.72, 0.2]} />
      </mesh>
    </group>
  );
}
