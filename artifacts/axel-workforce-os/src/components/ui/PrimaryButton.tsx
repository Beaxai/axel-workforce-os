import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SOLID_PRIMARY_BUTTON_BACKGROUND } from "@/lib/button-styles";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** The two variants are kept for API compatibility and style identically. */
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
        background: SOLID_PRIMARY_BUTTON_BACKGROUND,
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
