import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function PinkButton({ children, style, disabled, ...props }: PinkButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: "#E91E8C",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "#d1187e";
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = "#E91E8C";
      }}
    >
      {children}
    </button>
  );
}
