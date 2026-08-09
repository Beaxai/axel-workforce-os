import { GlassCard, PinkButton, GhostButton } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";

interface WCBreakdown {
  result: {
    wcPremium: number;
  };
  calculation: {
    payrollPer100: number;
    grossPremium: number;
    finalPremium: number;
    peoDiscountApplied: boolean;
    peoDiscountAmount: number;
    minimumPremiumApplied: boolean;
  };
  rateData: {
    baseRate: number;
    effectiveDate: string;
    description: string;
  };
  inputs: {
    state: string;
    classCode: string;
    annualPayroll: number;
    eMod: number;
    scheduleRating: number;
    isPEO: boolean;
  };
}

interface WFSBreakdown {
  result: {
    monthlyWFSFee: number;
    pepm: number;
  };
  calculation: {
    annualWFSFee: number;
    monthlyWFSFee: number;
    pepm: number;
  };
  inputs: {
    annualPayroll: number;
    headcount: number;
  };
}

interface ProposalPanelProps {
  businessName: string;
  quoteType: string;
  wcBreakdown: WCBreakdown | null;
  wfsBreakdown: WFSBreakdown | null;
  readOnly?: boolean;
  ratedAt?: string;
  onSaveDeal?: () => void;
  onRecalculate?: () => void;
  /** WC-2: Axel broker fee shown on the proposal (percent of WC premium). */
  brokerFee?: { percent: number; amount: number | null } | null;
}

function fmt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtRate(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "0.0000";
  return n.toFixed(4);
}

export default function ProposalPanel({
  businessName,
  quoteType,
  wcBreakdown,
  wfsBreakdown,
  readOnly = false,
  ratedAt,
  onSaveDeal,
  onRecalculate,
  brokerFee,
}: ProposalPanelProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  if (!wcBreakdown) return null;

  const isPEO = quoteType === "PEO" || quoteType === "PEO+WC";
  const wc = wcBreakdown;
  const wfs = wfsBreakdown;

  const wcPremium = wc.result?.wcPremium ?? wc.calculation?.finalPremium ?? 0;

  const totalMonthlyInvestment = isPEO && wfs
    ? Math.round((wcPremium / 12 + (wfs.result?.monthlyWFSFee ?? wfs.calculation?.monthlyWFSFee ?? 0)) * 100) / 100
    : null;

  return (
    <GlassCard padding="28px">
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: textPrimary, margin: "0 0 20px" }}>
        {businessName} — Workers&apos; Compensation Proposal
      </h2>

      {ratedAt && (
        <p style={{ fontSize: "12px", color: textMuted, margin: "-12px 0 16px" }}>
          Quoted on {new Date(ratedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
        <LineItem label="State" value={wc.inputs?.state ?? "—"} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Class Code" value={`${wc.inputs?.classCode ?? "—"} — ${wc.rateData?.description ?? ""}`} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Annual Payroll" value={fmt(wc.inputs?.annualPayroll)} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Base Rate" value={fmtRate(wc.rateData?.baseRate)} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Experience Mod" value={(wc.inputs?.eMod ?? 1).toFixed(2)} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Schedule Rating" value={(wc.inputs?.scheduleRating ?? 1).toFixed(2)} textPrimary={textPrimary} textMuted={textMuted} />
        <LineItem label="Gross Premium" value={fmt(wc.calculation?.grossPremium)} textPrimary={textPrimary} textMuted={textMuted} />
      </div>

      {wc.calculation?.minimumPremiumApplied && (
        <p style={{ fontSize: "12px", color: textMuted, margin: "12px 0 0", fontStyle: "italic" }}>
          Minimum premium of $500 applied
        </p>
      )}

      {!isPEO && (
        <div style={{ marginTop: "20px" }}>
          <span style={{ fontSize: "12px", color: textMuted }}>Final WC Premium</span>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-primary)", margin: "4px 0 0" }}>
            {fmt(wcPremium)}
          </p>
        </div>
      )}

      {brokerFee && (
        <div style={{ borderTop: `1px solid ${dividerColor}`, marginTop: "20px", paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: textPrimary }}>
              Axel Broker Fee ({brokerFee.percent}% of premium)
            </span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: textPrimary }}>
              {brokerFee.amount != null ? fmt(brokerFee.amount) : "—"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: textMuted, margin: "4px 0 0" }}>
            Invoiced separately from carrier premium.
          </p>
        </div>
      )}

      {isPEO && (
        <>
          <div style={{ marginTop: "20px" }}>
            <span style={{ fontSize: "12px", color: textMuted }}>WC Premium (before PEO discount)</span>
            <p style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "4px 0 0" }}>
              {fmt(wc.calculation?.grossPremium)}
            </p>
          </div>

          <div style={{ borderTop: `1px solid ${dividerColor}`, margin: "20px 0" }} />

          <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>
            PEO Program — Kind PEO Program
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
            <LineItem
              label="WC Bundled Discount"
              value={`-10% / -${fmt(wc.calculation?.peoDiscountAmount)}`}
              textPrimary="#22c55e"
              textMuted={textMuted}
            />
            <LineItem
              label="Discounted WC Premium"
              value={fmt(wcPremium)}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
          </div>

          {wfs && (
            <>
              <div style={{ borderTop: `1px solid ${dividerColor}`, margin: "20px 0" }} />

              <h3 style={{ fontSize: "15px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>
                Workforce Solutions Fee
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 32px" }}>
                <LineItem label="Annual WFS Fee" value={fmt(wfs.calculation?.annualWFSFee)} textPrimary={textPrimary} textMuted={textMuted} />
                <LineItem label="Monthly WFS Fee" value={fmt(wfs.result?.monthlyWFSFee ?? wfs.calculation?.monthlyWFSFee)} textPrimary={textPrimary} textMuted={textMuted} />
              </div>

              <div style={{ marginTop: "16px" }}>
                <span style={{ fontSize: "12px", color: textMuted }}>PEPM</span>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-primary)", margin: "4px 0 0" }}>
                  {fmt(wfs.result?.pepm ?? wfs.calculation?.pepm)}
                </p>
              </div>

              {totalMonthlyInvestment != null && totalMonthlyInvestment > 0 && (
                <div style={{ marginTop: "16px", padding: "16px", background: isDark ? "rgba(233,30,140,0.08)" : "rgba(233,30,140,0.05)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "12px", color: textMuted }}>Total Monthly Investment</span>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-primary)", margin: "4px 0 0" }}>
                    {fmt(totalMonthlyInvestment)}
                  </p>
                  <span style={{ fontSize: "11px", color: textMuted }}>
                    (WC {fmt(wcPremium / 12)}/mo + WFS {fmt(wfs.result?.monthlyWFSFee ?? wfs.calculation?.monthlyWFSFee ?? 0)}/mo)
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!readOnly && (
        <div style={{ display: "flex", gap: "12px", marginTop: "28px" }}>
          {onSaveDeal && (
            <PinkButton onClick={onSaveDeal} style={{ padding: "10px 24px" }}>
              Save as Deal
            </PinkButton>
          )}
          {onRecalculate && (
            <GhostButton onClick={onRecalculate} style={{ padding: "10px 24px" }}>
              Recalculate
            </GhostButton>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function LineItem({ label, value, textPrimary, textMuted }: { label: string; value: string; textPrimary: string; textMuted: string }) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: textMuted }}>{label}</span>
      <p style={{ fontSize: "14px", fontWeight: 500, color: textPrimary, margin: "2px 0 0" }}>{value}</p>
    </div>
  );
}
