/**
 * Shared scaffolding for the deal-task list mockups: app dark theme tokens,
 * sample data, and a drawer-shaped frame so every variant previews at the
 * exact width it will occupy inside the deal-card dialog (264px pane).
 */
import type { CSSProperties, ReactNode } from "react";

export const T = {
  bg: "#060608",
  cardBg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.07)",
  inputBorder: "rgba(255,255,255,0.10)",
  hoverBg: "rgba(255,255,255,0.06)",
  textPrimary: "#fff",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.48)",
  accent: "#E91E8C",
  green: "#4caf50",
};

export type Task = { id: string; name: string; assignee?: string; due?: string; done?: boolean };

export const TASKS: Task[] = [
  { id: "1", name: "Test Task", assignee: "Sarah Mitchell", due: "Jul 27" },
  { id: "2", name: "Collect loss runs from broker", assignee: "Marcus Webb", due: "Aug 4" },
  { id: "3", name: "Confirm payroll by class code", assignee: "Sarah Mitchell", due: "Aug 6" },
  { id: "4", name: "Schedule underwriting call", due: "Aug 8" },
  { id: "5", name: "Send indication letter", assignee: "Dana Ortiz", due: "Jul 22", done: true },
];

export const label: CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMuted,
};

/** Renders a variant inside a 264px drawer pane on the app's dark backdrop. */
export function DrawerFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", justifyContent: "center", paddingTop: 28, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: 264, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Drawer header, identical across variants */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 2px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ ...label, color: T.textSecondary }}>Tasks</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: T.textSecondary, background: T.hoverBg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "1px 6px" }}>4</span>
          <span style={{ marginLeft: "auto", color: T.textMuted, fontSize: 15, lineHeight: 1 }}>+</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Check({ done }: { done?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={done ? T.green : T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
