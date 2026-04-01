import { useThemeColors } from "@/lib/use-theme-colors";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload, FileSignature, FileCheck } from "lucide-react";
import SubmissionFlow from "@/components/submission/SubmissionFlow";
import LossHistoryUpload from "@/components/submission/LossHistoryUpload";
import RequestBindButton from "@/components/submission/RequestBindButton";
import ProposalTab from "@/components/submission/ProposalTab";
import BindStatusPanel from "@/components/submission/BindStatusPanel";
import UwFileViewer from "@/components/submission/UwFileViewer";

const accent = "#E91E8C";

type Tab = "application" | "loss-history" | "proposal" | "bind";

export default function SubmissionPage() {
  const [searchParams] = useSearchParams();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const navigate = useNavigate();
  const dealId = searchParams.get("dealId") || "";
  const verticalId = searchParams.get("verticalId") || "cannabis";
  const quoteId = searchParams.get("quoteId") || undefined;
  const dealName = searchParams.get("dealName") || "Deal";

  const [activeTab, setActiveTab] = useState<Tab>("application");
  const [showSubmissionOverlay, setShowSubmissionOverlay] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState("not_started");

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  useEffect(() => {
    if (!dealId) return;
    fetch(`${baseUrl}/submission/answers/${dealId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.answers?.status) setSubmissionStatus(data.answers.status);
      })
      .catch(() => {});
  }, [dealId]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "application", label: "Application", icon: <FileText size={16} /> },
    { key: "loss-history", label: "Loss History", icon: <Upload size={16} /> },
    { key: "proposal", label: "Proposal", icon: <FileCheck size={16} /> },
    { key: "bind", label: "Bind Request", icon: <FileSignature size={16} /> },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: textMuted,
          cursor: "pointer",
          fontSize: 13,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <h1 style={{ color: textPrimary, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        Underwriting Submission
      </h1>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 28 }}>
        {dealName} — {verticalId.charAt(0).toUpperCase() + verticalId.slice(1)} Vertical
      </p>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 28,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.key ? accent : "transparent"}`,
              background: activeTab === tab.key ? "rgba(233,30,140,0.08)" : "transparent",
              color: activeTab === tab.key ? accent : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "application" && (
        <div>
          <div
            style={{
              background: "#13131f",
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: 28,
              textAlign: "center",
            }}
          >
            <FileText size={36} color="rgba(255,255,255,0.2)" style={{ marginBottom: 16 }} />
            <h3 style={{ color: textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Workers' Compensation Application
            </h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
              Complete the full underwriting application for this deal. The form includes business details,
              cannabis operations, locations, safety information, and loss history.
            </p>
            <button
              type="button"
              onClick={() => setShowSubmissionOverlay(true)}
              style={{
                padding: "12px 28px",
                borderRadius: 8,
                border: "none",
                background: accent,
                color: textPrimary,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FileText size={16} />
              {submissionStatus === "not_started"
                ? "Start Application"
                : submissionStatus === "submitted"
                ? "View Application"
                : "Continue Application"}
            </button>
          </div>

          {showSubmissionOverlay && dealId && (
            <SubmissionFlow
              dealId={dealId}
              verticalId={verticalId}
              quoteId={quoteId}
              onClose={() => setShowSubmissionOverlay(false)}
              onComplete={() => {
                setSubmissionStatus("submitted");
                setShowSubmissionOverlay(false);
              }}
            />
          )}
        </div>
      )}

      {activeTab === "loss-history" && dealId && (
        <LossHistoryUpload dealId={dealId} />
      )}

      {activeTab === "proposal" && dealId && (
        <ProposalTab dealId={dealId} dealName={dealName} />
      )}

      {activeTab === "bind" && dealId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              background: "#13131f",
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: 28,
            }}
          >
            <h3 style={{ color: textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Request to Bind
            </h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 24 }}>
              Once the application is submitted and loss history documents are uploaded, you can
              request to bind the coverage. This will generate the bind document package.
            </p>
            <RequestBindButton
              dealId={dealId}
              quoteId={quoteId}
              submissionStatus={submissionStatus}
            />
          </div>

          <BindStatusPanel dealId={dealId} />

          <UwFileViewer dealId={dealId} />
        </div>
      )}
    </div>
  );
}
