import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getGrenades } from '@/game/playerRef';

// 渲染所有活跃手榴弹(球体 + 尾迹),并在爆炸瞬间画一个扩散光球。
export default function GrenadeView() {
  const groupRef = useRef<THREE.Group>(null);
  const [, setTick] = useState(0);
  const grenades3d = useRef<Map<number, THREE.Group>>(new Map());
  const blasts = useRef<{ mesh: THREE.Group; at: number }[]>([]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const grenades = getGrenades();
    const parent = groupRef.current;
    if (!parent) return;

    const seen = new Set<number>();
    for (const g of grenades) {
      seen.add(g.id);
      let m = grenades3d.current.get(g.id);
      if (!m) {
        m = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 10, 10),
          new THREE.MeshStandardMaterial({ color: '#3a4a2a', metalness: 0.4, roughness: 0.6 }),
        );
        const stripe = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.018, 6, 14),
          new THREE.MeshStandardMaterial({ color: '#ff7a18', emissive: '#ff7a18', emissiveIntensity: 0.6 }),
        );
        stripe.rotation.x = Math.PI / 2;
        m.add(body);
        m.add(stripe);
        parent.add(m);
        grenades3d.current.set(g.id, m);
      }
      m.position.copy(g.position);
      m.rotation.x += dt * 8;
      m.rotation.z += dt * 6;
      const age = (performance.now() - g.bornAt) / 1000;
      const blink = age > g.fuse - 0.5 ? (Math.sin(age * 40) > 0 ? 1.6 : 0.3) : 0.4;
      const stripeMat = (m.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      stripeMat.emissiveIntensity = blink;
    }
    // 移除消失的手榴弹(已爆炸)→ 触发爆炸光球
    for (const [id, m] of grenades3d.current) {
      if (!seen.has(id)) {
        spawnBlast(blasts.current, parent, m.position.clone());
        parent.remove(m);
        grenades3d.current.delete(id);
      }
    }

    // 更新/清理爆炸光球
    const now = performance.now();
    for (let i = blasts.current.length - 1; i >= 0; i--) {
      const b = blasts.current[i];
      const t = (now - b.at) / 350;
      if (t >= 1) {
        parent.remove(b.mesh);
        blasts.current.splice(i, 1);
        continue;
      }
      const s = 1 + t * 6;
      b.mesh.scale.setScalar(s);
      const mat = (b.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - t;
    }

    setTick((n) => (n + 1) % 1_000_000);
  });

  return <group ref={groupRef} />;
}

function spawnBlast(blasts: { mesh: THREE.Group; at: number }[], parent: THREE.Object3D, pos: THREE.Vector3) {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  g.add(sphere);
  g.position.copy(pos);
  parent.add(g);
  blasts.push({ mesh: g, at: performance.now() });
}
