import { useThemeColors } from "@/lib/use-theme-colors";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  Calendar,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";

const accent = "var(--accent-primary)";

interface ProposalData {
  id: string;
  dealId: string;
  quoteId: string | null;
  status: string;
  wcAnnualPremium: string | null;
  wcMonthlyPremium: string | null;
  wfsMonthlyPepm: string | null;
  wfsAnnualTotal: string | null;
  totalMonthly: string | null;
  totalAnnual: string | null;
  emod: string | null;
  scheduleRating: string | null;
  ratingBreakdown: any;
  effectiveDate: string | null;
  expirationDate: string | null;
  carrierName: string | null;
  programName: string | null;
  verticalId: string | null;
  proposalPdfPath: string | null;
  uwNotifiedAt: string | null;
  createdAt: string;
}

interface UwPackageData {
  status: string;
  emailSentAt: string | null;
  emailSentTo: string[] | null;
  documents: Array<{ type: string; label: string }> | null;
}

export default function ProposalScreen() {
  const [searchParams] = useSearchParams();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();

  const glass: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(12px)",
    border: `1px solid ${borderColor}`,
    borderRadius: "12px",
  };
  const dealId = searchParams.get("dealId") || "";
  const dealName = searchParams.get("dealName") || "Deal";

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestResult, setRequestResult] = useState<{ type: string; message: string } | null>(null);
  const [uwStatus, setUwStatus] = useState<UwPackageData | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (dealId) loadProposal();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [dealId]);

  async function loadProposal() {
    setLoading(true);
    try {
      const data = await api.get<{ proposal: ProposalData | null }>(`/proposals/${dealId}`);
      setProposal(data.proposal);
      if (data.proposal && (data.proposal.status === "approved_proposal_requested" || data.proposal.status === "underwriting_notified")) {
        loadUwStatus(data.proposal.id);
      }
    } catch {
      setProposal(null);
    }
    setLoading(false);
  }

  async function loadUwStatus(proposalId: string) {
    try {
      const data = await api.get<{ package: UwPackageData | null }>(`/proposals/${proposalId}/uw-package-status`);
      setUwStatus(data.package);
    } catch {}
  }

  async function handleCreateProposal() {
    setCreating(true);
    try {
      const data = await api.post<{ success: boolean; proposal: ProposalData }>(`/proposals/${dealId}/create-from-quote`, {});
      setProposal(data.proposal);
    } catch (err: any) {
      setRequestResult({ type: "error", message: err.message || "Failed to create proposal" });
    }
    setCreating(false);
  }

  async function handleRequestApprovedProposal() {
    if (!proposal) return;
    setRequesting(true);
    setRequestResult(null);

    try {
      const data = await api.post<{ success: boolean; message: string; uwPackageId: string }>(
        `/proposals/${proposal.id}/request-approved-proposal`, {}
      );

      setRequestResult({ type: "success", message: data.message });

      const interval = setInterval(async () => {
        try {
          const statusData = await api.get<{ package: UwPackageData | null }>(`/proposals/${proposal.id}/uw-package-status`);
          setUwStatus(statusData.package);
          if (statusData.package?.status === "sent" || statusData.package?.status === "failed") {
            clearInterval(interval);
          }
        } catch {}
      }, 4000);
      pollRef.current = interval;
      loadProposal();
    } catch (err: any) {
      setRequestResult({ type: "error", message: err.message || "Request failed" });
    }

    setRequesting(false);
  }

  function fmt(val: string | null | undefined) {
    if (!val) return "\u2014";
    const n = Number(val);
    if (isNaN(n)) return "\u2014";
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtDate(d: string | null | undefined) {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const alreadyRequested = proposal?.status === "approved_proposal_requested" || proposal?.status === "underwriting_notified";

  if (loading) {
    return (
      <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: textMuted }}>
          <Loader size={20} style={{ marginRight: 10, animation: "spin 1s linear infinite" }} /> Loading proposal...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: textMuted, cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0,
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      {!proposal ? (
        <div style={{ ...glass, padding: 40, textAlign: "center" }}>
          <FileText size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
          <p style={{ color: textMuted, fontSize: 15, margin: "0 0 4px" }}>No proposal available yet.</p>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, margin: "8px 0 24px" }}>
            Generate a proposal from the deal's existing quote data.
          </p>
          <button
            type="button"
            onClick={handleCreateProposal}
            disabled={creating}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 8, border: "none",
              background: accent, color: textPrimary, cursor: creating ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600,
            }}
          >
            {creating ? <Loader size={15} /> : <Plus size={15} />}
            {creating ? "Creating..." : "Generate Proposal from Quote"}
          </button>
          {requestResult?.type === "error" && (
            <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, background: "rgba(255,77,79,0.1)", border: "1px solid rgba(255,77,79,0.3)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#ff4d4f" />
              <span style={{ color: "#ff4d4f", fontSize: 13 }}>{requestResult.message}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 60 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <h2 style={{ color: textPrimary, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
                {proposal.programName || "Workers' Compensation Proposal"}
              </h2>
              <p style={{ color: textMuted, fontSize: 14, margin: 0 }}>
                {proposal.carrierName || "Carrier TBD"} \u00b7 Prepared {fmtDate(proposal.createdAt)}
              </p>
            </div>
            <StatusBadge status={proposal.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <PricingCard label="WC Annual Premium" value={fmt(proposal.wcAnnualPremium)} isAccent />
            <PricingCard label="WC Monthly" value={fmt(proposal.wcMonthlyPremium)} />
            <PricingCard label="WFS Monthly PEPM" value={fmt(proposal.wfsMonthlyPepm)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <PricingCard label="Total Monthly (WC + WFS)" value={fmt(proposal.totalMonthly)} />
            <PricingCard label="Total Annual" value={fmt(proposal.totalAnnual)} />
          </div>

          <div style={{ ...glass, padding: 24, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              <DetailItem icon={<Calendar size={14} />} label="Effective Date" value={fmtDate(proposal.effectiveDate)} />
              <DetailItem icon={<Calendar size={14} />} label="Expiration Date" value={fmtDate(proposal.expirationDate)} />
              <DetailItem icon={<TrendingUp size={14} />} label="EMod" value={proposal.emod ? `${proposal.emod}x` : "\u2014"} />
              <DetailItem icon={<Building2 size={14} />} label="Carrier" value={proposal.carrierName || "\u2014"} />
            </div>
          </div>

          {proposal.ratingBreakdown && (
            <div style={{ ...glass, padding: 0, marginBottom: 16, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setShowBreakdown(prev => !prev)}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 24px", background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
                }}
              >
                Rating Breakdown
                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showBreakdown && (
                <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <pre style={{
                    color: textMuted, fontSize: 12,
                    background: "rgba(0,0,0,0.3)", borderRadius: 8,
                    padding: 16, overflow: "auto", margin: "16px 0 0",
                  }}>
                    {JSON.stringify(proposal.ratingBreakdown, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {uwStatus && (
            <div style={{ ...glass, padding: "16px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {uwStatus.status === "sent" && <CheckCircle size={16} color="#4caf50" />}
                {(uwStatus.status === "assembling" || uwStatus.status === "pending") && (
                  <Loader size={16} color={accent} style={{ animation: "spin 1s linear infinite" }} />
                )}
                {uwStatus.status === "failed" && <AlertCircle size={16} color="#ff4d4f" />}
                <div>
                  <p style={{ color: textPrimary, fontSize: 13, fontWeight: 500, margin: 0 }}>
                    {uwStatus.status === "sent" && `Underwriting package sent to ${uwStatus.emailSentTo?.[0] || "underwriting"} \u00b7 ${fmtDate(uwStatus.emailSentAt)}`}
                    {(uwStatus.status === "assembling" || uwStatus.status === "pending") && "Assembling underwriting package\u2026"}
                    {uwStatus.status === "failed" && "Package assembly failed \u2014 please notify the underwriting team manually."}
                  </p>
                  {uwStatus.status === "sent" && uwStatus.documents && (
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "3px 0 0" }}>
                      {uwStatus.documents.length} documents included
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ ...glass, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h3 style={{ color: textPrimary, fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>
                  Request Approved Proposal
                </h3>
                <p style={{ color: textMuted, fontSize: 13, margin: 0 }}>
                  Sends the full submission package to the Axel underwriting team for market placement and approval.
                </p>
              </div>

              {alreadyRequested ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4caf50", fontSize: 14, fontWeight: 500 }}>
                  <CheckCircle size={16} /> Submitted to Underwriting
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestApprovedProposal}
                  disabled={requesting}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 24px", borderRadius: 8,
                    border: "none", background: accent, color: textPrimary,
                    cursor: requesting ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
                  }}
                >
                  {requesting ? <Loader size={15} /> : <Send size={15} />}
                  {requesting ? "Submitting\u2026" : "Request Approved Proposal"}
                </button>
              )}
            </div>

            {requestResult && (
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 8,
                background: requestResult.type === "success" ? "rgba(76,175,80,0.1)" : "rgba(255,77,79,0.1)",
                border: `1px solid ${requestResult.type === "success" ? "rgba(76,175,80,0.3)" : "rgba(255,77,79,0.3)"}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {requestResult.type === "success"
                  ? <CheckCircle size={14} color="#4caf50" />
                  : <AlertCircle size={14} color="#ff4d4f" />}
                <span style={{ color: requestResult.type === "success" ? "#4caf50" : "#ff4d4f", fontSize: 13 }}>
                  {requestResult.message}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PricingCard({ label, value, isAccent }: { label: string; value: string; isAccent?: boolean }) {
  const { textPrimary, textMuted, cardBg, borderColor } = useThemeColors();
  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${isAccent ? "rgba(124,58,237,0.25)" : borderColor}`,
      borderRadius: 10, padding: "16px 20px",
    }}>
      <p style={{ color: textMuted, fontSize: 12, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      <p style={{ color: isAccent ? accent : textPrimary, fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { textPrimary, textMuted } = useThemeColors();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: textMuted, fontSize: 12, marginBottom: 4 }}>
        {icon} {label}
      </div>
      <p style={{ color: textPrimary, fontSize: 14, fontWeight: 500, margin: 0 }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { textMuted } = useThemeColors();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: textMuted, bg: "rgba(255,255,255,0.06)" },
    sent_to_client: { label: "Sent to Client", color: "#64b5f6", bg: "rgba(100,181,246,0.1)" },
    approved_proposal_requested: { label: "UW Submitted", color: "#ffb74d", bg: "rgba(255,183,77,0.1)" },
    underwriting_notified: { label: "UW Notified", color: "#4caf50", bg: "rgba(76,175,80,0.1)" },
    accepted: { label: "Accepted", color: "#4caf50", bg: "rgba(76,175,80,0.12)" },
    declined: { label: "Declined", color: "#ff4d4f", bg: "rgba(255,77,79,0.1)" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      padding: "5px 14px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600, border: `1px solid ${s.color}44`,
    }}>
      {s.label}
    </span>
  );
}
