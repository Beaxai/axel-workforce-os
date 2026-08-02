import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";
import { useThemeColors } from "@/lib/use-theme-colors";

export interface AxelDropdownOption {
  value: string;
  label: string;
}

/**
 * Glass-styled dropdown pill (graduated from the canvas Table Rows mockup).
 * Fully custom-rendered so the popup matches the app aesthetic in both themes,
 * unlike native <select> popups which are OS-rendered.
 */
export function AxelDropdown({
  label,
  value,
  options,
  onChange,
  icon,
  alignRight = false,
  style,
}: {
  label?: string;
  value: string;
  options: (string | AxelDropdownOption)[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  alignRight?: boolean;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const { textPrimary } = useThemeColors();

  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const opts: AxelDropdownOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const selectedLabel = opts.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "9px 12px",
          borderRadius: "10px",
          border: `1px solid ${open ? "var(--accent-primary)" : inputBorder}`,
          boxShadow: open ? "0 0 0 1px var(--accent-primary-soft)" : "none",
          background: inputBg,
          color: textMuted,
          fontSize: "13px",
          cursor: "pointer",
          transition: "border-color 0.15s, box-shadow 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        {icon}
        {label && <span>{label}:</span>}
        <span style={{ color: textPrimary, fontWeight: 500 }}>{selectedLabel}</span>
        <ChevronDown
          style={{
            width: "13px",
            height: "13px",
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 50,
            top: "calc(100% + 6px)",
            ...(alignRight ? { right: 0 } : { left: 0 }),
            minWidth: "180px",
            maxHeight: "320px",
            overflowY: "auto",
            borderRadius: "12px",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
            background: isDark ? "rgba(23,18,31,0.95)" : "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: isDark
              ? "0 16px 48px -8px rgba(0,0,0,0.7)"
              : "0 16px 48px -8px rgba(0,0,0,0.18)",
            padding: "6px 0",
          }}
        >
          {opts.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = "transparent";
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                  background: selected ? "var(--accent-primary-soft)" : "transparent",
                  color: selected ? "var(--accent-primary)" : textPrimary,
                  fontWeight: selected ? 600 : 400,
                  transition: "background 0.12s",
                }}
              >
                {opt.label}
                {selected && <Check style={{ width: "13px", height: "13px", color: "var(--accent-primary)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
