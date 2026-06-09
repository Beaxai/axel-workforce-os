import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * "primary" (default) = solid purple interactive button.
   * "cta" = the single primary call-to-action per screen; renders the one
   * permitted brand gradient. Use at most one per view.
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
  const isCta = variant === "cta";
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: isCta ? "var(--gradient-cta)" : "var(--accent-primary)",
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
        if (isCta) {
          e.currentTarget.style.filter = "brightness(1.1)";
        } else {
          e.currentTarget.style.background = "var(--accent-primary-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (isCta) {
          e.currentTarget.style.filter = "none";
        } else {
          e.currentTarget.style.background = "var(--accent-primary)";
        }
      }}
    >
      {children}
    </button>
  );
}
