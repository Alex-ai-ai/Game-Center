import * as THREE from 'three';
import { WEAPONS, type WeaponId } from './constants';
import { useGame } from './store';
import { enemyRegistry } from './enemyRegistry';
import type { Enemy } from './types';

// 应用伤害并同步到 store。返回是否击杀。
export function applyDamage(enemy: Enemy, amount: number, headshot: boolean): boolean {
  if (!enemy.alive || enemy.dyingAt > 0) return false;
  enemy.hp -= amount;
  enemy.hitFlash = performance.now();
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.dyingAt = performance.now();
    if (enemy.group) enemy.group.traverse((o) => enemyRegistry.unregisterHitbox(o));
    useGame.getState().onEnemyHit(true, headshot);
    return true;
  }
  useGame.getState().onEnemyHit(false, headshot);
  return false;
}

export function damageForWeapon(id: WeaponId, part: 'head' | 'body'): number {
  const def = WEAPONS[id];
  return part === 'head' ? def.headDamage : def.bodyDamage;
}

// 范围爆炸伤害(手榴弹):对范围内所有存活敌人造成衰减伤害。
export function explosionDamage(center: THREE.Vector3, radius: number, baseDamage: number) {
  for (const e of enemyRegistry.all()) {
    if (!e.alive || e.dyingAt > 0) continue;
    const d = e.position.distanceTo(center);
    if (d > radius) continue;
    const falloff = 1 - d / radius; // 0..1
    const dmg = baseDamage * (0.35 + 0.65 * falloff);
    applyDamage(e, dmg, false);
  }
}
