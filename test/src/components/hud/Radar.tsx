import { useGame } from '@/game/store';
import { useClock } from '@/hooks/useClock';
import { enemyRegistry } from '@/game/enemyRegistry';
import { playerState, getGrenades } from '@/game/playerRef';
import { CONFIG } from '@/game/constants';

// 右上角雷达:圆形,玩家在中心朝上,红点为敌人,橙点为手榴弹。
// 雷达随玩家视角旋转(玩家朝向始终指向雷达上方)。
const SIZE = 132;
const R = SIZE / 2 - 4;
const RANGE = CONFIG.radarRange;

export default function Radar() {
  useClock(true);
  const aiming = useGame((s) => s.aiming);
  const weaponId = useGame((s) => s.weaponId);
  const adsProgress = useGame((s) => s.adsProgress);

  // 狙击瞄准时隐藏雷达(避免遮挡瞄准镜)
  const hideForScope = weaponId === 'sniper' && adsProgress > 0.55;

  const px = playerState.position.x;
  const pz = playerState.position.z;
  const yaw = playerState.yaw;

  const dots: { x: number; y: number; c: string; r: number }[] = [];

  // 玩家 forward / right 的 XZ 分量 (yaw = atan2(fx, fz))
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = -Math.cos(yaw); // right.x = forward × up 的 x 分量
  const rz = Math.sin(yaw);  // right.z
  const scale = R / RANGE;

  const project = (dx: number, dz: number): { sx: number; sy: number } => {
    // 投影到 forward 和 right 方向
    const fwdDot = dx * fx + dz * fz; // 前向分量(正=前方)
    const rightDot = dx * rx + dz * rz; // 右向分量(正=右方)
    // 雷达坐标:右→+x, 前→-y(上方)
    return { sx: rightDot * scale, sy: -fwdDot * scale };
  };

  const clampToEdge = (sx: number, sy: number): [number, number] => {
    const dist = Math.hypot(sx, sy);
    const maxR = R - 2;
    if (dist > maxR) {
      const k = maxR / dist;
      return [sx * k, sy * k];
    }
    return [sx, sy];
  };

  // 敌人
  for (const e of enemyRegistry.all()) {
    if (!e.alive && e.dyingAt > 0) continue;
    if (!e.alive) continue;
    const dx = e.position.x - px;
    const dz = e.position.z - pz;
    const { sx, sy } = project(dx, dz);
    const [cx, cy] = clampToEdge(sx, sy);
    dots.push({ x: cx, y: cy, c: '#ff2a2a', r: 2.6 });
  }

  // 手榴弹
  for (const g of getGrenades()) {
    const dx = g.position.x - px;
    const dz = g.position.z - pz;
    const { sx, sy } = project(dx, dz);
    const [cx, cy] = clampToEdge(sx, sy);
    dots.push({ x: cx, y: cy, c: '#ff7a18', r: 2 });
  }

  return (
    <div
      className="absolute"
      style={{
        right: 24,
        top: 92,
        width: SIZE,
        height: SIZE,
        opacity: hideForScope ? 0 : aiming ? 0.55 : 0.9,
        transition: 'opacity 120ms',
        pointerEvents: 'none',
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`-${R - 4} -${R - 4} ${SIZE - 8} ${SIZE - 8}`}>
        {/* 背景圆 */}
        <circle cx="0" cy="0" r={R} fill="rgba(8,6,5,0.7)" stroke="rgba(255,42,42,0.5)" strokeWidth="1.2" />
        {/* 扫描线 */}
        <line x1="0" y1={-R} x2="0" y2={R} stroke="rgba(255,122,24,0.18)" strokeWidth="0.6" />
        <line x1={-R} y1="0" x2={R} y2="0" stroke="rgba(255,122,24,0.18)" strokeWidth="0.6" />
        {/* 同心圆 */}
        <circle cx="0" cy="0" r={R * 0.66} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        <circle cx="0" cy="0" r={R * 0.33} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        {/* 敌人 / 手榴弹点 */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c}>
            <animate attributeName="opacity" values="1;0.45;1" dur="1.1s" repeatCount="indefinite" />
          </circle>
        ))}
        {/* 玩家中心(三角形朝上) */}
        <polygon points="0,-5 4,4 -4,4" fill="#e8e2da" />
      </svg>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] text-bone/40">
        Radar
      </div>
    </div>
  );
}
