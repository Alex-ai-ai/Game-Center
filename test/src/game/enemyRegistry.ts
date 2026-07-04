import * as THREE from 'three';
import type { Enemy } from './types';

// 模块级单例:在 EnemyManager(生成/移动)与 PlayerController(射击/射线检测)之间共享敌人数据。
// 每个敌人的 head/body mesh 注册为命中盒,带 userData { enemyId, part } 供射线检测读取。
class EnemyRegistry {
  private enemies = new Map<number, Enemy>();
  private hitboxes: THREE.Object3D[] = [];
  private nextId = 1;

  reset() {
    this.enemies.clear();
    this.hitboxes = [];
    this.nextId = 1;
  }

  spawn(partial: Omit<Enemy, 'id'>): Enemy {
    const id = this.nextId++;
    const enemy: Enemy = { id, ...partial };
    this.enemies.set(id, enemy);
    return enemy;
  }

  registerHitbox(obj: THREE.Object3D, enemyId: number, part: 'head' | 'body') {
    obj.userData.enemyId = enemyId;
    obj.userData.part = part;
    if (!this.hitboxes.includes(obj)) this.hitboxes.push(obj);
  }

  unregisterHitbox(obj: THREE.Object3D) {
    const i = this.hitboxes.indexOf(obj);
    if (i >= 0) this.hitboxes.splice(i, 1);
  }

  getHitboxes(): THREE.Object3D[] {
    return this.hitboxes;
  }

  get(id: number): Enemy | undefined {
    return this.enemies.get(id);
  }

  all(): Enemy[] {
    return [...this.enemies.values()];
  }

  remove(id: number) {
    this.enemies.delete(id);
  }
}

export const enemyRegistry = new EnemyRegistry();
