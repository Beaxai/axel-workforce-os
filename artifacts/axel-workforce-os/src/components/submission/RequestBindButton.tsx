import { useState } from "react";
import { FileSignature, Loader, CheckCircle, AlertCircle } from "lucide-react";

const accent = "#E91E8C";

interface RequestBindButtonProps {
  dealId: string;
  quoteId?: string;
  submissionStatus: string;
  onSuccess?: (bindPackageId: string) => void;
}

export default function RequestBindButton({
  dealId,
  quoteId,
  submissionStatus,
  onSuccess,
}: RequestBindButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;
  const isReady = submissionStatus === "submitted";
  const alreadyRequested = submissionStatus === "bind_requested";

  async function handleRequestBind() {
    if (!isReady) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${baseUrl}/submission/request-bind/${dealId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setResult("success");
        setMessage("Bind request submitted. Document package is being prepared.");
        if (onSuccess) onSuccess(data.bindPackageId);
      } else {
        setResult("error");
        setMessage(data.error || "Request failed. Please try again.");
      }
    } catch {
      setLoading(false);
      setResult("error");
      setMessage("Request failed. Please try again.");
    }
  }

  if (alreadyRequested) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, color: "#4caf50", fontSize: 14 }}
      >
        <CheckCircle size={16} /> Bind Requested — Document package in preparation
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRequestBind}
        disabled={!isReady || loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 28px",
          borderRadius: 8,
          border: "none",
          background: isReady ? accent : "rgba(255,255,255,0.08)",
          color: isReady ? "#fff" : "rgba(255,255,255,0.3)",
          cursor: isReady && !loading ? "pointer" : "not-allowed",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {loading ? (
          <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <FileSignature size={16} />
        )}
        {loading ? "Submitting..." : "Request to Bind Coverage"}
      </button>
      {!isReady && !alreadyRequested && (
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 6 }}>
          Complete and submit the application before requesting bind.
        </p>
      )}
      {result && (
        <p
          style={{
            color: result === "success" ? "#4caf50" : "#ff4d4f",
            fontSize: 13,
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {result === "success" ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {message}
        </p>
      )}
    </div>
  );
}
