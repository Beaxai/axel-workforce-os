/**
 * Phase 4C — right-rail completeness summary. Collapsible list of the six
 * sections with a status dot/indicator; clicking a row opens that section's
 * editor. The aggregate "N / 6" toggles collapse (spec §5).
 */
import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import type { SectionView } from "./types";
import { STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";

interface RailCompletenessSummaryProps {
  sections: SectionView[];
  aggregateComplete: number;
  total: number;
  onOpenSection: (key: string) => void;
}

export default function RailCompletenessSummary({
  sections,
  aggregateComplete,
  total,
  onOpenSection,
}: RailCompletenessSummaryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const c = useThemeColors();

  return (
    <div>
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.06em", color: c.textMuted }}>SUBMISSION</span>
        <span style={{ fontSize: 10, color: c.textMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
          {aggregateComplete} / {total}
          {collapsed ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
        </span>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 7 }}>
          {sections.map((s) => (
            <div
              key={s.key}
              onClick={() => onOpenSection(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 11.5,
                color: c.textSecondary,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>{s.label}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: c.textMuted, fontSize: 10 }}>
                {s.status === "complete" ? (
                  <Check style={{ width: 13, height: 13, color: STATUS_COLORS.complete }} aria-label="Complete" />
                ) : s.status === "partial" ? (
                  <>
                    <span>{s.missing} missing</span>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS.partial }} />
                  </>
                ) : (
                  <>
                    <span>Not started</span>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS.not_started }} />
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
