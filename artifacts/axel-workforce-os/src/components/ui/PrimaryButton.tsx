import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * All action buttons render the purple→pink brand gradient
   * (var(--gradient-cta)). The two variants are kept for API compatibility
   * and now style identically.
   */
  variant?: "primary" | "cta";
}

export default function PrimaryButton({
  children,
  style,
  disabled,
  variant = "primary",
  ...props
}: PrimaryButtonProps) {
  void variant;
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: "var(--gradient-cta)",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s, filter 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.filter = "brightness(1.1)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.filter = "none";
      }}
    >
      {children}
    </button>
  );
}
