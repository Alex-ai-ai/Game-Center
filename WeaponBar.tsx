import { useGame } from '@/game/store';
import { WEAPONS, WEAPON_ORDER } from '@/game/constants';

const SLOT_LABEL: Record<string, string> = {
  pistol: 'PSTL',
  rifle: 'RIFL',
  shotgun: 'SHTG',
  sniper: 'SNPR',
  knife: 'KNFE',
  grenade: 'GRND',
};

// 左下武器槽位条:1-6 数字 + 当前武器高亮 + 弹药显示。
export default function WeaponBar() {
  const weaponId = useGame((s) => s.weaponId);
  const runtimes = useGame((s) => s.runtimes);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-2">
      {WEAPON_ORDER.map((id) => {
        const def = WEAPONS[id];
        const rt = runtimes[id];
        const active = id === weaponId;
        const ammoText =
          def.kind === 'melee'
            ? '∞'
            : def.kind === 'throwable'
            ? String(rt.ammo)
            : `${rt.ammo}/${rt.reserve}`;
        return (
          <div
            key={id}
            className="relative flex flex-col items-center justify-center w-16 h-14 border transition-all duration-150"
            style={{
              borderColor: active ? def.color : 'rgba(232,226,218,0.18)',
              background: active ? `${def.color}22` : 'rgba(10,10,12,0.6)',
              boxShadow: active ? `0 0 14px ${def.color}66` : 'none',
              transform: active ? 'translateY(-4px)' : 'none',
            }}
          >
            <span
              className="font-display text-lg leading-none"
              style={{ color: active ? def.color : '#e8e2da' }}
            >
              {SLOT_LABEL[id]}
            </span>
            <span className="text-[10px] tracking-wider text-bone/60 mt-0.5">{ammoText}</span>
            <span className="absolute -top-2 left-1 text-[9px] text-bone/40">{def.slot}</span>
          </div>
        );
      })}
    </div>
  );
}
