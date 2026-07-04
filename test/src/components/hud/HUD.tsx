import { useGame } from '@/game/store';
import { WEAPONS } from '@/game/constants';
import { useClock } from '@/hooks/useClock';
import Crosshair from './Crosshair';
import Radar from './Radar';
import WeaponBar from './WeaponBar';

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[10px] uppercase tracking-[0.25em] text-bone/40">{label}</span>
      <span className="font-display text-3xl" style={{ color: accent ?? '#e8e2da' }}>
        {value}
      </span>
    </div>
  );
}

export default function HUD() {
  const hp = useGame((s) => s.hp);
  const maxHp = useGame((s) => s.maxHp);
  const weaponId = useGame((s) => s.weaponId);
  const rt = useGame((s) => s.runtimes[weaponId]);
  const reloading = useGame((s) => s.reloading);
  const score = useGame((s) => s.score);
  const wave = useGame((s) => s.wave);
  const remaining = useGame((s) => s.enemiesRemaining);
  const damageAt = useGame((s) => s.damageAt);
  const waveAnnounceAt = useGame((s) => s.waveAnnounceAt);
  const waveAnnounceText = useGame((s) => s.waveAnnounceText);
  const adsProgress = useGame((s) => s.adsProgress);
  useClock(true);

  const def = WEAPONS[weaponId];
  const now = performance.now();
  const dmgAge = now - damageAt;
  const dmgOpacity = dmgAge < 520 ? Math.max(0, 0.55 * (1 - dmgAge / 520)) : 0;
  const announceAge = now - waveAnnounceAt;
  const showAnnounce = announceAge < 2200;
  const announceOpacity = showAnnounce
    ? announceAge < 300
      ? announceAge / 300
      : Math.max(0, 1 - (announceAge - 1500) / 700)
    : 0;

  const hpRatio = Math.max(0, hp / maxHp);
  const hpColor = hpRatio > 0.5 ? '#3fa34d' : hpRatio > 0.25 ? '#ff7a18' : '#ff2a2a';

  // 弹药显示根据武器类型变化
  const ammoText =
    def.kind === 'melee'
      ? '∞'
      : def.kind === 'throwable'
      ? String(rt.ammo)
      : String(rt.ammo);
  const magText = def.kind === 'gun' ? `/ ${def.magSize}` : '';
  const reserveText =
    def.kind === 'melee' ? 'MELEE' : def.kind === 'throwable' ? `× ${rt.ammo}` : `Reserve ${rt.reserve}`;
  const lowAmmo = def.kind !== 'melee' && rt.ammo <= (def.kind === 'gun' ? 3 : 1);

  // 狙击强瞄准时隐藏部分 HUD(避免遮挡瞄准镜)
  const hideForScope = weaponId === 'sniper' && adsProgress > 0.55;
  const hudOpacity = hideForScope ? 0.15 : 1;

  return (
    <div className="pointer-events-none absolute inset-0 select-none" style={{ opacity: hudOpacity, transition: 'opacity 120ms' }}>
      {/* 伤害 vignette */}
      <div
        className="absolute inset-0"
        style={{
          opacity: dmgOpacity,
          background: 'radial-gradient(ellipse at center, rgba(255,0,0,0) 35%, rgba(190,10,10,0.85) 100%)',
        }}
      />

      <Crosshair />

      {/* 顶栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-8 py-5">
        <Stat label="Score" value={score.toLocaleString()} accent="#ff7a18" />
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] uppercase tracking-[0.3em] text-bone/40">Wave</span>
          <span className="font-display text-5xl text-bone dz-flicker">{wave}</span>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="text-[10px] uppercase tracking-[0.25em] text-bone/40">Threats</span>
          <span className="font-display text-3xl text-blood">{remaining}</span>
        </div>
      </div>

      {/* 雷达 */}
      <Radar />

      {/* 波次公告 */}
      {showAnnounce && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display text-7xl tracking-[0.15em]"
            style={{ opacity: announceOpacity, color: '#ff2a2a', textShadow: '0 0 24px rgba(255,42,42,0.6)' }}
          >
            {waveAnnounceText}
          </div>
        </div>
      )}

      {/* 左下:血量 + 当前武器名 */}
      <div className="absolute bottom-24 left-8 w-64">
        <div className="flex items-end justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-bone/50">Vitals</span>
          <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: def.color }}>
            {def.name}
          </span>
        </div>
        <div className="h-2.5 w-full bg-black/60 border border-bone/15 overflow-hidden">
          <div
            className="h-full transition-[width] duration-150"
            style={{
              width: `${hpRatio * 100}%`,
              background: `linear-gradient(90deg, ${hpColor}aa, ${hpColor})`,
              boxShadow: `0 0 10px ${hpColor}`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-bone/40">
          <span>{Math.ceil(hp)} HP</span>
          <span style={{ color: hpColor }}>{hpRatio > 0.25 ? 'STABLE' : 'CRITICAL'}</span>
        </div>
      </div>

      {/* 右下:弹药 */}
      <div className="absolute bottom-24 right-8 text-right">
        <div className="flex items-end justify-end gap-2 leading-none">
          <span
            className={`font-display text-6xl ${lowAmmo ? 'text-blood' : 'text-bone'}`}
            style={lowAmmo ? { animation: 'dz-flicker 1s infinite steps(1)' } : undefined}
          >
            {ammoText}
          </span>
          {magText && <span className="font-display text-2xl text-bone/40 mb-1">{magText}</span>}
        </div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-bone/50">
          {reloading ? <span className="text-warn">RELOADING…</span> : reserveText}
        </div>
      </div>

      {/* 武器槽位条 */}
      <WeaponBar />

      {/* 底部中央提示 */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-bone/25">
        WASD Move · Space Jump · 1-6 Weapons · RMB Aim · LMB Fire · R Reload · Esc Pause
      </div>
    </div>
  );
}
