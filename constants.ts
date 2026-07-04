// 武器类型
export type WeaponId = 'pistol' | 'rifle' | 'shotgun' | 'sniper' | 'knife' | 'grenade';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  slot: number; // 1..6
  kind: 'gun' | 'melee' | 'throwable';
  magSize: number; // 单次装填容量(刀/手榴弹为库存上限)
  startReserve: number; // 初始备弹(刀为 ∞ 用 -1 表示)
  reservePerWave: number; // 每波补充
  fireCooldown: number; // 秒
  reloadTime: number;
  bodyDamage: number;
  headDamage: number;
  automatic: boolean; // 是否自动连发
  pellets: number; // 一次发射弹丸数(霰弹>1)
  spread: number; // 散射角度(弧度),0 表示精准
  adsFov: number | null; // 瞄准镜 FOV,null 表示不可瞄准
  meleeRange: number; // 近战有效距离(刀)
  meleeDamage: number; // 近战单次伤害(刀)
  meleeCone: number; // 近战横向判定半角(弧度)
  throwSpeed: number; // 投掷初速(手榴弹)
  explosionRadius: number; // 爆炸半径(手榴弹)
  explosionDamage: number; // 爆炸中心伤害(手榴弹)
  color: string; // UI 强调色
}

// 6 个槽位:1 手枪 2 步枪 3 霰弹 4 狙击 5 刀 6 手榴弹
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    id: 'pistol', name: 'Pistol', slot: 1, kind: 'gun',
    magSize: 12, startReserve: 48, reservePerWave: 36,
    fireCooldown: 0.18, reloadTime: 1.2,
    bodyDamage: 28, headDamage: 80, automatic: false,
    pellets: 1, spread: 0.006, adsFov: 50,
    meleeRange: 0, meleeDamage: 0, meleeCone: 0,
    throwSpeed: 0, explosionRadius: 0, explosionDamage: 0,
    color: '#e8e2da',
  },
  rifle: {
    id: 'rifle', name: 'Rifle', slot: 2, kind: 'gun',
    magSize: 30, startReserve: 120, reservePerWave: 90,
    fireCooldown: 0.1, reloadTime: 1.8,
    bodyDamage: 24, headDamage: 70, automatic: true,
    pellets: 1, spread: 0.018, adsFov: 45,
    meleeRange: 0, meleeDamage: 0, meleeCone: 0,
    throwSpeed: 0, explosionRadius: 0, explosionDamage: 0,
    color: '#ff7a18',
  },
  shotgun: {
    id: 'shotgun', name: 'Shotgun', slot: 3, kind: 'gun',
    magSize: 6, startReserve: 24, reservePerWave: 18,
    fireCooldown: 0.7, reloadTime: 2.2,
    bodyDamage: 16, headDamage: 32, automatic: false,
    pellets: 8, spread: 0.09, adsFov: 60,
    meleeRange: 0, meleeDamage: 0, meleeCone: 0,
    throwSpeed: 0, explosionRadius: 0, explosionDamage: 0,
    color: '#ffb347',
  },
  sniper: {
    id: 'sniper', name: 'Sniper', slot: 4, kind: 'gun',
    magSize: 5, startReserve: 20, reservePerWave: 12,
    fireCooldown: 1.1, reloadTime: 2.6,
    bodyDamage: 95, headDamage: 240, automatic: false,
    pellets: 1, spread: 0.0, adsFov: 18,
    meleeRange: 0, meleeDamage: 0, meleeCone: 0,
    throwSpeed: 0, explosionRadius: 0, explosionDamage: 0,
    color: '#3fa34d',
  },
  knife: {
    id: 'knife', name: 'Knife', slot: 5, kind: 'melee',
    magSize: 1, startReserve: -1, reservePerWave: 0,
    fireCooldown: 0.45, reloadTime: 0,
    bodyDamage: 0, headDamage: 0, automatic: false,
    pellets: 0, spread: 0, adsFov: null,
    meleeRange: 3.0, meleeDamage: 90, meleeCone: 0.5,
    throwSpeed: 0, explosionRadius: 0, explosionDamage: 0,
    color: '#9aa0a6',
  },
  grenade: {
    id: 'grenade', name: 'Grenade', slot: 6, kind: 'throwable',
    magSize: 3, startReserve: 3, reservePerWave: 2,
    fireCooldown: 0.8, reloadTime: 0,
    bodyDamage: 0, headDamage: 0, automatic: false,
    pellets: 0, spread: 0, adsFov: null,
    meleeRange: 0, meleeDamage: 0, meleeCone: 0,
    throwSpeed: 22, explosionRadius: 6.5, explosionDamage: 220,
    color: '#ff2a2a',
  },
};

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'rifle', 'shotgun', 'sniper', 'knife', 'grenade'];

// 游戏全局可调参数
export const CONFIG = {
  // 玩家
  playerEye: 1.6,
  playerFov: 75,
  maxHp: 100,
  moveSpeed: 5.2,
  arenaRadius: 22,

  // 跳跃
  gravity: 24,
  jumpSpeed: 8.8,

  // 瞄准
  adsLerp: 8, // 瞄准过渡速度(越大越快)

  // 敌人
  enemyBaseHp: 100,
  enemyHpPerWave: 12,
  enemyBaseSpeed: 2.1,
  enemySpeedPerWave: 0.16,
  enemyMaxSpeed: 4.6,
  attackRange: 2.3,
  attackDamage: 9,
  attackCooldown: 0.9,
  spawnRadius: 34,

  // 波次
  firstWaveCount: 5,
  waveCountGrowth: 2,
  waveBreak: 3.2,

  // 计分
  scoreBodyKill: 100,
  scoreHeadKill: 160,
  scoreHit: 10,

  // 雷达
  radarRange: 40,
} as const;

export const HS_KEY = 'deadzone_highscore';
