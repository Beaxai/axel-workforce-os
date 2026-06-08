import { useThemeColors } from "@/lib/use-theme-colors";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuoteFlowStore, type MultiLocationResult, type WorkforceProfilePayload } from "@/lib/quote-flow-store";
import { api } from "@/lib/api";
import { Check, Clock, Loader2, AlertTriangle, Wallet, ClipboardCheck, HardHat, Smartphone, HeartPulse, Headset, ShieldCheck, Users, MapPin, DollarSign, Gauge, type LucideIcon } from "lucide-react";
import employeeGraphic from "@assets/employee_graphic_cutout_1780947767721.png";
import wcShieldIcon from "@assets/Shield-Icon_1780952893965.png";

export default function Step4Indication() {
  const s = useQuoteFlowStore();
  const { isDark, textPrimary, textSecondary, textMuted, borderColor } = useThemeColors();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ratingError, setRatingError] = useState("");
  const [ratingResult, setRatingResult] = useState<MultiLocationResult | null>(null);
  const [savingDeal, setSavingDeal] = useState(false);
  const [savedDealId, setSavedDealId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

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

  const handleSaveIndication = async () => {
    if (savingDeal) return;
    if (savedDealId) {
      navigate("/pipeline");
      return;
    }
    setSavingDeal(true);
    setSaveError("");
    try {
      const refTs = Date.now().toString(36).toUpperCase();
      const refRand = Math.random().toString(36).substring(2, 6).toUpperCase();
      const referenceCode = `AX-${refTs}-${refRand}`;
      const businessName = s.businessName || "Untitled Business";
      const productType = isPeo ? "PEO" : isAso ? "ASO" : "WC";
      const payload: Record<string, unknown> = {
        referenceCode,
        businessName,
        vertical: s.vertical || undefined,
        productType,
        state: s.locations[0]?.state || undefined,
        annualPayroll: totalPayroll ? String(totalPayroll) : undefined,
        employeeCountFt: totalEmployees || undefined,
        stage: "INDICATION",
        wcPremium: isAso ? undefined : String(totalPremium),
      };
      const newDeal = await api.post<{ id: string }>("/deals", payload);

      const ind = s.indicationData;
      if (ind?.wcRatingBreakdown) {
        const finalPremium = Number(ind.wcRatingBreakdown.finalPremium ?? totalPremium);
        try {
          await api.post("/quotes", {
            dealId: newDeal.id,
            status: "INDICATION",
            state: s.locations[0]?.state || undefined,
            annualPayroll: totalPayroll ? String(totalPayroll) : undefined,
            headcount: totalEmployees || undefined,
            eMod: String(modifier || 1.0),
            scheduleRating: "1.0",
            isPeo,
            wcPremium: String(finalPremium),
            wcFinalPremium: String(finalPremium),
            wcIndicationMin: premiumLow != null ? String(premiumLow) : undefined,
            wcIndicationMax: premiumHigh != null ? String(premiumHigh) : undefined,
            wcRatingBreakdown: ind.wcRatingBreakdown,
            workforceProfile: ind.workforceProfile,
          });
        } catch (e) {
          console.error("Failed to persist indication quote:", e);
        }
      }

      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      api.post(`/deals/${newDeal.id}/email`, {
        emailAddress: `${slug}@listener.axel.io`,
        companySlug: slug,
      }).catch(() => {});
      api.post(`/deals/${newDeal.id}/activity`, {
        entityType: "deal",
        entityId: newDeal.id,
        eventType: "DEAL_CREATED",
        description: `Indication saved for ${businessName}`,
      }).catch(() => {});
      window.dispatchEvent(new Event("deal-updated"));
      setSavedDealId(newDeal.id);
    } catch (err) {
      console.error("Failed to save indication:", err);
      setSaveError("Failed to save indication. Please try again.");
    } finally {
      setSavingDeal(false);
    }
  };

  const isAso = s.coverageType === "ASO";
  const isPeo = s.coverageType === "PEO";
  const handlePurchaseAso = () => {
    navigate("/marketplace");
  };

  const PEO_BASE_RATE = 0.02;
  const peoAnnual = Math.round(totalPayroll * PEO_BASE_RATE);
  const peoEmployees = Math.max(totalEmployees, 1);
  const peoPerEmployeeMonthly = Math.round(peoAnnual / peoEmployees / 12);
  const selectedFreq = s.payrollFrequency;

  const vertical = s.vertical || "Cannabis";
  const coverageLabel = isAso
    ? "WorkPlus OS — Administrative Services"
    : isPeo
    ? "Workforce Solutions Program (PEO)"
    : "Workers' Compensation Insurance";
  const locationCount = new Set(rateBreakdown.map((r) => r.location)).size || 1;
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
    { label: "Number of Locations", value: String(locationCount), accent: "#E91E8C", icon: MapPin },
    { label: "Number of Employees", value: String(totalEmployees), accent: "#7C3AED", icon: Users },
    { label: "Annual Payroll", value: fmtCompact(totalPayroll), accent: "#E91E8C", icon: DollarSign },
    { label: "Experience Mod", value: modifier.toFixed(2), accent: "#7C3AED", icon: Gauge },
  ];

  type FeatureCard = {
    title: string;
    icon: LucideIcon;
    desc: string;
    badges?: string[];
    badgeCheck?: boolean;
    link?: boolean;
  };
  const featureCards: FeatureCard[] = [
    {
      title: "Flexible Billing",
      icon: Wallet,
      desc: "Pay-as-you-go billing available to align your insurance costs directly with your operational cycle and cash flow.",
      link: true,
    },
    {
      title: "Dedicated Claims Management",
      icon: Users,
      desc: 'Our specialized team guarantees a "3-point" contact within 24 hours of any incident. We bridge the gap between reporting and resolution with elite professional oversight.',
      badges: ["24H Response", "3-Point Contact"],
    },
    {
      title: "Elite Reporting",
      icon: Headset,
      desc: "24-Hour claims reporting hotline staffed by industry veterans ready to initiate immediate protocol activation.",
    },
    {
      title: "Medical Network",
      icon: HeartPulse,
      desc: "Carrier-managed medical provider network ensuring top-tier care and streamlined integration with claims processing.",
    },
    {
      title: "Safety Architecture",
      icon: ShieldCheck,
      desc: "Personalized loss prevention programs and safety resources including HazCom, ergonomics, and injury prevention metrics.",
      badges: ["HazCom", "Ergonomics"],
      badgeCheck: true,
    },
  ];

  const panelBg = isDark ? "#13131f" : "#f8f8fc";
  const cardRadius = 14;
  const featureCardBg = panelBg;

  const renderFeatureCard = (c: FeatureCard) => {
    const Icon = c.icon;
    return (
      <div
        key={c.title}
        style={{
          padding: 24,
          borderRadius: cardRadius,
          background: featureCardBg,
          border: `1px solid ${borderColor}`,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(233,30,140,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 22, height: 22, color: "#E91E8C" }} />
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: textPrimary, marginBottom: 8 }}>{c.title}</div>
          <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.55, margin: 0 }}>{c.desc}</p>
        </div>
        {c.badges && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto" }}>
            {c.badges.map((b) => (
              <span
                key={b}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderRadius: 6,
                  border: "1px solid rgba(233,30,140,0.4)",
                  color: "#E91E8C",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--app-font-heading)",
                }}
              >
                {c.badgeCheck && <Check style={{ width: 12, height: 12 }} />}
                {b}
              </span>
            ))}
          </div>
        )}
        {c.link && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: "auto",
              color: "#E91E8C",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--app-font-heading)",
              cursor: "pointer",
            }}
          >
            Learn More →
          </span>
        )}
      </div>
    );
  };

  const rateBreakdownTable = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Workers' Compensation Coverage Pricing header */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: isDark ? "#13131f" : "#f8f8fc",
          borderLeft: "3px solid #E91E8C",
        }}
      >
        <h3 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: "0 0 16px", lineHeight: 1.15, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.01em" }}>Workers' Compensation Pricing</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(190px, 240px)", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>Workers' compensation premium is calculated from current filed carrier rates applied to payroll across each class code and location, then adjusted for your experience modifier.</p>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              The figure shown reflects your total estimated annual premium and is finalized after underwriting review and audit.
            </p>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              Workers' compensation premiums are seamlessly integrated into payroll processing. Premiums are calculated and remitted on a pay-as-you-go basis using actual payroll processed.
            </p>
          </div>
          <div style={{ position: "relative", paddingTop: 40 }}>
            <img
              src={wcShieldIcon}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 76,
                height: "auto",
                zIndex: 2,
                pointerEvents: "none",
                filter: "drop-shadow(0 8px 24px rgba(233,30,140,0.45))",
              }}
            />
            <div
              style={{
                borderRadius: 20,
                padding: 2,
                background: "linear-gradient(135deg, #E91E8C 0%, #7C3AED 50%, #3B82F6 100%)",
                boxShadow: "0 0 40px rgba(233,30,140,0.35)",
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "#0a0a12",
                  padding: "32px 20px 18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  ${totalPremium.toLocaleString()}
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "12px auto", maxWidth: 150 }} />
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>total annual premium</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          borderRadius: cardRadius,
          background: panelBg,
          borderLeft: "3px solid #E91E8C",
          overflow: "hidden",
          padding: "8px 4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, margin: "12px 18px 8px" }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: textPrimary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: "var(--app-font-heading)",
            margin: 0,
          }}
        >
          Workers' Compensation Premium Rating
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13 }}>
          <span style={{ color: textSecondary }}>
            <span style={{ color: textMuted, fontWeight: 600 }}>Carrier:</span> Benchmark
          </span>
          <span style={{ color: textSecondary }}>
            <span style={{ color: textMuted, fontWeight: 600 }}>Rating:</span> A (Excellent)
          </span>
        </div>
      </div>
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
            <td colSpan={5} style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700, borderTop: "1px solid #E91E8C" }}>Total</td>
            <td style={{ padding: "16px 18px", color: textPrimary, fontWeight: 700, textAlign: "right", borderTop: "1px solid #E91E8C" }}>
              ${totalPremium.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );

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
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
          <div
            key={c.label}
            style={{
              padding: "18px 20px",
              borderRadius: 12,
              background: panelBg,
              border: `1px solid ${borderColor}`,
              borderLeft: `3px solid ${c.accent}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(233,30,140,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ width: 20, height: 20, color: "#E91E8C" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontFamily: "var(--app-font-heading)",
                  marginBottom: 6,
                }}
              >
                {c.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: textPrimary, lineHeight: 1 }}>{c.value}</div>
            </div>
          </div>
          );
        })}
      </div>
      {!isAso && !isPeo && (
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
          <p style={{ fontSize: 13, color: textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
            Final pricing is subject to underwriting review and may be adjusted through credits or debits based on historical loss experience and claims performance.
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
      {/* Rate breakdown table (WC only — PEO renders it inside its pricing card) */}
      {!isAso && !isPeo && rateBreakdownTable}
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
          const asoFrequencies = [
            { key: "Monthly", label: "Monthly", cycles: 12, unit: "PEPM" },
            { key: "BiWeekly", label: "Bi-Weekly", cycles: 26, unit: "PEPC" },
            { key: "Weekly", label: "Weekly", cycles: 52, unit: "PEPC" },
          ] as const;
          const asoCategories = [
            { title: "Payroll", icon: Wallet, items: ["Full Service Payroll Platform", "Automated Payroll Processing", "Direct Deposits", "All Inclusive Payroll Tax Filing"] },
            { title: "HR Platform", icon: Smartphone, items: ["Unified Platform", "Electronic Onboarding & Offboarding", "Time & Attendance Tracking", "Employee Self Service Portal"] },
            { title: "Compliance", icon: ClipboardCheck, items: ["Multi-State Compliance Coverage", "Employee Handbook & Policies", "EEOC Claims Guidance", "Employment Law Posters"] },
            { title: "Benefits Administration", icon: HeartPulse, items: ["Major Medical (POS, EPO, HDHP options)", "ICHRA", "MEC and MVP", "Dental", "Vision", "Life"] },
            { title: "HR Support", icon: Headset, items: ["Support for HR Matters, Payroll, & Benefits", "HR Best Practice Guidance", "Employee Service Center", "Wage and Hour Guidance", "Performance Management Support"] },
            { title: "Risk Management", icon: HardHat, items: ["Injury & Illness Prevention Programs", "Safety Manuals", "Employer & Employee Safety Training", "Facility Inspections"] },
          ];
          return (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: isDark ? "#13131f" : "#f8f8fc",
                borderLeft: "3px solid #E91E8C",
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: "0 0 24px", lineHeight: 1.15, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.01em" }}>WorkPlus OS Program Pricing</h3>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 260px) 1fr", gap: 28, alignItems: "center", marginBottom: 32 }}>
                <div style={{ position: "relative", paddingTop: 54 }}>
                  <img
                    src={employeeGraphic}
                    alt=""
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 92,
                      height: "auto",
                      zIndex: 2,
                      pointerEvents: "none",
                      filter: "drop-shadow(0 8px 24px rgba(233,30,140,0.45))",
                    }}
                  />
                  <div
                    style={{
                      borderRadius: 20,
                      padding: 2,
                      background: "linear-gradient(135deg, #E91E8C 0%, #7C3AED 50%, #3B82F6 100%)",
                      boxShadow: "0 0 40px rgba(233,30,140,0.35)",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 18,
                        background: "#0a0a12",
                        padding: "44px 24px 24px",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                        ${asoPepm.toLocaleString()}
                      </div>
                      <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "16px auto", maxWidth: 150 }} />
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>per employee / month</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
                    WorkPlus OS is billed on a simple cost-per-employee, per-month model that includes full-service payroll processing, tax administration, HR technology, benefits administration, and dedicated support — while you remain the employer of record and keep your own workers' compensation policy.
                  </p>
                  <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
                    This all-inclusive rate provides clear, predictable pricing with no hidden fees and automatically adjusts as your workforce grows or changes.
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                {asoCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.title}
                      style={{
                        borderRadius: 14,
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                        border: `1px solid ${borderColor}`,
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${borderColor}` }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: "rgba(233,30,140,0.14)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon style={{ width: 17, height: 17, color: "#E91E8C" }} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {cat.title}
                        </span>
                      </div>
                      <ul style={{ listStyle: "none", margin: 0, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {cat.items.map((item) => (
                          <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: textSecondary, lineHeight: 1.4 }}>
                            <Check style={{ width: 14, height: 14, color: "#E91E8C", flexShrink: 0, marginTop: 2 }} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 28 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--app-font-heading)" }}>
                    Billing Cadence
                  </span>
                  <span style={{ fontSize: 13, color: textSecondary }}>
                    <span style={{ color: textMuted, fontWeight: 600 }}>Annual base:</span> ${asoAnnual.toLocaleString()} • {asoEmployees} employee{asoEmployees !== 1 ? "s" : ""}
                  </span>
                </div>
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
            </div>
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
        <h3 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: "0 0 24px", lineHeight: 1.15, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.01em" }}>Workforce Solutions Program Pricing</h3>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 260px) 1fr", gap: 28, alignItems: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", paddingTop: 54 }}>
            <img
              src={employeeGraphic}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 92,
                height: "auto",
                zIndex: 2,
                pointerEvents: "none",
                filter: "drop-shadow(0 8px 24px rgba(124,58,237,0.45))",
              }}
            />
            <div
              style={{
                borderRadius: 20,
                padding: 2,
                background: "linear-gradient(135deg, #E91E8C 0%, #7C3AED 50%, #3B82F6 100%)",
                boxShadow: "0 0 40px rgba(124,58,237,0.35)",
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  background: "#0a0a12",
                  padding: "44px 24px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                  ${peoPerEmployeeMonthly.toLocaleString()}
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "16px auto", maxWidth: 150 }} />
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>per employee </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              Our services are billed on a simple cost-per-employee, per-month model that includes payroll processing, tax administration, HR compliance, benefits administration, Risk Management services and access to a dedicated support team.
            </p>
            <p style={{ fontSize: 14, color: textSecondary, lineHeight: 1.6, margin: 0 }}>
              This all-inclusive rate provides clear, predictable pricing with no hidden fees and automatically adjusts as your workforce grows or changes.
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[
            { title: "Compliance", icon: ClipboardCheck, items: ["280E Tax Code Compliance", "State and Federal Compliance", "EEOC Claims Management", "Employee Handbook"] },
            { title: "Payroll", icon: Wallet, items: ["Full Service Payroll Platform", "Automated Payroll Processing", "Direct Deposits", "All Inclusive Payroll Tax Filing"] },
            { title: "HR Platform", icon: Smartphone, items: ["Unified Platform", "Electronic Onboarding", "Time & Attendance", "Employee Self Service Portal"] },
            { title: "Risk Management", icon: HardHat, items: ["Injury & Illness Prevention Programs", "Safety Manuals", "Employer & Employee Safety Training", "Facility Inspections"] },
            { title: "Benefits Administration", icon: HeartPulse, items: ["Major Medical (POS, EPO, HDHP options)", "ICHRA", "MEC and MVP", "Dental", "Vision", "Life"] },
            { title: "HR Support", icon: Headset, items: ["Support for HR Matters, Payroll, & Benefits", "HR Best Practice Guidance", "Employee Service Center", "State and Federal Compliance Guidance", "Employment Law Posters", "Wage and Hour Guidance", "Performance Management Support"] },
            { title: "Workers' Compensation Administration", icon: ShieldCheck, items: ["Pay-as-you-go workers' compensation billing", "Workers' Compensation Posters", "Compliance assistance for applicable federal/state employment laws", "W/C claims management", "24/7/365 Nurse Triage Claims Reporting Hotline", "Patient Advocacy"] },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                style={{
                  borderRadius: 14,
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${borderColor}`,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${borderColor}` }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: "rgba(124,58,237,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 17, height: 17, color: "#A78BFA" }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textPrimary, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {cat.title}
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {cat.items.map((item) => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: textSecondary, lineHeight: 1.4 }}>
                      <Check style={{ width: 14, height: 14, color: "#A78BFA", flexShrink: 0, marginTop: 2 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 28 }}>
          {rateBreakdownTable}
        </div>
      </div>
      )}
      {/* Features */}
      {!isPeo && !isAso && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: 0, lineHeight: 1.15, fontFamily: "var(--app-font-heading)", textTransform: "uppercase", letterSpacing: "0.01em" }}>Features</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
            {featureCards.slice(0, 2).map(renderFeatureCard)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {featureCards.slice(2).map(renderFeatureCard)}
          </div>
        </div>
      )}
      {/* Carrier + timing */}
      {!isAso ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock style={{ width: 16, height: 16, color: textMuted }} />
          <span style={{ fontSize: 13, color: textMuted }}>Est. 2-3 business days for approved proposal</span>
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
          onClick={handleSaveIndication}
          disabled={savingDeal}
          style={{
            flex: "0 1 180px",
            padding: "14px 24px",
            borderRadius: 28,
            border: "1px solid #E91E8C",
            background: savedDealId ? "rgba(233,30,140,0.12)" : "transparent",
            color: "#E91E8C",
            fontSize: 14,
            fontWeight: 600,
            cursor: savingDeal ? "default" : "pointer",
            opacity: savingDeal ? 0.7 : 1,
            height: 54,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!savedDealId) e.currentTarget.style.background = "rgba(233,30,140,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = savedDealId ? "rgba(233,30,140,0.12)" : "transparent";
          }}
        >
          {savingDeal ? (
            <>
              <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              Saving…
            </>
          ) : savedDealId ? (
            <>
              <Check style={{ width: 16, height: 16 }} />
              View in Pipeline
            </>
          ) : (
            "Save Indication"
          )}
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
      {saveError && (
        <p style={{ fontSize: 13, color: "#FF5B5B", margin: 0 }}>{saveError}</p>
      )}
    </div>
  );
}
