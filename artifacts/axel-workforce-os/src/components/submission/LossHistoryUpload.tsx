import { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

const accent = "var(--accent-primary)";

interface LossHistoryDoc {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  yearsCovered: string | null;
  valuationDate: string | null;
  notes: string | null;
  uploadedAt: string;
}

interface LossHistoryUploadProps {
  dealId: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function LossHistoryUpload({ dealId }: LossHistoryUploadProps) {
  const [documents, setDocuments] = useState<LossHistoryDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [valuationDate, setValuationDate] = useState("");
  const [yearsCovered, setYearsCovered] = useState("");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

  useEffect(() => {
    loadDocuments();
  }, [dealId]);

  async function loadDocuments() {
    try {
      const res = await fetch(`${baseUrl}/loss-history/${dealId}`);
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      console.error("Failed to load loss history documents");
    }
  }

  async function handleUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      setUploadError("Only PDF files are accepted.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    if (valuationDate) formData.append("valuationDate", valuationDate);
    if (yearsCovered) formData.append("yearsCovered", yearsCovered);
    if (notes) formData.append("notes", notes);

    try {
      const res = await fetch(`${baseUrl}/loss-history/${dealId}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setValuationDate("");
        setYearsCovered("");
        setNotes("");
        loadDocuments();
      } else {
        setUploadError(data.error || "Upload failed.");
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    }
    setUploading(false);
  }

  async function handleDelete(docId: string) {
    try {
      await fetch(`${baseUrl}/loss-history/${dealId}/${docId}`, { method: "DELETE" });
      loadDocuments();
    } catch {
      console.error("Failed to delete document");
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: 10,
    color: "var(--input-text)",
    padding: "8px 12px",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h3 style={{ color: "hsl(var(--foreground))", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
        Loss Run Documents
      </h3>
      <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, margin: "0 0 20px" }}>
        Upload prior carrier loss runs (last 3 years). Required if client has prior WC coverage.
        PDFs only.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{ display: "block", color: "var(--label-text)", fontSize: 12, marginBottom: 6 }}
        >
          Valuation date
        </label>
        <input
          type="date"
          value={valuationDate}
          onChange={(e) => setValuationDate(e.target.value)}
          style={inputStyle}
          data-testid="input-valuation-date"
        />
        <p style={{ color: "var(--label-text)", fontSize: 11, marginTop: 4, marginBottom: 0, opacity: 0.8 }}>
          The date the carrier valued this loss run. Carriers require valuation within 60 days
          of the desired effective date.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label
            style={{ display: "block", color: "var(--label-text)", fontSize: 12, marginBottom: 6 }}
          >
            Years Covered
          </label>
          <input
            value={yearsCovered}
            onChange={(e) => setYearsCovered(e.target.value)}
            placeholder="e.g. 2022-2024"
            style={inputStyle}
          />
        </div>
        <div>
          <label
            style={{ display: "block", color: "var(--label-text)", fontSize: 12, marginBottom: 6 }}
          >
            Notes (optional)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 3-year loss run from Hartford"
            style={inputStyle}
          />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleUpload(f);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? accent : "hsl(var(--border))"}`,
          borderRadius: 10,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? `${accent}11` : "hsl(var(--muted))",
          transition: "all 0.2s",
          marginBottom: 16,
        }}
      >
        <Upload
          size={24}
          color={dragOver ? accent : "hsl(var(--muted-foreground))"}
          style={{ marginBottom: 10 }}
        />
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14, margin: "0 0 4px" }}>
          {uploading ? "Uploading..." : "Drop PDF here or click to browse"}
        </p>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, margin: 0 }}>
          PDF files only - Max 25MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleUpload(e.target.files[0]);
          }}
        />
      </div>

      {uploadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#ff4d4f",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <AlertCircle size={14} /> {uploadError}
        </div>
      )}

      {documents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "hsl(var(--muted))",
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={16} color={accent} />
                <div>
                  <p style={{ color: "hsl(var(--foreground))", fontSize: 13, margin: 0 }}>{doc.fileName}</p>
                  <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 11, margin: 0 }}>
                    {doc.yearsCovered && `${doc.yearsCovered} \u00B7 `}
                    {`Valued: ${doc.valuationDate ?? "\u2014"} \u00B7 `}
                    {formatBytes(doc.fileSizeBytes)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
