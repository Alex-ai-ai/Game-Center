import { useEffect, useState } from 'react';

// 以 requestAnimationFrame 频率强制重绘,用于驱动基于时间戳的 UI 反馈(命中标记、伤害 vignette 等)。
export function useClock(active: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      set((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
