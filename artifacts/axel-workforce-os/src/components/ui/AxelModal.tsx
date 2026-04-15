import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

interface AxelModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function AxelModal({ isOpen, onClose, children, title }: AxelModalProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.78)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
          borderRadius: "16px",
          padding: "24px",
          minWidth: "400px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: isDark ? "#fff" : "#111",
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                padding: "4px",
              }}
            >
              <X style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              padding: "4px",
            }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
