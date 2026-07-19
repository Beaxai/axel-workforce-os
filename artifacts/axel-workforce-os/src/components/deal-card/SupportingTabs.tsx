/**
 * Phase 4C — supporting tabs (Documents / Tasks / Quote / Policy). These wrap
 * the pre-existing functional panels and endpoints so the hub preserves the
 * deal card's prior capabilities while the Overview + Submission tabs deliver
 * the new collaboration experience.
 */
import { useCallback, useEffect, useState } from "react";
import { FileText, Download, CheckSquare, Plus, Calculator, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useThemeColors } from "@/lib/use-theme-colors";
import { PinkButton, GhostButton } from "@/components/ui/axel-index";
import MultiLocationRatingPanel from "@/components/MultiLocationRatingPanel";
import ProposalPanel from "@/components/ProposalPanel";
import BindStatusPanel from "@/components/submission/BindStatusPanel";
import UserMiniProfile from "@/components/user-profile/UserMiniProfile";
import PolicyDocumentsPanel from "./PolicyDocumentsPanel";

/* ---------------------------------------------------------------- Documents */
type DealDocument = { id: string; name: string; documentType: string; status: string; generatedAt?: string };
type CannabisPdf = { documentType: string; label: string; path: string };

export function DocumentsTab({ dealId }: { dealId: string }) {
  const c = useThemeColors();
  const [docs, setDocs] = useState<DealDocument[]>([]);
  const [pdfs, setPdfs] = useState<CannabisPdf[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ documents: DealDocument[] }>(`/submission/deal-documents/${dealId}`);
        if (active) setDocs(res.documents || []);
      } catch {
        if (active) setDocs([]);
      }
      try {
        const res = await api.get<{ pdfs: CannabisPdf[] }>(`/submission/applications/${dealId}`);
        if (active) setPdfs(res.pdfs || []);
      } catch {
        if (active) setPdfs([]);
      }
    })();
    return () => { active = false; };
  }, [dealId]);

  const row: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: c.cardBg, border: `1px solid ${c.borderColor}`, borderRadius: 10, padding: "10px 12px",
  };

  return (
    <div>
      {docs.length === 0 && pdfs.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>
          No submission documents on file.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pdfs.map((p) => (
            <a key={p.path} href={p.path} target="_blank" rel="noreferrer" style={{ ...row, textDecoration: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: c.textPrimary }}>
                <FileText style={{ width: 16, height: 16, color: c.textMuted }} />{p.label}
              </span>
              <Download style={{ width: 15, height: 15, color: "var(--accent-primary)" }} />
            </a>
          ))}
          {docs.map((d) => (
            <div key={d.id} style={row}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: c.textPrimary }}>
                <FileText style={{ width: 16, height: 16, color: c.textMuted }} />{d.name}
              </span>
              <span style={{ fontSize: 11, color: c.textMuted }}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* §6C carrier binder / policy — always available, even with no other docs. */}
      <PolicyDocumentsPanel dealId={dealId} />
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
};

export function QuoteTab({ dealId, businessName, productType, onClose }: { dealId: string; businessName: string; productType?: string; onClose: () => void }) {
  const c = useThemeColors();
  const [quote, setQuote] = useState<QuoteRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

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
  }, [dealId]);

  if (!loaded) return <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: c.textMuted }}>Loading quote\u2026</div>;

  const wcBreakdown = quote?.wcRatingBreakdown?.data || quote?.wcRatingBreakdown;
  if (quote && wcBreakdown) {
    const isMulti = Array.isArray(wcBreakdown?.locations);
    if (isMulti) {
      return (
        <MultiLocationRatingPanel
          businessName={businessName}
          wcBreakdown={wcBreakdown}
          workforceProfile={quote.workforceProfile || null}
          indicationLow={quote.wcIndicationMin != null ? Number(quote.wcIndicationMin) : null}
          indicationHigh={quote.wcIndicationMax != null ? Number(quote.wcIndicationMax) : null}
          finalPremiumFallback={quote.wcFinalPremium != null ? Number(quote.wcFinalPremium) : null}
          ratedAt={quote.ratedAt}
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
