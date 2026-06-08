import { useThemeColors } from "@/lib/use-theme-colors";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuoteFlowStore, type MultiLocationResult, type WorkforceProfilePayload } from "@/lib/quote-flow-store";
import { api } from "@/lib/api";
import { Check, Clock, Shield, Cannabis, Loader2, AlertTriangle, FileCheck } from "lucide-react";

export default function Step4Indication() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ratingError, setRatingError] = useState("");
  const [ratingResult, setRatingResult] = useState<MultiLocationResult | null>(null);

  const modifier = s.hasExperienceMod === "Yes" ? parseFloat(s.experienceMod) || 1.0 : 1.0;

  const ratingInputKey = useMemo(
    () =>
      JSON.stringify({
        locations: s.locations.map((loc) => ({
          state: loc.state,
          zip: loc.zip,
          classCodes: loc.classCodes.map((cc) => ({
            classCode: cc.classCode,
            annualPayroll: cc.annualPayroll,
            fullTimeEmployees: cc.fullTimeEmployees,
            partTimeEmployees: cc.partTimeEmployees,
            description: cc.description,
          })),
        })),
        hasExperienceMod: s.hasExperienceMod,
        experienceMod: s.experienceMod,
      }),
    [s.locations, s.hasExperienceMod, s.experienceMod],
  );

  const storeRef = useRef(s);
  storeRef.current = s;

  useEffect(() => {
    let cancelled = false;
    const s = storeRef.current;
    async function fetchRates() {
      setLoading(true);
      setRatingError("");

      const locationsPayload: WorkforceProfilePayload["locations"] = s.locations
        .filter((loc) => loc.state && loc.classCodes.some((cc) => cc.classCode))
        .map((loc) => ({
          state: loc.state,
          zip: loc.zip || "",
          classCodes: loc.classCodes
            .filter((cc) => cc.classCode)
            .map((cc) => ({
              classCode: cc.classCode,
              annualPayroll: cc.annualPayroll || 0,
              fullTimeEmployees: cc.fullTimeEmployees || 0,
              partTimeEmployees: cc.partTimeEmployees || 0,
              description: cc.description || "",
            })),
        }));

      const workforceProfile: WorkforceProfilePayload = {
        locations: locationsPayload,
        eMod: modifier,
        scheduleRating: 1.0,
        isPEO: false,
      };

      if (locationsPayload.length === 0) {
        if (cancelled) return;
        setRatingError("No valid locations with class codes to rate.");
        setRatingResult(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.post<{ success: boolean; data: MultiLocationResult; error?: string }>("/rate/wc/multi", workforceProfile);

        if (cancelled) return;

        if (!res.success) {
          setRatingError(res.error || "Rating calculation failed.");
          setLoading(false);
          return;
        }

        setRatingResult(res.data);

        const breakdown: NonNullable<typeof s.indicationData>["rateBreakdown"] = [];
        let totalPayroll = 0;
        let totalEmployees = 0;

        res.data.locations.forEach((loc, locIdx) => {
          loc.classCodes.forEach((cc) => {
            totalPayroll += cc.annualPayroll;
            const origLoc = s.locations[locIdx];
            if (origLoc) {
              const origCc = origLoc.classCodes.find((c) => c.classCode === cc.classCode);
              if (origCc) {
                totalEmployees += (origCc.fullTimeEmployees || 0) + (origCc.partTimeEmployees || 0);
              }
            }
            breakdown.push({
              location: locIdx + 1,
              state: loc.state,
              classCode: cc.classCode,
              description: cc.description || "",
              payroll: cc.annualPayroll,
              ratePer100: cc.baseRate,
              estPremium: cc.premium,
            });
          });
        });

        const finalPremium = res.data.finalPremium;
        const low = Math.round(finalPremium * 0.9);
        const high = Math.round(finalPremium * 1.1);

        s.update({
          indicationData: {
            premiumLow: Math.max(500, low),
            premiumHigh: Math.max(Math.max(500, low), high),
            rateBreakdown: breakdown,
            totalPayroll,
            totalEmployees,
            modifier,
            calculatedAt: res.data.calculatedAt,
            wcRatingBreakdown: res.data,
            workforceProfile,
          },
        });
      } catch (err: any) {
        if (cancelled) return;
        setRatingError(err?.message || "Could not connect to rating engine.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRates();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingInputKey]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: "#E91E8C", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 14, color: textSecondary }}>Calculating rates from the rating table...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (ratingError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
        <AlertTriangle style={{ width: 32, height: 32, color: "#FFB547" }} />
        <p style={{ fontSize: 14, color: textPrimary, fontWeight: 600 }}>Rating Error</p>
        <p style={{ fontSize: 13, color: textSecondary, textAlign: "center", maxWidth: 400 }}>{ratingError}</p>
      </div>
    );
  }

  if (!s.indicationData) return null;

  const { premiumLow, premiumHigh, rateBreakdown, totalPayroll, totalEmployees } = s.indicationData;
  const stateCount = new Set(s.locations.map((l) => l.state).filter(Boolean)).size || 1;
  const classCodeCount = rateBreakdown.length;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const hasRateErrors = ratingResult?.locations.some((loc) => loc.classCodes.some((cc) => cc.error));

  const handleRequestProposal = () => {
    s.setPhase(2);
    s.setStep(0);
  };

  const isAso = s.coverageType === "ASO";
  const isPeo = s.coverageType === "PEO";
  const handlePurchaseAso = () => {
    navigate("/marketplace");
  };

  const PEO_BASE_RATE = 0.02;
  const peoAnnual = Math.round(totalPayroll * PEO_BASE_RATE);
  const peoEmployees = Math.max(totalEmployees, 1);
  const peoFrequencies = [
    { key: "Monthly", label: "Monthly", cycles: 12, unit: "PEPM" },
    { key: "BiWeekly", label: "Bi-Weekly", cycles: 26, unit: "PEPC" },
    { key: "Weekly", label: "Weekly", cycles: 52, unit: "PEPC" },
  ] as const;
  const selectedFreq = s.payrollFrequency;

  const highlights = isAso
    ? [
        "Full-service payroll & tax filing",
        "HR administration & compliance",
        "Benefits administration",
        "Time & attendance tracking",
        "Employee handbook & policies",
        "Onboarding & offboarding support",
        "Multi-state compliance coverage",
        "You keep your own WC policy",
      ]
    : [
        "Statutory workers' compensation coverage",
        "Employer's liability included",
        "Pay-as-you-go billing available",
        "Cannabis-specialized carrier",
        "Multi-state coverage available",
        "Dedicated claims management",
        "Return-to-work program support",
        "Certificate of insurance management",
      ];

  const vertical = s.vertical || "Cannabis";
  const coverageLabel = isAso
    ? "WorkPlus OS — Administrative Services"
    : isPeo
    ? "PEO Services"
    : "Workers' Compensation Insurance";
  const locationCount = new Set(rateBreakdown.map((r) => r.location)).size || 1;
  const primaryState = rateBreakdown[0]?.state || "";
  const totalPremium = ratingResult
    ? Math.round(ratingResult.totalGrossPremium)
    : Math.round(rateBreakdown.reduce((sum, r) => sum + r.estPremium, 0));
  const fmtCompact = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 10_000
      ? `$${Math.round(n / 1_000)}K`
      : `$${n.toLocaleString()}`;
  const coverageEffFormatted = (() => {
    if (!s.coverageEffectiveDate) return null;
    const d = new Date(`${s.coverageEffectiveDate}T00:00:00`);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  })();

  const statCards = [
    { label: "Number of Locations", value: String(locationCount), accent: "#E91E8C" },
    { label: "Number of Employees", value: String(totalEmployees), accent: "#7C3AED" },
    { label: "Annual Payroll", value: fmtCompact(totalPayroll), accent: "#E91E8C" },
    { label: "Experience Mod", value: modifier.toFixed(2), accent: "#7C3AED" },
  ];

  const wcFeatures = [
    "Pay-as-you-go billing available",
    'Dedicated Claims Management Team with "3-point" contact within 24 hrs',
    "24-Hour claims reporting hotline",
    "Carrier-managed medical provider network",
    "Personalized loss prevention programs + safety resources (HazCom, ergonomics, injury prevention)",
  ];
  const featureList = isAso ? highlights : wcFeatures;

  const coverageRows = [
    { icon: Shield, title: "A Rated Carrier", sub: "", right: "" },
    {
      icon: Shield,
      title: "Employer's Liability Limits",
      sub: "$1,000,000 / $1,000,000 / $1,000,000",
      right: "Included",
    },
    {
      icon: FileCheck,
      title: "Statutory WC Benefits",
      sub: `${primaryState ? primaryState + " " : ""}COMPLIANCE STANDARD`,
      right: "Mandatory",
    },
  ];

  const panelBg = isDark ? "#13131f" : "#f8f8fc";
  const subtleBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const cardRadius = 14;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "stretch" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid rgba(233,30,140,0.5)",
                color: "#E91E8C",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--app-font-heading)",
                whiteSpace: "nowrap",
              }}
            >
              Pricing Indication
            </span>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: textMuted, display: "inline-block" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--app-font-heading)",
              }}
            >
              Active Draft
            </span>
            <span style={{ width: 4, height: 4, borderRadius: 2, background: textMuted, display: "inline-block" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontFamily: "var(--app-font-heading)",
              }}
            >
              {today.toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.1 }}>
            {s.businessName || "Untitled Business"}
          </h1>
          <p style={{ fontSize: 15, color: textMuted, margin: "8px 0 0" }}>
            {vertical} | {coverageLabel}
          </p>
        </div>
        {coverageEffFormatted && (
          <div
            style={{
              color: "#E91E8C",
              fontSize: 19,
              fontWeight: 700,
              whiteSpace: "nowrap",
              paddingTop: 6,
            }}
          >
            Coverage Eff Date {coverageEffFormatted}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {statCards.map((c) => (
          <div
            key={c.label}
            style={{
              padding: "18px 20px",
              borderRadius: 12,
              background: panelBg,
              border: `1px solid ${borderColor}`,
              borderLeft: `3px solid ${c.accent}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontFamily: "var(--app-font-heading)",
                marginBottom: 10,
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {!isAso && (
        <div
          style={{
            padding: 24,
            borderRadius: cardRadius,
            background: panelBg,
            border: `1px solid ${borderColor}`,
            borderLeft: "3px solid #E91E8C",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontFamily: "var(--app-font-heading)",
              marginBottom: 8,
            }}
          >
            Estimated Annual Premium Range
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: textPrimary, lineHeight: 1.1 }}>
            ${premiumLow.toLocaleString()} – ${premiumHigh.toLocaleString()}
          </div>
          <p style={{ fontSize: 13, color: textMuted, margin: "8px 0 0" }}>
            Based on ${totalPayroll.toLocaleString()} total payroll across {classCodeCount} class code
            {classCodeCount !== 1 ? "s" : ""} in {stateCount} state{stateCount !== 1 ? "s" : ""} • Experience
            modifier {modifier.toFixed(2)}
          </p>
        </div>
      )}

      {!isAso && hasRateErrors && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(255,181,71,0.08)",
            border: "1px solid rgba(255,181,71,0.2)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16, color: "#FFB547", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: "#FFB547", lineHeight: 1.5 }}>
            Some class codes could not be found in the rating table. Those entries show a $0 rate and premium.
          </div>
        </div>
      )}

      {/* Rate breakdown table */}
      {!isAso && (
        <div
          style={{
            borderRadius: cardRadius,
            background: panelBg,
            borderLeft: "3px solid #E91E8C",
            overflow: "hidden",
            padding: "8px 4px",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Location", "Class Code", "Description", "Payroll", "Rate", "Est. Premium"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "16px 18px 12px",
                      textAlign: i >= 3 ? "right" : "left",
                      color: textMuted,
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontFamily: "var(--app-font-heading)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateBreakdown.map((row, i) => {
                const hasError = ratingResult?.locations[row.location - 1]?.classCodes.find(
                  (cc) => cc.classCode === row.classCode
                )?.error;
                return (
                  <tr key={i}>
                    <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600 }}>Loc {row.location} ({row.state})</td>
                    <td style={{ padding: "12px 18px", color: hasError ? "#FFB547" : textPrimary, fontWeight: 600 }}>{row.classCode}</td>
                    <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600 }}>{row.description}</td>
                    <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 600, textAlign: "right" }}>${row.payroll.toLocaleString()}</td>
                    <td style={{ padding: "12px 18px", color: hasError ? "#FFB547" : textPrimary, fontWeight: 600, textAlign: "right" }}>
                      ${row.ratePer100.toFixed(2)}
                      {hasError && <span title={hasError} style={{ marginLeft: 4, cursor: "help" }}>⚠</span>}
                    </td>
                    <td style={{ padding: "12px 18px", color: textPrimary, fontWeight: 700, textAlign: "right" }}>${Math.round(row.estPremium).toLocaleString()}</td>
                  </tr>
                );
              })}
              {ratingResult?.locations.filter((loc) => loc.caTerritory != null && loc.caTerritoryMultiplier !== 1.0).map((loc, i) => (
                <tr key={`territory-${i}`}>
                  <td colSpan={4} style={{ padding: "10px 18px", color: textMuted, fontSize: 12 }}>
                    CA Territory {loc.caTerritory} Adjustment ({loc.state})
                  </td>
                  <td style={{ padding: "10px 18px", color: textMuted, fontSize: 12, textAlign: "right" }}>
                    x{loc.caTerritoryMultiplier?.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 18px", color: textSecondary, fontWeight: 600, fontSize: 12, textAlign: "right" }}>
                    {loc.caTerritoryMultiplier! > 1 ? "+" : ""}{loc.subtotalBeforeTerritory != null
                      ? `$${Math.round(loc.subtotal - loc.subtotalBeforeTerritory).toLocaleString()}`
                      : ""}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700 }}>Total</td>
                <td style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700, textAlign: "right" }}>
                  ${totalPremium.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isAso && (ratingResult?.minimumPremiumApplied || (ratingResult?.isPEO && ratingResult.peoDiscountAmount > 0)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ratingResult?.minimumPremiumApplied && (
            <p style={{ fontSize: 12, color: "#FFB547", margin: 0 }}>Minimum premium of $500 applied</p>
          )}
          {ratingResult?.isPEO && ratingResult.peoDiscountAmount > 0 && (
            <p style={{ fontSize: 12, color: "#00D68F", margin: 0 }}>
              PEO discount applied: -${ratingResult.peoDiscountAmount.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {isAso && (() => {
          const asoPepm = 50;
          const asoEmployees = Math.max(totalEmployees, 1);
          const asoAnnual = asoPepm * asoEmployees * 12;
          const asoLow = Math.round(asoAnnual * 0.95);
          const asoHigh = Math.round(asoAnnual * 1.1);
          const asoFrequencies = [
            { key: "Monthly", label: "Monthly", cycles: 12, unit: "PEPM" },
            { key: "BiWeekly", label: "Bi-Weekly", cycles: 26, unit: "PEPC" },
            { key: "Weekly", label: "Weekly", cycles: 52, unit: "PEPC" },
          ] as const;
          return (
            <>
              <div
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: isDark ? "#13131f" : "#f8f8fc",
                  borderLeft: "3px solid #E91E8C",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Estimated Annual ASO Service Fee
                </span>
                <div style={{ fontSize: 36, fontWeight: 700, color: textPrimary, margin: "8px 0" }}>
                  ${asoLow.toLocaleString()} – ${asoHigh.toLocaleString()}
                </div>
                <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
                  Based on {asoEmployees} employee{asoEmployees !== 1 ? "s" : ""} at ${asoPepm}/employee/month
                </p>
              </div>

              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: isDark ? "#13131f" : "#f8f8fc",
                  borderLeft: "3px solid #E91E8C",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--app-font-heading)" }}>
                    ASO Service Pricing
                  </span>
                  <span style={{ fontSize: 11, color: textMuted }}>
                    ${asoPepm} per employee per month
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: "6px 0 4px" }}>
                  ${asoAnnual.toLocaleString()}
                  <span style={{ fontSize: 13, color: textMuted, fontWeight: 500, marginLeft: 8 }}>annual base</span>
                </div>
                <p style={{ fontSize: 12, color: textMuted, margin: "0 0 14px" }}>
                  {asoEmployees} employee{asoEmployees !== 1 ? "s" : ""} • billed via your chosen payroll cadence
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {asoFrequencies.map((f) => {
                    const perCycle = asoAnnual / asoEmployees / f.cycles;
                    const isSelected = selectedFreq === f.key;
                    return (
                      <div
                        key={f.key}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: isSelected ? "rgba(233,30,140,0.12)" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          border: isSelected ? "1px solid rgba(233,30,140,0.4)" : `1px solid ${borderColor}`,
                        }}
                      >
                        <div style={{ fontSize: 10, color: isSelected ? "#E91E8C" : textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)", marginBottom: 4 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>
                          ${perCycle.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                          {f.unit} • {f.cycles}/yr
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!selectedFreq && (
                  <p style={{ fontSize: 11, color: "#FFB547", margin: "10px 0 0", fontStyle: "italic" }}>
                    Select a payroll frequency on the Operations step to highlight your billing cadence.
                  </p>
                )}
              </div>
            </>
          );
        })()}

        {isPeo && (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: isDark ? "#13131f" : "#f8f8fc",
            borderLeft: "3px solid #7C3AED",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--app-font-heading)" }}>
              PEO Service Pricing
            </span>
            <span style={{ fontSize: 11, color: textMuted }}>
              {(PEO_BASE_RATE * 100).toFixed(0)}% of annual payroll
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: "6px 0 4px" }}>
            ${peoAnnual.toLocaleString()}
            <span style={{ fontSize: 13, color: textMuted, fontWeight: 500, marginLeft: 8 }}>annual base</span>
          </div>
          <p style={{ fontSize: 12, color: textMuted, margin: "0 0 14px" }}>
            Based on ${totalPayroll.toLocaleString()} payroll across {peoEmployees} employee{peoEmployees !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {peoFrequencies.map((f) => {
              const perCycle = peoAnnual / peoEmployees / f.cycles;
              const isSelected = selectedFreq === f.key;
              return (
                <div
                  key={f.key}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isSelected ? "rgba(124,58,237,0.12)" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    border: isSelected ? "1px solid rgba(124,58,237,0.4)" : `1px solid ${borderColor}`,
                  }}
                >
                  <div style={{ fontSize: 10, color: isSelected ? "#A78BFA" : textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)", marginBottom: 4 }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>
                    ${perCycle.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>
                    {f.unit} • {f.cycles}/yr
                  </div>
                </div>
              );
            })}
          </div>
          {!selectedFreq && (
            <p style={{ fontSize: 11, color: "#FFB547", margin: "10px 0 0", fontStyle: "italic" }}>
              Select a payroll frequency on the Operations step to highlight your billing cadence.
            </p>
          )}
        </div>
        )}

      {/* Coverage Breakdown */}
      {!isAso && (
        <div style={{ padding: 28, borderRadius: cardRadius, background: panelBg }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: "0 0 20px" }}>Coverage Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {coverageRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: subtleBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(233,30,140,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: "#E91E8C" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{row.title}</div>
                    {row.sub && (
                      <div
                        style={{
                          fontSize: 11,
                          color: textMuted,
                          marginTop: 2,
                          textTransform: row.title === "Statutory WC Benefits" ? "uppercase" : "none",
                          letterSpacing: row.title === "Statutory WC Benefits" ? "0.04em" : "normal",
                        }}
                      >
                        {row.sub}
                      </div>
                    )}
                  </div>
                  {row.right && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary, whiteSpace: "nowrap" }}>{row.right}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div style={{ padding: 28, borderRadius: cardRadius, background: panelBg }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: textPrimary, margin: "0 0 18px" }}>Features</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {featureList.map((h) => (
            <div key={h} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Check style={{ width: 17, height: 17, color: "#E91E8C", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: textSecondary, lineHeight: 1.45 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Carrier + timing */}
      {!isAso ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield style={{ width: 18, height: 18, color: "#E91E8C" }} />
            <div>
              <p style={{ fontSize: 14, color: textPrimary, margin: 0, fontWeight: 600 }}>Benchmark Insurance</p>
              <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Admitted carrier — Cannabis specialist</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock style={{ width: 16, height: 16, color: textMuted }} />
            <span style={{ fontSize: 13, color: textMuted }}>Est. 2-3 business days for approved proposal</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock style={{ width: 16, height: 16, color: textMuted }} />
          <span style={{ fontSize: 13, color: textMuted }}>Activate instantly — no underwriting required</span>
        </div>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: 12, color: textMuted, fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
        {isAso
          ? "This indication is based on the information provided. Final ASO service pricing is confirmed at checkout based on your selected billing cadence and employee headcount."
          : "This indication is based on the information provided and is not a guarantee of final pricing. Actual premium is subject to full underwriting review, carrier approval, and final audit. Rates shown are based on current filed carrier rates."}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={isAso ? handlePurchaseAso : handleRequestProposal}
          style={{
            flex: "1 1 240px",
            padding: "16px 24px",
            borderRadius: 28,
            border: "none",
            background: "#E91E8C",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            height: 54,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {isAso ? "Purchase WorkPlus OS" : "Request Proposal"}
        </button>

        <button
          type="button"
          style={{
            flex: "0 1 180px",
            padding: "14px 24px",
            borderRadius: 28,
            border: "1px solid #E91E8C",
            background: "transparent",
            color: "#E91E8C",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            height: 54,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(233,30,140,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Save Indication
        </button>

        <button
          type="button"
          onClick={() => navigate("/marketplace")}
          style={{
            background: "none",
            border: "none",
            color: textMuted,
            fontSize: 13,
            cursor: "pointer",
            padding: "8px 12px",
          }}
        >
          Back to Marketplace
        </button>
      </div>
    </div>
  );
}
