/**
 * Phase 4C — supporting tabs (Documents / Tasks / Quote / Policy). These wrap
 * the pre-existing functional panels and endpoints so the hub preserves the
 * deal card's prior capabilities while the Overview + Submission tabs deliver
 * the new collaboration experience.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPolicyDocuments,
  useDeletePolicyDocument,
  getListPolicyDocumentsQueryKey,
  getGetJourneysQueryKey,
} from "@workspace/api-client-react";
import { FileText, CheckSquare, Plus, Calculator, Shield, Upload, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { PinkButton, GhostButton } from "@/components/ui/axel-index";
import IndicationBreakdownPanel from "@/components/IndicationBreakdownPanel";
import IndicationDetailView, { type IndicationMetric, type WorkforceProfileShape } from "./IndicationDetailView";
import ProposalPanel from "@/components/ProposalPanel";
import BindStatusPanel from "@/components/submission/BindStatusPanel";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import PdfPreviewModal from "./PdfPreviewModal";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ---------------------------------------------------------------- Documents */
type DealDocument = {
  id: string;
  name: string;
  documentType: string;
  status: string;
  generatedAt?: string;
  metadata?: { downloadPath?: string } | null;
};
type CannabisPdf = { documentType: string; label: string; path: string };

type PolicyDoc = { id: string; fileName?: string | null; documentType?: string | null };

/** Muted one-word kind labels — the only secondary text a row is allowed. */
const DEAL_DOC_KIND: Record<string, string> = {
  rate_indication: "Indication",
  application_summary: "Summary",
  coverage_verification: "Verification",
  loss_history_bundle: "Loss History",
};

/** One quiet row: icon, name, muted kind word. Click anywhere to view. */
function QuietRow({
  name,
  kind,
  onOpen,
  onRename,
  onDelete,
  renaming,
  testId,
}: {
  name: string;
  kind: string;
  onOpen?: () => void;
  onRename?: (next: string) => Promise<void>;
  onDelete?: () => void;
  renaming?: boolean;
  testId: string;
}) {
  const c = useThemeColors();
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const next = draft.trim();
    if (!onRename || !next || next === name) { setEditing(false); setDraft(name); return; }
    setSaving(true);
    try { await onRename(next); setEditing(false); } finally { setSaving(false); }
  };

  const iconBtn: React.CSSProperties = {
    display: "inline-flex", padding: 5, background: "transparent", border: "none",
    color: c.textMuted, cursor: "pointer", borderRadius: 6,
  };

  return (
    <div
      data-testid={testId}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={editing || !onOpen ? undefined : onOpen}
      role={onOpen && !editing ? "button" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
        cursor: onOpen && !editing ? "pointer" : "default", borderRadius: 10,
        background: hover && onOpen && !editing ? c.inputBg : "transparent",
        transition: "background 120ms ease",
      }}
    >
      <FileText style={{ width: 16, height: 16, color: c.textMuted, flexShrink: 0 }} />
      {editing ? (
        <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }} onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={draft}
            data-testid={`${testId}-rename-input`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setEditing(false); setDraft(name); }
            }}
            style={{
              flex: 1, background: c.inputBg, border: `1px solid var(--accent-primary)`,
              borderRadius: 8, color: c.inputText, fontFamily: "inherit", fontSize: 13, padding: "6px 10px",
            }}
          />
          <button type="button" onClick={commit} aria-label="Save name" data-testid={`${testId}-rename-save`} style={{ ...iconBtn, color: "var(--accent-primary)" }}>
            {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Check style={{ width: 15, height: 15 }} />}
          </button>
          <button type="button" onClick={() => { setEditing(false); setDraft(name); }} aria-label="Cancel rename" style={iconBtn}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </span>
      ) : (
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: c.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
      )}
      {!editing && hover && onRename && (
        <button
          type="button"
          aria-label={`Rename ${name}`}
          data-testid={`${testId}-rename`}
          onClick={(e) => { e.stopPropagation(); setDraft(name); setEditing(true); }}
          style={iconBtn}
        >
          <Pencil style={{ width: 14, height: 14 }} />
        </button>
      )}
      {!editing && hover && onDelete && (
        <button
          type="button"
          aria-label={`Delete ${name}`}
          data-testid={`${testId}-delete`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ ...iconBtn, color: "#ef4444" }}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      )}
      {!editing && <span style={{ fontSize: 11.5, color: c.textMuted, whiteSpace: "nowrap" }}>{kind}</span>}
      {renaming ? null : null}
    </div>
  );
}

export function DocumentsTab({ dealId }: { dealId: string }) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DealDocument[]>([]);
  const [pdfs, setPdfs] = useState<CannabisPdf[]>([]);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  // Upload naming step: after picking a file, the user confirms a name + type.
  const [pending, setPending] = useState<{ file: File; name: string; type: "binder" | "policy" } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policyQuery = useListPolicyDocuments(dealId);
  const policyDocs: PolicyDoc[] = policyQuery.data?.documents ?? [];
  const removePolicy = useDeletePolicyDocument();

  const loadDealDocs = useCallback(async () => {
    try {
      const res = await api.get<{ documents: DealDocument[] }>(`/submission/deal-documents/${dealId}`);
      setDocs(res.documents || []);
    } catch { setDocs([]); }
  }, [dealId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadDealDocs();
      try {
        const res = await api.get<{ pdfs: CannabisPdf[] }>(`/submission/applications/${dealId}`);
        if (active) setPdfs(res.pdfs || []);
      } catch { if (active) setPdfs([]); }
    })();
    return () => { active = false; };
  }, [dealId, loadDealDocs]);

  const refreshPolicy = () => {
    queryClient.invalidateQueries({ queryKey: getListPolicyDocumentsQueryKey(dealId) });
    // Uploads may advance the WC tracker — refresh journeys too.
    queryClient.invalidateQueries({ queryKey: getGetJourneysQueryKey() });
  };

  const pickFile = (presetType: "binder" | "policy") => {
    setError(null);
    fileRef.current?.setAttribute("data-doctype", presetType);
    fileRef.current?.click();
  };

  const confirmUpload = async () => {
    if (!pending || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", pending.file);
      form.append("documentType", pending.type);
      form.append("displayName", pending.name.trim() || pending.file.name);
      const res = await fetch(`${API_BASE}/api/policy-documents/${dealId}/upload`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) throw new Error("upload failed");
      setPending(null);
      refreshPolicy();
    } catch {
      setError("Upload failed. PDF only, 25MB maximum.");
    } finally {
      setUploading(false);
    }
  };

  const renameDealDoc = async (docId: string, name: string) => {
    await api.patch(`/submission/deal-documents/doc/${docId}`, { name });
    await loadDealDocs();
  };
  const renamePolicyDoc = async (docId: string, name: string) => {
    await api.patch(`/policy-documents/${docId}`, { name });
    refreshPolicy();
  };

  const hasPolicy = policyDocs.some((d) => d.documentType === "policy");
  const input: React.CSSProperties = {
    background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8,
    color: c.inputText, fontFamily: "inherit", fontSize: 13, padding: "8px 10px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header: single quiet upload affordance. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <GhostButton
          onClick={() => pickFile("binder")}
          data-testid="button-upload-document"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}
        >
          <Upload style={{ width: 13, height: 13 }} />Upload
        </GhostButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        data-testid="input-upload-document"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          const preset = (fileRef.current?.getAttribute("data-doctype") as "binder" | "policy") || "binder";
          if (f) setPending({ file: f, name: f.name.replace(/\.pdf$/i, ""), type: preset });
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      {/* Name-on-upload step. */}
      {pending && (
        <div
          data-testid="panel-upload-naming"
          style={{ display: "flex", flexDirection: "column", gap: 10, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 12, padding: 14 }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              autoFocus
              value={pending.name}
              data-testid="input-upload-name"
              onChange={(e) => setPending((p) => (p ? { ...p, name: e.target.value } : p))}
              onKeyDown={(e) => { if (e.key === "Enter") confirmUpload(); }}
              placeholder="Document name"
              style={{ ...input, flex: 1, minWidth: 220 }}
            />
            <select
              value={pending.type}
              data-testid="select-upload-type"
              onChange={(e) => setPending((p) => (p ? { ...p, type: e.target.value as "binder" | "policy" } : p))}
              style={{ ...input, cursor: "pointer" }}
            >
              <option value="binder">Binder</option>
              <option value="policy">Policy</option>
            </select>
            <PinkButton onClick={confirmUpload} data-testid="button-confirm-upload" style={{ padding: "8px 16px", fontSize: 12 }}>
              {uploading ? "Uploading…" : "Upload"}
            </PinkButton>
            <GhostButton onClick={() => setPending(null)} style={{ padding: "8px 12px", fontSize: 12 }}>Cancel</GhostButton>
          </div>
          <span style={{ fontSize: 11.5, color: c.textMuted }}>
            Uploading a binder or policy marks the deal as carrier-bound.
          </span>
        </div>
      )}
      {error && (
        <p data-testid="text-upload-error" style={{ fontSize: 12.5, color: "#ef4444", margin: 0 }}>{error}</p>
      )}

      {/* One quiet list — no sections. */}
      <div>
        {pdfs.map((p) => (
          <QuietRow
            key={p.path}
            name={p.label}
            kind="Application"
            onOpen={() => setPreview({ url: p.path, title: p.label })}
            testId={`row-application-${p.documentType}`}
          />
        ))}
        {docs
          // Hide only rows that mirror a generated application PDF; rows with a
          // known generated kind (indication, summary, …) are never suppressed.
          .filter((d) => DEAL_DOC_KIND[d.documentType] || !pdfs.some((p) => p.documentType === d.documentType))
          .map((d) => {
          const url =
            d.metadata?.downloadPath ||
            (d.documentType === "rate_indication"
              ? `/api/submission/applications/${dealId}/indication-summary.pdf`
              : undefined);
          return (
            <QuietRow
              key={d.id}
              name={d.name}
              kind={DEAL_DOC_KIND[d.documentType] || "Document"}
              onOpen={url ? () => setPreview({ url, title: d.name }) : undefined}
              onRename={(next) => renameDealDoc(d.id, next)}
              testId={`row-generated-${d.id}`}
            />
          );
        })}
        {policyDocs.map((d) => (
          <QuietRow
            key={d.id}
            name={d.fileName || "Document"}
            kind={d.documentType === "policy" ? "Policy" : "Binder"}
            onOpen={() => setPreview({ url: `${API_BASE}/api/policy-documents/${d.id}/file`, title: d.fileName || "Document" })}
            onRename={(next) => renamePolicyDoc(d.id, next)}
            onDelete={() =>
              removePolicy.mutate({ docId: d.id }, { onSuccess: refreshPolicy, onError: () => setError("Could not delete that document.") })
            }
            testId={`policy-document-${d.id}`}
          />
        ))}
        {pdfs.length === 0 && docs.length === 0 && policyDocs.length === 0 && (
          <p style={{ fontSize: 12.5, color: c.textMuted, margin: "6px 0 0", padding: "0 16px" }}>No documents yet.</p>
        )}
      </div>

      {/* Quiet dashed affordance for the missing policy document. */}
      {!hasPolicy && (
        <button
          type="button"
          data-testid="button-add-policy-document"
          onClick={() => pickFile("policy")}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
            border: `1px dashed ${c.borderColor}`, borderRadius: 10, background: "transparent",
            color: c.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />Add policy document
        </button>
      )}

      {preview && (
        <PdfPreviewModal url={preview.url} title={preview.title} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Tasks */
type TaskEntry = { id: string; taskName: string; assignedTo?: string | null; assigneeName?: string | null; dueDate?: string; status?: string };

export function TasksTab({ dealId }: { dealId: string }) {
  const c = useThemeColors();
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ taskName: "", assignedTo: "", dueDate: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api.get<TaskEntry[]>(`/deals/${dealId}/tasks`);
      setTasks(rows);
    } catch {
      setTasks([]);
    }
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.taskName.trim() || saving) return;
    setSaving(true);
    try {
      await api.post(`/tasks`, {
        dealId,
        taskName: form.taskName.trim(),
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      });
      setForm({ taskName: "", assignedTo: "", dueDate: "" });
      setAdding(false);
      await load();
    } catch {
      /* surfaced by the empty list */
    } finally {
      setSaving(false);
    }
  };

  const input: React.CSSProperties = {
    background: c.inputBg, border: `1px solid ${c.inputBorder}`, borderRadius: 8,
    color: c.inputText, fontFamily: "inherit", fontSize: 13, padding: "8px 10px", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <GhostButton onClick={() => setAdding((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12 }}>
          <Plus style={{ width: 14, height: 14 }} />Add task
        </GhostButton>
      </div>

      {adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: 12 }}>
          <input style={input} placeholder="Task name" value={form.taskName} onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))} />
          <input style={input} placeholder="Assigned to (optional)" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
          <input style={input} type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          <PinkButton onClick={create} style={{ padding: "8px 16px", fontSize: 12 }}>{saving ? "Saving\u2026" : "Create task"}</PinkButton>
        </div>
      )}

      {tasks.length === 0 && !adding && (
        <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>No tasks yet.</div>
      )}
      {tasks.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: "10px 12px" }}>
          <CheckSquare style={{ width: 16, height: 16, color: t.status === "completed" ? "#4caf50" : c.textMuted }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: c.textPrimary }}>{t.taskName}</div>
            {(t.assignedTo || t.dueDate) && (
              <div style={{ fontSize: 11, color: c.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                {t.assignedTo && t.assigneeName ? (
                  <UserMiniProfile userId={t.assignedTo}>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: "var(--accent-primary)", fontWeight: 600 }}
                    >
                      {t.assigneeName}
                    </button>
                  </UserMiniProfile>
                ) : t.assigneeName ? (
                  <span>{t.assigneeName}</span>
                ) : null}
                {(t.assigneeName) && t.dueDate ? <span>{"\u00b7"}</span> : null}
                {t.dueDate ? <span>{new Date(t.dueDate).toLocaleDateString()}</span> : null}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- Quote */
type QuoteRecord = {
  wcRatingBreakdown?: any;
  wfsRatingBreakdown?: any;
  workforceProfile?: any;
  ratedAt?: string;
  wcIndicationMin?: string | null;
  wcIndicationMax?: string | null;
  wcFinalPremium?: string | null;
  paramsPendingReview?: boolean | null;
};

export function QuoteTab({ dealId, businessName, productType, vertical, coverageEffectiveDate, detailMetric, onCloseDetail, canEditParams, onQuoteUpdated, onClose }: { dealId: string; businessName: string; productType?: string; vertical?: string; coverageEffectiveDate?: string | null; detailMetric?: IndicationMetric | null; onCloseDetail?: () => void; canEditParams?: boolean; onQuoteUpdated?: () => void; onClose: () => void }) {
  const c = useThemeColors();
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await api.get<QuoteRecord>(`/quotes/by-deal/${dealId}`);
        if (active) setQuote(row);
      } catch {
        if (active) setQuote(null);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [dealId, version]);

  if (!loaded) return <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>Loading quote\u2026</div>;

  // A header KPI was clicked — show the editable detail view for that metric
  // instead of the indication (works whenever the deal has a workforce profile).
  if (detailMetric && quote?.workforceProfile) {
    return (
      <IndicationDetailView
        dealId={dealId}
        metric={detailMetric}
        profile={quote.workforceProfile as WorkforceProfileShape}
        pendingReview={!!quote.paramsPendingReview}
        editable={!!canEditParams}
        onBack={() => onCloseDetail?.()}
        onSaved={() => {
          setVersion((v) => v + 1); // refresh premium/table with re-rated numbers
          onQuoteUpdated?.();
        }}
      />
    );
  }

  const wcBreakdown = quote?.wcRatingBreakdown?.data || quote?.wcRatingBreakdown;
  if (quote && wcBreakdown) {
    const isMulti = Array.isArray(wcBreakdown?.locations);
    if (isMulti) {
      return (
        <IndicationBreakdownPanel
          businessName={businessName}
          wcBreakdown={wcBreakdown}
          workforceProfile={quote.workforceProfile || null}
          indicationLow={quote.wcIndicationMin != null ? Number(quote.wcIndicationMin) : null}
          indicationHigh={quote.wcIndicationMax != null ? Number(quote.wcIndicationMax) : null}
          finalPremiumFallback={quote.wcFinalPremium != null ? Number(quote.wcFinalPremium) : null}
          ratedAt={quote.ratedAt}
          vertical={vertical}
          productType={productType}
          coverageEffectiveDate={coverageEffectiveDate}
        />
      );
    }
    return (
      <ProposalPanel
        businessName={businessName}
        quoteType={productType === "PEO" ? "PEO+WC" : "WC Only"}
        wcBreakdown={wcBreakdown}
        wfsBreakdown={quote.wfsRatingBreakdown?.data || quote.wfsRatingBreakdown}
        readOnly
        ratedAt={quote.ratedAt}
      />
    );
  }

  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <Calculator style={{ width: 40, height: 40, color: c.textMuted, marginBottom: 12 }} />
      <p style={{ fontSize: 15, color: c.textPrimary, margin: "0 0 8px" }}>No quote on file</p>
      <p style={{ fontSize: 13, color: c.textMuted, margin: "0 0 16px" }}>Generate a quote from the Marketplace.</p>
      <GhostButton onClick={onClose} style={{ padding: "8px 20px" }}>Close</GhostButton>
    </div>
  );
}

/* ------------------------------------------------------------------- Policy */
export function PolicyTab({ dealId, bindStatus }: { dealId: string; bindStatus?: string }) {
  const c = useThemeColors();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: c.textMuted }}>
        <Shield style={{ width: 15, height: 15 }} />Bind & policy status
      </div>
      <BindStatusPanel dealId={dealId} bindStatus={bindStatus || "not_started"} />
    </div>
  );
}
