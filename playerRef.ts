import * as THREE from 'three';

// 模块级玩家状态快照:由 PlayerController 每帧写入,供雷达 HUD(非 R3F 组件)读取。
export const playerState = {
  position: new THREE.Vector3(0, 1.6, 0),
  yaw: 0, // 水平朝向(弧度),相机绕 Y 轴旋转角
};

// 活跃手榴弹列表(投掷物),供雷达绘制与爆炸逻辑共享。
export interface Grenade {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  bornAt: number;
  fuse: number; // 引信秒数
  exploded: boolean;
}
const grenades: Grenade[] = [];
let grenadeId = 1;

export function spawnGrenade(pos: THREE.Vector3, vel: THREE.Vector3, fuse = 1.6): Grenade {
  const g: Grenade = { id: grenadeId++, position: pos.clone(), velocity: vel.clone(), bornAt: performance.now(), fuse, exploded: false };
  grenades.push(g);
  return g;
}

export function getGrenades(): Grenade[] {
  return grenades;
}

export function removeGrenade(id: number) {
  const i = grenades.findIndex((g) => g.id === id);
  if (i >= 0) grenades.splice(i, 1);
}

export function clearGrenades() {
  grenades.length = 0;
}
