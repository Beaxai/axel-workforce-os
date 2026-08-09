import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function GhostButton({ children, style, disabled, ...props }: GhostButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: 'transparent', color: 'var(--accent-primary)',
        border: '1px solid var(--accent-primary)', borderRadius: '10px',
        padding: '10px 20px', fontSize: '14px', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
