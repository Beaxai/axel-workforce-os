import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPolicyDocuments,
  useUploadPolicyDocument,
  useDeletePolicyDocument,
  getListPolicyDocumentsQueryKey,
  getGetJourneysQueryKey,
} from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import AxelBadge from "@/components/ui/AxelBadge";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";

const ERROR_RED = "#ef4444";

type DocType = "binder" | "policy";

/**
 * §6C — carrier binder / policy upload.
 *
 * Uploading either document is de facto carrier acceptance, so the server
 * auto-satisfies the WC tracker's Phase 1 (and Phases 1+2 together for a direct
 * policy release). We invalidate the journeys cache after a successful upload so
 * the Implementations view reflects the advance without a manual refresh.
 */
export default function PolicyDocumentsPanel({ dealId }: { dealId: string }) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docType, setDocType] = useState<DocType>("binder");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The endpoint returns { documents: [...] }, not a bare array.
  const { data, isLoading } = useListPolicyDocuments(dealId);
  const docs = data?.documents ?? [];
  const upload = useUploadPolicyDocument();
  const remove = useDeletePolicyDocument();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListPolicyDocumentsQueryKey(dealId) });
    // The upload may have advanced the tracker — refresh journeys too.
    queryClient.invalidateQueries({ queryKey: getGetJourneysQueryKey() });
  };

  const handleFile = (file: File) => {
    setError(null);
    setNotice(null);
    upload.mutate(
      { dealId, data: { file, documentType: docType } },
      {
        onSuccess: () => {
          setNotice(
            docType === "policy"
              ? "Policy uploaded — carrier acceptance and policy issuance satisfied."
              : "Binder uploaded — carrier acceptance satisfied.",
          );
          refresh();
        },
        onError: () => setError("Upload failed. PDF only, 25MB maximum."),
      },
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const labelStyle = { fontSize: 12, color: "var(--label-text)", marginBottom: 6, display: "block" } as const;

  return (
    <div data-testid="panel-policy-documents" style={{ marginTop: 24 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary, margin: "0 0 4px" }}>
        Carrier binder &amp; policy
      </h4>
      <p style={{ fontSize: 12, color: c.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>
        Uploading a binder or policy is treated as carrier acceptance and advances the
        implementation tracker automatically.
      </p>

      {/* UPLOAD */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Document type</label>
          <select
            data-testid="select-document-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              color: "var(--input-text)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="binder">Binder</option>
            <option value="policy">Policy</option>
          </select>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          data-testid="input-policy-document"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <button
          type="button"
          data-testid="button-upload-policy-document"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 20,
            border: "1px solid var(--accent-primary)",
            background: "transparent",
            color: "var(--accent-primary)",
            fontSize: 13,
            fontWeight: 600,
            cursor: upload.isPending ? "default" : "pointer",
          }}
        >
          {upload.isPending ? (
            <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Uploading…</>
          ) : (
            <><Upload style={{ width: 14, height: 14 }} />Upload PDF</>
          )}
        </button>
      </div>

      {notice && (
        <p data-testid="text-upload-notice" style={{ fontSize: 12.5, color: "var(--accent-primary)", margin: "0 0 12px" }}>
          {notice}
        </p>
      )}
      {error && (
        <p data-testid="text-upload-error" style={{ fontSize: 12.5, color: ERROR_RED, margin: "0 0 12px" }}>
          {error}
        </p>
      )}

      {/* LIST */}
      {isLoading ? (
        <p style={{ fontSize: 13, color: c.textMuted }}>Loading documents…</p>
      ) : docs.length === 0 ? (
        <p data-testid="text-no-policy-documents" style={{ fontSize: 13, color: c.textMuted, margin: 0 }}>
          No binder or policy on file yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              data-testid={`policy-document-${doc.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${c.borderColor}`,
                background: c.inputBg,
              }}
            >
              <FileText style={{ width: 15, height: 15, color: c.textMuted, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: c.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.fileName}
              </span>
              <AxelBadge
                label={doc.documentType === "policy" ? "Policy" : "Binder"}
                color={doc.documentType === "policy" ? "purple" : "blue"}
              />
              <button
                type="button"
                data-testid={`button-delete-policy-document-${doc.id}`}
                onClick={() =>
                  remove.mutate({ docId: doc.id }, { onSuccess: refresh, onError: () => setError("Could not delete that document.") })
                }
                aria-label="Delete document"
                style={{ background: "transparent", border: "none", color: ERROR_RED, cursor: "pointer", padding: 4, display: "inline-flex" }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
