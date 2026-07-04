import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  className?: string;
}

// 斜切角按钮:主按钮红描边 + hover 红光,ghost 为次要操作。
export default function Btn({ children, onClick, variant = 'primary', className = '' }: Props) {
  const base =
    'clip-btn relative font-display tracking-[0.2em] text-lg px-10 py-3 transition-all duration-200 select-none';
  const styles =
    variant === 'primary'
      ? 'bg-blood/10 text-bone border border-blood hover:bg-blood hover:text-ash hover:shadow-[0_0_28px_rgba(255,42,42,0.55)]'
      : 'bg-white/5 text-bone/70 border border-bone/20 hover:text-bone hover:border-bone/50';
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
