import { create } from 'zustand';
import { CONFIG, HS_KEY, WEAPONS, WEAPON_ORDER, type WeaponId } from './constants';

export type Phase = 'menu' | 'playing' | 'paused' | 'gameover';

// 单个武器的运行时弹药状态
interface WeaponRuntime {
  ammo: number; // 当前弹匣/库存
  reserve: number; // 备弹(刀为 -1 表示无限)
}

function initRuntimes(): Record<WeaponId, WeaponRuntime> {
  const r = {} as Record<WeaponId, WeaponRuntime>;
  for (const id of WEAPON_ORDER) {
    const def = WEAPONS[id];
    r[id] = { ammo: def.magSize, reserve: def.startReserve };
  }
  return r;
}

interface GameState {
  phase: Phase;
  hp: number;
  maxHp: number;

  // 武器
  weaponId: WeaponId;
  runtimes: Record<WeaponId, WeaponRuntime>;
  reloading: boolean;
  reloadProgress: number;

  // 瞄准
  aiming: boolean;
  adsProgress: number; // 0..1

  // 计分 / 波次
  score: number;
  kills: number;
  wave: number;
  enemiesRemaining: number;
  highScore: number;

  // 反馈时间戳
  hitMarkerAt: number;
  killMarkerAt: number;
  damageAt: number;
  waveAnnounceAt: number;
  waveAnnounceText: string;

  start: () => void;
  reset: () => void;
  setPhase: (p: Phase) => void;
  togglePause: () => void;
  takeDamage: (amount: number) => void;
  switchWeapon: (id: WeaponId) => void;

  // 当前武器弹药操作
  consumeAmmo: () => void;
  beginReload: () => void;
  finishReload: () => void;
  setReloadProgress: (p: number) => void;

  setAiming: (a: boolean) => void;
  setAdsProgress: (p: number) => void;

  onEnemyHit: (killed: boolean, headshot: boolean) => void;
  enemySpawned: (count: number) => void;
  startWave: (w: number) => void;
  setEnemiesRemaining: (n: number) => void;
}

const loadHighScore = (): number => {
  try {
    const v = localStorage.getItem(HS_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
};

const persistHighScore = (v: number) => {
  try {
    localStorage.setItem(HS_KEY, String(v));
  } catch {
    /* ignore */
  }
};

const freshCombat = () => ({
  hp: CONFIG.maxHp,
  weaponId: 'pistol' as WeaponId,
  runtimes: initRuntimes(),
  reloading: false,
  reloadProgress: 0,
  aiming: false,
  adsProgress: 0,
  score: 0,
  kills: 0,
  wave: 0,
  enemiesRemaining: 0,
});

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  ...freshCombat(),
  maxHp: CONFIG.maxHp,
  highScore: loadHighScore(),
  hitMarkerAt: 0,
  killMarkerAt: 0,
  damageAt: 0,
  waveAnnounceAt: 0,
  waveAnnounceText: '',

  start: () => set({ ...freshCombat(), phase: 'playing' }),

  reset: () => set({ ...freshCombat(), phase: 'menu' }),

  setPhase: (p) => set({ phase: p }),

  togglePause: () => {
    const { phase } = get();
    if (phase === 'playing') set({ phase: 'paused', aiming: false });
    else if (phase === 'paused') set({ phase: 'playing' });
  },

  takeDamage: (amount) => {
    const { hp, phase } = get();
    if (phase !== 'playing') return;
    const next = Math.max(0, hp - amount);
    set({ hp: next, damageAt: performance.now() });
    if (next <= 0) {
      const { score, highScore } = get();
      if (score > highScore) {
        persistHighScore(score);
        set({ hp: 0, phase: 'gameover', highScore: score, aiming: false });
      } else {
        set({ hp: 0, phase: 'gameover', aiming: false });
      }
    }
  },

  switchWeapon: (id) => {
    const { phase, reloading, weaponId } = get();
    if (phase !== 'playing' && phase !== 'paused') return;
    if (id === weaponId) return;
    // 切换时取消装弹与瞄准
    set({ weaponId: id, reloading: false, reloadProgress: 0, aiming: false });
  },

  consumeAmmo: () => {
    const { weaponId, runtimes } = get();
    const rt = runtimes[weaponId];
    if (rt.ammo <= 0) return;
    set({
      runtimes: { ...runtimes, [weaponId]: { ...rt, ammo: rt.ammo - 1 } },
    });
  },

  beginReload: () => {
    const { weaponId, runtimes, reloading } = get();
    const def = WEAPONS[weaponId];
    const rt = runtimes[weaponId];
    // 刀/手榴弹不可装弹; 弹满或无备弹不可装弹
    if (reloading || def.reloadTime <= 0) return;
    if (rt.ammo >= def.magSize) return;
    if (rt.reserve <= 0) return;
    set({ reloading: true, reloadProgress: 0 });
  },

  finishReload: () => {
    const { weaponId, runtimes } = get();
    const def = WEAPONS[weaponId];
    const rt = runtimes[weaponId];
    const need = def.magSize - rt.ammo;
    const take = Math.min(need, rt.reserve);
    set({
      runtimes: { ...runtimes, [weaponId]: { ammo: rt.ammo + take, reserve: rt.reserve - take } },
      reloading: false,
      reloadProgress: 1,
    });
  },

  setReloadProgress: (p) => set({ reloadProgress: p }),

  setAiming: (a) => {
    const { weaponId } = get();
    if (WEAPONS[weaponId].adsFov == null) {
      if (a) return;
    }
    set({ aiming: a });
  },

  setAdsProgress: (p) => set({ adsProgress: p }),

  onEnemyHit: (killed, headshot) => {
    const now = performance.now();
    if (!killed) {
      set((s) => ({ score: s.score + CONFIG.scoreHit, hitMarkerAt: now }));
      return;
    }
    const bonus = headshot ? CONFIG.scoreHeadKill : CONFIG.scoreBodyKill;
    set((s) => ({
      score: s.score + bonus,
      kills: s.kills + 1,
      enemiesRemaining: Math.max(0, s.enemiesRemaining - 1),
      hitMarkerAt: now,
      killMarkerAt: now,
    }));
  },

  enemySpawned: (count) => set((s) => ({ enemiesRemaining: s.enemiesRemaining + count })),

  startWave: (w) => {
    set((s) => {
      // 每波补充所有武器的备弹
      const runtimes = { ...s.runtimes };
      for (const id of WEAPON_ORDER) {
        const def = WEAPONS[id];
        const rt = runtimes[id];
        if (rt.reserve < 0) continue; // 刀无限
        runtimes[id] = { ...rt, reserve: rt.reserve + def.reservePerWave };
      }
      return {
        wave: w,
        runtimes,
        waveAnnounceAt: performance.now(),
        waveAnnounceText: `WAVE ${w}`,
      };
    });
  },

  setEnemiesRemaining: (n) => set({ enemiesRemaining: n }),
}));
