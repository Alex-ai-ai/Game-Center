import * as THREE from 'three';

// 敌人运行时数据(非 React 状态,由 EnemyManager 持有在 ref 中)
export interface Enemy {
  id: number;
  hp: number;
  maxHp: number;
  speed: number;
  alive: boolean;
  position: THREE.Vector3;
  group: THREE.Group | null;
  hitFlash: number; // 上次受击时间戳(performance.now)
  attackCooldown: number;
  walkPhase: number; // 行走动画相位
  dyingAt: number; // 死亡时间戳,0 表示存活
}

export type EnemyPart = 'head' | 'body';
