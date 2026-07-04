import { useGame } from '@/game/store';
import { useClock } from '@/hooks/useClock';

// 中心准星:四段开合十字 + 中心点。命中变红,装弹时显示旋转进度环。
// 瞄准时(狙击)隐藏准星(用瞄准镜视野),其他枪瞄准时收窄开合。
export default function Crosshair() {
  const hitAt = useGame((s) => s.hitMarkerAt);
  const killAt = useGame((s) => s.killMarkerAt);
  const reloading = useGame((s) => s.reloading);
  const reloadProgress = useGame((s) => s.reloadProgress);
  const weaponId = useGame((s) => s.weaponId);
  const aiming = useGame((s) => s.aiming);
  const adsProgress = useGame((s) => s.adsProgress);
  const rt = useGame((s) => s.runtimes[s.weaponId]);
  useClock(true);

  const now = performance.now();
  const hitAge = now - hitAt;
  const killAge = now - killAt;
  const hit = hitAge < 140;
  const kill = killAge < 180;
  const ammo = rt.ammo;

  // 装弹环
  if (reloading) {
    const r = 16;
    const circ = 2 * Math.PI * r;
    const dash = circ * Math.max(0, Math.min(1, reloadProgress));
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 48 48" className="animate-spin" style={{ animationDuration: '1.4s' }}>
          <circle cx="24" cy="24" r={r} fill="none" stroke="#3a1010" strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            stroke="#ff7a18"
            strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
        </svg>
      </div>
    );
  }

  // 狙击枪强瞄准:真实开镜 —— 中心圆形透明(显示缩放后的 3D 场景),外部黑色镜筒遮罩
  const isSniperAds = weaponId === 'sniper' && adsProgress > 0.5;

  if (isSniperAds) {
    const breath = Math.sin(performance.now() / 900) * 0.3;
    // 透明视野半径(屏幕较短边的百分比)
    const viewR = 36; // %
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translate(${breath * 0.2}px, ${breath * 0.12}px)` }}
      >
        {/* 1) 黑色镜筒遮罩 + 中心透明圆 (radial-gradient,最可靠) */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center,
              rgba(0,0,0,0) 0%,
              rgba(0,0,0,0) ${viewR - 1}%,
              rgba(0,0,0,0.5) ${viewR}%,
              rgba(0,0,0,0.97) ${viewR + 2}%,
              #000 ${viewR + 4}%)`,
          }}
        />
        {/* 2) 视野内淡绿色调 + 暗角 */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center,
              rgba(140,170,120,0.04) 0%,
              rgba(140,170,120,0.04) ${viewR - 8}%,
              rgba(0,0,0,0) ${viewR - 2}%,
              rgba(0,0,0,0) ${viewR}%)`,
          }}
        />

        {/* 3) 镜筒内圈高光 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full"
            style={{
              width: `${viewR * 2}vmin`,
              height: `${viewR * 2}vmin`,
              boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.08), inset 0 0 24px rgba(0,0,0,0.6)`,
            }}
          />
        </div>

        {/* 4) 瞄准镜刻度 + 中心十字 (SVG,坐标原点在中心) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width={`${viewR * 2}vmin`}
            height={`${viewR * 2}vmin`}
            viewBox="-100 -100 200 200"
            className="relative"
          >
            {/* Mil-dot 主十字线 */}
            <line x1="-98" y1="0" x2="98" y2="0" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
            <line x1="0" y1="-98" x2="0" y2="98" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />

            {/* Mil-dot 圆点 (每 10 单位) */}
            {Array.from({ length: 17 }).map((_, i) => {
              const p = -80 + i * 10;
              if (Math.abs(p) < 5) return null;
              return <circle key={`h${i}`} cx={p} cy="0" r="0.9" fill="rgba(255,255,255,0.5)" />;
            })}
            {Array.from({ length: 17 }).map((_, i) => {
              const p = -80 + i * 10;
              if (Math.abs(p) < 5) return null;
              return <circle key={`v${i}`} cx="0" cy={p} r="0.9" fill="rgba(255,255,255,0.5)" />;
            })}

            {/* 中心红色细十字 + 红点 */}
            <line x1="-7" y1="0" x2="-1.5" y2="0" stroke="#ff2a2a" strokeWidth="0.8" />
            <line x1="1.5" y1="0" x2="7" y2="0" stroke="#ff2a2a" strokeWidth="0.8" />
            <line x1="0" y1="-7" x2="0" y2="-1.5" stroke="#ff2a2a" strokeWidth="0.8" />
            <line x1="0" y1="1.5" x2="0" y2="7" stroke="#ff2a2a" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="0.7" fill="#ff2a2a" />
          </svg>
        </div>
      </div>
    );
  }

  const color = kill ? '#ff2a2a' : hit ? '#ff7a18' : ammo <= 0 ? '#a01717' : '#e8e2da';
  // 瞄准时收窄开合(其他枪)
  const adsNarrow = aiming ? 0.5 : 1;
  const gap = (kill ? 9 : 6) * adsNarrow;
  const len = 9;
  const lineStyle = (dir: string): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', background: color, boxShadow: `0 0 4px ${color}` };
    if (dir === 't') return { ...base, width: 2, height: len, left: -1, top: -(gap + len) };
    if (dir === 'b') return { ...base, width: 2, height: len, left: -1, top: gap };
    if (dir === 'l') return { ...base, width: len, height: 2, top: -1, left: -(gap + len) };
    return { ...base, width: len, height: 2, top: -1, left: gap };
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative" style={{ transform: kill ? 'scale(1.25)' : 'scale(1)', transition: 'transform 80ms' }}>
        <span style={lineStyle('t')} />
        <span style={lineStyle('b')} />
        <span style={lineStyle('l')} />
        <span style={lineStyle('r')} />
        <span style={{ position: 'absolute', width: 2, height: 2, left: -1, top: -1, background: color, borderRadius: 1 }} />
      </div>
    </div>
  );
}
