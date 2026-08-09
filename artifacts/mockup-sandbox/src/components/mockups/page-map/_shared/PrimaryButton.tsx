import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'cta';
}

export function PrimaryButton({ children, style, disabled, variant: _v, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: 'var(--gradient-cta)', color: '#fff', border: 'none',
        borderRadius: '10px', padding: '10px 20px', fontSize: '14px',
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'filter 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
