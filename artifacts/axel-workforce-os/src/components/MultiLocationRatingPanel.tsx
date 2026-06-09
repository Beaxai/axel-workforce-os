import { GlassCard, Badge } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";

interface ClassCodeBreakdown {
  classCode: string;
  annualPayroll: number;
  baseRate?: number;
  premium?: number;
  description?: string;
}

interface LocationBreakdown {
  state: string;
  subtotal: number;
  classCodes: ClassCodeBreakdown[];
  caTerritory?: number | null;
  caTerritoryMultiplier?: number;
}

interface WcRatingBreakdown {
  locations: LocationBreakdown[];
  finalPremium: number;
  minimumPremiumApplied?: boolean;
  peoDiscountAmount?: number;
  isPEO?: boolean;
  eMod?: number;
  scheduleRating?: number;
}

interface WorkforceProfile {
  locations?: Array<{ state?: string; zip?: string }>;
  eMod?: number;
  scheduleRating?: number;
  isPEO?: boolean;
}

interface MultiLocationRatingPanelProps {
  businessName: string;
  wcBreakdown: WcRatingBreakdown;
  workforceProfile?: WorkforceProfile | null;
  indicationLow?: number | null;
  indicationHigh?: number | null;
  finalPremiumFallback?: number | null;
  ratedAt?: string;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

export default function MultiLocationRatingPanel({
  businessName,
  wcBreakdown,
  workforceProfile,
  indicationLow,
  indicationHigh,
  finalPremiumFallback,
  ratedAt,
}: MultiLocationRatingPanelProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const textSecondary = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const subtleBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";

  const eMod = workforceProfile?.eMod ?? wcBreakdown.eMod ?? 1.0;
  const scheduleRating = workforceProfile?.scheduleRating ?? wcBreakdown.scheduleRating ?? 1.0;
  const isPEO = workforceProfile?.isPEO ?? wcBreakdown.isPEO ?? false;
  const finalPremium = wcBreakdown.finalPremium ?? finalPremiumFallback ?? 0;
  const peoDiscountAmount = wcBreakdown.peoDiscountAmount ?? 0;
  const locs = wcBreakdown.locations || [];

  return (
    <GlassCard padding="28px">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: textPrimary, margin: 0 }}>
          {businessName} — Rating Breakdown
        </h2>
        <Badge label={isPEO ? "PEO+WC" : "WC Only"} color={isPEO ? "purple" : "blue"} />
      </div>

      {ratedAt && (
        <p style={{ fontSize: "12px", color: textMuted, margin: "0 0 20px" }}>
          Quoted on{" "}
          {new Date(ratedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}

      {/* Aggregate summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          padding: "14px",
          background: subtleBg,
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <Stat label="Locations" value={String(locs.length)} textPrimary={textPrimary} textMuted={textMuted} />
        <Stat label="Experience Mod" value={Number(eMod).toFixed(2)} textPrimary={textPrimary} textMuted={textMuted} />
        <Stat label="Schedule Rating" value={Number(scheduleRating).toFixed(2)} textPrimary={textPrimary} textMuted={textMuted} />
        <Stat label="PEO" value={isPEO ? "Yes" : "No"} textPrimary={textPrimary} textMuted={textMuted} />
      </div>

      {/* Per-location rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          Per-Location Subtotals
        </p>
        {locs.map((loc, i) => {
          const profileLoc = workforceProfile?.locations?.[i];
          const locPayroll = (loc.classCodes || []).reduce((sum, cc) => sum + (cc.annualPayroll || 0), 0);
          const ccCount = (loc.classCodes || []).length;
          return (
            <div
              key={i}
              style={{
                padding: "12px 14px",
                background: subtleBg,
                borderRadius: "10px",
                border: `1px solid ${dividerColor}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: textPrimary }}>
                  Loc {i + 1} — {loc.state}
                  {profileLoc?.zip ? ` ${profileLoc.zip}` : ""}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: textPrimary }}>
                  {fmtMoney(loc.subtotal)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: textSecondary }}>
                <span>
                  {ccCount} class code{ccCount !== 1 ? "s" : ""} • ${locPayroll.toLocaleString()} payroll
                </span>
                {loc.caTerritoryMultiplier && loc.caTerritoryMultiplier !== 1.0 && (
                  <span style={{ color: textMuted }}>
                    CA Territory {loc.caTerritory} ×{loc.caTerritoryMultiplier.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Class code detail rows */}
              {ccCount > 0 && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${dividerColor}`, display: "flex", flexDirection: "column", gap: "3px" }}>
                  {loc.classCodes.map((cc, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: textMuted, fontFamily: "monospace" }}>
                      <span>
                        {cc.classCode}
                        {cc.description ? ` — ${cc.description}` : ""}
                      </span>
                      <span>${(cc.annualPayroll || 0).toLocaleString()} payroll</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Indication range */}
      {(indicationLow != null || indicationHigh != null) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "12px 14px",
            marginBottom: "12px",
            background: subtleBg,
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "12px", color: textMuted }}>Indication Range</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: textPrimary }}>
            {indicationLow != null ? fmtMoney(indicationLow) : "—"} –{" "}
            {indicationHigh != null ? fmtMoney(indicationHigh) : "—"}
          </span>
        </div>
      )}

      {/* Final premium */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          padding: "16px 18px",
          borderRadius: "10px",
          border: "1px solid rgba(233,30,140,0.3)",
          background: isDark ? "rgba(233,30,140,0.08)" : "rgba(233,30,140,0.05)",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--accent-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Final Premium
        </span>
        <span style={{ fontSize: "26px", color: "var(--accent-primary)", fontWeight: 700 }}>
          {fmtMoney(finalPremium)}
        </span>
      </div>

      {/* Notes */}
      {(wcBreakdown.minimumPremiumApplied || (isPEO && peoDiscountAmount > 0)) && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {wcBreakdown.minimumPremiumApplied && (
            <p style={{ fontSize: "12px", color: "#FFB547", margin: 0 }}>
              Minimum premium of $500 applied
            </p>
          )}
          {isPEO && peoDiscountAmount > 0 && (
            <p style={{ fontSize: "12px", color: "#22c55e", margin: 0 }}>
              PEO discount applied: −{fmtMoney(peoDiscountAmount)}
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  textPrimary,
  textMuted,
}: {
  label: string;
  value: string;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <p style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: "2px 0 0" }}>{value}</p>
    </div>
  );
}
