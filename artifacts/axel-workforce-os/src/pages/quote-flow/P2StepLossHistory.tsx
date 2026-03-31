import { useState, useCallback, useRef } from "react";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import { storeFile, removeFile } from "@/lib/loss-history-file-store";
import { Upload, FileText, Trash2, AlertCircle } from "lucide-react";

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function P2StepLossHistory() {
  const s = useQuoteFlowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const addFiles = useCallback((files: FileList | File[]) => {
    setError("");
    const newEntries: typeof s.lossHistoryFiles = [];

    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted for loss history.");
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError("Files must be under 25MB.");
        continue;
      }
      const id = generateId();
      storeFile(id, file);
      newEntries.push({
        id,
        name: file.name,
        size: file.size,
        yearsCovered: "",
        notes: "",
      });
    }

    if (newEntries.length > 0) {
      s.update({ lossHistoryFiles: [...s.lossHistoryFiles, ...newEntries] });
    }
  }, [s]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleRemove = (id: string) => {
    removeFile(id);
    s.update({ lossHistoryFiles: s.lossHistoryFiles.filter(f => f.id !== id) });
  };

  const handleUpdateFile = (id: string, field: "yearsCovered" | "notes", value: string) => {
    s.update({
      lossHistoryFiles: s.lossHistoryFiles.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      ),
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#1a1a26",
    color: "#fff",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
        Loss History
      </h2>
      <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px" }}>
        Upload your loss run documents (PDF). These are required before submission for underwriting review.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#E91E8C" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12,
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "rgba(233,30,140,0.04)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
          marginBottom: 24,
        }}
      >
        <Upload style={{ width: 36, height: 36, color: dragOver ? "#E91E8C" : "#666", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>
          {dragOver ? "Drop files here" : "Drag & drop loss run PDFs"}
        </p>
        <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
          or click to browse — PDF only, max 25MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 8, marginBottom: 16 }}>
          <AlertCircle style={{ width: 16, height: 16, color: "#ef4444" }} />
          <span style={{ fontSize: 13, color: "#ef4444" }}>{error}</span>
        </div>
      )}

      {s.lossHistoryFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {s.lossHistoryFiles.map((file) => (
            <div
              key={file.id}
              style={{
                background: "#13131f",
                borderRadius: 10,
                padding: 16,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText style={{ width: 20, height: 20, color: "#E91E8C" }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(file.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                    color: "#666",
                    display: "flex",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Years Covered
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2021-2025"
                    value={file.yearsCovered}
                    onChange={(e) => handleUpdateFile(file.id, "yearsCovered", e.target.value)}
                    style={inputStyle}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional notes"
                    value={file.notes}
                    onChange={(e) => handleUpdateFile(file.id, "notes", e.target.value)}
                    style={inputStyle}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {s.lossHistoryFiles.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: 13, color: "#555" }}>
            No loss history documents uploaded yet. You can continue without them, but they may be required during underwriting review.
          </p>
        </div>
      )}
    </div>
  );
}
