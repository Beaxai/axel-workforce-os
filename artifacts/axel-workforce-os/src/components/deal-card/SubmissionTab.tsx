/**
 * Phase 4C — Submission tab (Stitch layout). Header shows the aggregate
 * completeness (moved here from the right rail per the 2026-06-22 §8 update),
 * followed by the six section cards with a 2-field preview + status indicator.
 * Clicking a card opens the section editor overlay (handled by the shell).
 * Completeness comes straight from the server payload.
 */
import type { SectionFieldView, SectionView } from "./types";
import { sectionIcon, STATUS_COLORS } from "./icons";
import { useThemeColors } from "@/lib/use-theme-colors";

interface SubmissionTabProps {
  sections: SectionView[];
  aggregateComplete: number;
  total: number;
  onOpenSection: (key: string) => void;
}

function previewValue(f: SectionFieldView): string {
  if (f.value == null || f.value === "") return "\u2014";
  if (f.type === "boolean") return f.value ? "Yes" : "No";
  if (f.type === "array") return Array.isArray(f.value) ? f.value.join(", ") : String(f.value);
  return String(f.value);
}

function StatusChip({ section }: { section: SectionView }) {
  const c = useThemeColors();
  const dot = (bg: string) => <span style={{ width: 7, height: 7, borderRadius: "50%", background: bg, display: "inline-block" }} />;
  return (
    <span style={{ fontSize: 10, color: c.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
      {section.status === "complete" && <>{dot(STATUS_COLORS.complete)}Complete</>}
      {section.status === "partial" && <>{dot(STATUS_COLORS.partial)}{section.missing} missing</>}
      {section.status === "not_started" && <>{dot(STATUS_COLORS.not_started)}Not started</>}
    </span>
  );
}

export default function SubmissionTab({ sections, aggregateComplete, total, onOpenSection }: SubmissionTabProps) {
  const c = useThemeColors();
  const pct = total > 0 ? Math.round((aggregateComplete / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Aggregate completeness (relocated from the rail per §8 Stitch update) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-heading" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: c.sectionHeading }}>
            Submission Completeness
          </span>
          <span style={{ fontSize: 11, color: c.textMuted, fontWeight: 500 }}>{aggregateComplete} / {total} complete</span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: c.cardBg, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {sections.map((s) => {
          const Icon = sectionIcon(s.icon);
          const preview = s.fields.slice(0, 2);
          return (
            <div
              key={s.key}
              onClick={() => onOpenSection(s.key)}
              style={{
                background: c.cardBg,
                border: `1px solid ${c.borderColor}`,
                borderRadius: 12,
                padding: 12,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.borderColor)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: c.textPrimary }}>
                  <Icon style={{ width: 16, height: 16, color: c.textMuted }} />
                  {s.label}
                </span>
                <StatusChip section={s} />
              </div>
              <div style={{ fontSize: 11, color: c.textMuted, lineHeight: 1.6 }}>
                {preview.map((f) => (
                  <div key={f.key}>
                    {f.label}: {previewValue(f)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
