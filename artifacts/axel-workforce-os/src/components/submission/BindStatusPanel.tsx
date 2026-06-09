import { useState, useEffect } from "react";
import {
  FileSignature, CheckCircle, Clock,
  Loader, Send, RefreshCw,
} from "lucide-react";

const accent = "var(--accent-primary)";

const BIND_STAGES = [
  { key: "not_started", label: "Not Started" },
  { key: "bind_requested", label: "Bind Requested" },
  { key: "sent_for_signature", label: "Sent for Signature" },
  { key: "partially_signed", label: "Partially Signed" },
  { key: "signed", label: "Fully Signed" },
  { key: "bound", label: "Bound" },
];

interface Signer {
  role: string;
  name: string;
  email: string;
  signature_id: string;
  status: string;
  signed_at: string | null;
}

interface SignatureRequest {
  id: string;
  status: string;
  signers: Signer[];
  hellosignSignatureRequestId: string;
  createdAt: string;
}

interface BindPackage {
  id: string;
  status: string;
  documents: any[];
}

export default function BindStatusPanel({
  dealId,
  bindStatus: initialBindStatus,
}: {
  dealId: string;
  bindStatus?: string;
}) {
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [bindPkg, setBindPkg] = useState<BindPackage | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);
  const [bindStatus, setBindStatus] = useState(initialBindStatus || "not_started");

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  useEffect(() => {
    if (dealId) loadData();
  }, [dealId]);

  async function loadData() {
    setLoading(true);
    try {
      const [sigRes, pkgRes] = await Promise.all([
        fetch(`${baseUrl}/signatures/${dealId}`),
        fetch(`${baseUrl}/bind-packages/${dealId}`),
      ]);
      const [sigData, pkgData] = await Promise.all([sigRes.json(), pkgRes.json()]);
      setSignatureRequest(sigData.signatureRequest);
      setBindPkg(pkgData.bindPackage);
      if (sigData.signatureRequest?.status === "signed") setBindStatus("signed");
      else if (sigData.signatureRequest?.status === "partially_signed") setBindStatus("partially_signed");
      else if (sigData.signatureRequest?.status === "awaiting_signature") setBindStatus("sent_for_signature");
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForSignature() {
    if (!bindPkg?.id) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${baseUrl}/signatures/send/${bindPkg.id}`, { method: "POST" });
      const data = await res.json();
      setSendResult(data.success ? "success" : "error");
      if (data.success) loadData();
    } catch {
      setSendResult("error");
    } finally {
      setSending(false);
    }
  }

  const currentStageIndex = BIND_STAGES.findIndex((s) => s.key === bindStatus);
  const pkgReadyToSign =
    bindPkg && (bindPkg.status === "pending_signature" || bindPkg.status === "generating") &&
    bindStatus !== "sent_for_signature" && bindStatus !== "partially_signed" && bindStatus !== "signed" && bindStatus !== "bound";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileSignature size={15} color={accent} />
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Bind & Signature Status</span>
        </div>
        <button
          onClick={loadData}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2 }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {BIND_STAGES.map((stage, i) => {
          const isComplete = i < currentStageIndex;
          const isCurrent = i === currentStageIndex;
          return (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 70 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isComplete ? "#4caf50" : isCurrent ? accent : "rgba(255,255,255,0.08)",
                    border: `2px solid ${isComplete ? "#4caf50" : isCurrent ? accent : "rgba(255,255,255,0.12)"}`,
                    flexShrink: 0,
                  }}
                >
                  {isComplete ? (
                    <CheckCircle size={12} color="#fff" />
                  ) : isCurrent ? (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                  )}
                </div>
                <span
                  style={{
                    color: isComplete ? "#4caf50" : isCurrent ? "#fff" : "rgba(255,255,255,0.25)",
                    fontSize: 10,
                    textAlign: "center",
                    marginTop: 4,
                    lineHeight: "1.3",
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {stage.label}
                </span>
              </div>
              {i < BIND_STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    minWidth: 12,
                    background: i < currentStageIndex ? "#4caf50" : "rgba(255,255,255,0.08)",
                    marginBottom: 16,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {signatureRequest &&
        (signatureRequest.status === "awaiting_signature" || signatureRequest.status === "partially_signed") && (
          <div style={{ marginBottom: 12 }}>
            {(signatureRequest.signers || []).map((signer, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 12px",
                  marginBottom: 4,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {signer.status === "signed" ? (
                    <CheckCircle size={12} color="#4caf50" />
                  ) : (
                    <Clock size={12} color="rgba(255,255,255,0.3)" />
                  )}
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{signer.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{signer.role}</span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: signer.status === "signed" ? "#4caf50" : "#ffb74d",
                  }}
                >
                  {signer.status === "signed" ? "Signed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}

      {(bindStatus === "signed" || bindStatus === "bound") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(76,175,80,0.1)",
            border: "1px solid rgba(76,175,80,0.25)",
            marginBottom: 12,
          }}
        >
          <CheckCircle size={14} color="#4caf50" />
          <span style={{ color: "#4caf50", fontSize: 13, fontWeight: 500 }}>
            All parties have signed. Deal is bound.
          </span>
        </div>
      )}

      {pkgReadyToSign && (
        <div>
          <button
            onClick={handleSendForSignature}
            disabled={sending}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 10,
              borderRadius: 8,
              border: "none",
              background: accent,
              color: "#fff",
              cursor: sending ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {sending ? <Loader size={14} /> : <Send size={14} />}
            {sending ? "Sending to HelloSign..." : "Send Bind Package for Signature"}
          </button>
          {sendResult === "success" && (
            <p style={{ color: "#4caf50", fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
              Sent successfully — signers will receive an email from HelloSign.
            </p>
          )}
          {sendResult === "error" && (
            <p style={{ color: "#ff4d4f", fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
              Send failed — check the console and verify HelloSign credentials.
            </p>
          )}
        </div>
      )}

      {!bindPkg && !loading && bindStatus === "not_started" && (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", margin: "8px 0 0" }}>
          No bind package generated yet. Submit the application first.
        </p>
      )}
    </div>
  );
}
