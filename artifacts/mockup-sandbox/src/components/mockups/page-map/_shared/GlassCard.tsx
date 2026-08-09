import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', padding = '20px', style, onClick }: GlassCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
