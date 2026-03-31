import { useState, useEffect } from "react";
import {
  FileText, Download, CheckCircle, Clock,
  ChevronDown, ChevronUp, Loader, Shield,
} from "lucide-react";

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
};
const accent = "#E91E8C";

const DOC_CATEGORY_LABELS: Record<string, string> = {
  proposal: "Proposal",
  axel_supplemental: "Axel Supplemental Application",
  acord_130: "ACORD 130",
  carrier_supplemental: "Carrier Supplemental Application",
  bind_order: "Bind Order Form",
  loss_history: "Loss Run Documents",
  signed_package: "Signed Bind Package",
  application_summary: "Application Summary",
  rate_indication: "Rate Indication",
  coverage_verification: "Coverage Verification",
  loss_history_bundle: "Loss History Bundle",
};

const DOC_CATEGORY_ORDER = [
  "proposal", "axel_supplemental", "acord_130",
  "carrier_supplemental", "bind_order", "loss_history",
  "application_summary", "rate_indication", "coverage_verification",
  "loss_history_bundle", "signed_package",
];

interface DocItem {
  category: string;
  document_type: string;
  label: string;
  storage_path?: string | null;
}

interface Signer {
  role: string;
  name: string;
  email: string;
  status: string;
  signed_at: string | null;
}

interface SigRequest {
  id: string;
  status: string;
  signers: Signer[];
}

export default function UwFileViewer({ dealId }: { dealId: string }) {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [signatureRequest, setSignatureRequest] = useState<SigRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  useEffect(() => {
    loadAll();
  }, [dealId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadDocuments(), loadSignatureRequest()]);
    setLoading(false);
  }

  async function loadDocuments() {
    try {
      const [pkgRes, dealDocsRes] = await Promise.all([
        fetch(`${baseUrl}/bind-packages/${dealId}`),
        fetch(`${baseUrl}/submission/deal-documents/${dealId}`),
      ]);
      const [pkgData, dealDocsData] = await Promise.all([pkgRes.json(), dealDocsRes.json()]);

      const docs: DocItem[] = [];

      if (pkgData.bindPackage?.documents) {
        (pkgData.bindPackage.documents as any[]).forEach((d: any) => {
          docs.push({
            category: d.document_type,
            document_type: d.document_type,
            label: d.label || DOC_CATEGORY_LABELS[d.document_type] || d.document_type,
            storage_path: d.storage_path,
          });
        });

        if (pkgData.bindPackage.status === "signed") {
          docs.push({
            category: "signed_package",
            document_type: "signed_package",
            label: "Fully Executed Bind Package",
            storage_path: null,
          });
        }
      }

      if (dealDocsData.documents) {
        (dealDocsData.documents as any[]).forEach((d: any) => {
          docs.push({
            category: d.documentType,
            document_type: d.documentType,
            label: d.name || DOC_CATEGORY_LABELS[d.documentType] || d.documentType,
            storage_path: null,
          });
        });
      }

      setDocuments(docs);

      const expanded: Record<string, boolean> = {};
      DOC_CATEGORY_ORDER.forEach((c) => {
        expanded[c] = true;
      });
      setExpandedCategories(expanded);
    } catch {
    }
  }

  async function loadSignatureRequest() {
    try {
      const res = await fetch(`${baseUrl}/signatures/${dealId}`);
      const data = await res.json();
      setSignatureRequest(data.signatureRequest);
    } catch {
    }
  }

  async function handleLogView(doc: DocItem) {
    try {
      await fetch(`${baseUrl}/documents/log-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: dealId,
          document_type: doc.document_type,
          storage_path: doc.storage_path,
        }),
      });
    } catch {
    }
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function getDocsByCategory(cat: string) {
    return documents.filter((d) => d.category === cat);
  }

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <Loader size={18} style={{ marginRight: 10 }} /> Loading underwriting file...
      </div>
    );

  const categoriesWithDocs = DOC_CATEGORY_ORDER.filter((cat) => getDocsByCategory(cat).length > 0);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Shield size={20} color={accent} />
        <div>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Underwriting File</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "3px 0 0" }}>
            All submission documents, loss history, and executed bind package
          </p>
        </div>
      </div>

      {signatureRequest && (
        <div style={{ ...glass, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>Signature Status</h3>
            <SignatureStatusBadge status={signatureRequest.status} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(signatureRequest.signers || []).map((signer, i) => (
              <SignerRow key={i} signer={signer} />
            ))}
          </div>
        </div>
      )}

      {categoriesWithDocs.length === 0 ? (
        <div style={{ ...glass, padding: 40, textAlign: "center" }}>
          <FileText size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: 0 }}>No documents available yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categoriesWithDocs.map((cat) => {
            const docs = getDocsByCategory(cat);
            const expanded = expandedCategories[cat] !== false;
            return (
              <div key={cat} style={{ ...glass, overflow: "hidden" }}>
                <button
                  onClick={() => toggleCategory(cat)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={15} color={accent} />
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
                      {DOC_CATEGORY_LABELS[cat] || cat}
                    </span>
                    <span
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}
                    >
                      {docs.length}
                    </span>
                  </div>
                  {expanded ? (
                    <ChevronUp size={15} color="rgba(255,255,255,0.3)" />
                  ) : (
                    <ChevronDown size={15} color="rgba(255,255,255,0.3)" />
                  )}
                </button>

                {expanded && (
                  <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 12 }}>
                      {docs.map((doc, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <FileText size={14} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                              {doc.label}
                            </span>
                          </div>
                          <button
                            onClick={() => handleLogView(doc)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 14px",
                              borderRadius: 6,
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: "transparent",
                              color: "rgba(255,255,255,0.6)",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            <Download size={12} />
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignatureStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
    awaiting_signature: { label: "Awaiting Signatures", color: "#ffb74d", bg: "rgba(255,183,77,0.1)" },
    partially_signed: { label: "Partially Signed", color: "#64b5f6", bg: "rgba(100,181,246,0.1)" },
    signed: { label: "Fully Signed", color: "#4caf50", bg: "rgba(76,175,80,0.1)" },
    declined: { label: "Declined", color: "#ff4d4f", bg: "rgba(255,77,79,0.1)" },
    expired: { label: "Expired", color: "#ff4d4f", bg: "rgba(255,77,79,0.1)" },
    error: { label: "Error", color: "#ff4d4f", bg: "rgba(255,77,79,0.1)" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${s.color}44`,
      }}
    >
      {s.label}
    </span>
  );
}

function SignerRow({ signer }: { signer: { name: string; role: string; email: string; status: string; signed_at: string | null } }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {signer.status === "signed" ? (
          <CheckCircle size={14} color="#4caf50" />
        ) : (
          <Clock size={14} color="rgba(255,255,255,0.3)" />
        )}
        <div>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, margin: 0 }}>{signer.name}</p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "2px 0 0" }}>
            {signer.role} · {signer.email}
          </p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 12,
            background: signer.status === "signed" ? "rgba(76,175,80,0.12)" : "rgba(255,255,255,0.06)",
            color: signer.status === "signed" ? "#4caf50" : "rgba(255,255,255,0.4)",
            border: `1px solid ${signer.status === "signed" ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          {signer.status === "signed" ? "Signed" : "Awaiting"}
        </span>
        {signer.signed_at && (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "4px 0 0" }}>
            {new Date(signer.signed_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
