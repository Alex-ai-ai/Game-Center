import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '@/game/constants';
import { useGame } from '@/game/store';
import { enemyRegistry } from '@/game/enemyRegistry';
import { playerState } from '@/game/playerRef';
import EnemyView from './EnemyView';
import type { Enemy } from '@/game/types';

// 玩家前方视锥半角(弧度):敌人只有在这个角度内才能伤害玩家
// cos(70°) ≈ 0.34 —— 即玩家前方 ±70° 范围(共 140°)内的敌人才可攻击
const ATTACK_DOT_THRESHOLD = Math.cos((70 * Math.PI) / 180);

const tmpForward = new THREE.Vector3();
const tmpToEnemy = new THREE.Vector3();

export default function EnemyManager() {
  const [list, setList] = useState<Enemy[]>([]);
  const listRef = useRef<Enemy[]>([]);
  const lastPhase = useRef<string>('menu');
  const waveRef = useRef(0);
  const toSpawn = useRef(0);
  const spawnTimer = useRef(0);
  const breakTimer = useRef(0);
  const waveActive = useRef(false);

  const spawnOne = useCallback((wave: number) => {
    const angle = Math.random() * Math.PI * 2;
    const radius = CONFIG.spawnRadius + Math.random() * 6;
    const hp = CONFIG.enemyBaseHp + (wave - 1) * CONFIG.enemyHpPerWave;
    const speed = Math.min(CONFIG.enemyMaxSpeed, CONFIG.enemyBaseSpeed + (wave - 1) * CONFIG.enemySpeedPerWave);
    const enemy = enemyRegistry.spawn({
      hp,
      maxHp: hp,
      speed,
      alive: true,
      position: new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
      group: null,
      hitFlash: 0,
      attackCooldown: 0.5 + Math.random(),
      walkPhase: Math.random() * Math.PI * 2,
      dyingAt: 0,
    });
    listRef.current.push(enemy);
    setList((prev) => [...prev, enemy]);
    useGame.getState().enemySpawned(1);
  }, []);

  const beginWave = useCallback(
    (n: number) => {
      waveRef.current = n;
      const count = CONFIG.firstWaveCount + (n - 1) * CONFIG.waveCountGrowth;
      toSpawn.current = count;
      spawnTimer.current = 0.35;
      waveActive.current = true;
      useGame.getState().startWave(n);
    },
    [],
  );

  useFrame((_, dtRaw) => {
    const phase = useGame.getState().phase;
    const dt = Math.min(dtRaw, 0.05);

    // 新对局开始(非暂停恢复):重置并开启第一波
    if (phase !== lastPhase.current) {
      if (phase === 'playing' && lastPhase.current !== 'paused') {
        enemyRegistry.reset();
        listRef.current = [];
        setList([]);
        waveRef.current = 0;
        toSpawn.current = 0;
        waveActive.current = false;
        breakTimer.current = 0;
        beginWave(1);
      }
      lastPhase.current = phase;
    }
    if (phase !== 'playing') return;

    // 波间休息倒计时
    if (breakTimer.current > 0) {
      breakTimer.current -= dt;
      if (breakTimer.current <= 0) beginWave(waveRef.current + 1);
      return;
    }

    // 生成敌人
    if (toSpawn.current > 0) {
      spawnTimer.current -= dt;
      if (spawnTimer.current <= 0) {
        spawnOne(waveRef.current);
        toSpawn.current -= 1;
        spawnTimer.current = 0.45 + Math.random() * 0.5;
      }
    }

    // 移动 + 战斗 + 清理死亡
    const now = performance.now();
    let aliveCount = 0;
    const next: Enemy[] = [];
    for (const e of listRef.current) {
      // 死亡动画结束后移除
      if (e.dyingAt > 0) {
        if (now - e.dyingAt > 320) {
          enemyRegistry.remove(e.id);
          continue;
        }
        next.push(e);
        continue;
      }
      if (!e.alive) continue;
      next.push(e);
      aliveCount++;

      const pos = e.position;
      // 朝玩家实际位置移动
      const px = playerState.position.x;
      const pz = playerState.position.z;
      const dx = px - pos.x;
      const dz = pz - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > CONFIG.attackRange) {
        // 向玩家移动
        const inv = 1 / dist;
        pos.x += dx * inv * e.speed * dt;
        pos.z += dz * inv * e.speed * dt;
        if (e.group) {
          e.group.position.x = pos.x;
          e.group.position.z = pos.z;
        }
      } else {
        // 进入攻击范围:仅当敌人在玩家前方视锥内才能造成伤害
        // 计算玩家朝向(XZ 平面)
        const fx = Math.sin(playerState.yaw);
        const fz = Math.cos(playerState.yaw);
        // 敌人相对玩家的方向(从玩家指向敌人)
        tmpToEnemy.set(-dx, 0, -dz);
        if (dist > 0.001) tmpToEnemy.normalize();
        tmpForward.set(fx, 0, fz);
        const dot = tmpForward.dot(tmpToEnemy);
        e.attackCooldown -= dt;
        if (dot >= ATTACK_DOT_THRESHOLD && e.attackCooldown <= 0) {
          useGame.getState().takeDamage(CONFIG.attackDamage);
          e.attackCooldown = CONFIG.attackCooldown;
        }
      }
    }
    if (next.length !== listRef.current.length) {
      listRef.current = next;
      setList(next);
    } else {
      listRef.current = next;
    }

    // 波次完成判定
    if (waveActive.current && toSpawn.current === 0 && aliveCount === 0) {
      waveActive.current = false;
      breakTimer.current = CONFIG.waveBreak;
    }
  });

  return (
    <>
      {list.map((e) => (
        <EnemyView key={e.id} enemy={e} />
      ))}
    </>
  );
}
